import { EventEmitter } from 'events';
import { Response } from 'express';
import { prisma } from '../config/database';
import { config } from '../config';
import { canDonateTo, getCompatibleDonorGroups, BloodGroupType, BLOOD_GROUP_LABELS } from '../utils/compatibility';
import { calculateDistanceKm } from '../utils/distance';
import { maskPhoneNumber } from '../utils/privacy';
import { logger } from '../utils/logger';
import { ResponsePredictionService } from '../modules/ml/responsePredictionService';
import { RealtimeEventService } from './realtimeEventService';
import { NotificationService } from './notificationService';

export interface ProgressiveSearchStep {
  radiusKm: number;
  newDonorsFound: number;
  cumulativeDonors: number;
  isSufficient: boolean;
  message: string;
}

export interface RadiusMetrics {
  radiusKm: number;
  candidatesEvaluated: number;
  compatibleCount: number;
  eligibleCount: number;
  availableCount: number;
  alreadyContactedCount: number;
  newDonorsAtRadius: number;
  cumulativeDonors: number;
  remainingTarget: number;
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
  searchDurationMs?: number;
}

export interface ProgressiveSearchEvent {
  type:
    | 'search_started'
    | 'radius_started'
    | 'candidate_count_updated'
    | 'candidate_found'
    | 'radius_completed'
    | 'radius_expanded'
    | 'sufficient_matches_found'
    | 'max_radius_reached'
    | 'search_completed'
    | 'search_failed'
    | 'search_cancelled';
  searchId: string;
  timestamp: string;
  [key: string]: any;
}

export interface ActiveSearchJob {
  searchId: string;
  requestId: string;
  request: any;
  state: string; // e.g. SEARCH_INITIALIZING, SEARCHING_5KM, EVALUATING_5KM, EXPANDING_7KM, etc.
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ESCALATED' | 'FAILED' | 'CANCELLED';
  cancelled: boolean;
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  sequence: number[];
  currentRadiusIndex: number;
  currentRadiusKm: number;
  targetDonorsNeeded: number;
  cumulativeCandidates: ScoredDonorCandidate[];
  alreadyMatchedDonorIds: Set<string>;
  searchSteps: ProgressiveSearchStep[];
  metricsByRadius: Map<number, RadiusMetrics>;
  emitter: EventEmitter;
  eventHistory: ProgressiveSearchEvent[];
  startTime: number;
  endTime?: number;
  escalationPlan: Array<{ priority: number; action: string; description: string }> | null;
  error?: string;
  loopPromise?: Promise<void>;
}

export class ProgressiveDonorSearchService {
  public static readonly DEFAULT_SEQUENCES: Record<string, number[]> = {
    CRITICAL: [5, 7, 9, 10, 15, 20, 25, 50, 100],
    HIGH: [5, 7, 9, 10, 15, 20, 25],
    NORMAL: [5, 7, 10, 15, 20],
  };

  private static activeJobs: Map<string, ActiveSearchJob> = new Map();
  private static requestToSearchId: Map<string, string> = new Map();

  /**
   * Helper to emit event to both active job listeners and legacy RealtimeEventService
   */
  private static emitEvent(job: ActiveSearchJob, type: ProgressiveSearchEvent['type'], payload: Record<string, any>): void {
    const event: ProgressiveSearchEvent = {
      type,
      searchId: job.searchId,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    job.eventHistory.push(event);
    job.emitter.emit('event', event);

    // Also forward to existing RealtimeEventService for request-level broadcast compatibility
    RealtimeEventService.sendToRequest(job.requestId, type, event);
  }

  /**
   * Pacing utility for smooth transition between progressive stages
   */
  private static pace(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Initializes and starts an asynchronous progressive search job
   */
  static async startSearch(
    requestId: string,
    customSequence?: number[],
    targetOverride?: number
  ): Promise<{ searchId: string; status: string; target: number; radiusSequence: number[] }> {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: { requester: true },
    });

    if (!request) {
      throw new Error(`Blood request with id ${requestId} not found`);
    }

    // Check if an active search job is already executing for this request
    const existingSearchId = this.requestToSearchId.get(requestId);
    if (existingSearchId) {
      const existingJob = this.activeJobs.get(existingSearchId);
      if (existingJob && existingJob.status === 'IN_PROGRESS' && !existingJob.cancelled) {
        return {
          searchId: existingJob.searchId,
          status: existingJob.state,
          target: existingJob.targetDonorsNeeded,
          radiusSequence: existingJob.sequence,
        };
      }
    }

    const urgency = (request.urgency as 'NORMAL' | 'HIGH' | 'CRITICAL') || 'NORMAL';
    const sequence =
      customSequence ||
      config.matching?.sequencesByUrgency?.[urgency] ||
      this.DEFAULT_SEQUENCES[urgency] ||
      config.matching?.radiusSequence ||
      this.DEFAULT_SEQUENCES.NORMAL;

    const maxRadius = sequence[sequence.length - 1];

    // Calculate target donor count based on units & urgency buffer
    const targetBufferMultiplier = urgency === 'CRITICAL' ? 3 : urgency === 'HIGH' ? 2 : 1.5;
    const targetDonorsNeeded =
      targetOverride ||
      Math.max(
        config.matching?.minimumSuitableDonors || 5,
        Math.ceil(request.unitsRequired * targetBufferMultiplier)
      );

    // Create EmergencySearch record in database
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

    const emitter = new EventEmitter();
    emitter.setMaxListeners(100);

    const job: ActiveSearchJob = {
      searchId: searchRecord.id,
      requestId: request.id,
      request,
      state: 'SEARCH_INITIALIZING',
      status: 'IN_PROGRESS',
      cancelled: false,
      urgency,
      sequence: [...sequence],
      currentRadiusIndex: 0,
      currentRadiusKm: sequence[0],
      targetDonorsNeeded,
      cumulativeCandidates: [],
      alreadyMatchedDonorIds: new Set<string>(),
      searchSteps: [],
      metricsByRadius: new Map<number, RadiusMetrics>(),
      emitter,
      eventHistory: [],
      startTime: Date.now(),
      escalationPlan: null,
    };

    this.activeJobs.set(job.searchId, job);
    this.requestToSearchId.set(request.id, job.searchId);

    // Emit initial search_started event
    this.emitEvent(job, 'search_started', {
      requestId: request.id,
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      urgency,
      target: targetDonorsNeeded,
      sequence: job.sequence,
      initialRadiusKm: job.sequence[0],
      status: 'SEARCH_INITIALIZING',
      latitude: request.latitude,
      longitude: request.longitude,
      hospitalName: request.hospitalName,
      hospitalCity: request.hospitalCity,
    });

    // Run progressive search loop asynchronously in background
    job.loopPromise = this.runProgressiveLoop(job).catch((err) => {
      logger.error(`[ProgressiveSearch] Uncaught error in search job ${job.searchId}:`, err);
      job.status = 'FAILED';
      job.state = 'SEARCH_FAILED';
      job.error = err.message || 'Search execution failed';
      this.emitEvent(job, 'search_failed', {
        error: 'Donor search temporarily unavailable.',
      });
      prisma.emergencySearch
        .update({
          where: { id: job.searchId },
          data: { status: 'FAILED' },
        })
        .catch(() => {});
    });

    return {
      searchId: job.searchId,
      status: 'SEARCH_INITIALIZING',
      target: targetDonorsNeeded,
      radiusSequence: job.sequence,
    };
  }

  /**
   * Core progressive radius search loop that executes step-by-step
   */
  private static async runProgressiveLoop(job: ActiveSearchJob): Promise<void> {
    const compatibleGroups = getCompatibleDonorGroups(job.request.bloodGroup as BloodGroupType);

    // Query active, eligible donors who can donate to this recipient's blood group
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

    // Check existing notified matches for this request
    const existingMatches = await prisma.donorMatch.findMany({
      where: { requestId: job.requestId },
      select: { donorId: true },
    });
    const alreadyContactedSet = new Set(existingMatches.map((m) => m.donorId));

    for (let i = job.currentRadiusIndex; i < job.sequence.length; i++) {
      if (job.cancelled) {
        await this.handleCancelled(job);
        return;
      }

      const currentRadius = job.sequence[i];
      job.currentRadiusIndex = i;
      job.currentRadiusKm = currentRadius;
      const prevRadius = i > 0 ? job.sequence[i - 1] : null;

      job.state = `SEARCHING_${currentRadius}KM`;

      // 1. Emit radius_started
      this.emitEvent(job, 'radius_started', {
        radiusKm: currentRadius,
        previousRadiusKm: prevRadius,
        suitableDonorsFound: job.cumulativeCandidates.length,
        target: job.targetDonorsNeeded,
        status: 'SEARCHING',
      });

      // Brief pacing for smooth streaming and event ingestion
      await this.pace(150);

      if (job.cancelled) {
        await this.handleCancelled(job);
        return;
      }

      job.state = `EVALUATING_${currentRadius}KM`;

      let candidatesEvaluated = 0;
      let compatibleCount = 0;
      let eligibleCount = 0;
      let availableCount = 0;
      let alreadyContactedCount = 0;
      let newDonorsAtRadius = 0;
      const newlyDiscoveredCandidates: ScoredDonorCandidate[] = [];

      for (const donor of eligibleDonors) {
        if (job.cancelled) break;

        // Skip donors already matched in previous radii (NO DUPLICATES)
        if (job.alreadyMatchedDonorIds.has(donor.id)) {
          continue;
        }

        candidatesEvaluated++;
        compatibleCount++;

        // 1. Medical Eligibility (90-day whole blood donation window)
        if (donor.lastDonationDate) {
          const diffDays = (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 90) {
            continue;
          }
        }
        eligibleCount++;

        // 2. Availability Check
        if (!donor.isAvailable && !donor.emergencyAvailable) {
          continue;
        }
        availableCount++;

        // 3. Geographic radius bound check
        let distanceKm: number | null = null;
        if (job.request.latitude && job.request.longitude && donor.latitude && donor.longitude) {
          distanceKm = calculateDistanceKm(
            job.request.latitude,
            job.request.longitude,
            donor.latitude,
            donor.longitude
          );
          if (distanceKm === null || distanceKm > currentRadius) {
            continue;
          }
        } else if (
          job.request.hospitalCity &&
          donor.city.toLowerCase() !== job.request.hospitalCity.toLowerCase()
        ) {
          if (job.request.hospitalState && donor.state.toLowerCase() !== job.request.hospitalState.toLowerCase()) {
            continue;
          }
        }

        if (alreadyContactedSet.has(donor.id)) {
          alreadyContactedCount++;
        }

        // 4. ML Donor Response Probability Prediction
        const prediction = await ResponsePredictionService.predictDonorResponse({
          donorId: donor.id,
          distanceKm,
          urgency: job.urgency as any,
          emergencyAvailable: donor.emergencyAvailable,
          totalDonations: donor.totalDonations,
        });

        // 5. Multi-factor Scoring (0-100)
        const { totalScore, scoreBreakdown } = this.calculateDonorScore(
          donor,
          job.request,
          job.urgency,
          distanceKm,
          currentRadius,
          prediction.responseProbability
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
          scoreBreakdown,
          predictedResponseProbability: prediction.responseProbability,
          maskedPhone: maskPhoneNumber(donor.user.phone),
          totalDonations: donor.totalDonations,
          isAvailable: donor.isAvailable,
          emergencyAvailable: donor.emergencyAvailable,
          discoveredAtRadiusKm: currentRadius,
        };

        job.alreadyMatchedDonorIds.add(donor.id);
        newlyDiscoveredCandidates.push(candidate);
        job.cumulativeCandidates.push(candidate);
        newDonorsAtRadius++;

        // Emit candidate_found
        this.emitEvent(job, 'candidate_found', {
          radiusKm: currentRadius,
          candidate,
          cumulativeCount: job.cumulativeCandidates.length,
        });

        // Stop scanning this radius early if target is met
        if (job.cumulativeCandidates.length >= job.targetDonorsNeeded) {
          break;
        }
      }

      if (job.cancelled) {
        await this.handleCancelled(job);
        return;
      }

      const remainingTarget = Math.max(0, job.targetDonorsNeeded - job.cumulativeCandidates.length);

      const radiusMetric: RadiusMetrics = {
        radiusKm: currentRadius,
        candidatesEvaluated,
        compatibleCount,
        eligibleCount,
        availableCount,
        alreadyContactedCount,
        newDonorsAtRadius,
        cumulativeDonors: job.cumulativeCandidates.length,
        remainingTarget,
      };
      job.metricsByRadius.set(currentRadius, radiusMetric);

      // Emit candidate_count_updated
      this.emitEvent(job, 'candidate_count_updated', {
        radiusKm: currentRadius,
        ...radiusMetric,
      });

      const isSufficient = job.cumulativeCandidates.length >= job.targetDonorsNeeded;

      const stepSummary: ProgressiveSearchStep = {
        radiusKm: currentRadius,
        newDonorsFound: newDonorsAtRadius,
        cumulativeDonors: job.cumulativeCandidates.length,
        isSufficient,
        message: isSufficient
          ? `Found ${job.cumulativeCandidates.length} suitable donors within ${currentRadius} km. Requirement satisfied.`
          : `Found ${newDonorsAtRadius} new donors (${job.cumulativeCandidates.length}/${job.targetDonorsNeeded}) within ${currentRadius} km.`,
      };
      job.searchSteps.push(stepSummary);

      // Record SearchRadiusAttempt in database
      await prisma.searchRadiusAttempt.create({
        data: {
          searchId: job.searchId,
          radiusKm: currentRadius,
          donorsFound: newDonorsAtRadius,
          cumulativeDonors: job.cumulativeCandidates.length,
          isSufficient,
          candidateDonorIds: JSON.stringify(newlyDiscoveredCandidates.map((c) => c.donorId)),
        },
      });

      const stages = [
        { name: 'Location calculated', status: 'COMPLETED' },
        { name: 'Compatibility checked', status: 'COMPLETED' },
        { name: 'Eligibility checked', status: 'COMPLETED' },
        { name: 'Availability checked', status: 'COMPLETED' },
        {
          name: `${newDonorsAtRadius} suitable donor${newDonorsAtRadius === 1 ? '' : 's'} found`,
          status: 'COMPLETED',
        },
      ];

      // Emit radius_completed
      this.emitEvent(job, 'radius_completed', {
        radiusKm: currentRadius,
        newDonorsFound: newDonorsAtRadius,
        cumulativeDonors: job.cumulativeCandidates.length,
        candidatesEvaluated,
        compatibleCount,
        eligibleCount,
        availableCount,
        alreadyContactedCount,
        isSufficient,
        target: job.targetDonorsNeeded,
        stages,
      });

      // STOP CONDITION: If sufficient suitable candidates found, STOP expanding!
      if (isSufficient) {
        job.state = 'SUFFICIENT_MATCHES_FOUND';
        this.emitEvent(job, 'sufficient_matches_found', {
          radiusKm: currentRadius,
          totalDonorsFound: job.cumulativeCandidates.length,
          target: job.targetDonorsNeeded,
          message: `${job.cumulativeCandidates.length} suitable donors identified within ${currentRadius} km. Search stopped automatically because the required number of suitable donors was reached.`,
        });
        break; // Do NOT continue to next radii!
      }

      // If not sufficient and more radii exist, expand to next radius
      if (i < job.sequence.length - 1) {
        const nextRadius = job.sequence[i + 1];
        job.state = `EXPANDING_${nextRadius}KM`;
        this.emitEvent(job, 'radius_expanded', {
          nextRadiusKm: nextRadius,
          previousRadiusKm: currentRadius,
          currentDonors: job.cumulativeCandidates.length,
          target: job.targetDonorsNeeded,
          status: 'EXPANDING',
        });
        await this.pace(200);
      }
    }

    if (job.cancelled) {
      await this.handleCancelled(job);
      return;
    }

    await this.finalizeJob(job);
  }

  /**
   * Finalizes search job upon completion or maximum radius exhaustion
   */
  private static async finalizeJob(job: ActiveSearchJob): Promise<void> {
    const isSufficient = job.cumulativeCandidates.length >= job.targetDonorsNeeded;
    job.status = isSufficient ? 'COMPLETED' : 'ESCALATED';
    job.state = isSufficient ? 'SEARCH_COMPLETED' : 'MAX_RADIUS_REACHED';
    job.endTime = Date.now();
    const searchDurationMs = job.endTime - job.startTime;

    // Sort candidates descending by match score
    job.cumulativeCandidates.sort((a, b) => b.score - a.score);

    // If target not reached, generate escalation plan
    if (!isSufficient) {
      job.escalationPlan = this.generateEscalationPlan(job.currentRadiusKm, job.request);
      this.emitEvent(job, 'max_radius_reached', {
        finalRadiusKm: job.currentRadiusKm,
        totalDonorsFound: job.cumulativeCandidates.length,
        target: job.targetDonorsNeeded,
        message: `Search reached ${job.currentRadiusKm} km with ${job.cumulativeCandidates.length} candidate(s). Target not fully satisfied.`,
      });
    }

    // Save DonorMatch records and dispatch notifications for top matches
    const donorsToNotify = job.cumulativeCandidates.slice(0, job.targetDonorsNeeded);
    for (const c of donorsToNotify) {
      await prisma.donorMatch.upsert({
        where: {
          requestId_donorId: {
            requestId: job.requestId,
            donorId: c.donorId,
          },
        },
        create: {
          requestId: job.requestId,
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

      NotificationService.notify({
        userId: c.userId,
        title: job.urgency === 'CRITICAL' ? `🚨 CRITICAL BLOOD MATCH (${job.request.bloodGroup})` : `Urgent Blood Match (${job.request.bloodGroup})`,
        message: `${job.request.patientName} urgently requires ${job.request.unitsRequired} unit(s) of ${job.request.bloodGroup} at ${job.request.hospitalName} (${c.distanceKm ? `${c.distanceKm.toFixed(1)} km` : 'nearby'}).`,
        type: job.urgency === 'CRITICAL' ? 'CRITICAL_BLOOD_REQUEST' : 'URGENT_BLOOD_REQUEST',
        priority: job.urgency === 'CRITICAL' ? 'CRITICAL' : 'URGENT',
        category: 'MATCH',
        link: '/donor/requests',
        actionUrl: '/donor/requests',
        metadata: {
          requestId: job.requestId,
          bloodGroup: job.request.bloodGroup,
          unitsRequired: job.request.unitsRequired,
          hospitalName: job.request.hospitalName,
          distanceKm: c.distanceKm,
        },
        sms: {
          to: c.maskedPhone,
          message: `[RakthaSethu Emergency] ${job.request.bloodGroup} needed at ${job.request.hospitalName}. Open RakthaSethu to respond.`,
        },
      }).catch((err) => logger.warn('[ProgressiveSearch] Notification dispatch warning', err));
    }

    // Update database records
    await prisma.emergencySearch.update({
      where: { id: job.searchId },
      data: {
        currentRadiusKm: job.currentRadiusKm,
        donorsFoundCount: job.cumulativeCandidates.length,
        donorsContactedCount: donorsToNotify.length,
        status: job.status,
        completedAt: new Date(),
        escalationPlan: job.escalationPlan ? JSON.stringify(job.escalationPlan) : null,
      },
    });

    await prisma.bloodRequest.update({
      where: { id: job.requestId },
      data: { status: 'MATCHING' },
    });

    const finalResult: ProgressiveSearchResult = {
      searchId: job.searchId,
      requestId: job.requestId,
      patientName: job.request.patientName,
      bloodGroup: job.request.bloodGroup,
      unitsRequired: job.request.unitsRequired,
      urgency: job.urgency,
      targetDonorsNeeded: job.targetDonorsNeeded,
      finalRadiusKm: job.currentRadiusKm,
      totalDonorsFound: job.cumulativeCandidates.length,
      isCompleted: isSufficient,
      isEscalated: !isSufficient,
      searchSteps: job.searchSteps,
      candidates: job.cumulativeCandidates,
      escalationPlan: job.escalationPlan,
      searchDurationMs,
    };

    // Emit search_completed event
    this.emitEvent(job, 'search_completed', finalResult);
  }

  /**
   * Handles user cancellation
   */
  private static async handleCancelled(job: ActiveSearchJob): Promise<void> {
    job.status = 'CANCELLED';
    job.state = 'SEARCH_CANCELLED';
    job.endTime = Date.now();

    this.emitEvent(job, 'search_cancelled', {
      message: 'Search was cancelled by user.',
      finalRadiusKm: job.currentRadiusKm,
      totalDonorsFound: job.cumulativeCandidates.length,
    });

    await prisma.emergencySearch.update({
      where: { id: job.searchId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    this.activeJobs.delete(job.searchId);
    this.requestToSearchId.delete(job.requestId);
  }

  /**
   * Cancels an ongoing search job
   */
  static async cancelSearch(searchId: string): Promise<boolean> {
    const job = this.activeJobs.get(searchId);
    if (job) {
      job.cancelled = true;
      await this.handleCancelled(job);
      return true;
    }

    const searchRecord = await prisma.emergencySearch.findUnique({
      where: { id: searchId },
    });

    if (searchRecord && searchRecord.status === 'IN_PROGRESS') {
      await prisma.emergencySearch.update({
        where: { id: searchId },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
      return true;
    }

    return false;
  }

  /**
   * Resumes or extends an existing search (e.g. "Keep Searching" or "Continue to 100 km")
   */
  static async continueSearch(searchId: string, additionalRadii?: number[]): Promise<any> {
    let job = this.activeJobs.get(searchId);

    if (!job) {
      const searchRecord = await prisma.emergencySearch.findUnique({
        where: { id: searchId },
        include: { request: true },
      });

      if (!searchRecord) {
        throw new Error(`Search with id ${searchId} not found`);
      }

      return this.startSearch(searchRecord.requestId, additionalRadii || [100]);
    }

    // Extend sequence with requested additional radii or next tiers
    const nextRadii = additionalRadii || [100];
    for (const r of nextRadii) {
      if (!job.sequence.includes(r)) {
        job.sequence.push(r);
      }
    }
    job.sequence.sort((a, b) => a - b);

    // Increase target by 3 so expansion continues
    job.targetDonorsNeeded += 3;
    job.status = 'IN_PROGRESS';
    job.cancelled = false;

    // Advance index to the next unscanned radius
    const nextUnscannedIndex = job.sequence.findIndex((r) => r > job.currentRadiusKm);
    if (nextUnscannedIndex !== -1) {
      job.currentRadiusIndex = nextUnscannedIndex;
    }

    job.loopPromise = this.runProgressiveLoop(job).catch((err) => {
      logger.error(`[ProgressiveSearch] Error in continued search ${job.searchId}:`, err);
    });

    return {
      searchId: job.searchId,
      status: 'SEARCHING',
      newTarget: job.targetDonorsNeeded,
      sequence: job.sequence,
    };
  }

  /**
   * Subscribes an HTTP response to Server-Sent Events for a searchId
   */
  static async subscribeToStream(searchId: string, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Initial handshake
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', searchId, timestamp: new Date().toISOString() })}\n\n`);

    const job = this.activeJobs.get(searchId);

    if (!job) {
      // If not in active memory, check database
      const dbSearch = await prisma.emergencySearch.findUnique({
        where: { id: searchId },
        include: {
          request: true,
          radiusAttempts: { orderBy: { radiusKm: 'asc' } },
        },
      });

      if (!dbSearch) {
        res.write(`data: ${JSON.stringify({ type: 'search_failed', searchId, error: 'Search record not found' })}\n\n`);
        res.end();
        return;
      }

      // Replay completed summary from database
      res.write(
        `data: ${JSON.stringify({
          type: 'search_completed',
          searchId: dbSearch.id,
          requestId: dbSearch.requestId,
          status: dbSearch.status,
          finalRadiusKm: dbSearch.currentRadiusKm,
          totalDonorsFound: dbSearch.donorsFoundCount,
          targetDonorsNeeded: dbSearch.targetDonorsNeeded,
          isCompleted: dbSearch.status === 'COMPLETED',
          isEscalated: dbSearch.status === 'ESCALATED',
          searchSteps: dbSearch.radiusAttempts.map((a) => ({
            radiusKm: a.radiusKm,
            newDonorsFound: a.donorsFound,
            cumulativeDonors: a.cumulativeDonors,
            isSufficient: a.isSufficient,
            message: `Found ${a.donorsFound} suitable donors within ${a.radiusKm} km`,
          })),
          candidates: [],
          escalationPlan: dbSearch.escalationPlan ? JSON.parse(dbSearch.escalationPlan) : null,
        })}\n\n`
      );
      res.end();
      return;
    }

    // Replay historical events for fresh or reconnected clients
    for (const event of job.eventHistory) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // If job has already terminated, end response
    if (job.status !== 'IN_PROGRESS') {
      res.end();
      return;
    }

    const onEvent = (event: ProgressiveSearchEvent) => {
      try {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err) {
        logger.warn(`[ProgressiveSearch] Failed writing event to stream ${searchId}`, err);
      }
    };

    job.emitter.on('event', onEvent);

    const heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatTimer);
        return;
      }
      res.write(': heartbeat\n\n');
    }, 20000);

    res.on('close', () => {
      clearInterval(heartbeatTimer);
      job.emitter.off('event', onEvent);
    });
  }

  /**
   * Retrieves current search snapshot from memory or database
   */
  static async getSearchSnapshot(searchId: string): Promise<any> {
    const job = this.activeJobs.get(searchId);
    if (job) {
      return {
        searchId: job.searchId,
        requestId: job.requestId,
        status: job.status,
        state: job.state,
        urgency: job.urgency,
        currentRadiusKm: job.currentRadiusKm,
        sequence: job.sequence,
        targetDonorsNeeded: job.targetDonorsNeeded,
        cumulativeDonors: job.cumulativeCandidates.length,
        candidates: job.cumulativeCandidates,
        searchSteps: job.searchSteps,
        metrics: Array.from(job.metricsByRadius.values()),
        escalationPlan: job.escalationPlan,
        request: {
          id: job.request.id,
          patientName: job.request.patientName,
          bloodGroup: job.request.bloodGroup,
          unitsRequired: job.request.unitsRequired,
          urgency: job.request.urgency,
          hospitalName: job.request.hospitalName,
          hospitalCity: job.request.hospitalCity,
          latitude: job.request.latitude,
          longitude: job.request.longitude,
        },
      };
    }

    const dbSearch = await prisma.emergencySearch.findUnique({
      where: { id: searchId },
      include: {
        radiusAttempts: { orderBy: { radiusKm: 'asc' } },
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
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!dbSearch) {
      return null;
    }

    // Load matched donor profiles for this request
    const matches = await prisma.donorMatch.findMany({
      where: { requestId: dbSearch.requestId },
      include: {
        donor: {
          include: {
            user: { select: { phone: true, isActive: true } },
          },
        },
      },
    });

    const candidates: ScoredDonorCandidate[] = matches.map((m) => ({
      donorId: m.donorId,
      userId: m.donor.userId,
      fullName: m.donor.fullName,
      bloodGroup: m.donor.bloodGroup as BloodGroupType,
      bloodGroupLabel: BLOOD_GROUP_LABELS[m.donor.bloodGroup as BloodGroupType] || m.donor.bloodGroup,
      city: m.donor.city,
      state: m.donor.state,
      distanceKm: m.distanceKm,
      score: m.compatibilityScore,
      scoreBreakdown: {
        compatibility: 40,
        exactMatchBonus: m.donor.bloodGroup === dbSearch.request.bloodGroup ? 10 : 0,
        availability: m.donor.isAvailable ? 20 : 5,
        emergencyReadiness: m.donor.emergencyAvailable ? 15 : 0,
        proximity: 10,
        experience: Math.min(5, m.donor.totalDonations),
        predictedResponseBonus: 8,
      },
      predictedResponseProbability: 0.8,
      maskedPhone: maskPhoneNumber(m.donor.user?.phone),
      totalDonations: m.donor.totalDonations,
      isAvailable: m.donor.isAvailable,
      emergencyAvailable: m.donor.emergencyAvailable,
      discoveredAtRadiusKm: m.distanceKm ? Math.ceil(m.distanceKm) : dbSearch.currentRadiusKm,
    }));

    return {
      searchId: dbSearch.id,
      requestId: dbSearch.requestId,
      status: dbSearch.status,
      state: dbSearch.status === 'COMPLETED' ? 'SEARCH_COMPLETED' : dbSearch.status,
      urgency: dbSearch.urgency,
      currentRadiusKm: dbSearch.currentRadiusKm,
      sequence: config.matching?.sequencesByUrgency?.[dbSearch.urgency as 'NORMAL' | 'HIGH' | 'CRITICAL'] || [5, 7, 9, 10, 15, 20, 25, 50, 100],
      targetDonorsNeeded: dbSearch.targetDonorsNeeded,
      cumulativeDonors: dbSearch.donorsFoundCount,
      candidates,
      searchSteps: dbSearch.radiusAttempts.map((a) => ({
        radiusKm: a.radiusKm,
        newDonorsFound: a.donorsFound,
        cumulativeDonors: a.cumulativeDonors,
        isSufficient: a.isSufficient,
        message: `Found ${a.donorsFound} suitable donor(s) within ${a.radiusKm} km`,
      })),
      metrics: [],
      escalationPlan: dbSearch.escalationPlan ? JSON.parse(dbSearch.escalationPlan) : null,
      request: dbSearch.request,
    };
  }

  /**
   * Synchronous execution wrapper for legacy tests and callers
   */
  static async executeSearch(requestId: string, customSequence?: number[]): Promise<ProgressiveSearchResult> {
    const { searchId } = await this.startSearch(requestId, customSequence);
    const job = this.activeJobs.get(searchId);

    if (job?.loopPromise) {
      await job.loopPromise;
    }

    const snapshot = await this.getSearchSnapshot(searchId);
    return {
      searchId,
      requestId,
      patientName: snapshot.request.patientName,
      bloodGroup: snapshot.request.bloodGroup,
      unitsRequired: snapshot.request.unitsRequired,
      urgency: snapshot.urgency,
      targetDonorsNeeded: snapshot.targetDonorsNeeded,
      finalRadiusKm: snapshot.currentRadiusKm,
      totalDonorsFound: snapshot.cumulativeDonors,
      isCompleted: snapshot.status === 'COMPLETED',
      isEscalated: snapshot.status === 'ESCALATED',
      searchSteps: snapshot.searchSteps,
      candidates: snapshot.candidates,
      escalationPlan: snapshot.escalationPlan,
    };
  }

  /**
   * Multi-factor intelligent ranking calculator
   */
  private static calculateDonorScore(
    donor: any,
    request: any,
    urgency: string,
    distanceKm: number | null,
    currentRadius: number,
    responseProbability: number
  ): { totalScore: number; scoreBreakdown: any } {
    let compatibilityScore = 40;
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
    let predictedResponseBonus = Math.round(responseProbability * 10);

    const totalScore = Math.min(
      100,
      compatibilityScore +
        exactBonus +
        availabilityScore +
        emergencyScore +
        proximityScore +
        experienceScore +
        predictedResponseBonus
    );

    return {
      totalScore,
      scoreBreakdown: {
        compatibility: compatibilityScore,
        exactMatchBonus: exactBonus,
        availability: availabilityScore,
        emergencyReadiness: emergencyScore,
        proximity: proximityScore,
        experience: experienceScore,
        predictedResponseBonus,
      },
    };
  }

  /**
   * Generates systematic healthcare escalation plan when nearby candidates are insufficient
   */
  private static generateEscalationPlan(
    radiusKm: number,
    request: any
  ): Array<{ priority: number; action: string; description: string }> {
    return [
      {
        priority: 1,
        action: 'Expand Geographic Boundary',
        description: `Extend geographic search envelope beyond ${radiusKm}km up to 100km regional boundary.`,
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
  }
}
