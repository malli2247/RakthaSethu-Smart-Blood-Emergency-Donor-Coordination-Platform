export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DONOR'
  | 'PATIENT'
  | 'ATTENDANT'
  | 'HOSPITAL'
  | 'BLOOD_BANK'
  | 'VOLUNTEER';

export type BloodGroup =
  | 'A_POSITIVE'
  | 'A_NEGATIVE'
  | 'B_POSITIVE'
  | 'B_NEGATIVE'
  | 'AB_POSITIVE'
  | 'AB_NEGATIVE'
  | 'O_POSITIVE'
  | 'O_NEGATIVE';

export type UrgencyLevel = 'NORMAL' | 'HIGH' | 'CRITICAL';

export type RequestStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'MATCHING'
  | 'DONORS_FOUND'
  | 'DONOR_CONTACTED'
  | 'DONOR_ACCEPTED'
  | 'DONOR_TRAVELLING'
  | 'DONOR_ARRIVED'
  | 'DONATION_STARTED'
  | 'DONATION_COMPLETED'
  | 'DONATION_VERIFICATION_PENDING'
  | 'DONATION_CONFIRMED'
  | 'BLOOD_RECEIVED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'FULFILLMENT_ISSUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'UNABLE_TO_FULFILL';

export type MatchStatus =
  | 'PENDING'
  | 'NOTIFIED'
  | 'ACCEPTED'
  | 'TRAVELLING'
  | 'ARRIVED'
  | 'DONATION_STARTED'
  | 'DONATION_COMPLETED'
  | 'CONFIRMED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type DonationStatus =
  | 'STARTED'
  | 'COMPLETED'
  | 'VERIFICATION_PENDING'
  | 'CONFIRMED'
  | 'REJECTED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type ComponentType =
  | 'WHOLE_BLOOD'
  | 'PACKED_RED_CELLS'
  | 'PLATELETS'
  | 'FRESH_FROZEN_PLASMA'
  | 'CRYOPRECIPITATE';

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'EXPIRED' | 'DISCARDED';

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  displayName?: string;
  profile?: any;
}

export interface DonorProfile {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: BloodGroup;
  city: string;
  state: string;
  address: string;
  latitude?: number;
  longitude?: number;
  lastDonationDate?: string;
  isEligible: boolean;
  isAvailable: boolean;
  emergencyAvailable: boolean;
  totalDonations: number;
  livesSavedEstimate: number;
  consentGiven: boolean;
  hidePhoneNumber: boolean;
  hideExactAddress: boolean;
  nextEligibleDate?: string;
  daysUntilEligible?: number;
}

export interface BloodRequest {
  id: string;
  requesterId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  hospitalName: string;
  hospitalCity: string;
  hospitalState: string;
  hospitalAddress: string;
  latitude?: number;
  longitude?: number;
  requiredBy: string;
  urgency: UrgencyLevel;
  medicalReason?: string;
  contactName: string;
  contactPhone: string;
  status: RequestStatus;
  unitsFulfilled?: number;
  additionalNotes?: string;
  createdAt: string;
  matches?: DonorMatch[];
  donations?: DonationRecord[];
  receipts?: BloodReceipt[];
  _count?: { matches: number };
}

export interface DonorMatch {
  id: string;
  requestId: string;
  donorId: string;
  compatibilityScore: number;
  distanceKm?: number;
  status: MatchStatus;
  contactedAt: string;
  respondedAt?: string;
  startedTravellingAt?: string;
  arrivedAt?: string;
  responseNotes?: string;
  donor?: DonorProfile;
  request?: BloodRequest;
  phone?: string;
  maskedPhone?: string;
  fullName?: string;
  bloodGroup?: BloodGroup;
  city?: string;
  state?: string;
}

export interface BloodReceipt {
  id: string;
  requestId: string;
  receiverId: string;
  unitsReceived: number;
  confirmed: boolean;
  confirmedAt?: string;
  reportedIssue?: string;
  notes?: string;
  createdAt: string;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  requestId?: string;
  hospitalId?: string;
  bloodBankId?: string;
  bloodGroup: BloodGroup;
  units: number;
  donationDate: string;
  certificateCode: string;
  status: DonationStatus;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  hospital?: { name: string; city: string };
  bloodBank?: { name: string; city: string };
  donor?: { fullName: string; bloodGroup: string; user?: { phone?: string; email?: string } };
}

export interface BloodInventoryItem {
  id: string;
  bloodBankId: string;
  bloodGroup: BloodGroup;
  componentType: ComponentType;
  units: number;
  batchNumber: string;
  collectionDate: string;
  expiryDate: string;
  status: InventoryStatus;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  address: string;
  city: string;
  state: string;
  bloodGroupsNeeded: string;
  targetUnits: number;
  registeredCount: number;
  status: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
  category?: 'EMERGENCY' | 'MATCH' | 'DONATION' | 'INVENTORY' | 'SYSTEM' | 'ACCOUNT';
  link?: string;
  actionUrl?: string;
  metadata?: string;
  isRead: boolean;
  readAt?: string;
  expiresAt?: string;
  deliveryChannel?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  inAppAlerts: boolean;
  soundEnabled: boolean;
  browserNotifications: boolean;
  criticalOnly: boolean;
  vibrationEnabled?: boolean;
  emergencyAlerts?: boolean;
  bloodRequests?: boolean;
  donationUpdates?: boolean;
  systemAlerts?: boolean;
  campaignAlerts?: boolean;
}
