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

const RoleEnum = z.enum([
  'DONOR',
  'PATIENT',
  'ATTENDANT',
  'HOSPITAL',
  'BLOOD_BANK',
  'VOLUNTEER',
  'ADMIN',
]);

export const registerSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: RoleEnum.default('DONOR'),
  phone: z.string().min(10, 'Valid phone number is required'),

  // Donor fields
  donorData: z
    .object({
      fullName: z.string().min(2, 'Full name is required'),
      dateOfBirth: z.string().or(z.date()),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
      bloodGroup: BloodGroupEnum,
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      address: z.string().min(5, 'Address is required'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      lastDonationDate: z.string().or(z.date()).optional().nullable(),
      consentGiven: z.boolean().default(true),
      hidePhoneNumber: z.boolean().default(false),
      hideExactAddress: z.boolean().default(true),
    })
    .optional(),

  // Patient fields
  patientData: z
    .object({
      fullName: z.string().min(2, 'Full name is required'),
      dateOfBirth: z.string().or(z.date()).optional().nullable(),
      gender: z.string().optional(),
      bloodGroup: BloodGroupEnum.optional().nullable(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      address: z.string().optional(),
    })
    .optional(),

  // Hospital fields
  hospitalData: z
    .object({
      name: z.string().min(2, 'Hospital name is required'),
      licenseNumber: z.string().min(4, 'Valid medical license registration is required'),
      address: z.string().min(5, 'Address is required'),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      contactPerson: z.string().min(2, 'Contact person name is required'),
      contactPhone: z.string().min(10, 'Contact phone is required'),
    })
    .optional(),

  // Blood bank fields
  bloodBankData: z
    .object({
      name: z.string().min(2, 'Blood bank name is required'),
      licenseNumber: z.string().min(4, 'Blood bank license number is required'),
      address: z.string().min(5, 'Address is required'),
      city: z.string().min(2, 'City is required'),
      state: z.string().min(2, 'State is required'),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      contactPerson: z.string().min(2, 'Contact person name is required'),
      contactPhone: z.string().min(10, 'Contact phone is required'),
      storageCapacity: z.number().min(1).default(1000),
    })
    .optional(),

  // Volunteer fields
  volunteerData: z
    .object({
      fullName: z.string().min(2, 'Full name is required'),
      serviceAreaCity: z.string().min(2, 'Service area city is required'),
      serviceAreaState: z.string().min(2, 'Service area state is required'),
      skills: z.string().optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

