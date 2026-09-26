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
}

// In-memory store for OTP records with thread-safe operations
const otpStore = new Map<string, OtpRecord>();

// Clean expired records every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [phone, record] of otpStore.entries()) {
    if (record.expiresAt < now && !record.verified) {
      otpStore.delete(phone);
    }
  }
}, 10 * 60 * 1000);

export class OtpService {
  private static readonly OTP_EXPIRY_MINUTES = 5;
  private static readonly RESEND_COOLDOWN_SECONDS = 30;
  private static readonly MAX_ATTEMPTS = 5;

  private static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  /**
   * Generates and dispatches a cryptographically secure 6-digit OTP
   */
  static async sendOtp(
    phone: string,
    userId?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number; expiresInSeconds: number }> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      throw new Error('Please provide a valid 10-digit mobile number');
    }

    const existing = otpStore.get(cleanPhone);
    const now = new Date();

    // Check resend cooldown
    if (existing) {
      const elapsedSeconds = Math.floor((now.getTime() - existing.lastSentAt.getTime()) / 1000);
      if (elapsedSeconds < this.RESEND_COOLDOWN_SECONDS) {
        const remainingCooldown = this.RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        return {
          success: false,
          message: `Please wait ${remainingCooldown} seconds before requesting a new OTP.`,
          cooldownSeconds: remainingCooldown,
          expiresInSeconds: Math.max(0, Math.floor((existing.expiresAt.getTime() - now.getTime()) / 1000)),
        };
      }
    }

    // Determine OTP code:
    // In production, strictly generate cryptographically random 6-digit code.
    // In development ONLY if ALLOW_TEST_OTP=true, allow a deterministic test OTP.
    let otp: string;
    const isProd = process.env.NODE_ENV === 'production';
    const allowTestOtp = process.env.ALLOW_TEST_OTP === 'true';

    if (!isProd && allowTestOtp) {
      otp = '789123'; // Explicit test OTP for local dev only
    } else {
      otp = crypto.randomInt(100000, 999999).toString();
    }

    const hashedOtp = this.hashOtp(otp);
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save record
    otpStore.set(cleanPhone, {
      phone: cleanPhone,
      hashedOtp,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      verified: false,
      userId,
    });

    // Also persist in VerificationToken table if user exists
    if (userId) {
      try {
        await prisma.verificationToken.create({
          data: {
            userId,
            token: hashedOtp,
            type: 'PHONE_OTP',
            expiresAt,
          },
        });
      } catch (err) {
        logger.warn('[OtpService] Failed to persist VerificationToken row:', err);
      }
    }

    // Dispatch SMS via resilient SmsService
    const smsMessage = `Your RakthaSethu mobile verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    await SmsService.sendSms(cleanPhone, smsMessage);

    // Record audit log (do not log plaintext OTP)
    await recordAuditLog({
      userId: userId || null,
      action: 'OTP_REQUESTED',
      entity: 'OtpVerification',
      details: { phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}`, expiresAt },
      ipAddress,
    });

    logger.info(`[OtpService] OTP dispatched for ${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}`);

    return {
      success: true,
      message: 'Verification OTP sent to your registered mobile number.',
      cooldownSeconds: this.RESEND_COOLDOWN_SECONDS,
      expiresInSeconds: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verifies the submitted OTP against the stored hash
   */
  static async verifyOtp(
    phone: string,
    otp: string,
    userId?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string; verified: boolean }> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanOtp = otp.trim();

    if (!cleanPhone || cleanOtp.length !== 6) {
      return { success: false, message: 'Invalid 6-digit OTP provided.', verified: false };
    }

    const record = otpStore.get(cleanPhone);
    const now = new Date();

    if (!record) {
      return {
        success: false,
        message: 'No active OTP found for this mobile number. Please request a new code.',
        verified: false,
      };
    }

    if (record.expiresAt < now) {
      otpStore.delete(cleanPhone);
      await recordAuditLog({
        userId: userId || record.userId || null,
        action: 'OTP_EXPIRED',
        entity: 'OtpVerification',
        details: { phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}` },
        ipAddress,
      });
      return {
        success: false,
        message: 'This OTP has expired. Please request a new verification code.',
        verified: false,
      };
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      otpStore.delete(cleanPhone);
      await recordAuditLog({
        userId: userId || record.userId || null,
        action: 'OTP_MAX_ATTEMPTS_EXCEEDED',
        entity: 'OtpVerification',
        details: { phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}` },
        ipAddress,
      });
      return {
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
        verified: false,
      };
    }

    const submittedHash = this.hashOtp(cleanOtp);
    if (submittedHash !== record.hashedOtp) {
      record.attempts += 1;
      if (record.attempts >= this.MAX_ATTEMPTS) {
        otpStore.delete(cleanPhone);
        await recordAuditLog({
          userId: userId || record.userId || null,
          action: 'OTP_MAX_ATTEMPTS_EXCEEDED',
          entity: 'OtpVerification',
          details: { phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}` },
          ipAddress,
        });
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          verified: false,
        };
      }

      await recordAuditLog({
        userId: userId || record.userId || null,
        action: 'OTP_FAILED_ATTEMPT',
        entity: 'OtpVerification',
        details: { attempts: record.attempts, phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}` },
        ipAddress,
      });
      const remainingAttempts = this.MAX_ATTEMPTS - record.attempts;
      return {
        success: false,
        message: `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`,
        verified: false,
      };
    }

    // Success! Mark verified
    record.verified = true;
    otpStore.delete(cleanPhone);

    // If userId provided or known, update User and DonorProfile in database
    const targetUserId = userId || record.userId;
    if (targetUserId) {
      try {
        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            phone: cleanPhone,
            isVerified: true,
          },
        });

        // Also ensure donor profile is marked active / eligible
        await prisma.donorProfile.updateMany({
          where: { userId: targetUserId },
          data: {
            isEligible: true,
          },
        });
      } catch (err) {
        logger.error('[OtpService] Failed to update user verification status in database:', err);
      }
    }

    await recordAuditLog({
      userId: targetUserId || null,
      action: 'OTP_VERIFIED',
      entity: 'OtpVerification',
      details: { phoneMasked: `${cleanPhone.slice(0, 3)}****${cleanPhone.slice(-2)}` },
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
  static invalidateOtp(phone: string): void {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    otpStore.delete(cleanPhone);
  }

  /**
   * Checks if a phone has been verified recently
   */
  static isPhoneVerified(phone: string): boolean {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    return otpStore.get(cleanPhone)?.verified === true;
  }
}
