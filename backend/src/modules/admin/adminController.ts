import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';

export async function getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalUsers,
      totalDonors,
      activeDonors,
      totalRequests,
      criticalRequests,
      fulfilledRequests,
      pendingRequests,
      totalHospitals,
      pendingHospitals,
      totalBloodBanks,
      pendingBloodBanks,
      totalDonations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.donorProfile.count(),
      prisma.donorProfile.count({ where: { isAvailable: true, isEligible: true } }),
      prisma.bloodRequest.count(),
      prisma.bloodRequest.count({ where: { urgency: 'CRITICAL' } }),
      prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
      prisma.bloodRequest.count({ where: { status: { in: ['PENDING', 'MATCHING', 'DONOR_CONTACTED'] } } }),
      prisma.hospital.count(),
      prisma.hospital.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.bloodBank.count(),
      prisma.bloodBank.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.donation.count(),
    ]);

    const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;

    sendSuccess(res, {
      totalUsers,
      totalDonors,
      activeDonors,
      totalRequests,
      criticalRequests,
      fulfilledRequests,
      pendingRequests,
      totalHospitals,
      pendingHospitals,
      totalBloodBanks,
      pendingBloodBanks,
      totalDonations,
      fulfillmentRate,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, search, page = 1, limit = 25 } = req.query;

    const where: any = {};
    if (role) where.role = String(role);
    if (search) {
      where.OR = [
        { email: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          lastLogin: true,
          createdAt: true,
          donorProfile: { select: { fullName: true, bloodGroup: true, city: true } },
          hospitalProfile: { select: { name: true, city: true, verificationStatus: true } },
          bloodBankProfile: { select: { name: true, city: true, verificationStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    sendSuccess(res, users, 'Users retrieved', 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
      },
    });

    sendSuccess(res, updated, 'User status updated');
  } catch (error) {
    next(error);
  }
}

export async function verifyOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, id } = req.params; // type: 'hospital' | 'blood-bank'
    const { status, notes } = req.body; // status: 'VERIFIED' | 'REJECTED'

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      throw new AppError('Status must be VERIFIED or REJECTED', 400);
    }

    const verifiedAt = status === 'VERIFIED' ? new Date() : null;

    if (type === 'hospital') {
      const updated = await prisma.hospital.update({
        where: { id },
        data: {
          verificationStatus: status,
          verificationNotes: notes,
          verifiedAt,
          user: {
            update: { isVerified: status === 'VERIFIED' },
          },
        },
      });

      sendSuccess(res, updated, `Hospital verification updated to ${status}`);
    } else if (type === 'blood-bank') {
      const updated = await prisma.bloodBank.update({
        where: { id },
        data: {
          verificationStatus: status,
          verificationNotes: notes,
          verifiedAt,
          user: {
            update: { isVerified: status === 'VERIFIED' },
          },
        },
      });

      sendSuccess(res, updated, `Blood bank verification updated to ${status}`);
    } else {
      throw new AppError('Invalid organization type', 400);
    }
  } catch (error) {
    next(error);
  }
}

export async function getVerificationRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [pendingHospitals, pendingBloodBanks] = await Promise.all([
      prisma.hospital.findMany({
        where: { verificationStatus: 'PENDING' },
        include: { user: { select: { email: true, phone: true } } },
      }),
      prisma.bloodBank.findMany({
        where: { verificationStatus: 'PENDING' },
        include: { user: { select: { email: true, phone: true } } },
      }),
    ]);

    sendSuccess(res, {
      hospitals: pendingHospitals,
      bloodBanks: pendingBloodBanks,
    });
  } catch (error) {
    next(error);
  }
}
