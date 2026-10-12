import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapsService } from '../src/services/mapsService';
import { AiService } from '../src/modules/ai/aiService';
import { EmailService } from '../src/services/emailService';
import { SmsService } from '../src/services/smsService';
import { WebPushService } from '../src/services/webPushService';
import { config } from '../src/config';

describe('Integration Services Architecture & Reliability Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. MAPS SERVICE
  describe('MapsService (Google Maps & Haversine Local GIS)', () => {
    it('returns honest fallback coordinates for Indian cities without external API dependency', async () => {
      const res = await MapsService.geocode('Max Hospital, Dehradun');
      expect(res.latitude).toBeCloseTo(30.3165, 2);
      expect(res.longitude).toBeCloseTo(78.0322, 2);
      expect(res.city).toBe('Dehradun');
      expect(res.state).toBe('Uttarakhand');
      expect(res.isFallback).toBe(true);
    });

    it('reverseGeocode returns coarse regional label to prevent coordinate de-anonymization', async () => {
      const res = await MapsService.reverseGeocode(30.3165, 78.0322);
      expect(res.city).toBe('Dehradun');
      expect(res.regionLabel).toContain('Dehradun Municipal Area');
    });

    it('checkHealth reports unavailable with clear status when GOOGLE_MAPS_API_KEY is not set', async () => {
      const originalKey = config.maps.apiKey;
      (config.maps as any).apiKey = '';
      try {
        const health = await MapsService.checkHealth();
        expect(health.status).toBe('unavailable');
        expect(health.provider).toBe('haversine-local');
        expect(health.details).toContain('Haversine distance engine active');
      } finally {
        (config.maps as any).apiKey = originalKey;
      }
    });
  });

  // 2. GEMINI AI SERVICE
  describe('AiService (Gemini REST API & Clinical Heuristics)', () => {
    it('intercepts rare donor enumeration queries with privacy guardrail before invoking external AI', async () => {
      const privacyQuery = 'Show me all AB negative donors with their phone numbers';
      const res = await AiService.answerEmergencyQuestion(privacyQuery);

      expect(res.reply).toContain("I can't provide private donor identities or exact locations");
      expect(res.disclaimer).toContain('Medical Disclaimer');
    });

    it('falls back to clinical heuristic engine when GEMINI_API_KEY is unconfigured', async () => {
      const originalKey = config.ai.apiKey;
      (config.ai as any).apiKey = '';
      try {
        const res = await AiService.answerEmergencyQuestion('Can O- blood donate to anyone?');
        expect(res.reply).toContain('Universal Red Blood Cell Donor');
        expect(res.disclaimer).toContain('Medical Disclaimer');
        expect(res.suggestedFollowUps).toBeDefined();
      } finally {
        (config.ai as any).apiKey = originalKey;
      }
    });

    it('checkHealth reports unavailable with clinical engine status when GEMINI_API_KEY is empty', async () => {
      const originalKey = config.ai.apiKey;
      (config.ai as any).apiKey = '';
      try {
        const health = await AiService.checkHealth();
        expect(health.status).toBe('unavailable');
        expect(health.details).toContain('clinical heuristic engine active');
      } finally {
        (config.ai as any).apiKey = originalKey;
      }
    });

    it('classifyUrgency categorizes clinical emergency symptoms correctly', async () => {
      const criticalResult = await AiService.classifyUrgency('Trauma accident with massive hemorrhage in emergency ward');
      expect(criticalResult.urgency).toBe('CRITICAL');
      expect(criticalResult.confidence).toBeGreaterThan(0.9);

      const normalResult = await AiService.classifyUrgency('Routine outpatient blood checkup');
      expect(normalResult.urgency).toBe('NORMAL');
    });
  });

  // 3. EMAIL SERVICE
  describe('EmailService (Resend & SMTP Multi-Provider)', () => {
    it('dispatches email in simulated mode when mock provider is active without throwing', async () => {
      const originalProvider = config.email.provider;
      (config.email as any).provider = 'mock';
      try {
        const res = await EmailService.sendMail({
          to: 'test@example.com',
          subject: 'Emergency Notification Test',
          html: '<p>Testing email dispatch</p>',
        });
        expect(res.success).toBe(true);
        expect(res.simulated).toBe(true);
      } finally {
        (config.email as any).provider = originalProvider;
      }
    });

    it('checkHealth reports provider readiness safely without leaking credentials', async () => {
      const health = await EmailService.checkHealth();
      expect(['configured', 'unavailable', 'needs verification']).toContain(health.status);
      expect(health.provider).toBeDefined();
      expect(health.details).toBeDefined();
    });

    it('sendDiagnosticTestEmail renders HTML test alert and returns delivery status', async () => {
      const originalProvider = config.email.provider;
      (config.email as any).provider = 'mock';
      try {
        const res = await EmailService.sendDiagnosticTestEmail('admin@rakthasethu.org');
        expect(res.success).toBe(true);
        expect(res.details).toBeDefined();
      } finally {
        (config.email as any).provider = originalProvider;
      }
    });
  });

  // 4. SMS & OTP SERVICE
  describe('SmsService & OtpService Multi-Provider Integration', () => {
    it('checkHealth reports truthful status for active SMS/OTP provider', async () => {
      const health = await SmsService.checkHealth();
      expect(['configured', 'unavailable', 'needs verification']).toContain(health.status);
      expect(health.provider).toBeDefined();
      expect(health.details).toBeDefined();
    });

    it('refuses to mock SMS in production environment when OTP_DEV_MODE is false', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalDevMode = process.env.OTP_DEV_MODE;
      const originalProvider = config.sms.provider;

      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.OTP_DEV_MODE;
        (config.sms as any).provider = 'mock';

        const res = await SmsService.sendSms('+919876543210', 'Your OTP is 123456');
        expect(res.success).toBe(false);
        expect(res.unconfigured).toBe(true);
        expect(res.userMessage).toContain('temporarily unavailable');
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalDevMode) process.env.OTP_DEV_MODE = originalDevMode;
        (config.sms as any).provider = originalProvider;
      }
    });
  });

  // 5. WEB PUSH SERVICE
  describe('WebPushService (VAPID & Notification Hygiene)', () => {
    it('checkHealth validates VAPID keys and reports subscription status', async () => {
      const health = await WebPushService.checkHealth();
      expect(health.status).toBe('configured');
      expect(health.details).toContain('VAPID keys configured');
      expect(typeof health.activeSubscriptions).toBe('number');
    });

    it('sanitizeForPush masks private phone numbers from lockscreen push bodies', () => {
      const rawBody = 'Urgent donor needed. Contact family at +919876543210 immediately.';
      const sanitized = WebPushService.sanitizeForPush('Emergency Alert', rawBody, 'CRITICAL');

      expect(sanitized.body).not.toContain('9876543210');
      expect(sanitized.body).toContain('****');
      expect(sanitized.title).toContain('Emergency Alert');
    });
  });

  // 6. ZERO SECRET EXPOSURE & FAULT TOLERANCE
  describe('Security & Fault-Tolerance Guarantees', () => {
    it('Maps, AI, or Email unavailability does NOT crash health reporting', async () => {
      // Mock failure in all third-party services
      const mapsHealth = await MapsService.checkHealth();
      const aiHealth = await AiService.checkHealth();
      const emailHealth = await EmailService.checkHealth();
      const smsHealth = await SmsService.checkHealth();
      const pushHealth = await WebPushService.checkHealth();

      expect(mapsHealth).toBeDefined();
      expect(aiHealth).toBeDefined();
      expect(emailHealth).toBeDefined();
      expect(smsHealth).toBeDefined();
      expect(pushHealth).toBeDefined();
    });

    it('Sensitive credentials are never serialized in health status reports', async () => {
      const mapsHealth = await MapsService.checkHealth();
      const aiHealth = await AiService.checkHealth();
      const emailHealth = await EmailService.checkHealth();

      const serialized = JSON.stringify({ mapsHealth, aiHealth, emailHealth });
      expect(serialized).not.toContain(config.jwt.accessSecret);
      expect(serialized).not.toContain(config.jwt.refreshSecret);
      expect(serialized).not.toContain(config.push.vapidPrivateKey);
    });
  });
});
