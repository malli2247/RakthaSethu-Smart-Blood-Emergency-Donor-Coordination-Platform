import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { calculateDistanceKm } from '../../utils/distance';
import { CacheService } from '../../services/cacheService';
import { DonorConsentService } from '../../services/donorConsentService';

export async function getDonorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const donor = await prisma.donorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            isActive: true,
            isVerified: true,
            isPhoneVerified: true,
            phoneVerifiedAt: true,
          },
        },
      },
    });

    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    // Calculate next eligible donation date (90 days after last donation)
    let nextEligibleDate: Date | null = null;
    let daysUntilEligible = 0;
    if (donor.lastDonationDate) {
      nextEligibleDate = new Date(donor.lastDonationDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
      const diffTime = nextEligibleDate.getTime() - Date.now();
      daysUntilEligible = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    sendSuccess(res, {
      ...donor,
      isPhoneVerified: Boolean(donor.isPhoneVerified || donor.user.isPhoneVerified),
      phoneVerifiedAt: donor.phoneVerifiedAt || donor.user.phoneVerifiedAt,
      nextEligibleDate,
      daysUntilEligible,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDonorProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const {
      fullName,
      bloodGroup,
      gender,
      city,
      state,
      address,
      latitude,
      longitude,
      isAvailable,
      emergencyAvailable,
      hidePhoneNumber,
      hideExactAddress,
      lastDonationDate,
      phone,
    } = req.body;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    if (phone) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.phone !== phone) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            phone,
            isVerified: false,
            isPhoneVerified: false,
            phoneVerifiedAt: null,
          },
        });
        await prisma.donorProfile.update({
          where: { userId },
          data: {
            isPhoneVerified: false,
            phoneVerifiedAt: null,
          },
        });
        const { OtpService, maskPhoneNumber } = await import('../../services/otpService');
        await OtpService.invalidateOtp(phone);
        if (user.phone) await OtpService.invalidateOtp(user.phone);

        const { recordAuditLog } = await import('../../utils/auditLogger');
        await recordAuditLog({
          userId,
          action: 'MOBILE_CHANGED',
          entity: 'DonorProfile',
          details: {
            oldPhoneMasked: maskPhoneNumber(user.phone),
            newPhoneMasked: maskPhoneNumber(phone),
          },
          ipAddress: req.ip,
        });
      }
    }

    const updated = await prisma.donorProfile.update({
      where: { userId },
      data: {
        ...(fullName && { fullName }),
        ...(bloodGroup && { bloodGroup }),
        ...(gender && { gender }),
        ...(city && { city }),
        ...(state && { state }),
        ...(address && { address }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(emergencyAvailable !== undefined && { emergencyAvailable: Boolean(emergencyAvailable) }),
        ...(hidePhoneNumber !== undefined && { hidePhoneNumber: Boolean(hidePhoneNumber) }),
        ...(hideExactAddress !== undefined && { hideExactAddress: Boolean(hideExactAddress) }),
        ...(req.body.rareBloodMatchingConsent !== undefined && {
          rareBloodMatchingConsent: Boolean(req.body.rareBloodMatchingConsent),
          ...(req.body.rareBloodMatchingConsent && { consentWithdrawnAt: null }),
        }),
        ...(req.body.rareEmergencyAlertsEnabled !== undefined && {
          rareEmergencyAlertsEnabled: Boolean(req.body.rareEmergencyAlertsEnabled),
        }),
        ...(req.body.criticalAlertsEnabled !== undefined && {
          criticalAlertsEnabled: Boolean(req.body.criticalAlertsEnabled),
        }),
        ...(req.body.urgentAlertsEnabled !== undefined && {
          urgentAlertsEnabled: Boolean(req.body.urgentAlertsEnabled),
        }),
        ...(req.body.generalAlertsEnabled !== undefined && {
          generalAlertsEnabled: Boolean(req.body.generalAlertsEnabled),
        }),
        ...(req.body.locationPrivacyLevel && {
          locationPrivacyLevel: req.body.locationPrivacyLevel,
        }),
        ...(req.body.contactPrivacyLevel && {
          contactPrivacyLevel: req.body.contactPrivacyLevel,
        }),
        ...(req.body.notificationFrequencyLimit !== undefined && {
          notificationFrequencyLimit: Math.max(1, Math.min(20, Number(req.body.notificationFrequencyLimit))),
        }),
        consentTimestamp: new Date(),
        ...(lastDonationDate !== undefined && {
          lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : null,
        }),
      },
    });

    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'Donor profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function getDonorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const donor = await prisma.donorProfile.findUnique({
      where: { userId },
      include: {
        matches: true,
        donations: true,
      },
    });

    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const requestsReceived = donor.matches.length;
    const requestsAccepted = donor.matches.filter((m) => m.status === 'ACCEPTED').length;
    const donationsCompleted =
      donor.donations.filter((d) => d.status === 'CONFIRMED' || d.status === 'COMPLETED').length ||
      donor.donations.length ||
      donor.totalDonations;
    const unitsDonated =
      donor.donations.reduce((sum, d) => sum + (d.units || 1), 0) || donor.totalDonations;
    const requestsFulfilled = donor.donations.filter((d) => Boolean(d.requestId)).length;

    sendSuccess(res, {
      isAvailable: donor.isAvailable,
      emergencyAvailable: donor.emergencyAvailable,
      isEligible: donor.isEligible,
      lastDonationDate: donor.lastDonationDate,
      requestsReceived,
      requestsAccepted,
      donationsCompleted,
      unitsDonated,
      requestsFulfilled,
      livesPotentiallyHelped: donationsCompleted,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDonorMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const now = new Date();
    const matches = await prisma.donorMatch.findMany({
      where: {
        donorId: donor.id,
        request: {
          status: { notIn: ['CANCELLED', 'FULFILLED', 'BLOOD_RECEIVED', 'EXPIRED'] },
          requiredBy: { gte: now },
        },
      },
      include: {
        request: {
          select: {
            id: true,
            patientName: true,
            bloodGroup: true,
            unitsRequired: true,
            hospitalName: true,
            hospitalCity: true,
            hospitalState: true,
            hospitalAddress: true,
            latitude: true,
            longitude: true,
            urgency: true,
            requiredBy: true,
            medicalReason: true,
            contactName: true,
            contactPhone: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, matches);
  } catch (error) {
    next(error);
  }
}

export async function getDonationHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const donations = await prisma.donation.findMany({
      where: { donorId: donor.id },
      include: {
        hospital: { select: { name: true, city: true } },
        bloodBank: { select: { name: true, city: true } },
      },
      orderBy: { donationDate: 'desc' },
    });

    sendSuccess(res, donations);
  } catch (error) {
    next(error);
  }
}

export async function recordPastDonation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { donationDate, units = 1, notes, hospitalName } = req.body;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const certCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const dateObj = new Date(donationDate || Date.now());

    const donation = await prisma.$transaction(async (tx) => {
      const rec = await tx.donation.create({
        data: {
          donorId: donor.id,
          bloodGroup: donor.bloodGroup,
          units: Number(units),
          donationDate: dateObj,
          certificateCode: certCode,
          notes: notes || (hospitalName ? `Donated at ${hospitalName}` : 'Recorded donation'),
        },
      });

      // Update donor total donations and last donation date
      await tx.donorProfile.update({
        where: { id: donor.id },
        data: {
          totalDonations: { increment: 1 },
          livesSavedEstimate: { increment: 3 },
          lastDonationDate: dateObj,
        },
      });

      return rec;
    });

    CacheService.invalidateByTag('stats');
    sendSuccess(res, donation, 'Donation recorded successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Updates donor privacy preferences and consent settings.
 * PATCH /api/donors/consent
 */
export async function updateDonorConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const updated = await DonorConsentService.updateConsent(userId, req.body, ip);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'Donor privacy consent preferences updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Withdraws donor consent for matching and emergency notifications.
 * Section 22: Immediately removes donor from future matching queues.
 * POST /api/donors/consent/withdraw
 */
export async function withdrawDonorConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { reason } = req.body || {};
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const updated = await DonorConsentService.withdrawConsent(userId, reason, ip);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'Donor matching consent has been withdrawn. You have been removed from future emergency matching.');
  } catch (error) {
    next(error);
  }
}
