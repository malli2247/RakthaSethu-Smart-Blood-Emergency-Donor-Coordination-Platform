export type BloodGroupType =
  | 'A_POSITIVE'
  | 'A_NEGATIVE'
  | 'B_POSITIVE'
  | 'B_NEGATIVE'
  | 'AB_POSITIVE'
  | 'AB_NEGATIVE'
  | 'O_POSITIVE'
  | 'O_NEGATIVE';

export const ALL_BLOOD_GROUPS: BloodGroupType[] = [
  'O_NEGATIVE',
  'O_POSITIVE',
  'A_NEGATIVE',
  'A_POSITIVE',
  'B_NEGATIVE',
  'B_POSITIVE',
  'AB_NEGATIVE',
  'AB_POSITIVE',
];

/**
 * Human-readable display mapping
 */
export const BLOOD_GROUP_LABELS: Record<BloodGroupType, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

/**
 * Reciprocal compatibility matrix for Red Blood Cells (RBC):
 * Map key: Recipient Blood Group
 * Map value: List of compatible Donor Blood Groups
 */
export const RBC_RECIPIENT_COMPATIBILITY_MAP: Record<BloodGroupType, BloodGroupType[]> = {
  O_NEGATIVE: ['O_NEGATIVE'],
  O_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE'],
  A_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE'],
  A_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'],
  B_NEGATIVE: ['O_NEGATIVE', 'B_NEGATIVE'],
  B_POSITIVE: ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'],
  AB_NEGATIVE: ['O_NEGATIVE', 'A_NEGATIVE', 'B_NEGATIVE', 'AB_NEGATIVE'],
  AB_POSITIVE: [
    'O_NEGATIVE',
    'O_POSITIVE',
    'A_NEGATIVE',
    'A_POSITIVE',
    'B_NEGATIVE',
    'B_POSITIVE',
    'AB_NEGATIVE',
    'AB_POSITIVE',
  ],
};

/**
 * Reciprocal compatibility matrix for Donors:
 * Map key: Donor Blood Group
 * Map value: List of compatible Recipient Blood Groups
 */
export const RBC_DONOR_COMPATIBILITY_MAP: Record<BloodGroupType, BloodGroupType[]> = {
  O_NEGATIVE: [
    'O_NEGATIVE',
    'O_POSITIVE',
    'A_NEGATIVE',
    'A_POSITIVE',
    'B_NEGATIVE',
    'B_POSITIVE',
    'AB_NEGATIVE',
    'AB_POSITIVE',
  ],
  O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
  A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
  B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
  AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
  AB_POSITIVE: ['AB_POSITIVE'],
};

/**
 * Checks if donor blood group can donate to recipient blood group (RBC rules).
 */
export function canDonateTo(donor: BloodGroupType, recipient: BloodGroupType): boolean {
  const compatibleDonors = RBC_RECIPIENT_COMPATIBILITY_MAP[recipient];
  return Boolean(compatibleDonors && compatibleDonors.includes(donor));
}

/**
 * Returns list of blood groups that can safely donate to the specified recipient.
 */
export function getCompatibleDonorGroups(recipient: BloodGroupType): BloodGroupType[] {
  return RBC_RECIPIENT_COMPATIBILITY_MAP[recipient] || [];
}

/**
 * Returns list of blood groups that can safely receive blood from the specified donor.
 */
export function getCompatibleRecipientGroups(donor: BloodGroupType): BloodGroupType[] {
  return RBC_DONOR_COMPATIBILITY_MAP[donor] || [];
}
