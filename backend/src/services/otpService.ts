import crypto from 'crypto';
import { prisma } from '../config/database';
import { SmsService } from './smsService';
import { recordAuditLog } from '../utils/auditLogger';
import { logger } from '../utils/logger';

export interface OtpRecord {
  phone: string;
  hashedOtp: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  verified: boolean;
  userId?: string;
  purpose?: string;
}

// In-memory cache for ultra-fast cooldown checking and local fallbacks
const otpStore = new Map<string, OtpRecord>();

// Clean expired records every 10 minutes from memory
setInterval(() => {
  const now = new Date();
  for (const [key, record] of otpStore.entries()) {
    if (record.expiresAt < now && !record.verified) {
      otpStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'Unknown';
  const clean = phone.trim().replace(/\s+/g, '');
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}

export class OtpService {
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly RESEND_COOLDOWN_SECONDS = 30;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly MAX_HOURLY_REQUESTS = 5;

  private static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  private static getStoreKey(phone: string, purpose: string): string {
    return `${phone.trim()}:${purpose}`;
  }

  /**
   * Generates and dispatches a cryptographically secure 6-digit OTP backed by database persistence.
   */
  static async sendOtp(
    phone: string,
    userId?: string,
    ipAddress?: string,
    purpose: string = 'MOBILE_VERIFICATION'
  ): Promise<{
    success: boolean;
    unconfigured?: boolean;
    rateLimited?: boolean;
    message: string;
    cooldownSeconds: number;
    expiresInSeconds: number;
  }> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number');
    }

    const storeKey = this.getStoreKey(cleanPhone, purpose);
    const now = new Date();

    // 1. Resend Cooldown Check (Memory + DB)
    const existingMemory = otpStore.get(storeKey) || otpStore.get(cleanPhone);
    if (existingMemory) {
      const elapsedSeconds = Math.floor((now.getTime() - existingMemory.lastSentAt.getTime()) / 1000);
      if (elapsedSeconds < this.RESEND_COOLDOWN_SECONDS) {
        const remainingCooldown = this.RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        return {
          success: false,
          message: `Please wait ${remainingCooldown} seconds before requesting a new OTP.`,
          cooldownSeconds: remainingCooldown,
          expiresInSeconds: Math.max(
            0,
            Math.floor((existingMemory.expiresAt.getTime() - now.getTime()) / 1000)
          ),
        };
      }
    }

    // Check DB for recent active OTP within cooldown period
    try {
      const recentDbOtp = await prisma.mobileOtp.findFirst({
        where: {
          phone: cleanPhone,
          purpose,
          consumedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentDbOtp) {
        const elapsedSinceCreated = Math.floor((now.getTime() - recentDbOtp.createdAt.getTime()) / 1000);
        if (elapsedSinceCreated < this.RESEND_COOLDOWN_SECONDS) {
          const remainingCooldown = this.RESEND_COOLDOWN_SECONDS - elapsedSinceCreated;
          return {
            success: false,
            message: `Please wait ${remainingCooldown} seconds before requesting a new OTP.`,
            cooldownSeconds: remainingCooldown,
            expiresInSeconds: Math.max(
              0,
              Math.floor((recentDbOtp.expiresAt.getTime() - now.getTime()) / 1000)
            ),
          };
        }
      }

      // 2. Hourly Rate Limiting Check (Max 5 OTP requests per hour per phone)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const hourlyCount = await prisma.mobileOtp.count({
        where: {
          phone: cleanPhone,
          createdAt: { gte: oneHourAgo },
        },
      });

      if (hourlyCount >= this.MAX_HOURLY_REQUESTS) {
        await recordAuditLog({
          userId: userId || null,
          action: 'OTP_RATE_LIMITED',
          entity: 'OtpVerification',
          details: { phoneMasked: maskPhoneNumber(cleanPhone), hourlyCount },
          ipAddress,
        });

        return {
          success: false,
          rateLimited: true,
          message: 'Maximum OTP requests exceeded for this hour. Please try again later.',
          cooldownSeconds: 3600,
          expiresInSeconds: 0,
        };
      }
    } catch (dbErr) {
      logger.warn('[OtpService] Database check warning:', dbErr);
    }

    // 3. Cryptographically Secure OTP Generation
    let otp: string;
    const isProd = process.env.NODE_ENV === 'production';
    const allowTestOtp =
      (process.env.OTP_DEV_MODE === 'true' || process.env.ALLOW_TEST_OTP === 'true') && !isProd;

    if (allowTestOtp) {
      otp = '789123'; // Allowed only in development/testing modes
    } else {
      otp = crypto.randomInt(100000, 1000000).toString();
    }

    const hashedOtp = this.hashOtp(otp);
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // 4. Invalidate Previous Unconsumed OTPs in Database
    try {
      await prisma.mobileOtp.updateMany({
        where: {
          phone: cleanPhone,
          purpose,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      // Persist New OTP Record in MobileOtp table
      await prisma.mobileOtp.create({
        data: {
          userId: userId || null,
          phone: cleanPhone,
          purpose,
          otpHash: hashedOtp,
          expiresAt,
          attemptCount: 0,
        },
      });
    } catch (dbErr) {
      logger.error('[OtpService] Failed to persist MobileOtp in database:', dbErr);
    }

    // Cache in memory for quick lookups
    const record: OtpRecord = {
      phone: cleanPhone,
      hashedOtp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verified: false,
      userId,
      purpose,
    };
    otpStore.set(storeKey, record);
    otpStore.set(cleanPhone, record);

    // Record OTP_REQUESTED Audit Log (Never log plaintext OTP)
    await recordAuditLog({
      userId: userId || null,
      action: 'OTP_REQUESTED',
      entity: 'OtpVerification',
      details: {
        phoneMasked: maskPhoneNumber(cleanPhone),
        purpose,
        expiresAt,
      },
      ipAddress,
    });

    // 5. Dispatch SMS via Multi-Provider SMS Service
    const smsMessage = `Your RakthaSethu verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsResult = await SmsService.sendSms(cleanPhone, smsMessage, otp);

    if (smsResult.unconfigured) {
      // Invalidate current OTP record
      try {
        await prisma.mobileOtp.updateMany({
          where: { phone: cleanPhone, otpHash: hashedOtp },
          data: { consumedAt: now },
        });
      } catch (err) {
        // ignore
      }
      otpStore.delete(storeKey);
      otpStore.delete(cleanPhone);

      return {
        success: false,
        unconfigured: true,
        message: 'Mobile verification is temporarily unavailable. Please try again later.',
        cooldownSeconds: 0,
        expiresInSeconds: 0,
      };
    }

    if (!smsResult.success) {
      try {
        await prisma.mobileOtp.updateMany({
          where: { phone: cleanPhone, otpHash: hashedOtp },
          data: { consumedAt: now },
        });
      } catch (err) {
        // ignore
      }
      otpStore.delete(storeKey);
      otpStore.delete(cleanPhone);

      return {
        success: false,
        message: 'Failed to deliver OTP via SMS. Please try again later.',
        cooldownSeconds: 0,
        expiresInSeconds: 0,
      };
    }

    // Record OTP_SENT Audit Log
    await recordAuditLog({
      userId: userId || null,
      action: 'OTP_SENT',
      entity: 'OtpVerification',
      details: {
        phoneMasked: maskPhoneNumber(cleanPhone),
        provider: smsResult.provider || 'default',
        simulated: smsResult.simulated || false,
      },
      ipAddress,
    });

    logger.info(`[OtpService] OTP dispatched for ${maskPhoneNumber(cleanPhone)}`);

    return {
      success: true,
      message: 'Verification OTP sent to your registered mobile number.',
      cooldownSeconds: this.RESEND_COOLDOWN_SECONDS,
      expiresInSeconds: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verifies the submitted OTP against the cryptographically stored SHA-256 hash in database.
   */
  static async verifyOtp(
    phone: string,
    otp: string,
    userId?: string,
    ipAddress?: string,
    purpose: string = 'MOBILE_VERIFICATION'
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanOtp = otp.trim();

    if (!cleanPhone || cleanOtp.length !== 6) {
      return { success: false, message: 'Invalid 6-digit OTP provided.', verified: false };
    }

    const storeKey = this.getStoreKey(cleanPhone, purpose);
    const now = new Date();

    // 1. Look up active record in MobileOtp table
    let dbRecord: any = null;
    try {
      dbRecord = await prisma.mobileOtp.findFirst({
        where: {
          phone: cleanPhone,
          purpose,
          consumedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      logger.warn('[OtpService] Database query for MobileOtp failed, falling back to memory:', err);
    }

    const memRecord = otpStore.get(storeKey) || otpStore.get(cleanPhone);

    // If neither DB record nor memory record found
    if (!dbRecord && !memRecord) {
      return {
        success: false,
        message: 'No active OTP found for this mobile number. Please request a new code.',
        verified: false,
      };
    }

    const expiresAt = dbRecord ? dbRecord.expiresAt : memRecord!.expiresAt;
    const currentAttempts = dbRecord ? dbRecord.attemptCount : memRecord!.attempts;
    const expectedHash = dbRecord ? dbRecord.otpHash : memRecord!.hashedOtp;

    // 2. Expiration Check
    if (expiresAt < now) {
      if (dbRecord) {
        await prisma.mobileOtp.update({
          where: { id: dbRecord.id },
          data: { consumedAt: now },
        }).catch(() => null);
      }
      otpStore.delete(storeKey);
      otpStore.delete(cleanPhone);

      await recordAuditLog({
        userId: userId || dbRecord?.userId || memRecord?.userId || null,
        action: 'OTP_EXPIRED',
        entity: 'OtpVerification',
        details: { phoneMasked: maskPhoneNumber(cleanPhone), purpose },
        ipAddress,
      });

      return {
        success: false,
        message: 'This OTP has expired. Please request a new verification code.',
        verified: false,
      };
    }

    // 3. Max Attempts Check
    if (currentAttempts >= this.MAX_ATTEMPTS) {
      if (dbRecord) {
        await prisma.mobileOtp.update({
          where: { id: dbRecord.id },
          data: { consumedAt: now },
        }).catch(() => null);
      }
      otpStore.delete(storeKey);
      otpStore.delete(cleanPhone);

      await recordAuditLog({
        userId: userId || dbRecord?.userId || memRecord?.userId || null,
        action: 'OTP_VERIFICATION_FAILED',
        entity: 'OtpVerification',
        details: {
          phoneMasked: maskPhoneNumber(cleanPhone),
          reason: 'MAX_ATTEMPTS_EXCEEDED',
        },
        ipAddress,
      });

      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        verified: false,
      };
    }

    // 4. Constant-Time or SHA-256 Hash Verification
    const submittedHash = this.hashOtp(cleanOtp);
    const hashesMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, 'utf8'),
      Buffer.from(expectedHash, 'utf8')
    );

    if (!hashesMatch) {
      const newAttempts = currentAttempts + 1;
      if (dbRecord) {
        await prisma.mobileOtp.update({
          where: { id: dbRecord.id },
          data: {
            attemptCount: { increment: 1 },
            ...(newAttempts >= this.MAX_ATTEMPTS ? { consumedAt: now } : {}),
          },
        }).catch(() => null);
      }
      if (memRecord) {
        memRecord.attempts = newAttempts;
        if (newAttempts >= this.MAX_ATTEMPTS) {
          otpStore.delete(storeKey);
          otpStore.delete(cleanPhone);
        }
      }

      await recordAuditLog({
        userId: userId || dbRecord?.userId || memRecord?.userId || null,
        action: 'OTP_VERIFICATION_FAILED',
        entity: 'OtpVerification',
        details: {
          phoneMasked: maskPhoneNumber(cleanPhone),
          attemptNumber: newAttempts,
        },
        ipAddress,
      });

      if (newAttempts >= this.MAX_ATTEMPTS) {
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          verified: false,
        };
      }

      const remainingAttempts = this.MAX_ATTEMPTS - newAttempts;
      return {
        success: false,
        message: `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`,
        verified: false,
      };
    }

    // 5. Verification Succeeded! Mark OTP Consumed in DB & Memory
    if (dbRecord) {
      await prisma.mobileOtp.update({
        where: { id: dbRecord.id },
        data: { consumedAt: now },
      }).catch(() => null);
    }
    otpStore.delete(storeKey);
    otpStore.delete(cleanPhone);

    // 6. Update User and DonorProfile Verification Status in Database
    const targetUserId = userId || dbRecord?.userId || memRecord?.userId;
    if (targetUserId) {
      try {
        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            phone: cleanPhone,
            isVerified: true,
            isPhoneVerified: true,
            phoneVerifiedAt: now,
          },
        });

        await prisma.donorProfile.updateMany({
          where: { userId: targetUserId },
          data: {
            isPhoneVerified: true,
            phoneVerifiedAt: now,
            isEligible: true,
          },
        });
      } catch (err) {
        logger.error('[OtpService] Failed to update user mobile verification status:', err);
      }
    }

    // 7. Record OTP_VERIFICATION_SUCCESS Audit Log
    await recordAuditLog({
      userId: targetUserId || null,
      action: 'OTP_VERIFICATION_SUCCESS',
      entity: 'OtpVerification',
      details: { phoneMasked: maskPhoneNumber(cleanPhone), purpose },
      ipAddress,
    });

    return {
      success: true,
      message: 'Mobile number verified successfully.',
      verified: true,
    };
  }

  /**
   * Invalidates any active OTP for a mobile number
   */
  static async invalidateOtp(phone: string, purpose?: string): Promise<void> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    if (purpose) {
      otpStore.delete(this.getStoreKey(cleanPhone, purpose));
    } else {
      for (const key of Array.from(otpStore.keys())) {
        if (key === cleanPhone || key.startsWith(`${cleanPhone}:`)) {
          otpStore.delete(key);
        }
      }
    }
    otpStore.delete(cleanPhone);

    try {
      await prisma.mobileOtp.deleteMany({
        where: {
          phone: cleanPhone,
          ...(purpose ? { purpose } : {}),
        },
      });
    } catch (err) {
      // Ignore if database call fails during unit tests
    }
  }

  /**
   * Synchronous check for memory or test verification
   */
  static isPhoneVerified(phone: string): boolean {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    return otpStore.get(cleanPhone)?.verified === true;
  }
}
