import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { CacheService } from '../../services/cacheService';
import { NotificationService } from '../../services/notificationService';
import { MatchingService } from '../matching/matchingService';

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
    const userRole = req.user!.role;

    let hospital: any = null;
    if (userRole === 'HOSPITAL') {
      hospital = await prisma.hospital.findUnique({ where: { userId } });
    }

    // Find requests: created by hospital or targeted at hospital name/city
    const where: any = hospital
      ? {
          OR: [
            { requesterId: userId },
            { hospitalName: { contains: hospital.name } },
            { hospitalCity: hospital.city },
          ],
        }
      : {};

    const requests = await prisma.bloodRequest.findMany({
      where,
      include: {
        matches: {
          include: {
            donor: {
              include: {
                user: { select: { id: true, phone: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        donations: {
          include: {
            donor: { select: { fullName: true, bloodGroup: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        receipts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
}

/**
 * Step 9: Hospital verifies donor arrival, identity, blood group & donation eligibility
 */
export async function verifyDonorArrival(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { requestId, donorId, staffNotes } = req.body;

    const hospital = await prisma.hospital.findUnique({ where: { userId } });
    const hospitalName = hospital?.name || 'Hospital Staff';

    const match = await prisma.donorMatch.findFirst({
      where: { requestId, donorId },
      include: { request: true, donor: true },
    });

    if (!match) {
      throw new AppError('Matched donor record not found for this request', 404);
    }

    // Update match to ARRIVED
    await prisma.donorMatch.update({
      where: { id: match.id },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date(),
        responseNotes: staffNotes || `Arrival verified by ${hospitalName}`,
      },
    });

    // Update request to DONOR_ARRIVED
    await prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: 'DONOR_ARRIVED' },
    });

    // Notify donor & requester
    await NotificationService.notify({
      userId: match.donor.userId,
      title: 'Arrival Verified by Hospital',
      message: `Hospital staff at ${match.request.hospitalName} verified your arrival. Please proceed to the blood donation area.`,
      type: 'DONOR_ARRIVED',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: '/donor/requests',
      actionUrl: '/donor/requests',
    });

    await NotificationService.notify({
      userId: match.request.requesterId,
      title: 'Donor Arrival Verified',
      message: `Hospital staff confirmed matched donor has arrived and verified eligibility for ${match.request.patientName}.`,
      type: 'DONOR_ARRIVED',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: `/patient/requests/${requestId}`,
      actionUrl: `/patient/requests/${requestId}`,
    });

    sendSuccess(res, { verified: true }, 'Donor arrival verified successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Step 10: Hospital starts the medical blood donation process
 */
export async function startDonation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { requestId, donorId, units = 1 } = req.body;

    const hospital = await prisma.hospital.findUnique({ where: { userId } });
    const request = await prisma.bloodRequest.findUnique({ where: { id: requestId } });
    const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });

    if (!request || !donor) {
      throw new AppError('Request or Donor not found', 404);
    }

    const certPlaceholder = `PENDING-${Date.now().toString(36).toUpperCase()}-${donorId.substring(0, 4)}`;

    // Create donation record in STARTED state
    const donation = await prisma.donation.create({
      data: {
        donorId: donor.id,
        requestId: request.id,
        hospitalId: hospital?.id,
        bloodGroup: request.bloodGroup,
        units: Number(units),
        certificateCode: certPlaceholder,
        status: 'STARTED',
        startedAt: new Date(),
        verifiedBy: hospital?.name || 'Hospital Medical Staff',
        notes: `Donation procedure started at ${hospital?.name || request.hospitalName}`,
      },
    });

    // Update match and request status
    await prisma.donorMatch.updateMany({
      where: { requestId: request.id, donorId: donor.id },
      data: { status: 'DONATION_STARTED' },
    });

    await prisma.bloodRequest.update({
      where: { id: request.id },
      data: { status: 'DONATION_STARTED' },
    });

    // Notify donor & requester
    await NotificationService.notify({
      userId: request.requesterId,
      title: 'Donation Procedure Started',
      message: `Donation process has officially started for your blood request (${request.patientName}).`,
      type: 'DONATION_STARTED',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: `/patient/requests/${request.id}`,
      actionUrl: `/patient/requests/${request.id}`,
    });

    await NotificationService.notify({
      userId: donor.userId,
      title: 'Blood Donation Commenced',
      message: `Your life-saving donation process has begun at ${hospital?.name || request.hospitalName}. Thank you!`,
      type: 'DONATION_STARTED',
      priority: 'HIGH',
      category: 'DONATION',
      link: '/donor/requests',
      actionUrl: '/donor/requests',
    });

    sendSuccess(res, donation, 'Donation procedure started successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Step 11: Blood collection completed, awaiting verification
 */
export async function completeDonation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId, donorId, donationId, notes } = req.body;

    const donation = await prisma.donation.findFirst({
      where: donationId ? { id: donationId } : { requestId, donorId, status: 'STARTED' },
      include: { request: true, donor: true, hospital: true },
    });

    if (!donation) {
      throw new AppError('Active donation record in progress not found', 404);
    }

    const updatedDonation = await prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        notes: notes || donation.notes,
      },
    });

    await prisma.donorMatch.updateMany({
      where: { requestId: donation.requestId!, donorId: donation.donorId },
      data: { status: 'DONATION_COMPLETED' },
    });

    await prisma.bloodRequest.update({
      where: { id: donation.requestId! },
      data: { status: 'DONATION_COMPLETED' },
    });

    if (donation.request) {
      await NotificationService.notify({
        userId: donation.request.requesterId,
        title: 'Donation Completed — Verification Pending',
        message: `Blood donation has been completed and is now being verified by hospital medical staff.`,
        type: 'DONATION_COMPLETED',
        priority: 'HIGH',
        category: 'EMERGENCY',
        link: `/patient/requests/${donation.requestId}`,
        actionUrl: `/patient/requests/${donation.requestId}`,
      });
    }

    sendSuccess(res, updatedDonation, 'Donation completed and submitted for verification');
  } catch (error) {
    next(error);
  }
}

/**
 * Step 12: Hospital officially confirms and verifies donation
 */
export async function confirmHospitalDonation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { requestId, donorId, units = 1, notes, donationId } = req.body;

    const hospital = await prisma.hospital.findUnique({ where: { userId } });
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        donations: { where: { status: 'CONFIRMED' } },
        receipts: true,
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const certCode = `RKS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Find existing started/completed donation or create new
      let donation: any = null;
      if (donationId) {
        donation = await tx.donation.update({
          where: { id: donationId },
          data: {
            status: 'CONFIRMED',
            units: Number(units),
            certificateCode: certCode,
            verifiedAt: new Date(),
            verifiedBy: hospital?.name || 'Hospital Medical Staff',
            notes: notes || `Donation verified and certified at ${hospital?.name || request.hospitalName}`,
          },
        });
      } else {
        const existing = await tx.donation.findFirst({
          where: { requestId: request.id, donorId: donor.id, status: { in: ['STARTED', 'COMPLETED'] } },
        });

        if (existing) {
          donation = await tx.donation.update({
            where: { id: existing.id },
            data: {
              status: 'CONFIRMED',
              units: Number(units),
              certificateCode: certCode,
              verifiedAt: new Date(),
              verifiedBy: hospital?.name || 'Hospital Medical Staff',
              notes: notes || `Donation verified and certified at ${hospital?.name || request.hospitalName}`,
            },
          });
        } else {
          donation = await tx.donation.create({
            data: {
              donorId: donor.id,
              requestId: request.id,
              hospitalId: hospital?.id,
              bloodGroup: request.bloodGroup,
              units: Number(units),
              certificateCode: certCode,
              status: 'CONFIRMED',
              verifiedAt: new Date(),
              verifiedBy: hospital?.name || 'Hospital Medical Staff',
              notes: notes || `Donation verified at ${hospital?.name || request.hospitalName}`,
            },
          });
        }
      }

      // Update donor profile stats & lastDonationDate
      await tx.donorProfile.update({
        where: { id: donor.id },
        data: {
          lastDonationDate: new Date(),
          totalDonations: { increment: 1 },
          livesSavedEstimate: { increment: 3 },
        },
      });

      // Update match status to CONFIRMED
      await tx.donorMatch.updateMany({
        where: { requestId: request.id, donorId: donor.id },
        data: { status: 'CONFIRMED' },
      });

      // Calculate total confirmed units for this request
      const otherConfirmedUnits = request.donations
        .filter((d) => d.id !== donation.id)
        .reduce((sum, d) => sum + d.units, 0);
      const totalConfirmedUnits = otherConfirmedUnits + Number(units);

      let nextRequestStatus: string;
      const receiverAlreadyConfirmed = request.receipts.some((r) => r.confirmed);

      if (totalConfirmedUnits < request.unitsRequired) {
        // Section 20: Partial fulfillment
        nextRequestStatus = 'PARTIALLY_FULFILLED';
      } else if (receiverAlreadyConfirmed) {
        // Section 14 & 19: Both hospital confirmed AND receiver confirmed
        nextRequestStatus = 'FULFILLED';
      } else {
        // Section 16: Hospital confirmed, awaiting receiver confirmation
        nextRequestStatus = 'DONATION_CONFIRMED';
      }

      await tx.bloodRequest.update({
        where: { id: request.id },
        data: {
          status: nextRequestStatus,
          unitsFulfilled: totalConfirmedUnits,
        },
      });

      // Notify donor
      await tx.notification.create({
        data: {
          userId: donor.userId,
          title: '🎉 Life-Saving Blood Donation Confirmed!',
          message: `Your donation for ${request.patientName} at ${hospital?.name || request.hospitalName} has been officially confirmed. Certificate: ${certCode}.`,
          type: 'DONATION_CONFIRMED',
          priority: 'NORMAL',
          category: 'DONATION',
          link: '/donor/history',
          actionUrl: '/donor/history',
        },
      });

      return { donation, nextRequestStatus, totalConfirmedUnits };
    });

    CacheService.invalidateByTag('stats');

    // Notify requester
    if (result.nextRequestStatus === 'PARTIALLY_FULFILLED') {
      await NotificationService.notify({
        userId: request.requesterId,
        title: `Partial Donation Verified (${result.totalConfirmedUnits}/${request.unitsRequired} Units)`,
        message: `Hospital verified ${units} unit(s). The platform is actively matching remaining donors.`,
        type: 'PARTIALLY_FULFILLED',
        priority: 'HIGH',
        category: 'EMERGENCY',
        link: `/patient/requests/${request.id}`,
        actionUrl: `/patient/requests/${request.id}`,
      });
      // Continue matching for remaining units
      MatchingService.matchRequest(request.id).catch(() => {});
    } else if (result.nextRequestStatus === 'DONATION_CONFIRMED') {
      await NotificationService.notify({
        userId: request.requesterId,
        title: `Hospital Confirmed Blood Donation!`,
        message: `Hospital verified blood collection for ${request.patientName}. Please confirm receipt once the blood units are received.`,
        type: 'DONATION_CONFIRMED',
        priority: 'HIGH',
        category: 'EMERGENCY',
        link: `/patient/requests/${request.id}`,
        actionUrl: `/patient/requests/${request.id}`,
      });
    } else if (result.nextRequestStatus === 'FULFILLED') {
      await NotificationService.notify({
        userId: request.requesterId,
        title: `Emergency Request Successfully Fulfilled!`,
        message: `All required units have been confirmed and received. Thank you!`,
        type: 'REQUEST_FULFILLED',
        priority: 'NORMAL',
        category: 'EMERGENCY',
        link: `/patient/requests/${request.id}`,
        actionUrl: `/patient/requests/${request.id}`,
      });
    }

    sendSuccess(res, result.donation, 'Donation confirmed and certificate generated successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Hospital reports an issue (donor deferred, no-show, blood cross-match failure)
 */
export async function reportHospitalIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId, donorId, issueReason } = req.body;

    const request = await prisma.bloodRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError('Blood request not found', 404);

    if (donorId) {
      await prisma.donorMatch.updateMany({
        where: { requestId, donorId },
        data: {
          status: 'DECLINED',
          responseNotes: `Hospital issue reported: ${issueReason}`,
        },
      });
    }

    // Revert to MATCHING to find another donor
    await prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: 'MATCHING' },
    });

    MatchingService.matchRequest(requestId).catch(() => {});

    await NotificationService.notify({
      userId: request.requesterId,
      title: 'Donor Replacement Search Underway',
      message: `Hospital reported: ${issueReason || 'Donor was unable to proceed'}. Matching engine is locating replacement donors.`,
      type: 'REQUEST_STATUS_CHANGED',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: `/patient/requests/${requestId}`,
      actionUrl: `/patient/requests/${requestId}`,
    });

    sendSuccess(res, { reported: true }, 'Hospital issue recorded and rematching initiated');
  } catch (error) {
    next(error);
  }
}
