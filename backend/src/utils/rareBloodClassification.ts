import { BloodGroupType, ALL_BLOOD_GROUPS, BLOOD_GROUP_LABELS } from './compatibility';

export type RarityLevel = 'COMMON' | 'MODERATE' | 'RARE' | 'VERY_RARE';

export type PrivacyTierLevel = 'STANDARD' | 'ENHANCED' | 'MAXIMUM';

export interface BloodGroupRarityMetadata {
  bloodGroup: string;
  label: string;
  rarityLevel: RarityLevel;
  isRare: boolean;
  prevalencePercentageApproxIndia: number;
  specialHandlingRequired: boolean;
  privacyTier: PrivacyTierLevel;
  description: string;
}

/**
 * Authoritative Indian epidemiological & clinical rarity classification.
 * Configurable with safe defaults:
 * - Common: O+, B+, A+ (~85-90% of Indian population)
 * - Moderate: AB+, A- (~6-8%)
 * - Rare: B-, O-, AB- (~2-4%)
 * - Very Rare / Ultra Rare: Bombay Phenotype (hh / Oh, ~0.0004% in India, 1 in 10,000 in Mumbai/Maharashtra), Rh-null, INRA
 */
export const RARE_BLOOD_CLASSIFICATION_REGISTRY: Record<string, BloodGroupRarityMetadata> = {
  O_POSITIVE: {
    bloodGroup: 'O_POSITIVE',
    label: 'O+',
    rarityLevel: 'COMMON',
    isRare: false,
    prevalencePercentageApproxIndia: 37.1,
    specialHandlingRequired: false,
    privacyTier: 'STANDARD',
    description: 'High prevalence common blood group.',
  },
  B_POSITIVE: {
    bloodGroup: 'B_POSITIVE',
    label: 'B+',
    rarityLevel: 'COMMON',
    isRare: false,
    prevalencePercentageApproxIndia: 32.2,
    specialHandlingRequired: false,
    privacyTier: 'STANDARD',
    description: 'High prevalence common blood group in Indian subcontinent.',
  },
  A_POSITIVE: {
    bloodGroup: 'A_POSITIVE',
    label: 'A+',
    rarityLevel: 'COMMON',
    isRare: false,
    prevalencePercentageApproxIndia: 21.4,
    specialHandlingRequired: false,
    privacyTier: 'STANDARD',
    description: 'Moderate-high prevalence common blood group.',
  },
  AB_POSITIVE: {
    bloodGroup: 'AB_POSITIVE',
    label: 'AB+',
    rarityLevel: 'MODERATE',
    isRare: false,
    prevalencePercentageApproxIndia: 6.8,
    specialHandlingRequired: false,
    privacyTier: 'ENHANCED',
    description: 'Universal RBC recipient; moderate prevalence.',
  },
  A_NEGATIVE: {
    bloodGroup: 'A_NEGATIVE',
    label: 'A-',
    rarityLevel: 'MODERATE',
    isRare: true,
    prevalencePercentageApproxIndia: 0.6,
    specialHandlingRequired: true,
    privacyTier: 'ENHANCED',
    description: 'Rh-negative group with low regional availability.',
  },
  B_NEGATIVE: {
    bloodGroup: 'B_NEGATIVE',
    label: 'B-',
    rarityLevel: 'RARE',
    isRare: true,
    prevalencePercentageApproxIndia: 0.8,
    specialHandlingRequired: true,
    privacyTier: 'MAXIMUM',
    description: 'Rare Rh-negative group requiring elevated privacy protection.',
  },
  O_NEGATIVE: {
    bloodGroup: 'O_NEGATIVE',
    label: 'O-',
    rarityLevel: 'RARE',
    isRare: true,
    prevalencePercentageApproxIndia: 1.4,
    specialHandlingRequired: true,
    privacyTier: 'MAXIMUM',
    description: 'Universal red blood cell donor; critical emergency asset under maximum privacy protection.',
  },
  AB_NEGATIVE: {
    bloodGroup: 'AB_NEGATIVE',
    label: 'AB-',
    rarityLevel: 'RARE',
    isRare: true,
    prevalencePercentageApproxIndia: 0.2,
    specialHandlingRequired: true,
    privacyTier: 'MAXIMUM',
    description: 'Rarest ABO/Rh group in India (<0.5%). High vulnerability to enumeration.',
  },
  // Rare antigen phenotypes & Bombay phenotype
  BOMBAY_PHENOTYPE: {
    bloodGroup: 'BOMBAY_PHENOTYPE',
    label: 'Bombay (hh / Oh)',
    rarityLevel: 'VERY_RARE',
    isRare: true,
    prevalencePercentageApproxIndia: 0.004,
    specialHandlingRequired: true,
    privacyTier: 'MAXIMUM',
    description: 'Extremely rare absence of H antigen. Can receive blood strictly from another Bombay phenotype donor.',
  },
  RH_NULL: {
    bloodGroup: 'RH_NULL',
    label: 'Rh-null (Golden Blood)',
    rarityLevel: 'VERY_RARE',
    isRare: true,
    prevalencePercentageApproxIndia: 0.0001,
    specialHandlingRequired: true,
    privacyTier: 'MAXIMUM',
    description: 'Lacks all 61 Rh antigens. Worldwide rarity under absolute maximum privacy protection.',
  },
};

/**
 * Checks if a blood group is considered rare or requires enhanced privacy protections.
 */
export function isRareBloodGroup(bloodGroup?: string | null): boolean {
  if (!bloodGroup) return false;
  const normalized = bloodGroup.trim().toUpperCase();
  const meta = RARE_BLOOD_CLASSIFICATION_REGISTRY[normalized];
  if (meta) {
    return meta.isRare;
  }
  // Any group ending in _NEGATIVE is treated as rare by default
  return normalized.includes('NEGATIVE');
}

/**
 * Retrieves rarity classification metadata.
 */
export function getBloodGroupRarity(bloodGroup?: string | null): BloodGroupRarityMetadata {
  if (!bloodGroup) {
    return RARE_BLOOD_CLASSIFICATION_REGISTRY['O_POSITIVE'];
  }
  const normalized = bloodGroup.trim().toUpperCase();
  return (
    RARE_BLOOD_CLASSIFICATION_REGISTRY[normalized] || {
      bloodGroup: normalized,
      label: normalized,
      rarityLevel: normalized.includes('NEGATIVE') ? 'RARE' : 'COMMON',
      isRare: normalized.includes('NEGATIVE'),
      prevalencePercentageApproxIndia: 1.0,
      specialHandlingRequired: normalized.includes('NEGATIVE'),
      privacyTier: normalized.includes('NEGATIVE') ? 'MAXIMUM' : 'STANDARD',
      description: 'Standard clinical blood group classification.',
    }
  );
}

/**
 * Converts exact distance in km into coarse, non-triangulatable distance bands.
 * Anti-Triangulation Rule:
 * Never return exact numbers like "7.32 km" because repeated queries with slightly
 * modified centers or radii allow mathematical trilateration of a donor's residence.
 */
export function getCoarseDistanceBand(distanceKm: number | null | undefined, isRare: boolean = false): string {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return 'Regional service area';
  }

  if (isRare) {
    // Rare donors get even broader distance bands to prevent triangulation
    if (distanceKm <= 15) {
      return 'Within primary metropolitan area (< 15 km)';
    }
    if (distanceKm <= 35) {
      return 'Within regional district (15–35 km)';
    }
    if (distanceKm <= 75) {
      return 'Within inter-district corridor (35–75 km)';
    }
    return 'State-wide network (> 75 km)';
  }

  // Standard blood group coarse bands
  if (distanceKm <= 10) {
    return 'Nearby (< 10 km)';
  }
  if (distanceKm <= 25) {
    return 'Regional area (10–25 km)';
  }
  if (distanceKm <= 50) {
    return 'Extended regional area (25–50 km)';
  }
  return 'State-wide match (50–100 km)';
}
