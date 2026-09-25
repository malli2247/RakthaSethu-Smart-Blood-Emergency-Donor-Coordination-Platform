export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DONOR: 'DONOR',
  PATIENT: 'PATIENT',
  ATTENDANT: 'ATTENDANT',
  HOSPITAL: 'HOSPITAL',
  BLOOD_BANK: 'BLOOD_BANK',
  VOLUNTEER: 'VOLUNTEER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const BloodGroup = {
  A_POSITIVE: 'A_POSITIVE',
  A_NEGATIVE: 'A_NEGATIVE',
  B_POSITIVE: 'B_POSITIVE',
  B_NEGATIVE: 'B_NEGATIVE',
  AB_POSITIVE: 'AB_POSITIVE',
  AB_NEGATIVE: 'AB_NEGATIVE',
  O_POSITIVE: 'O_POSITIVE',
  O_NEGATIVE: 'O_NEGATIVE',
} as const;
export type BloodGroup = (typeof BloodGroup)[keyof typeof BloodGroup];

export const UrgencyLevel = {
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type UrgencyLevel = (typeof UrgencyLevel)[keyof typeof UrgencyLevel];

export const RequestStatus = {
  PENDING: 'PENDING',
  MATCHING: 'MATCHING',
  DONOR_CONTACTED: 'DONOR_CONTACTED',
  DONOR_ACCEPTED: 'DONOR_ACCEPTED',
  DONATION_CONFIRMED: 'DONATION_CONFIRMED',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REJECTED: 'REJECTED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const MatchStatus = {
  PENDING: 'PENDING',
  NOTIFIED: 'NOTIFIED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const VerificationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const InventoryStatus = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  EXPIRED: 'EXPIRED',
  DISCARDED: 'DISCARDED',
} as const;
export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus];

export const ComponentType = {
  WHOLE_BLOOD: 'WHOLE_BLOOD',
  PACKED_RED_CELLS: 'PACKED_RED_CELLS',
  PLATELETS: 'PLATELETS',
  FRESH_FROZEN_PLASMA: 'FRESH_FROZEN_PLASMA',
  CRYOPRECIPITATE: 'CRYOPRECIPITATE',
} as const;
export type ComponentType = (typeof ComponentType)[keyof typeof ComponentType];

export const NotificationType = {
  NEW_REQUEST: 'NEW_REQUEST',
  MATCHING_DONOR_FOUND: 'MATCHING_DONOR_FOUND',
  DONOR_ACCEPTED: 'DONOR_ACCEPTED',
  DONOR_DECLINED: 'DONOR_DECLINED',
  REQUEST_FULFILLED: 'REQUEST_FULFILLED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  EMERGENCY_ALERT: 'EMERGENCY_ALERT',
  ACCOUNT_VERIFICATION: 'ACCOUNT_VERIFICATION',
  SYSTEM_NOTICE: 'SYSTEM_NOTICE',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
