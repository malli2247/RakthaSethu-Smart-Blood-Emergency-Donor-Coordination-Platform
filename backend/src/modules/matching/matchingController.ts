import { Request, Response, NextFunction } from 'express';
import { MatchingService } from './matchingService';
import { sendSuccess, AppError } from '../../utils/response';
import { prisma } from '../../config/database';
import { BloodGroupType } from '../../utils/compatibility';
import { ProgressiveDonorSearchService } from '../../services/progressiveDonorSearchService';
import { isRareBloodGroup, getBloodGroupRarity, getCoarseDistanceBand } from '../../utils/rareBloodClassification';
import { toRareDonorMatchDTO, getPrivacySafeCount, MIN_PUBLIC_AGGREGATE_THRESHOLD, PrivacyTier } from '../../utils/privacyTiers';
import { AntiTriangulationService } from '../../services/antiTriangulationService';

export async function findDonors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bloodGroup, latitude, longitude, city, state, urgency, maxRadiusKm, limit } = req.body;

    if (!bloodGroup) {
      throw new AppError('bloodGroup is required', 400);
    }

    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userId = req.user?.id;

    // 1. Anti-Triangulation & Anti-Enumeration Evaluation
    const antiTri = await AntiTriangulationService.evaluateQuery({
      ip,
      userId,
      bloodGroup,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      city: city as string,
      radiusKm: maxRadiusKm ? parseFloat(maxRadiusKm) : undefined,
    });

    if (!antiTri.allowed) {
      throw new AppError(antiTri.reason || 'Search frequency limit exceeded to protect donor privacy.', 429);
    }

    const isRare = isRareBloodGroup(bloodGroup);

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

    // RARE BLOOD GROUP PRIVACY ENFORCEMENT (Sections 2, 6, 8, 11)
    // Never expose individual donor items, raw donor IDs, or exact distances for rare blood groups.
    if (isRare) {
      const rarityMeta = getBloodGroupRarity(bloodGroup);
      const safeCountInfo = getPrivacySafeCount(candidates.length, MIN_PUBLIC_AGGREGATE_THRESHOLD);

      sendSuccess(
        res,
        {
          status: candidates.length > 0 ? 'POTENTIAL_DONOR_IDENTIFIED' : 'MATCHING_IN_PROGRESS',
          isRareBloodGroup: true,
          rarityLevel: rarityMeta.rarityLevel,
          rarityDescription: rarityMeta.description,
          summary: {
            bloodGroup,
            serviceArea: city ? `${city} & regional emergency perimeter` : 'State-wide emergency network',
            networkAvailability: safeCountInfo.displayValue,
            privacyLevel: 'MAXIMUM_PRIVACY',
          },
          message:
            candidates.length > 0
              ? 'A compatible donor may be available in the regional network. Submit an authenticated emergency request to initiate secure clinical dispatch.'
              : 'Currently no suitable rare donor has been identified in this radius. Broadcast an emergency request to initiate statewide progressive matching.',
          candidates: [],
        },
        candidates.length > 0
          ? 'Potential compatible rare donors identified in network'
          : 'Matching in progress'
      );
      return;
    }

    // Standard blood groups: Strip donorId, strip exact km (enforce distanceBand)
    const sanitized = candidates.map((c, i) => ({
      matchReference: `DONOR-${i + 1}`,
      bloodGroup: c.bloodGroup,
      bloodGroupLabel: c.bloodGroupLabel,
      city: c.city,
      state: c.state,
      approximateDistance: c.distanceBand,
      distanceBand: c.distanceBand,
      isAvailable: c.isAvailable,
      emergencyAvailable: c.emergencyAvailable,
      verifiedStatus: 'VERIFIED',
      isVerified: true,
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

    if (!currentUser) {
      throw new AppError('Authentication required to view blood request matches', 401);
    }

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
        coordinationRoom: true,
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    // IDOR & RBAC Protection: Only Requester, Hospital, or Admin can access matches
    const isOwner = currentUser.id === request.requesterId;
    const isHospital = currentUser.role === 'HOSPITAL';
    const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';

    if (!isOwner && !isHospital && !isAdmin) {
      throw new AppError('Access denied: You do not have permission to view matches for this request', 403);
    }

    // Audit log admin access to sensitive match records (Section 20)
    if (isAdmin && !isOwner) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'VIEW_RARE_MATCHES',
          entity: 'BloodRequest',
          entityId: request.id,
          details: `Admin viewed matches for request ${request.id}`,
          ipAddress: req.ip,
        },
      });
    }

    // Format matches using strict privacy tiers (Section 4 & 11)
    const formattedMatches = request.matches.map((m) => {
      const isAccepted = m.status === 'ACCEPTED';
      const tier: PrivacyTier = isAccepted ? 'ACCEPTED_COORDINATION' : 'AUTHORIZED_MATCH';

      return toRareDonorMatchDTO(
        {
          id: m.id,
          requestId: m.requestId,
          distanceKm: m.distanceKm,
          status: m.status,
          contactedAt: m.contactedAt,
          respondedAt: m.respondedAt,
          donor: m.donor,
        },
        tier,
        request.coordinationRoom ? { roomId: request.coordinationRoom.id } : null
      );
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
    sendSuccess(
      res,
      {
        status: candidates.length > 0 ? 'POTENTIAL_DONOR_IDENTIFIED' : 'MATCHING_IN_PROGRESS',
        requestId,
        candidatesContacted: candidates.length,
        message:
          candidates.length > 0
            ? 'A compatible donor may be available. The donor has been notified.'
            : 'We are securely searching for compatible donors.',
      },
      `Matching engine notified ${candidates.length} candidate(s)`
    );
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

