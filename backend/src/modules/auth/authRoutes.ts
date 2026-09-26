import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendOtp,
  verifyOtp,
  resendOtp,
} from './authController';
import { validate } from '../../middleware/validate';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './authSchemas';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), login);
authRouter.post('/refresh-token', validate({ body: refreshTokenSchema }), refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', authenticateToken, getMe);
authRouter.post(
  '/change-password',
  authenticateToken,
  validate({ body: changePasswordSchema }),
  changePassword
);
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPassword
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPassword
);
authRouter.post(
  '/verify-email',
  validate({ body: verifyEmailSchema }),
  verifyEmail
);

// Mobile OTP Verification Endpoints
authRouter.post('/otp/send', authLimiter, optionalAuth, sendOtp);
authRouter.post('/otp/verify', authLimiter, optionalAuth, verifyOtp);
authRouter.post('/otp/resend', authLimiter, optionalAuth, resendOtp);

// Standalone OTP Router for /api/otp alias
export const otpRouter = Router();
otpRouter.post('/send', authLimiter, optionalAuth, sendOtp);
otpRouter.post('/verify', authLimiter, optionalAuth, verifyOtp);
otpRouter.post('/resend', authLimiter, optionalAuth, resendOtp);

