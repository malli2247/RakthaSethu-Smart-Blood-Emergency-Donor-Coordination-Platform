import { describe, it, expect, beforeEach } from 'vitest';
import { OtpService } from '../src/services/otpService';

describe('OtpService Security & Lifecycle', () => {
  const testPhone = '+919876543210';

  beforeEach(() => {
    OtpService.invalidateOtp(testPhone);
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
});
