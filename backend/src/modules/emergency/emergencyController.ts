import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { ProgressiveDonorSearchService } from '../../services/progressiveDonorSearchService';
import { RealtimeEventService } from '../../services/realtimeEventService';
import { DemandForecastingService } from '../ml/demandForecastingService';
import { FraudDetectionService } from '../ml/fraudDetectionService';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

/**
 * Server-Sent Events real-time event streaming endpoint
 */
export function streamEmergencyEvents(req: Request, res: Response): void {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const requestId = req.query.requestId ? String(req.query.requestId) : undefined;
  RealtimeEventService.registerClient(clientId, res, requestId);
}

/**
 * Triggers progressive donor search for an emergency request
 */
export async function runProgressiveSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId, customSequence } = req.body;
    if (!requestId) {
      throw new AppError('requestId is required to initiate search', 400);
    }

    const result = await ProgressiveDonorSearchService.executeSearch(requestId, customSequence);
    sendSuccess(res, result, 'Progressive donor search completed', 200);
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieves progressive search status and step history
 */
export async function getSearchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.params;
    const search = await prisma.emergencySearch.findFirst({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      include: {
        radiusAttempts: {
          orderBy: { radiusKm: 'asc' },
        },
        request: {
          select: {
            id: true,
            patientName: true,
            bloodGroup: true,
            unitsRequired: true,
            urgency: true,
            hospitalName: true,
            hospitalCity: true,
            status: true,
          },
        },
      },
    });

    if (!search) {
      throw new AppError('No progressive search found for this request', 404);
    }

    sendSuccess(res, {
      searchId: search.id,
      requestId: search.requestId,
      urgency: search.urgency,
      status: search.status,
      currentRadiusKm: search.currentRadiusKm,
      maxRadiusKm: search.maxRadiusKm,
      targetDonorsNeeded: search.targetDonorsNeeded,
      donorsFoundCount: search.donorsFoundCount,
      donorsContactedCount: search.donorsContactedCount,
      escalationPlan: search.escalationPlan ? JSON.parse(search.escalationPlan) : null,
      steps: search.radiusAttempts,
      request: search.request,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Live Emergency Command Center aggregated intelligence
 */
export async function getCommandCenterData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      criticalCount,
      highCount,
      normalCount,
      activeDonorsCount,
      availableNowCount,
      emergencyReadyCount,
      hospitalsCount,
      bloodBanksCount,
      recentRequests,
      activeCoordinationRooms,
    ] = await Promise.all([
      prisma.bloodRequest.count({ where: { urgency: 'CRITICAL', status: { in: ['PENDING', 'MATCHING', 'DONOR_ACCEPTED'] } } }),
      prisma.bloodRequest.count({ where: { urgency: 'HIGH', status: { in: ['PENDING', 'MATCHING', 'DONOR_ACCEPTED'] } } }),
      prisma.bloodRequest.count({ where: { urgency: 'NORMAL', status: { in: ['PENDING', 'MATCHING', 'DONOR_ACCEPTED'] } } }),
      prisma.donorProfile.count({ where: { isEligible: true, user: { isActive: true } } }),
      prisma.donorProfile.count({ where: { isAvailable: true, isEligible: true } }),
      prisma.donorProfile.count({ where: { emergencyAvailable: true, isAvailable: true, isEligible: true } }),
      prisma.hospital.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.bloodBank.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.bloodRequest.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientName: true,
          bloodGroup: true,
          unitsRequired: true,
          urgency: true,
          hospitalName: true,
          hospitalCity: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.emergencyCoordinationRoom.count({ where: { status: 'ACTIVE' } }),
    ]);

    // Query 7-day demand predictions
    const demandForecast = await DemandForecastingService.getRegionalDemandForecast();

    sendSuccess(res, {
      activeEmergencies: {
        critical: criticalCount,
        high: highCount,
        normal: normalCount,
        totalActive: criticalCount + highCount + normalCount,
      },
      networkCapacity: {
        totalActiveDonors: activeDonorsCount,
        availableNow: availableNowCount,
        emergencyReady: emergencyReadyCount,
        verifiedHospitals: hospitalsCount,
        certifiedBloodBanks: bloodBanksCount,
        activeCoordinationRooms,
      },
      liveEmergenciesFeed: recentRequests,
      shortageAlerts: demandForecast.groups.filter((g) => g.shortageRiskLevel === 'CRITICAL' || g.shortageRiskLevel === 'HIGH'),
      activeConnectionsCount: RealtimeEventService.getActiveClientsCount(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Privacy-preserving map layers (fuzzed donor zones, exact hospital/blood bank points)
 */
export async function getMapLayers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bloodGroup, urgency } = req.query;

    const requestWhere: any = {
      status: { in: ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED'] },
    };
    if (bloodGroup) requestWhere.bloodGroup = String(bloodGroup);
    if (urgency) requestWhere.urgency = String(urgency);

    const [activeRequests, hospitals, bloodBanks, donors] = await Promise.all([
      prisma.bloodRequest.findMany({
        where: requestWhere,
        select: {
          id: true,
          patientName: true,
          bloodGroup: true,
          unitsRequired: true,
          urgency: true,
          hospitalName: true,
          hospitalCity: true,
          latitude: true,
          longitude: true,
          status: true,
          createdAt: true,
        },
        take: 50,
      }),
      prisma.hospital.findMany({
        where: { verificationStatus: 'VERIFIED' },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          latitude: true,
          longitude: true,
          contactPhone: true,
        },
        take: 100,
      }),
      prisma.bloodBank.findMany({
        where: { verificationStatus: 'VERIFIED' },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          address: true,
          latitude: true,
          longitude: true,
          contactPhone: true,
          storageCapacity: true,
        },
        take: 50,
      }),
      prisma.donorProfile.findMany({
        where: {
          isAvailable: true,
          isEligible: true,
          user: { isActive: true },
          ...(bloodGroup ? { bloodGroup: String(bloodGroup) } : {}),
        },
        select: {
          id: true,
          bloodGroup: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          emergencyAvailable: true,
        },
        take: 80,
      }),
    ]);

    // PRIVACY ENFORCEMENT: Never expose exact donor GPS coordinates or street addresses!
    // Deterministically fuzz donor coordinates within ~1.2 km radius to protect donor homes
    const fuzzedDonorZones = donors
      .filter((d) => d.latitude !== null && d.longitude !== null)
      .map((d) => {
        // Pseudo-random deterministic jitter based on donor ID hash
        const hash = crypto.createHash('md5').update(d.id).digest('hex');
        const offsetLat = ((parseInt(hash.substring(0, 4), 16) % 200) - 100) / 10000; // ~1km offset
        const offsetLng = ((parseInt(hash.substring(4, 8), 16) % 200) - 100) / 10000;

        return {
          zoneId: `zone_${d.id.substring(0, 8)}`,
          bloodGroup: d.bloodGroup,
          city: d.city,
          state: d.state,
          approximateLatitude: Number((d.latitude! + offsetLat).toFixed(4)),
          approximateLongitude: Number((d.longitude! + offsetLng).toFixed(4)),
          emergencyAvailable: d.emergencyAvailable,
          radiusRepresentationMeters: 1200,
        };
      });

    sendSuccess(res, {
      requests: activeRequests.filter((r) => r.latitude && r.longitude),
      hospitals: hospitals.filter((h) => h.latitude && h.longitude),
      bloodBanks: bloodBanks.filter((b) => b.latitude && b.longitude),
      donorZones: fuzzedDonorZones,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Emergency Simulator for Admins / Coordinators
 */
export async function simulateEmergency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      bloodGroup = 'O_NEGATIVE',
      unitsRequired = 2,
      urgency = 'CRITICAL',
      hospitalName = 'Apollo Emergency Hospital',
      city = 'Hyderabad',
      state = 'Telangana',
      latitude = 17.4325,
      longitude = 78.4072,
    } = req.body;

    const simulationSteps: Array<{ stage: string; detail: string; radiusKm?: number; donorsFound: number }> = [
      { stage: 'EMERGENCY_INITIATED', detail: `Broadcast requisition initiated for ${unitsRequired} unit(s) of ${bloodGroup} at ${hospitalName}`, donorsFound: 0 },
      { stage: 'RBC_COMPATIBILITY_VERIFIED', detail: `Compatible donor groups identified via RBC transfusion matrix`, donorsFound: 0 },
      { stage: 'RADIUS_SEARCH_5KM', detail: 'Scanning within immediate 5 km radius zone', radiusKm: 5, donorsFound: 2 },
      { stage: 'INSUFFICIENT_EXPANDING', detail: '2/6 required donors located. Progressive expansion triggered', radiusKm: 7, donorsFound: 4 },
      { stage: 'RADIUS_SEARCH_9KM', detail: 'Expanding search to 9 km radius envelope', radiusKm: 9, donorsFound: 8 },
      { stage: 'AI_RANKING_COMPLETED', detail: 'ML response prediction & multi-factor match score applied to 8 candidates', donorsFound: 8 },
      { stage: 'NOTIFICATIONS_DISPATCHED', detail: 'Phased emergency push & SMS alerts sent to top ranked donors', donorsFound: 8 },
      { stage: 'DONOR_ACCEPTED', detail: 'Verified donor accepted match and confirmed transit to hospital reception', donorsFound: 8 },
      { stage: 'COORDINATION_ROOM_OPENED', detail: 'Real-time navigation and controlled emergency coordination room activated', donorsFound: 8 },
    ];

    sendSuccess(res, {
      simulationId: `sim_${Date.now()}`,
      parameters: { bloodGroup, unitsRequired, urgency, hospitalName, city, state, coordinates: { latitude, longitude } },
      timeline: simulationSteps,
      summary: {
        initialRadiusKm: 5,
        finalRadiusKm: 9,
        totalDonorsDiscovered: 8,
        donorsContacted: 6,
        estimatedResponseTimeMinutes: 4.5,
        unitsSecured: unitsRequired,
        status: 'SIMULATION_SUCCESSFUL',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Offline Action Queue Synchronizer (Idempotent)
 */
export async function syncOfflineActions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { idempotencyKey, actionType, payload } = req.body;
    const userId = req.user?.id || null;

    if (!idempotencyKey || !actionType || !payload) {
      throw new AppError('idempotencyKey, actionType, and payload are required', 400);
    }

    // Check if idempotency key was already synced
    const existingSync = await prisma.offlineSyncEvent.findUnique({
      where: { idempotencyKey },
    });

    if (existingSync) {
      sendSuccess(res, {
        idempotencyKey,
        status: 'ALREADY_PROCESSED',
        details: existingSync.resultDetails ? JSON.parse(existingSync.resultDetails) : null,
      }, 'Action was previously synchronized', 200);
      return;
    }

    let resultDetails: any = null;

    if (actionType === 'CREATE_REQUEST') {
      if (!userId) {
        throw new AppError('Authentication required to sync blood request', 401);
      }

      // Create blood request from offline draft
      const newRequest = await prisma.bloodRequest.create({
        data: {
          requesterId: userId,
          patientName: payload.patientName,
          patientAge: payload.patientAge ? Number(payload.patientAge) : null,
          patientGender: payload.patientGender,
          bloodGroup: payload.bloodGroup,
          unitsRequired: Number(payload.unitsRequired || 1),
          hospitalName: payload.hospitalName,
          hospitalCity: payload.hospitalCity,
          hospitalState: payload.hospitalState,
          hospitalAddress: payload.hospitalAddress || `${payload.hospitalName}, ${payload.hospitalCity}`,
          latitude: payload.latitude ? parseFloat(payload.latitude) : null,
          longitude: payload.longitude ? parseFloat(payload.longitude) : null,
          requiredBy: new Date(payload.requiredBy || Date.now() + 24 * 60 * 60 * 1000),
          urgency: payload.urgency || 'NORMAL',
          medicalReason: payload.medicalReason,
          contactName: payload.contactName,
          contactPhone: payload.contactPhone,
          status: 'MATCHING',
        },
      });

      // Automatically trigger progressive search in background
      ProgressiveDonorSearchService.executeSearch(newRequest.id).catch((err) => {
        logger.error('[OfflineSync] Progressive search background execution failed', err);
      });

      resultDetails = { requestId: newRequest.id, status: newRequest.status };
    }

    // Record sync event
    await prisma.offlineSyncEvent.create({
      data: {
        idempotencyKey,
        userId,
        actionType,
        payload: JSON.stringify(payload),
        status: 'PROCESSED',
        resultDetails: JSON.stringify(resultDetails),
      },
    });

    sendSuccess(res, {
      idempotencyKey,
      status: 'PROCESSED',
      resultDetails,
    }, 'Offline action successfully synchronized with server', 201);
  } catch (error) {
    next(error);
  }
}
