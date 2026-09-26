import { Request, Response, NextFunction } from 'express';
import { MatchingService } from './matchingService';
import { sendSuccess, AppError } from '../../utils/response';
import { prisma } from '../../config/database';
import { BloodGroupType } from '../../utils/compatibility';
import { ProgressiveDonorSearchService } from '../../services/progressiveDonorSearchService';

export async function findDonors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bloodGroup, latitude, longitude, city, state, urgency, maxRadiusKm, limit } = req.body;

    if (!bloodGroup) {
      throw new AppError('bloodGroup is required', 400);
    }

    const candidates = await MatchingService.findRankedDonors({
      bloodGroup: bloodGroup as BloodGroupType,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      city: city as string,
      state: state as string,
      urgency: urgency || 'NORMAL',
      maxRadiusKm: maxRadiusKm ? parseFloat(maxRadiusKm) : 100,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    // Enforce strict donor privacy: omit phone, address, coordinates, and full identity
    const sanitized = candidates.map((c) => ({
      donorId: c.donorId,
      bloodGroup: c.bloodGroup,
      bloodGroupLabel: c.bloodGroupLabel,
      city: c.city,
      state: c.state,
      approximateDistance:
        c.distanceKm !== null ? `${Math.round(c.distanceKm * 10) / 10} km away` : 'Regional area',
      distanceKm: c.distanceKm !== null ? Math.round(c.distanceKm * 10) / 10 : null,
      isAvailable: c.isAvailable,
      emergencyAvailable: c.emergencyAvailable,
      verifiedStatus: 'VERIFIED',
      isVerified: true,
      score: c.score,
      totalDonations: c.totalDonations,
    }));

    sendSuccess(res, sanitized, `Found ${sanitized.length} compatible donor candidate(s)`);
  } catch (error) {
    next(error);
  }
}

export async function getMatchesForRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.params;
    const currentUser = req.user;

    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        matches: {
          include: {
            donor: {
              include: {
                user: {
                  select: {
                    id: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { compatibilityScore: 'desc' },
        },
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    // Role-based visibility: Requester, Hospital, or Admin can see details
    const isOwner = currentUser && (currentUser.id === request.requesterId || currentUser.role === 'ADMIN');
    
    // Format matches with privacy controls
    const formattedMatches = request.matches.map((m) => {
      const isAccepted = m.status === 'ACCEPTED';
      const canViewContact = isOwner || isAccepted;

      return {
        matchId: m.id,
        donorId: m.donorId,
        fullName: m.donor.fullName,
        bloodGroup: m.donor.bloodGroup,
        city: m.donor.city,
        state: m.donor.state,
        distanceKm: m.distanceKm,
        score: m.compatibilityScore,
        status: m.status,
        contactedAt: m.contactedAt,
        respondedAt: m.respondedAt,
        responseNotes: m.responseNotes,
        // Show contact details only if owner or donor accepted
        phone: canViewContact ? m.donor.user.phone : undefined,
        maskedPhone: m.donor.user.phone
          ? `${m.donor.user.phone.slice(0, 4)}****${m.donor.user.phone.slice(-3)}`
          : 'Hidden for privacy',
        exactAddress: canViewContact ? m.donor.address : undefined,
      };
    });

    sendSuccess(res, {
      request: {
        id: request.id,
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        unitsRequired: request.unitsRequired,
        urgency: request.urgency,
        status: request.status,
        hospitalName: request.hospitalName,
      },
      matches: formattedMatches,
    });
  } catch (error) {
    next(error);
  }
}

export async function runMatchingForRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.params;
    const candidates = await MatchingService.matchRequest(requestId);
    sendSuccess(res, candidates, `Matching engine notified ${candidates.length} candidate(s)`);
  } catch (error) {
    next(error);
  }
}

/**
 * Initiates an asynchronous progressive matching search job
 * POST /api/blood-requests/:id/matching/start or POST /api/matching/search/start
 */
export async function startMatchingForRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = req.params.id || req.params.requestId || req.body.requestId;
    if (!requestId) {
      throw new AppError('requestId is required to start matching search', 400);
    }

    const { customSequence, minimumSuitableDonors } = req.body || {};
    const result = await ProgressiveDonorSearchService.startSearch(
      requestId,
      customSequence,
      minimumSuitableDonors
    );

    sendSuccess(res, result, 'Progressive donor search initialized', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Real-time SSE stream for progressive search updates
 * GET /api/matching/search/:searchId/stream
 */
export async function streamProgressiveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { searchId } = req.params;
    if (!searchId) {
      throw new AppError('searchId is required to stream events', 400);
    }

    await ProgressiveDonorSearchService.subscribeToStream(searchId, res);
  } catch (error) {
    next(error);
  }
}

/**
 * Gets snapshot state of a search job
 * GET /api/matching/search/:searchId
 */
export async function getProgressiveSearchSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { searchId } = req.params;
    if (!searchId) {
      throw new AppError('searchId is required', 400);
    }

    const snapshot = await ProgressiveDonorSearchService.getSearchSnapshot(searchId);
    if (!snapshot) {
      throw new AppError('Progressive search job not found', 404);
    }

    sendSuccess(res, snapshot, 'Search snapshot retrieved');
  } catch (error) {
    next(error);
  }
}

/**
 * Cancels an ongoing search job
 * POST /api/matching/search/:searchId/cancel
 */
export async function cancelProgressiveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { searchId } = req.params;
    if (!searchId) {
      throw new AppError('searchId is required', 400);
    }

    const cancelled = await ProgressiveDonorSearchService.cancelSearch(searchId);
    sendSuccess(res, { cancelled }, 'Search job cancelled');
  } catch (error) {
    next(error);
  }
}

/**
 * Continues or expands an existing search job
 * POST /api/matching/search/:searchId/continue
 */
export async function continueProgressiveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { searchId } = req.params;
    if (!searchId) {
      throw new AppError('searchId is required', 400);
    }

    const { additionalRadii } = req.body || {};
    const result = await ProgressiveDonorSearchService.continueSearch(searchId, additionalRadii);
    sendSuccess(res, result, 'Search expanded to additional radii');
  } catch (error) {
    next(error);
  }
}

