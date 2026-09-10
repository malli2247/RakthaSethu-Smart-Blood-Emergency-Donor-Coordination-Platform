import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { sendSuccess, AppError } from '../../utils/response';

// Helper to generate access & refresh tokens
function generateTokens(user: { id: string; email: string; role: string; isVerified: boolean }) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };

  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: (config.jwt.accessExpiration as any),
  });

  const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: (config.jwt.refreshExpiration as any),
  });

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, phone, role, donorData, patientData, hospitalData, bloodBankData, volunteerData } =
      req.body;

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existing) {
      throw new AppError('An account with this email or phone already exists.', 409, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Initial verification: Donors, Patients, Attendants and Volunteers are verified immediately;
    // Hospitals and Blood Banks require Admin verification
    const isAutoVerified = ['DONOR', 'PATIENT', 'ATTENDANT', 'VOLUNTEER', 'ADMIN'].includes(role);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          phone,
          role,
          isVerified: isAutoVerified,
        },
      });

      // Role specific sub-profile creation
      if (role === 'DONOR' && donorData) {
        await tx.donorProfile.create({
          data: {
            userId: newUser.id,
            fullName: donorData.fullName,
            dateOfBirth: new Date(donorData.dateOfBirth),
            gender: donorData.gender,
            bloodGroup: donorData.bloodGroup,
            city: donorData.city,
            state: donorData.state,
            address: donorData.address,
            latitude: donorData.latitude,
            longitude: donorData.longitude,
            lastDonationDate: donorData.lastDonationDate ? new Date(donorData.lastDonationDate) : null,
            consentGiven: donorData.consentGiven ?? true,
            hidePhoneNumber: donorData.hidePhoneNumber ?? false,
            hideExactAddress: donorData.hideExactAddress ?? true,
          },
        });
      } else if (role === 'PATIENT' && patientData) {
        await tx.patientProfile.create({
          data: {
            userId: newUser.id,
            fullName: patientData.fullName,
            dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth) : null,
            gender: patientData.gender,
            bloodGroup: patientData.bloodGroup,
            emergencyContactName: patientData.emergencyContactName,
            emergencyContactPhone: patientData.emergencyContactPhone,
            city: patientData.city,
            state: patientData.state,
            address: patientData.address,
          },
        });
      } else if (role === 'HOSPITAL' && hospitalData) {
        await tx.hospital.create({
          data: {
            userId: newUser.id,
            name: hospitalData.name,
            licenseNumber: hospitalData.licenseNumber,
            address: hospitalData.address,
            city: hospitalData.city,
            state: hospitalData.state,
            latitude: hospitalData.latitude,
            longitude: hospitalData.longitude,
            contactPerson: hospitalData.contactPerson,
            contactPhone: hospitalData.contactPhone,
            verificationStatus: 'PENDING',
          },
        });
      } else if (role === 'BLOOD_BANK' && bloodBankData) {
        await tx.bloodBank.create({
          data: {
            userId: newUser.id,
            name: bloodBankData.name,
            licenseNumber: bloodBankData.licenseNumber,
            address: bloodBankData.address,
            city: bloodBankData.city,
            state: bloodBankData.state,
            latitude: bloodBankData.latitude,
            longitude: bloodBankData.longitude,
            contactPerson: bloodBankData.contactPerson,
            contactPhone: bloodBankData.contactPhone,
            storageCapacity: bloodBankData.storageCapacity || 1000,
            verificationStatus: 'PENDING',
          },
        });
      } else if (role === 'VOLUNTEER' && volunteerData) {
        await tx.volunteer.create({
          data: {
            userId: newUser.id,
            fullName: volunteerData.fullName,
            serviceAreaCity: volunteerData.serviceAreaCity,
            serviceAreaState: volunteerData.serviceAreaState,
            skills: volunteerData.skills,
          },
        });
      }

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Welcome to RakthaSethu',
        message:
          role === 'DONOR'
            ? 'Thank you for registering as a blood donor! Your altruism can save lives.'
            : 'Your account has been created successfully.',
        type: 'SYSTEM_NOTICE',
      },
    });

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
        accessToken,
        refreshToken,
      },
      'Registration successful',
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        donorProfile: true,
        patientProfile: true,
        hospitalProfile: true,
        bloodBankProfile: true,
        volunteerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Determine primary display name & profile summary
    let profileData: any = null;
    let displayName = user.email.split('@')[0];

    if (user.donorProfile) {
      profileData = user.donorProfile;
      displayName = user.donorProfile.fullName;
    } else if (user.patientProfile) {
      profileData = user.patientProfile;
      displayName = user.patientProfile.fullName;
    } else if (user.hospitalProfile) {
      profileData = user.hospitalProfile;
      displayName = user.hospitalProfile.name;
    } else if (user.bloodBankProfile) {
      profileData = user.bloodBankProfile;
      displayName = user.bloodBankProfile.name;
    } else if (user.volunteerProfile) {
      profileData = user.volunteerProfile;
      displayName = user.volunteerProfile.fullName;
    }

    sendSuccess(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          displayName,
          profile: profileData,
        },
        accessToken,
        refreshToken,
      },
      'Login successful'
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // Check if token exists and is valid
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || new Date() > storedToken.expiresAt) {
      throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Rotate refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const tokens = generateTokens(storedToken.user);

    const newExpires = new Date();
    newExpires.setDate(newExpires.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: storedToken.user.id,
        expiresAt: newExpires,
      },
    });

    sendSuccess(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        donorProfile: true,
        patientProfile: true,
        hospitalProfile: true,
        bloodBankProfile: true,
        volunteerProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let displayName = user.email;
    let profile: any = null;

    if (user.donorProfile) {
      profile = user.donorProfile;
      displayName = user.donorProfile.fullName;
    } else if (user.patientProfile) {
      profile = user.patientProfile;
      displayName = user.patientProfile.fullName;
    } else if (user.hospitalProfile) {
      profile = user.hospitalProfile;
      displayName = user.hospitalProfile.name;
    } else if (user.bloodBankProfile) {
      profile = user.bloodBankProfile;
      displayName = user.bloodBankProfile.name;
    } else if (user.volunteerProfile) {
      profile = user.volunteerProfile;
      displayName = user.volunteerProfile.fullName;
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      displayName,
      profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    sendSuccess(res, null, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
}
