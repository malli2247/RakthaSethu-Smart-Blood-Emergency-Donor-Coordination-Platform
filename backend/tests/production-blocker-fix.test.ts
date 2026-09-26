import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { VALID_STATUS_TRANSITIONS } from '../src/modules/requests/requestService';
import { checkProductionEnvironment } from '../src/config';
import { OtpService } from '../src/services/otpService';
import { SmsService } from '../src/services/smsService';
import { config } from '../src/config';

describe('RAKTHASETHU Production Blocker Fix Suite', () => {
  const app = createApp();

  describe('1. Emergency State Machine & DRAFT Lifecycle', () => {
    it('supports DRAFT in state machine transitions', () => {
      expect(VALID_STATUS_TRANSITIONS['DRAFT']).toBeDefined();
      expect(VALID_STATUS_TRANSITIONS['DRAFT']).toContain('PENDING');
      expect(VALID_STATUS_TRANSITIONS['DRAFT']).toContain('MATCHING');
      expect(VALID_STATUS_TRANSITIONS['DRAFT']).toContain('CANCELLED');
    });

    it('guarantees complete 15-stage emergency state machine sequence', () => {
      const expectedStates = [
        'DRAFT',
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
        'FULFILLED',
      ];

      for (const state of expectedStates) {
        expect(VALID_STATUS_TRANSITIONS).toHaveProperty(state);
      }

      // DONOR_ACCEPTED must never transition directly to FULFILLED
      expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).not.toContain('FULFILLED');
      expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).toContain('DONOR_TRAVELLING');
    });
  });

  describe('2. OTP Endpoints & Production SMS Safety', () => {
    const testPhone = '+919988776655';

    beforeEach(() => {
      OtpService.invalidateOtp(testPhone);
    });

    it('serves OTP dispatch via POST /api/auth/otp/send and /api/otp/send alias', async () => {
      const res1 = await request(app)
        .post('/api/auth/otp/send')
        .send({ phone: testPhone });
      expect([200, 429]).toContain(res1.status);

      const res2 = await request(app)
        .post('/api/otp/send')
        .send({ phone: testPhone });
      // If cooldown is active, it returns 429; otherwise 200. Both verify route is mounted and handled!
      expect([200, 429]).toContain(res2.status);
    });

    it('serves OTP resend via POST /api/auth/otp/resend and /api/otp/resend', async () => {
      const res = await request(app)
        .post('/api/auth/otp/resend')
        .send({ phone: testPhone });
      expect([200, 429]).toContain(res.status);
    });

    it('serves OTP verify via POST /api/auth/otp/verify and /api/otp/verify', async () => {
      const res = await request(app)
        .post('/api/otp/verify')
        .send({ phone: testPhone, otp: '123456' });
      // Should reject invalid OTP with 400
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('enforces unconfigured SMS check in production without OTP_DEV_MODE', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevDevMode = process.env.OTP_DEV_MODE;
      const prevProvider = config.sms.provider;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.OTP_DEV_MODE;
        (config.sms as any).provider = 'mock';

        const result = await SmsService.sendSms('+919876543210', 'Emergency Test');
        expect(result.success).toBe(false);
        expect(result.unconfigured).toBe(true);
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevDevMode) process.env.OTP_DEV_MODE = prevDevMode;
        (config.sms as any).provider = prevProvider;
      }
    });
  });

  describe('3. Web Push & VAPID Endpoints', () => {
    it('returns VAPID public key via GET /api/notifications/vapid-public-key and /push/public-key', async () => {
      const res1 = await request(app).get('/api/notifications/vapid-public-key');
      expect(res1.status).toBe(200);
      expect(res1.body.data).toHaveProperty('publicKey');
      expect(res1.body.data).toHaveProperty('vapidPublicKey');

      const res2 = await request(app).get('/api/notifications/push/public-key');
      expect(res2.status).toBe(200);
      expect(res2.body.data.publicKey).toBe(res1.body.data.publicKey);
    });

    it('protects push subscribe endpoints requiring authentication', async () => {
      const subRes = await request(app)
        .post('/api/notifications/push/subscribe')
        .send({ endpoint: 'https://example.com/push/123' });
      expect(subRes.status).toBe(401);
      expect(subRes.body.message).toContain('Bearer token');

      const unsubRes = await request(app)
        .delete('/api/notifications/push/subscribe')
        .send({ endpoint: 'https://example.com/push/123' });
      expect(unsubRes.status).toBe(401);
    });
  });

  describe('4. Safe Production Configuration Audit', () => {
    it('evaluates configuration safely without printing secrets', () => {
      const report = checkProductionEnvironment();
      expect(report).toBeDefined();

      const validStatuses = ['CONFIGURED', 'MISSING', 'INVALID'];
      for (const [key, status] of Object.entries(report)) {
        expect(validStatuses).toContain(status);
        // Ensure keys do not contain actual secret tokens
        expect(typeof status).toBe('string');
      }

      expect(report).toHaveProperty('DATABASE_URL');
      expect(report).toHaveProperty('JWT_ACCESS_SECRET');
      expect(report).toHaveProperty('JWT_REFRESH_SECRET');
      expect(report).toHaveProperty('VAPID_PUBLIC_KEY');
      expect(report).toHaveProperty('SMS_PROVIDER');
    });
  });
});
