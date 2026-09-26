import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { recordAuditLog } from '../../utils/auditLogger';

import { CacheService } from '../../services/cacheService';
import { RequestService } from '../requests/requestService';
import { MatchingService } from '../matching/matchingService';

export async function getAdminStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await CacheService.wrap(
      'admin_stats',
      30, // 30 seconds TTL
      async () => {
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

        return {
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
        };
      },
      ['stats']
    );

    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}

export async function listAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, status, search, page = 1, limit = 25 } = req.query;

    const where: any = {};
    if (role) where.role = String(role);
    if (status === 'ACTIVE') where.isActive = true;
    if (status === 'INACTIVE' || status === 'SUSPENDED') where.isActive = false;
    if (status === 'UNVERIFIED') where.isVerified = false;
    if (status === 'VERIFIED') where.isVerified = true;

    if (search) {
      where.OR = [
        { email: { contains: String(search) } },
        { phone: { contains: String(search) } },
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
          donorProfile: { select: { fullName: true, bloodGroup: true, city: true, isAvailable: true } },
          patientProfile: { select: { fullName: true, city: true, bloodGroup: true } },
          hospitalProfile: { select: { name: true, city: true, verificationStatus: true, licenseNumber: true } },
          bloodBankProfile: { select: { name: true, city: true, verificationStatus: true, licenseNumber: true } },
          volunteerProfile: { select: { fullName: true, serviceAreaCity: true, skills: true } },
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

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        donorProfile: true,
        patientProfile: true,
        hospitalProfile: true,
        bloodBankProfile: true,
        volunteerProfile: true,
        auditLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const { passwordHash, ...safeUser } = user;
    sendSuccess(res, safeUser, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { isActive, isVerified, reason } = req.body;
    const adminId = req.user!.id;

    if (id === adminId && isActive === false) {
      throw new AppError('Cannot suspend or deactivate your own administrator account', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(isVerified !== undefined && { isVerified: Boolean(isVerified) }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    // Record audit log
    await recordAuditLog({
      userId: adminId,
      action: isActive === false ? 'SUSPEND_USER' : (isActive === true ? 'ACTIVATE_USER' : 'UPDATE_USER_STATUS'),
      entity: 'User',
      entityId: id,
      details: { isActive, isVerified, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'User status updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function verifyOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, id } = req.params; // type: 'hospital' | 'blood-bank'
    const { status, notes } = req.body; // status: 'VERIFIED' | 'REJECTED'
    const adminId = req.user!.id;

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

      await recordAuditLog({
        userId: adminId,
        action: `VERIFY_HOSPITAL_${status}`,
        entity: 'Hospital',
        entityId: id,
        details: { status, notes },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      CacheService.invalidateByTag('stats');
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

      await recordAuditLog({
        userId: adminId,
        action: `VERIFY_BLOOD_BANK_${status}`,
        entity: 'BloodBank',
        entityId: id,
        details: { status, notes },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      CacheService.invalidateByTag('stats');
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

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, entity, userId, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (action) where.action = String(action);
    if (entity) where.entity = String(entity);
    if (userId) where.userId = String(userId);

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
      }),
    ]);

    sendSuccess(res, logs, 'Audit logs retrieved', 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
}

export async function getStuckRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await RequestService.getStuckRequests();
    sendSuccess(res, alerts, 'Stuck and delayed request operational alerts');
  } catch (error) {
    next(error);
  }
}

export async function resolveRequestIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'FORCE_FULFILL' | 'RESTART_MATCHING' | 'CANCEL'
    const adminId = req.user!.id;

    const request = await prisma.bloodRequest.findUnique({ where: { id } });
    if (!request) throw new AppError('Request not found', 404);

    if (action === 'FORCE_FULFILL') {
      await prisma.bloodRequest.update({
        where: { id },
        data: {
          status: 'FULFILLED',
          additionalNotes: `${request.additionalNotes || ''}\n[Admin Resolution]: Force fulfilled by admin (${notes || 'Manual review verified'})`,
        },
      });
      await recordAuditLog({ userId: adminId, action: 'ADMIN_FORCE_FULFILL_REQUEST', entity: 'BloodRequest', entityId: id, details: notes });
    } else if (action === 'RESTART_MATCHING') {
      await prisma.bloodRequest.update({
        where: { id },
        data: {
          status: 'MATCHING',
          additionalNotes: `${request.additionalNotes || ''}\n[Admin Resolution]: Re-triggered matching`,
        },
      });
      MatchingService.matchRequest(id).catch(() => {});
      await recordAuditLog({ userId: adminId, action: 'ADMIN_RESTART_MATCHING', entity: 'BloodRequest', entityId: id, details: notes });
    } else if (action === 'CANCEL') {
      await prisma.bloodRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          additionalNotes: `${request.additionalNotes || ''}\n[Admin Resolution]: Cancelled (${notes})`,
        },
      });
      await recordAuditLog({ userId: adminId, action: 'ADMIN_CANCEL_REQUEST', entity: 'BloodRequest', entityId: id, details: notes });
    }

    CacheService.invalidateByTag('stats');
    sendSuccess(res, { resolved: true }, `Request resolution recorded: ${action}`);
  } catch (error) {
    next(error);
  }
}
