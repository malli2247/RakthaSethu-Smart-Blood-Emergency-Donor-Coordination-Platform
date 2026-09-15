import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { calculateDistanceKm } from '../../utils/distance';
import { CacheService } from '../../services/cacheService';

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
    } = req.body;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
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
    const donationsCompleted = donor.donations.length || donor.totalDonations;
    const livesPotentiallyHelped = donationsCompleted * 3; // 1 whole blood donation can save up to 3 lives

    sendSuccess(res, {
      isAvailable: donor.isAvailable,
      emergencyAvailable: donor.emergencyAvailable,
      isEligible: donor.isEligible,
      lastDonationDate: donor.lastDonationDate,
      requestsReceived,
      requestsAccepted,
      donationsCompleted,
      livesPotentiallyHelped,
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

    const matches = await prisma.donorMatch.findMany({
      where: { donorId: donor.id },
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
