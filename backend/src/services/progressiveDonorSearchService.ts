import { prisma } from '../config/database';
import { canDonateTo, getCompatibleDonorGroups, BloodGroupType, BLOOD_GROUP_LABELS } from '../utils/compatibility';
import { calculateDistanceKm } from '../utils/distance';
import { maskPhoneNumber } from '../utils/privacy';
import { logger } from '../utils/logger';
import { ResponsePredictionService } from '../modules/ml/responsePredictionService';
import { RealtimeEventService } from './realtimeEventService';
import { NotificationService } from './notificationService';
import { EmailService } from './emailService';

export interface ProgressiveSearchStep {
  radiusKm: number;
  newDonorsFound: number;
  cumulativeDonors: number;
  isSufficient: boolean;
  message: string;
}

export interface ScoredDonorCandidate {
  donorId: string;
  userId: string;
  fullName: string;
  bloodGroup: BloodGroupType;
  bloodGroupLabel: string;
  city: string;
  state: string;
  distanceKm: number | null;
  score: number;
  scoreBreakdown: {
    compatibility: number;
    exactMatchBonus: number;
    availability: number;
    emergencyReadiness: number;
    proximity: number;
    experience: number;
    predictedResponseBonus: number;
  };
  predictedResponseProbability: number;
  maskedPhone: string;
  totalDonations: number;
  isAvailable: boolean;
  emergencyAvailable: boolean;
  discoveredAtRadiusKm: number;
}

export interface ProgressiveSearchResult {
  searchId: string;
  requestId: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  targetDonorsNeeded: number;
  finalRadiusKm: number;
  totalDonorsFound: number;
  isCompleted: boolean;
  isEscalated: boolean;
  searchSteps: ProgressiveSearchStep[];
  candidates: ScoredDonorCandidate[];
  escalationPlan: Array<{ priority: number; action: string; description: string }> | null;
}

export class ProgressiveDonorSearchService {
  public static readonly DEFAULT_SEQUENCES: Record<string, number[]> = {
    CRITICAL: [5, 7, 9, 10, 15, 20, 25, 50, 100],
    HIGH: [5, 7, 9, 10, 15, 20, 25],
    NORMAL: [5, 7, 10, 15, 20],
  };

  /**
   * Executes intelligent progressive geographic donor search
   */
  static async executeSearch(requestId: string, customSequence?: number[]): Promise<ProgressiveSearchResult> {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: { requester: true },
    });

    if (!request) {
      throw new Error(`Blood request with id ${requestId} not found`);
    }

    const urgency = request.urgency as 'NORMAL' | 'HIGH' | 'CRITICAL';
    const sequence = customSequence || this.DEFAULT_SEQUENCES[urgency] || this.DEFAULT_SEQUENCES.NORMAL;
    const maxRadius = sequence[sequence.length - 1];

    // Determine target donor count: CRITICAL needs 3x buffer, HIGH needs 2x, NORMAL needs 1.5x
    const targetBufferMultiplier = urgency === 'CRITICAL' ? 3 : urgency === 'HIGH' ? 2 : 1.5;
    const targetDonorsNeeded = Math.max(3, Math.ceil(request.unitsRequired * targetBufferMultiplier));

    // Initialize or get EmergencySearch record
    const searchRecord = await prisma.emergencySearch.create({
      data: {
        requestId: request.id,
        urgency: request.urgency,
        currentRadiusKm: sequence[0],
        maxRadiusKm: maxRadius,
        targetDonorsNeeded,
        status: 'IN_PROGRESS',
      },
    });

    // Notify real-time stream that progressive search has initiated
    RealtimeEventService.sendToRequest(request.id, 'SEARCH_STARTED', {
      searchId: searchRecord.id,
      requestId: request.id,
      urgency,
      targetDonorsNeeded,
      initialRadiusKm: sequence[0],
      sequence,
    });

    const compatibleGroups = getCompatibleDonorGroups(request.bloodGroup as BloodGroupType);

    // Query active, eligible donors compatible with recipient blood
    const eligibleDonors = await prisma.donorProfile.findMany({
      where: {
        bloodGroup: { in: compatibleGroups as any },
        user: { isActive: true },
        isEligible: true,
      },
      include: {
        user: {
          select: { id: true, email: true, phone: true, isActive: true },
        },
      },
    });

    const seenDonorIds = new Set<string>();
    const cumulativeCandidates: ScoredDonorCandidate[] = [];
    const searchSteps: ProgressiveSearchStep[] = [];
    let completedRadius = sequence[0];
    let isSufficient = false;

    // Step progressively through radii
    for (let i = 0; i < sequence.length; i++) {
      const currentRadius = sequence[i];
      completedRadius = currentRadius;
      let newDonorsInRadius = 0;

      // Broadcast search expansion stage to frontend
      RealtimeEventService.sendToRequest(request.id, 'SEARCH_STAGE_UPDATED', {
        searchId: searchRecord.id,
        stepIndex: i + 1,
        totalSteps: sequence.length,
        currentRadiusKm: currentRadius,
        cumulativeDonors: cumulativeCandidates.length,
        isSufficient: false,
        message: `Searching for compatible donors within ${currentRadius} km...`,
      });

      for (const donor of eligibleDonors) {
        if (seenDonorIds.has(donor.id)) {
          continue; // Prevent duplicate counting across radii
        }

        // 1. Verify 90-day donation interval
        if (donor.lastDonationDate) {
          const diffDays = (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 90) {
            continue; // Medically ineligible
          }
        }

        // 2. Compute distance using exact spherical coordinates
        let distanceKm: number | null = null;
        if (request.latitude && request.longitude && donor.latitude && donor.longitude) {
          distanceKm = calculateDistanceKm(request.latitude, request.longitude, donor.latitude, donor.longitude);
          if (distanceKm === null || distanceKm > currentRadius) {
            continue; // Out of current radius bound
          }
        } else if (request.hospitalCity && donor.city.toLowerCase() !== request.hospitalCity.toLowerCase()) {
          // City fallback if coordinates missing
          if (request.hospitalState && donor.state.toLowerCase() !== request.hospitalState.toLowerCase()) {
            continue;
          }
        }

        // 3. Predict ML donor response probability
        const prediction = await ResponsePredictionService.predictDonorResponse({
          donorId: donor.id,
          distanceKm,
          urgency,
          emergencyAvailable: donor.emergencyAvailable,
          totalDonations: donor.totalDonations,
        });

        // 4. Compute Smart Donor Match Score (0 - 100)
        let compatibilityScore = 40; // Prerequisite base
        let exactBonus = donor.bloodGroup === request.bloodGroup ? 10 : 0;
        let availabilityScore = donor.isAvailable ? 20 : 5;
        let emergencyScore = 0;
        if (urgency === 'CRITICAL' && donor.emergencyAvailable) {
          emergencyScore = 15;
        } else if (urgency === 'HIGH' && donor.emergencyAvailable) {
          emergencyScore = 10;
        }

        let proximityScore = 0;
        if (distanceKm !== null) {
          proximityScore = Math.max(0, Math.round(15 * (1 - Math.min(distanceKm, currentRadius) / currentRadius)));
        } else {
          proximityScore = 8;
        }

        let experienceScore = Math.min(5, donor.totalDonations);
        let predictedResponseBonus = Math.round(prediction.responseProbability * 10);

        const totalScore = Math.min(
          100,
          compatibilityScore + exactBonus + availabilityScore + emergencyScore + proximityScore + experienceScore + predictedResponseBonus
        );

        const candidate: ScoredDonorCandidate = {
          donorId: donor.id,
          userId: donor.userId,
          fullName: donor.fullName,
          bloodGroup: donor.bloodGroup as BloodGroupType,
          bloodGroupLabel: BLOOD_GROUP_LABELS[donor.bloodGroup as BloodGroupType] || donor.bloodGroup,
          city: donor.city,
          state: donor.state,
          distanceKm,
          score: totalScore,
          scoreBreakdown: {
            compatibility: compatibilityScore,
            exactMatchBonus: exactBonus,
            availability: availabilityScore,
            emergencyReadiness: emergencyScore,
            proximity: proximityScore,
            experience: experienceScore,
            predictedResponseBonus,
          },
          predictedResponseProbability: prediction.responseProbability,
          maskedPhone: maskPhoneNumber(donor.user.phone),
          totalDonations: donor.totalDonations,
          isAvailable: donor.isAvailable,
          emergencyAvailable: donor.emergencyAvailable,
          discoveredAtRadiusKm: currentRadius,
        };

        seenDonorIds.add(donor.id);
        cumulativeCandidates.push(candidate);
        newDonorsInRadius++;
      }

      // Check if enough suitable donors exist
      isSufficient = cumulativeCandidates.length >= targetDonorsNeeded;

      const stepSummary: ProgressiveSearchStep = {
        radiusKm: currentRadius,
        newDonorsFound: newDonorsInRadius,
        cumulativeDonors: cumulativeCandidates.length,
        isSufficient,
        message: isSufficient
          ? `Found ${cumulativeCandidates.length} suitable donors within ${currentRadius} km. Requirement satisfied.`
          : `Found ${newDonorsInRadius} new donors (${cumulativeCandidates.length}/${targetDonorsNeeded}) within ${currentRadius} km.`,
      };

      searchSteps.push(stepSummary);

      // Record SearchRadiusAttempt in database
      await prisma.searchRadiusAttempt.create({
        data: {
          searchId: searchRecord.id,
          radiusKm: currentRadius,
          donorsFound: newDonorsInRadius,
          cumulativeDonors: cumulativeCandidates.length,
          isSufficient,
          candidateDonorIds: JSON.stringify(cumulativeCandidates.map((c) => c.donorId)),
        },
      });

      if (isSufficient) {
        break; // STOP! Target reached
      }
    }

    // Sort candidates descending by match score
    cumulativeCandidates.sort((a, b) => b.score - a.score);

    // Save DonorMatch records and notify top candidates
    const donorsToNotify = cumulativeCandidates.slice(0, targetDonorsNeeded);
    for (const c of donorsToNotify) {
      await prisma.donorMatch.upsert({
        where: {
          requestId_donorId: {
            requestId: request.id,
            donorId: c.donorId,
          },
        },
        create: {
          requestId: request.id,
          donorId: c.donorId,
          compatibilityScore: c.score,
          distanceKm: c.distanceKm,
          status: 'NOTIFIED',
        },
        update: {
          compatibilityScore: c.score,
          distanceKm: c.distanceKm,
        },
      });

      // Dispatch non-blocking notification
      NotificationService.notify({
        userId: c.userId,
        title: urgency === 'CRITICAL' ? `🚨 CRITICAL BLOOD MATCH (${request.bloodGroup})` : `Urgent Blood Match (${request.bloodGroup})`,
        message: `${request.patientName} urgently requires ${request.unitsRequired} unit(s) of ${request.bloodGroup} at ${request.hospitalName} (${c.distanceKm} km away).`,
        type: urgency === 'CRITICAL' ? 'CRITICAL_BLOOD_REQUEST' : 'URGENT_BLOOD_REQUEST',
        priority: urgency === 'CRITICAL' ? 'CRITICAL' : 'URGENT',
        category: 'MATCH',
        link: '/donor/requests',
        actionUrl: '/donor/requests',
        metadata: {
          requestId: request.id,
          bloodGroup: request.bloodGroup,
          unitsRequired: request.unitsRequired,
          hospitalName: request.hospitalName,
          distanceKm: c.distanceKm,
        },
        sms: {
          to: c.maskedPhone,
          message: `[RakthaSethu Emergency] ${request.bloodGroup} needed at ${request.hospitalName}. Please open RakthaSethu to respond.`,
        },
      }).catch((err) => logger.warn('[ProgressiveSearch] Notification dispatch warning', err));
    }

    let escalationPlan: Array<{ priority: number; action: string; description: string }> | null = null;
    const isEscalated = !isSufficient;

    if (isEscalated) {
      escalationPlan = [
        {
          priority: 1,
          action: 'Expand Search Radius',
          description: `Extend geographic search envelope beyond ${completedRadius}km up to 100km regional boundary.`,
        },
        {
          priority: 2,
          action: 'Query Certified Blood Banks',
          description: `Contact verified blood banks in ${request.hospitalCity} to reserve compatible packed red cells.`,
        },
        {
          priority: 3,
          action: 'Alert Emergency Disaster Volunteers',
          description: `Dispatch regional volunteer network coordinators for on-ground donor mobilization and transport support.`,
        },
        {
          priority: 4,
          action: 'Hospital Clinical Escalation',
          description: `Notify attending hospital blood bank coordinator at ${request.hospitalName} for priority cross-match substitutes.`,
        },
      ];

      // Notify nearby verified blood banks of the critical requirement
      if (urgency === 'CRITICAL') {
        prisma.bloodBank.findMany({
          where: { city: request.hospitalCity, verificationStatus: 'VERIFIED' },
          take: 3,
        }).then((bloodBanks) => {
          for (const bb of bloodBanks) {
            NotificationService.notify({
              userId: bb.userId,
              title: `🚨 Emergency Shortage Alert: ${request.bloodGroup} Needed`,
              message: `Critical shortage escalation: ${request.patientName} urgently needs ${request.unitsRequired} unit(s) of ${request.bloodGroup} at ${request.hospitalName}. Check reserve inventory.`,
              type: 'BLOOD_BANK_SHORTAGE',
              priority: 'CRITICAL',
              category: 'INVENTORY',
              link: '/bloodbank/inventory',
              actionUrl: '/bloodbank/inventory',
              metadata: { requestId: request.id, bloodGroup: request.bloodGroup, hospitalName: request.hospitalName },
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    // Update EmergencySearch and BloodRequest records
    await prisma.emergencySearch.update({
      where: { id: searchRecord.id },
      data: {
        currentRadiusKm: completedRadius,
        donorsFoundCount: cumulativeCandidates.length,
        donorsContactedCount: donorsToNotify.length,
        status: isSufficient ? 'COMPLETED' : 'ESCALATED',
        completedAt: new Date(),
        escalationPlan: escalationPlan ? JSON.stringify(escalationPlan) : null,
      },
    });

    await prisma.bloodRequest.update({
      where: { id: request.id },
      data: { status: 'MATCHING' },
    });

    const finalResult: ProgressiveSearchResult = {
      searchId: searchRecord.id,
      requestId: request.id,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      unitsRequired: request.unitsRequired,
      urgency,
      targetDonorsNeeded,
      finalRadiusKm: completedRadius,
      totalDonorsFound: cumulativeCandidates.length,
      isCompleted: isSufficient,
      isEscalated,
      searchSteps,
      candidates: cumulativeCandidates,
      escalationPlan,
    };

    // Broadcast search completed event
    RealtimeEventService.sendToRequest(request.id, 'SEARCH_COMPLETED', finalResult);

    return finalResult;
  }
}
