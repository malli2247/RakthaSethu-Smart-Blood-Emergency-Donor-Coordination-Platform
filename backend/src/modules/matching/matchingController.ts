import { Request, Response, NextFunction } from 'express';
import { MatchingService } from './matchingService';
import { sendSuccess, AppError } from '../../utils/response';
import { prisma } from '../../config/database';
import { BloodGroupType } from '../../utils/compatibility';

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

    sendSuccess(res, candidates, `Found ${candidates.length} compatible donor candidate(s)`);
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
