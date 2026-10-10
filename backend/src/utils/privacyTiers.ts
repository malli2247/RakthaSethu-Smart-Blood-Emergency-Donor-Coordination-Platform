import { getCoarseDistanceBand, isRareBloodGroup } from './rareBloodClassification';
import { maskPhoneNumber, maskEmail } from './privacy';

export type PrivacyTier =
  | 'PUBLIC'
  | 'PRIVATE'
  | 'AUTHORIZED_MATCH'
  | 'ACCEPTED_COORDINATION'
  | 'ADMIN_RESTRICTED';

/**
 * Minimum number of entities required before public numerical aggregates can be exposed.
 * Section 8: Anti-Enumeration Protection.
 */
export const MIN_PUBLIC_AGGREGATE_THRESHOLD = 5;

/**
 * Strict Privacy-Preserving DTO for donor matches.
 * Section 11: Never return raw donor database records or identifiers.
 *
 * EXCLUSION LIST:
 * - donorId / userId
 * - fullName
 * - phone / email
 * - address / street / landmark
 * - latitude / longitude
 * - exactDistance (e.g. 7.32 km)
 * - medicalHistory / lastDonationDate
 * - internalScore / AI confidence
 */
export interface RareDonorMatchDTO {
  matchId: string;
  requestId: string;
  compatibilityStatus: 'COMPATIBLE';
  availabilityStatus: 'AVAILABLE' | 'CONTACTED' | 'DISPATCHED' | 'ACCEPTED' | 'STANDBY';
  verificationStatus: 'VERIFIED';
  distanceBand: string;
  regionLabel: string;
  notificationStatus: 'PENDING' | 'NOTIFIED' | 'DELIVERED' | 'RESPONDED';
  isRareDonor: boolean;
  bloodGroup: string;
  bloodGroupLabel: string;
  coordinatedAt?: string;
  // Controlled coordination attributes (Only populated in ACCEPTED_COORDINATION tier)
  coordinationChannelAvailable?: boolean;
  coordinationRoomId?: string;
  maskedCoordinatorContact?: string;
}

/**
 * Transforms an internal candidate/match into a privacy-safe RareDonorMatchDTO.
 * Strips all sensitive columns unconditionally.
 */
export function toRareDonorMatchDTO(
  match: {
    id: string;
    requestId: string;
    donorId?: string;
    distanceKm?: number | null;
    status?: string;
    contactedAt?: Date | string | null;
    respondedAt?: Date | string | null;
    donor?: {
      bloodGroup: string;
      city?: string;
      state?: string;
      coarseRegion?: string | null;
      user?: { phone?: string | null; email?: string | null };
    };
    bloodGroup?: string;
    city?: string;
    state?: string;
  },
  tier: PrivacyTier = 'AUTHORIZED_MATCH',
  roomInfo?: { roomId: string } | null
): RareDonorMatchDTO {
  const bloodGroup = match.donor?.bloodGroup || match.bloodGroup || 'UNKNOWN';
  const isRare = isRareBloodGroup(bloodGroup);
  const rawDistance = match.distanceKm;

  // Generate coarse distance band
  const distanceBand = getCoarseDistanceBand(rawDistance, isRare);

  // Coarse region label (City/District level only, never street address)
  const city = match.donor?.city || match.city || '';
  const state = match.donor?.state || match.state || '';
  const regionLabel = match.donor?.coarseRegion
    ? match.donor.coarseRegion
    : city && state
    ? `${city} District, ${state}`
    : city
    ? `${city} Area`
    : 'Local Metropolitan Area';

  const isAccepted = match.status === 'ACCEPTED';
  const statusStr = match.status || 'PENDING';

  let availabilityStatus: RareDonorMatchDTO['availabilityStatus'] = 'STANDBY';
  if (isAccepted) {
    availabilityStatus = 'ACCEPTED';
  } else if (match.contactedAt) {
    availabilityStatus = 'CONTACTED';
  } else {
    availabilityStatus = 'AVAILABLE';
  }

  let notificationStatus: RareDonorMatchDTO['notificationStatus'] = 'PENDING';
  if (match.respondedAt) {
    notificationStatus = 'RESPONDED';
  } else if (match.contactedAt) {
    notificationStatus = 'DELIVERED';
  }

  const dto: RareDonorMatchDTO = {
    matchId: match.id,
    requestId: match.requestId,
    compatibilityStatus: 'COMPATIBLE',
    availabilityStatus,
    verificationStatus: 'VERIFIED',
    distanceBand,
    regionLabel,
    notificationStatus,
    isRareDonor: isRare,
    bloodGroup,
    bloodGroupLabel: bloodGroup.replace('_POSITIVE', '+').replace('_NEGATIVE', '-'),
  };

  // Only if donor has actively accepted and coordination tier is authorized
  if (tier === 'ACCEPTED_COORDINATION' && isAccepted) {
    dto.coordinationChannelAvailable = true;
    if (roomInfo?.roomId) {
      dto.coordinationRoomId = roomInfo.roomId;
    }
    // Masked coordinator contact for relay
    if (match.donor?.user?.phone) {
      dto.maskedCoordinatorContact = maskPhoneNumber(match.donor.user.phone);
    }
  }

  return dto;
}

/**
 * Sanitizes aggregate public counts to protect against small-sample enumeration.
 * Example: If count of rare donors in a specific city is 1 or 2, exposing "1 donor"
 * could uniquely identify an individual.
 */
export function getPrivacySafeCount(count: number, threshold: number = MIN_PUBLIC_AGGREGATE_THRESHOLD): {
  isSuppressed: boolean;
  displayValue: string;
  actualCount?: number;
} {
  if (count <= 0) {
    return { isSuppressed: false, displayValue: '0', actualCount: 0 };
  }

  if (count < threshold) {
    return {
      isSuppressed: true,
      displayValue: `< ${threshold} (Verified in network)`,
    };
  }

  return {
    isSuppressed: false,
    displayValue: `${count}`,
    actualCount: count,
  };
}
