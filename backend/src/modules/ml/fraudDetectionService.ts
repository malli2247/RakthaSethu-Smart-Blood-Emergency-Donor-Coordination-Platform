import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface RequestTrustAssessment {
  requestId: string;
  trustScore: number;       // 0 - 100
  riskCategory: 'LOW_RISK' | 'MODERATE_RISK' | 'REVIEW_REQUIRED';
  flags: string[];
  requiresAdminReview: boolean;
  assessmentTimestamp: string;
}

export class FraudDetectionService {
  private static readonly MODEL_VERSION = '1.1.0-rules-calibrated';

  /**
   * Assesses an emergency blood request for trust and suspicious pattern signals
   */
  static async evaluateRequestTrust(requestId: string): Promise<RequestTrustAssessment> {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            phone: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error(`Blood request ${requestId} not found for trust evaluation`);
    }

    let score = 50; // Neutral starting score
    const flags: string[] = [];

    // 1. Requester Account Age
    const accountAgeDays = (Date.now() - new Date(request.requester.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays >= 30) {
      score += 20;
    } else if (accountAgeDays >= 7) {
      score += 10;
    } else if (accountAgeDays < 1) {
      flags.push('Newly created requester account (< 24 hours)');
    }

    // 2. Verified contact credentials
    if (request.requester.isVerified) {
      score += 20;
    } else {
      score -= 10;
      flags.push('Unverified requester account');
    }

    if (request.contactPhone && request.contactPhone.length >= 10) {
      score += 10;
    } else {
      score -= 15;
      flags.push('Incomplete contact telephone number');
    }

    // 3. Request Frequency in past 48 hours
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const pastRequestsCount = await prisma.bloodRequest.count({
      where: {
        requesterId: request.requesterId,
        createdAt: { gte: twoDaysAgo },
      },
    });

    if (pastRequestsCount === 1) {
      score += 10; // Normal first request in 48 hours
    } else if (pastRequestsCount >= 4) {
      score -= 30;
      flags.push(`Unusually high request velocity: ${pastRequestsCount} requisitions in 48 hours`);
    }

    // 4. Clinical Details Verification
    if (request.hospitalName && request.hospitalCity) {
      score += 10;
    } else {
      score -= 15;
      flags.push('Missing hospital or city specification');
    }

    if (request.medicalReason && request.medicalReason.trim().length >= 10) {
      score += 5;
    }

    // Normalize final score between 10 and 99
    const finalScore = Math.max(10, Math.min(99, score));
    const requiresAdminReview = finalScore < 45;

    let riskCategory: 'LOW_RISK' | 'MODERATE_RISK' | 'REVIEW_REQUIRED' = 'LOW_RISK';
    if (finalScore < 45) {
      riskCategory = 'REVIEW_REQUIRED';
    } else if (finalScore < 70) {
      riskCategory = 'MODERATE_RISK';
    }

    const assessment: RequestTrustAssessment = {
      requestId: request.id,
      trustScore: finalScore,
      riskCategory,
      flags,
      requiresAdminReview,
      assessmentTimestamp: new Date().toISOString(),
    };

    // Log prediction to database
    prisma.modelPrediction.create({
      data: {
        modelType: 'REQUEST_TRUST',
        modelVersion: this.MODEL_VERSION,
        entityId: request.id,
        inputFeatures: JSON.stringify({ accountAgeDays, pastRequestsCount, isVerified: request.requester.isVerified }),
        predictionOutput: JSON.stringify(assessment),
        confidence: 0.91,
      },
    }).catch((err) => logger.warn('[FraudDetectionService] Failed to record prediction audit', err));

    return assessment;
  }
}
