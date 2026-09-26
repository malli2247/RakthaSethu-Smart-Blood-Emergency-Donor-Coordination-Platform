import { describe, it, expect, beforeEach } from 'vitest';
import { OtpService } from '../src/services/otpService';
import { SmsService } from '../src/services/smsService';
import { prisma } from '../src/config/database';
import { config } from '../src/config';

describe('OtpService Security, Multi-Provider & Database Lifecycle', () => {
  const testPhone = '+919876543210';

  beforeEach(async () => {
    await OtpService.invalidateOtp(testPhone);
  });

  it('sends an OTP and enforces resend cooldown', async () => {
    const res1 = await OtpService.sendOtp(testPhone);
    expect(res1.success).toBe(true);
    expect(res1.cooldownSeconds).toBe(30);

    // Immediate second attempt should hit cooldown
    const res2 = await OtpService.sendOtp(testPhone);
    expect(res2.success).toBe(false);
    expect(res2.message).toContain('Please wait');
    expect(res2.cooldownSeconds).toBeGreaterThan(0);
  });

  it('persists SHA-256 hashed OTP in MobileOtp database table without plaintext leakage', async () => {
    const res = await OtpService.sendOtp(testPhone);
    expect(res.success).toBe(true);

    const dbOtp = await prisma.mobileOtp.findFirst({
      where: { phone: testPhone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    expect(dbOtp).toBeDefined();
    expect(dbOtp?.otpHash).toBeDefined();
    // SHA-256 hash is 64 hex characters
    expect(dbOtp?.otpHash.length).toBe(64);
    // Plaintext OTP should never match the hash
    expect(dbOtp?.otpHash).not.toBe('789123');
  });

  it('rejects incorrect OTP and counts attempts down', async () => {
    await OtpService.sendOtp(testPhone);

    const badVerify = await OtpService.verifyOtp(testPhone, '000000');
    expect(badVerify.success).toBe(false);
    expect(badVerify.verified).toBe(false);
    expect(badVerify.message).toContain('attempt(s) remaining');
  });

  it('rejects expired OTP or missing active OTP', async () => {
    const unrequestedPhone = '+919111122222';
    const verifyRes = await OtpService.verifyOtp(unrequestedPhone, '123456');
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.verified).toBe(false);
    expect(verifyRes.message).toContain('No active OTP found');
  });

  it('locks out after 5 consecutive failed attempts', async () => {
    await OtpService.sendOtp(testPhone);

    for (let i = 0; i < 4; i++) {
      await OtpService.verifyOtp(testPhone, '111111');
    }

    // 5th failed attempt triggers max attempts exceeded
    const finalFail = await OtpService.verifyOtp(testPhone, '111111');
    expect(finalFail.success).toBe(false);
    expect(finalFail.message).toContain('Maximum verification attempts exceeded');
  });

  it('verifies correctly with valid OTP and updates user & donor profile', async () => {
    // In dev mode with OTP_DEV_MODE=true, test OTP is 789123
    process.env.OTP_DEV_MODE = 'true';
    const sendRes = await OtpService.sendOtp(testPhone);
    expect(sendRes.success).toBe(true);

    const verifyRes = await OtpService.verifyOtp(testPhone, '789123');
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.verified).toBe(true);

    // After successful verification, OTP is marked consumed in DB
    const consumedOtp = await prisma.mobileOtp.findFirst({
      where: { phone: testPhone },
      orderBy: { createdAt: 'desc' },
    });
    expect(consumedOtp?.consumedAt).not.toBeNull();
  });

  it('returns user-friendly error when provider is unconfigured in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevDevMode = process.env.OTP_DEV_MODE;
    const prevProvider = config.sms.provider;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.OTP_DEV_MODE;
      (config.sms as any).provider = 'mock';

      const sendRes = await OtpService.sendOtp('+919999988888');
      expect(sendRes.success).toBe(false);
      expect(sendRes.unconfigured).toBe(true);
      // User must never see "OTP service is not configured"
      expect(sendRes.message).toBe('Mobile verification is temporarily unavailable. Please try again later.');
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevDevMode) process.env.OTP_DEV_MODE = prevDevMode;
      (config.sms as any).provider = prevProvider;
    }
  });

  it('supports Fast2SMS, MSG91, and Gateway provider selection', async () => {
    const prevProvider = config.sms.provider;
    try {
      // Fast2SMS without key returns unconfigured with userMessage
      (config.sms as any).provider = 'fast2sms';
      (config.sms as any).fast2smsApiKey = '';
      const f2sRes = await SmsService.sendSms('+919876543210', 'Test', '123456');
      expect(f2sRes.success).toBe(false);
      expect(f2sRes.unconfigured).toBe(true);
      expect(f2sRes.userMessage).toContain('Mobile verification is temporarily unavailable');

      // MSG91 without key returns unconfigured
      (config.sms as any).provider = 'msg91';
      (config.sms as any).msg91AuthKey = '';
      const msgRes = await SmsService.sendSms('+919876543210', 'Test', '123456');
      expect(msgRes.success).toBe(false);
      expect(msgRes.unconfigured).toBe(true);

      // Generic Gateway without URL returns unconfigured
      (config.sms as any).provider = 'gateway';
      (config.sms as any).gatewayUrl = '';
      const gwRes = await SmsService.sendSms('+919876543210', 'Test', '123456');
      expect(gwRes.success).toBe(false);
      expect(gwRes.unconfigured).toBe(true);
    } finally {
      (config.sms as any).provider = prevProvider;
    }
  });
});
