import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { CacheService } from '../../services/cacheService';

export async function getHospitalProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const hospital = await prisma.hospital.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, phone: true, isVerified: true } },
      },
    });

    if (!hospital) {
      throw new AppError('Hospital profile not found', 404);
    }

    sendSuccess(res, hospital);
  } catch (error) {
    next(error);
  }
}

export async function updateHospitalProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, address, city, state, contactPerson, contactPhone, latitude, longitude } = req.body;

    const hospital = await prisma.hospital.findUnique({ where: { userId } });
    if (!hospital) {
      throw new AppError('Hospital profile not found', 404);
    }

    const updated = await prisma.hospital.update({
      where: { userId },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(contactPerson && { contactPerson }),
        ...(contactPhone && { contactPhone }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
      },
    });

    sendSuccess(res, updated, 'Hospital profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function getHospitalRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const requests = await prisma.bloodRequest.findMany({
      where: { requesterId: userId },
      include: {
        matches: {
          include: {
            donor: true,
          },
        },
        donations: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
}

export async function confirmHospitalDonation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { requestId, donorId, units = 1, notes } = req.body;

    const hospital = await prisma.hospital.findUnique({ where: { userId } });
    if (!hospital) {
      throw new AppError('Hospital profile not found', 404);
    }

    const request = await prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const certCode = `RKS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create donation record
      const donation = await tx.donation.create({
        data: {
          donorId: donor.id,
          requestId: request.id,
          hospitalId: hospital.id,
          bloodGroup: request.bloodGroup,
          units: Number(units),
          certificateCode: certCode,
          notes: notes || `Donation verified at ${hospital.name}`,
        },
      });

      // Update donor profile stats & lastDonationDate
      await tx.donorProfile.update({
        where: { id: donor.id },
        data: {
          lastDonationDate: new Date(),
          totalDonations: { increment: 1 },
          livesSavedEstimate: { increment: 3 },
        },
      });

      // Update request status to FULFILLED
      await tx.bloodRequest.update({
        where: { id: request.id },
        data: { status: 'FULFILLED' },
      });

      // Update match status to ACCEPTED if present
      await tx.donorMatch.updateMany({
        where: { requestId: request.id, donorId: donor.id },
        data: { status: 'ACCEPTED' },
      });

      // Notify donor of successful verified donation
      await tx.notification.create({
        data: {
          userId: donor.userId,
          title: '🎉 Thank You for Your Life-Saving Blood Donation!',
          message: `Your donation at ${hospital.name} for ${request.patientName} has been officially confirmed. Certificate: ${certCode}.`,
          type: 'REQUEST_FULFILLED',
          link: '/donor/history',
        },
      });

      return donation;
    });

    CacheService.invalidateByTag('stats');
    sendSuccess(res, result, 'Donation confirmed and certificate generated successfully', 201);
  } catch (error) {
    next(error);
  }
}
