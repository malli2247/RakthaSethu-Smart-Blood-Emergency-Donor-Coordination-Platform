import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface DonorPredictionInput {
  donorId: string;
  distanceKm: number | null;
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  hourOfDay?: number;
  dayOfWeek?: number;
  emergencyAvailable?: boolean;
  totalDonations?: number;
  historicalResponseRate?: number;
}

export interface DonorPredictionOutput {
  donorId: string;
  responseProbability: number; // 0.0 - 1.0
  probabilityPercent: number;  // 0 - 100
  confidenceScore: number;     // 0.0 - 1.0
  contributingFactors: Array<{ factor: string; impact: string; isPositive: boolean }>;
}

export class ResponsePredictionService {
  private static readonly MODEL_VERSION = '1.2.0-calibrated';

  /**
   * Predicts probability that a donor will actively respond to an emergency request
   */
  static async predictDonorResponse(input: DonorPredictionInput): Promise<DonorPredictionOutput> {
    const now = new Date();
    const hour = input.hourOfDay ?? now.getHours();
    const day = input.dayOfWeek ?? now.getDay();
    const isEmergency = input.urgency === 'CRITICAL' || input.urgency === 'HIGH';
    const distance = input.distanceKm ?? 15.0;

    let logit = 0.5; // Base logit prior (~62% base probability)
    const factors: Array<{ factor: string; impact: string; isPositive: boolean }> = [];

    // 1. Distance factor (Closer donors respond dramatically faster and more reliably)
    if (distance <= 5) {
      logit += 0.85;
      factors.push({ factor: 'Immediate Proximity (<= 5 km)', impact: '+18%', isPositive: true });
    } else if (distance <= 10) {
      logit += 0.40;
      factors.push({ factor: 'Nearby Radius (<= 10 km)', impact: '+8%', isPositive: true });
    } else if (distance > 25) {
      logit -= 0.70;
      factors.push({ factor: 'Extended Distance (> 25 km)', impact: '-15%', isPositive: false });
    }

    // 2. Time-of-day circadian availability factor
    // Peak hours: 8 AM to 9 PM
    if (hour >= 8 && hour <= 21) {
      logit += 0.35;
      factors.push({ factor: 'Daytime Awake Hours', impact: '+7%', isPositive: true });
    } else if (hour >= 23 || hour <= 5) {
      // Late night / early morning
      if (input.emergencyAvailable) {
        logit -= 0.20;
        factors.push({ factor: 'Late Night (Compensated by Emergency Ready)', impact: '-4%', isPositive: false });
      } else {
        logit -= 0.90;
        factors.push({ factor: 'Late Night Sleep Window (Non-emergency ready)', impact: '-20%', isPositive: false });
      }
    }

    // 3. Emergency Availability Willingness Flag
    if (input.emergencyAvailable) {
      logit += 0.60;
      factors.push({ factor: 'Emergency Volunteer Opt-in Active', impact: '+12%', isPositive: true });
    }

    // 4. Past Donation Experience & Platform Loyalty
    const donations = input.totalDonations ?? 0;
    if (donations >= 5) {
      logit += 0.55;
      factors.push({ factor: 'Experienced Veteran Donor (5+ Donations)', impact: '+11%', isPositive: true });
    } else if (donations >= 2) {
      logit += 0.25;
      factors.push({ factor: 'Repeat Donor (2+ Donations)', impact: '+5%', isPositive: true });
    }

    // 5. Historical acceptance rate on matches
    const historicalRate = input.historicalResponseRate ?? 0.75;
    if (historicalRate >= 0.85) {
      logit += 0.45;
      factors.push({ factor: 'High Historical Response Rate (>= 85%)', impact: '+9%', isPositive: true });
    } else if (historicalRate < 0.40) {
      logit -= 0.60;
      factors.push({ factor: 'Low Historical Response History (< 40%)', impact: '-12%', isPositive: false });
    }

    // Calibrated sigmoid transformation: 1 / (1 + exp(-z))
    const rawProbability = 1 / (1 + Math.exp(-logit));
    // Clamp between 0.10 and 0.98 for statistical realism
    const probability = Math.max(0.10, Math.min(0.98, Number(rawProbability.toFixed(3))));
    const probabilityPercent = Math.round(probability * 100);

    const confidenceScore = Number((0.80 + Math.min(0.18, donations * 0.03)).toFixed(2));

    const result: DonorPredictionOutput = {
      donorId: input.donorId,
      responseProbability: probability,
      probabilityPercent,
      confidenceScore,
      contributingFactors: factors,
    };

    // Record model prediction asynchronously for model evaluation
    prisma.modelPrediction.create({
      data: {
        modelType: 'DONOR_RESPONSE',
        modelVersion: this.MODEL_VERSION,
        entityId: input.donorId,
        inputFeatures: JSON.stringify({ distance, hour, day, isEmergency, donations }),
        predictionOutput: JSON.stringify(result),
        confidence: confidenceScore,
      },
    }).catch((err) => logger.warn('[ResponsePredictionService] Async audit log failed', err));

    return result;
  }
}
