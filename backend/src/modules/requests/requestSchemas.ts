import { z } from 'zod';

const BloodGroupEnum = z.enum([
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]);

const UrgencyEnum = z.enum(['NORMAL', 'HIGH', 'CRITICAL']);

const RequestStatusEnum = z.enum([
  'PENDING',
  'VALIDATING',
  'MATCHING',
  'DONORS_FOUND',
  'DONOR_CONTACTED',
  'DONOR_ACCEPTED',
  'DONOR_TRAVELLING',
  'DONOR_ARRIVED',
  'DONATION_STARTED',
  'DONATION_COMPLETED',
  'DONATION_VERIFICATION_PENDING',
  'DONATION_CONFIRMED',
  'BLOOD_RECEIVED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'FULFILLMENT_ISSUE',
  'CANCELLED',
  'EXPIRED',
  'REJECTED',
  'UNABLE_TO_FULFILL',
]);

export const createBloodRequestSchema = z.object({
  patientName: z.string().min(2, 'Patient name is required'),
  patientAge: z.number().int().positive().optional(),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodGroup: BloodGroupEnum,
  unitsRequired: z.number().int().min(1, 'Units required must be at least 1').default(1),
  hospitalName: z.string().min(2, 'Hospital name is required'),
  hospitalCity: z.string().min(2, 'Hospital city is required'),
  hospitalState: z.string().min(2, 'Hospital state is required'),
  hospitalAddress: z.string().min(5, 'Hospital address is required'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  requiredBy: z.string().or(z.date()),
  urgency: UrgencyEnum.default('NORMAL'),
  medicalReason: z.string().optional(),
  contactName: z.string().min(2, 'Contact person name is required'),
  contactPhone: z.string().min(10, 'Contact phone is required'),
  additionalNotes: z.string().optional(),
});

export const updateBloodRequestStatusSchema = z.object({
  status: RequestStatusEnum,
  notes: z.string().optional(),
});
