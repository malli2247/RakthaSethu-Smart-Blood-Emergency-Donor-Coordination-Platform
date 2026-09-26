import { Request, Response, NextFunction } from 'express';
import { CampService } from '../../services/campService';
import { ERaktKoshSyncService, RawCampRecord } from '../../services/eRaktKoshSyncService';
import { sendSuccess, AppError } from '../../utils/response';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Public location-aware camp discovery
 */
export async function listCamps(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      lat,
      lon,
      city,
      district,
      state,
      radius = '25',
      expand = 'true',
      status,
      limit,
    } = req.query;

    const parsedLat = lat !== undefined ? parseFloat(String(lat)) : undefined;
    const parsedLon = lon !== undefined ? parseFloat(String(lon)) : undefined;
    const parsedRadius = parseInt(String(radius), 10) || 25;
    const expandRadius = expand === 'true' || expand === '1';
    const parsedLimit = limit ? parseInt(String(limit), 10) : undefined;

    const currentUserId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';

    const result = await CampService.listCamps(
      {
        lat: parsedLat,
        lon: parsedLon,
        city: city ? String(city) : undefined,
        district: district ? String(district) : undefined,
        state: state ? String(state) : undefined,
        radiusKm: parsedRadius,
        expandRadiusIfNeeded: expandRadius,
        status: status ? String(status) : undefined,
        isAdmin,
        limit: parsedLimit,
      },
      currentUserId
    );

    sendSuccess(res, result.camps, 'Verified camps retrieved successfully', 200, {
      ...result.metadata,
      metadata: result.metadata,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single verified camp by ID
 */
export async function getCampById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const camp = await CampService.getCampById(id, req.user?.id);

    if (!camp) {
      throw new AppError('Verified blood donation camp not found', 404);
    }

    sendSuccess(res, camp);
  } catch (error) {
    next(error);
  }
}

/**
 * Hospital / Blood Bank / Admin publishes a new blood donation camp
 */
export async function createCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!['ADMIN', 'SUPER_ADMIN', 'HOSPITAL', 'BLOOD_BANK'].includes(userRole)) {
      throw new AppError('Only verified Hospitals, Blood Banks, or Admins can organize blood donation camps', 403);
    }

    const {
      campName,
      venue,
      address,
      city,
      district,
      state,
      campDate,
      startTime,
      endTime,
      organizerName,
      description,
      contactPhone,
      contactEmail,
      registrationUrl,
      bloodBankId,
      latitude,
      longitude,
    } = req.body;

    if (!campName || !venue || !address || !city || !state || !campDate || !startTime || !endTime) {
      throw new AppError('Missing mandatory camp details (Name, Venue, Address, City, State, Date, Times)', 400);
    }

    const camp = await CampService.createCamp(userId, userRole, {
      campName,
      venue,
      address,
      city,
      district,
      state,
      campDate,
      startTime,
      endTime,
      organizerName: organizerName || req.user?.email || 'Authorized Organizer',
      description,
      contactPhone,
      contactEmail,
      registrationUrl,
      bloodBankId,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
    });

    const message =
      camp.verificationStatus === 'VERIFIED'
        ? 'Blood donation camp verified and published successfully'
        : 'Blood donation camp submitted. It will become publicly visible once verified by RakthaSethu Administrators.';

    sendSuccess(res, camp, message, 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Registered donor registers for a verified camp
 */
export async function registerForCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Only registered blood donors can register for donation camps', 400);
    }

    const camp = await prisma.bloodDonationCamp.findUnique({ where: { id } });
    if (!camp) {
      throw new AppError('Camp not found', 404);
    }

    if (camp.verificationStatus !== 'VERIFIED') {
      throw new AppError('Cannot register for an unverified camp', 400);
    }

    const registration = await prisma.campRegistration.upsert({
      where: {
        campId_donorId: {
          campId: id,
          donorId: donor.id,
        },
      },
      create: {
        campId: id,
        donorId: donor.id,
        status: 'CONFIRMED',
      },
      update: {
        status: 'CONFIRMED',
      },
    });

    sendSuccess(res, registration, 'Registered for verified blood donation camp successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Registered donor cancels camp registration
 */
export async function cancelRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    await prisma.campRegistration.deleteMany({
      where: {
        campId: id,
        donorId: donor.id,
      },
    });

    sendSuccess(res, null, 'Registration cancelled successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Trigger e-RaktKosh synchronization
 */
export async function triggerSourceSync(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.id;
    const result = await ERaktKoshSyncService.syncFromSource(adminUserId);
    sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Batch import verified camp records
 */
export async function batchImportCamps(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.id;
    const { camps, source = 'OFFICIAL_IMPORT' } = req.body;

    if (!Array.isArray(camps) || camps.length === 0) {
      throw new AppError('Valid array of camp records is required', 400);
    }

    const result = await ERaktKoshSyncService.processBatchRecords(
      camps as RawCampRecord[],
      source,
      adminUserId
    );

    sendSuccess(
      res,
      result,
      `Import processed: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped.`
    );
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Get sync status & audit logs
 */
export async function getSyncStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = await ERaktKoshSyncService.getSyncStatus();
    sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Verify a pending camp
 */
export async function verifyCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.id;
    const { id } = req.params;
    const { notes } = req.body;

    const camp = await CampService.verifyCamp(id, adminUserId, notes);
    sendSuccess(res, camp, 'Camp verified and published to the public network');
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN: Reject a pending camp
 */
export async function rejectCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminUserId = req.user!.id;
    const { id } = req.params;
    const { notes } = req.body;

    const camp = await CampService.rejectCamp(id, adminUserId, notes);
    sendSuccess(res, camp, 'Camp rejected');
  } catch (error) {
    next(error);
  }
}

/**
 * ADMIN / ORGANIZER: Cancel a camp
 */
export async function cancelCamp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const camp = await CampService.cancelCamp(id, reason);
    sendSuccess(res, camp, 'Camp marked as cancelled');
  } catch (error) {
    next(error);
  }
}
