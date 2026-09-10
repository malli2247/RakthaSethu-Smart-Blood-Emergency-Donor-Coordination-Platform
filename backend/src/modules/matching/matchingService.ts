import { prisma } from '../../config/database';
import { canDonateTo, getCompatibleDonorGroups, BloodGroupType, BLOOD_GROUP_LABELS } from '../../utils/compatibility';
import { calculateDistanceKm } from '../../utils/distance';

export interface DonorMatchCandidate {
  donorId: string;
  userId: string;
  fullName: string;
  bloodGroup: BloodGroupType;
  bloodGroupLabel: string;
  city: string;
  state: string;
  distanceKm: number | null;
  score: number;
  isEligible: boolean;
  isAvailable: boolean;
  emergencyAvailable: boolean;
  totalDonations: number;
  maskedPhone: string;
  phone?: string; // only if match accepted
  exactAddress?: string; // only if match accepted
  matchStatus?: string;
  responseNotes?: string | null;
}

export interface FindDonorsOptions {
  bloodGroup: BloodGroupType;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  urgency?: 'NORMAL' | 'HIGH' | 'CRITICAL';
  maxRadiusKm?: number;
  limit?: number;
  requireAvailable?: boolean;
}

export class MatchingService {
  /**
   * Find and rank compatible donors for a blood request or search query
   */
  static async findRankedDonors(options: FindDonorsOptions): Promise<DonorMatchCandidate[]> {
    const {
      bloodGroup,
      latitude,
      longitude,
      city,
      state,
      urgency = 'NORMAL',
      maxRadiusKm = 100,
      limit = 20,
      requireAvailable = false,
    } = options;

    const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

    // Query active donors with compatible blood group
    const donors = await prisma.donorProfile.findMany({
      where: {
        bloodGroup: {
          in: compatibleGroups as any,
        },
        user: {
          isActive: true,
        },
        ...(requireAvailable ? { isAvailable: true } : {}),
        isEligible: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    const candidates: DonorMatchCandidate[] = [];

    for (const donor of donors) {
      // 1. Verify blood compatibility
      if (!canDonateTo(donor.bloodGroup as BloodGroupType, bloodGroup)) {
        continue;
      }

      // 2. Check donation interval (90 days)
      if (donor.lastDonationDate) {
        const diffDays =
          (Date.now() - new Date(donor.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 90) {
          continue; // Ineligible due to recent donation
        }
      }

      // 3. Distance calculation
      let distanceKm: number | null = null;
      if (latitude && longitude && donor.latitude && donor.longitude) {
        distanceKm = calculateDistanceKm(latitude, longitude, donor.latitude, donor.longitude);
        if (distanceKm !== null && distanceKm > maxRadiusKm) {
          continue; // Out of requested radius
        }
      } else if (city && donor.city.toLowerCase() !== city.toLowerCase()) {
        // Fallback city check if no coordinates
        if (state && donor.state.toLowerCase() !== state.toLowerCase()) {
          continue;
        }
      }

      // 4. Calculate multi-factor match score (0 - 100)
      let score = 40; // Base score for 100% compatible blood

      // Exact blood match gets a slight bonus over universal compatibility
      if (donor.bloodGroup === bloodGroup) {
        score += 10;
      }

      // Availability score
      if (donor.isAvailable) {
        score += 20;
      }

      // Emergency willingness bonus for urgent requests
      if (urgency === 'CRITICAL' && donor.emergencyAvailable) {
        score += 15;
      } else if (urgency === 'HIGH' && donor.emergencyAvailable) {
        score += 10;
      }

      // Distance score (Closer = higher score up to 15 points)
      if (distanceKm !== null) {
        const proximityScore = Math.max(0, 15 * (1 - Math.min(distanceKm, 100) / 100));
        score += Math.round(proximityScore);
      } else if (city && donor.city.toLowerCase() === city.toLowerCase()) {
        score += 10; // Same city bonus
      }

      // Experience / reliability bonus (up to 5 points)
      score += Math.min(5, donor.totalDonations);

      // Mask phone number for privacy: "+91 98****1234"
      const rawPhone = donor.user.phone || '';
      const maskedPhone =
        rawPhone.length > 5
          ? `${rawPhone.slice(0, 4)}****${rawPhone.slice(-3)}`
          : 'Contact via platform';

      candidates.push({
        donorId: donor.id,
        userId: donor.userId,
        fullName: donor.fullName,
        bloodGroup: donor.bloodGroup as BloodGroupType,
        bloodGroupLabel: BLOOD_GROUP_LABELS[donor.bloodGroup as BloodGroupType] || donor.bloodGroup,
        city: donor.city,
        state: donor.state,
        distanceKm,
        score: Math.min(100, score),
        isEligible: donor.isEligible,
        isAvailable: donor.isAvailable,
        emergencyAvailable: donor.emergencyAvailable,
        totalDonations: donor.totalDonations,
        maskedPhone,
      });
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, limit);
  }

  /**
   * Execute matching for an existing BloodRequest record
   */
  static async matchRequest(requestId: string, maxDonorsToNotify = 10) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error(`Blood request with id ${requestId} not found`);
    }

    const candidates = await this.findRankedDonors({
      bloodGroup: request.bloodGroup as BloodGroupType,
      latitude: request.latitude,
      longitude: request.longitude,
      city: request.hospitalCity,
      state: request.hospitalState,
      urgency: request.urgency as any,
      limit: maxDonorsToNotify,
    });

    // Create DonorMatch records in database
    for (const candidate of candidates) {
      await prisma.donorMatch.upsert({
        where: {
          requestId_donorId: {
            requestId: request.id,
            donorId: candidate.donorId,
          },
        },
        create: {
          requestId: request.id,
          donorId: candidate.donorId,
          compatibilityScore: candidate.score,
          distanceKm: candidate.distanceKm,
          status: 'NOTIFIED',
        },
        update: {
          compatibilityScore: candidate.score,
          distanceKm: candidate.distanceKm,
        },
      });

      // Create in-app notification for the donor
      await prisma.notification.create({
        data: {
          userId: candidate.userId,
          title: `Emergency Blood Request: ${request.bloodGroup.replace('_', '+')}`,
          message: `URGENT: ${request.patientName} at ${request.hospitalName} requires ${request.unitsRequired} unit(s) of ${request.bloodGroup}. Urgency: ${request.urgency}.`,
          type: request.urgency === 'CRITICAL' ? 'EMERGENCY_ALERT' : 'NEW_REQUEST',
          link: `/donor/requests`,
        },
      });
    }

    // Update request status to MATCHING
    await prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: 'MATCHING' },
    });

    return candidates;
  }
}
