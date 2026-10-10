import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { isRareBloodGroup } from '../utils/rareBloodClassification';
import { calculateDistanceKm } from '../utils/distance';

interface QueryRecord {
  timestamp: number;
  ip: string;
  userId?: string;
  bloodGroup: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  radiusKm?: number;
}

export interface AntiTriangulationResult {
  allowed: boolean;
  isSuspicious: boolean;
  violationType?: 'RADIUS_PROBING' | 'COORDINATE_WALKING' | 'RAPID_ENUMERATION' | 'RATE_EXCEEDED';
  reason?: string;
  recommendedCooldownSeconds?: number;
}

/**
 * Anti-Triangulation & Abuse Prevention Engine
 * Prevents malicious actors from mathematically trilaterating rare blood donors'
 * residences or enumerating small-community populations.
 */
export class AntiTriangulationService {
  // In-memory sliding query history (pruned periodically)
  private static queryHistory: QueryRecord[] = [];
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
  private static readonly MAX_RARE_QUERIES_PER_WINDOW = 12; // Maximum rare queries per IP/user per 15 mins
  private static readonly MIN_RADIUS_STEP_DELTA_KM = 3.0; // Prohibits fine-grained delta steps like 5km -> 5.5km
  private static lastPrune = Date.now();

  /**
   * Evaluates an incoming search request against triangulation and enumeration patterns.
   */
  static async evaluateQuery(params: {
    ip: string;
    userId?: string;
    bloodGroup: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    radiusKm?: number;
  }): Promise<AntiTriangulationResult> {
    const now = Date.now();
    this.maybePruneHistory(now);

    const isRare = isRareBloodGroup(params.bloodGroup);

    // Filter relevant historical queries for this actor (by IP or userId)
    const actorHistory = this.queryHistory.filter(
      (q) => (params.userId && q.userId === params.userId) || q.ip === params.ip
    );

    // 1. Check Rapid Enumeration Rate on Rare Blood Groups
    if (isRare) {
      const rareQueriesInWindow = actorHistory.filter(
        (q) => isRareBloodGroup(q.bloodGroup) && now - q.timestamp < this.WINDOW_MS
      );

      if (rareQueriesInWindow.length >= this.MAX_RARE_QUERIES_PER_WINDOW) {
        await this.recordSecurityEvent({
          userId: params.userId,
          ip: params.ip,
          action: 'SUSPICIOUS_ENUMERATION_ATTEMPT',
          details: `Actor exceeded maximum rare donor search threshold (${rareQueriesInWindow.length}/${this.MAX_RARE_QUERIES_PER_WINDOW}) in 15 minutes.`,
        });

        return {
          allowed: false,
          isSuspicious: true,
          violationType: 'RAPID_ENUMERATION',
          reason: 'Excessive search frequency for rare blood groups. Please wait before retrying.',
          recommendedCooldownSeconds: 300,
        };
      }
    }

    // 2. Check Coordinate-Walking (Trilateration via shifting geographical origins)
    if (params.latitude !== undefined && params.longitude !== undefined && isRare) {
      const recentNearbyOriginQueries = actorHistory.filter(
        (q) =>
          q.latitude !== undefined &&
          q.longitude !== undefined &&
          q.bloodGroup === params.bloodGroup &&
          now - q.timestamp < 5 * 60 * 1000 // Last 5 minutes
      );

      // Check if actor is making tiny coordinate shifts (< 5 km apart) repeatedly
      let microShiftCount = 0;
      for (const past of recentNearbyOriginQueries) {
        if (past.latitude && past.longitude) {
          const shiftDist = calculateDistanceKm(
            params.latitude,
            params.longitude,
            past.latitude,
            past.longitude
          );
          if (shiftDist !== null && shiftDist > 0.1 && shiftDist < 4.0) {
            microShiftCount++;
          }
        }
      }

      if (microShiftCount >= 3) {
        await this.recordSecurityEvent({
          userId: params.userId,
          ip: params.ip,
          action: 'SUSPICIOUS_TRIANGULATION_ATTEMPT',
          details: `Detected coordinate-walking pattern for rare group ${params.bloodGroup}. Multiple micro-shifts detected.`,
        });

        return {
          allowed: false,
          isSuspicious: true,
          violationType: 'COORDINATE_WALKING',
          reason: 'Irregular geographic search pattern detected. Location probing is strictly restricted.',
          recommendedCooldownSeconds: 180,
        };
      }
    }

    // 3. Check Radius Probing (Incrementally expanding radius to isolate a boundary donor)
    if (params.radiusKm !== undefined && isRare) {
      const recentRadiusQueries = actorHistory.filter(
        (q) =>
          q.bloodGroup === params.bloodGroup &&
          q.radiusKm !== undefined &&
          now - q.timestamp < 3 * 60 * 1000 // Last 3 minutes
      );

      let fineGrainRadiusChanges = 0;
      for (const past of recentRadiusQueries) {
        if (past.radiusKm !== undefined) {
          const radiusDelta = Math.abs(params.radiusKm - past.radiusKm);
          if (radiusDelta > 0 && radiusDelta < this.MIN_RADIUS_STEP_DELTA_KM) {
            fineGrainRadiusChanges++;
          }
        }
      }

      if (fineGrainRadiusChanges >= 3) {
        await this.recordSecurityEvent({
          userId: params.userId,
          ip: params.ip,
          action: 'SUSPICIOUS_RADIUS_PROBING',
          details: `Detected fine-grained radius probing for ${params.bloodGroup}.`,
        });

        return {
          allowed: false,
          isSuspicious: true,
          violationType: 'RADIUS_PROBING',
          reason: 'Fine-grained radius probing is not permitted. Please use standard emergency search modes.',
          recommendedCooldownSeconds: 120,
        };
      }
    }

    // Record valid search in sliding history
    this.queryHistory.push({
      timestamp: now,
      ip: params.ip,
      userId: params.userId,
      bloodGroup: params.bloodGroup,
      latitude: params.latitude,
      longitude: params.longitude,
      city: params.city,
      radiusKm: params.radiusKm,
    });

    return { allowed: true, isSuspicious: false };
  }

  /**
   * Records a security event in the database audit log.
   */
  private static async recordSecurityEvent(data: {
    userId?: string;
    ip?: string;
    action: string;
    details: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entity: 'DonorSearchSecurity',
          details: data.details,
          ipAddress: data.ip || null,
        },
      });
      logger.warn(`[AntiTriangulation] Security event recorded: ${data.action} - ${data.details}`);
    } catch (err) {
      logger.error('[AntiTriangulation] Failed to record security event', err);
    }
  }

  /**
   * Periodically prunes expired records from memory.
   */
  private static maybePruneHistory(now: number): void {
    if (now - this.lastPrune > 60000) {
      this.queryHistory = this.queryHistory.filter((q) => now - q.timestamp < this.WINDOW_MS);
      this.lastPrune = now;
    }
  }

  /**
   * Resets internal history (used during testing).
   */
  static resetForTesting(): void {
    this.queryHistory = [];
  }
}
