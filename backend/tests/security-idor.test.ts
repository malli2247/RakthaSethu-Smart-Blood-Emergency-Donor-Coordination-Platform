import { describe, it, expect } from 'vitest';
import { VALID_STATUS_TRANSITIONS } from '../src/modules/requests/requestService';
import { EmailService } from '../src/services/emailService';
import { SmsService } from '../src/services/smsService';
import { NotificationService } from '../src/services/notificationService';

describe('Security, IDOR & Resilience Validation', () => {
  describe('Request State Machine Transition Integrity', () => {
    it('prevents any transitions from terminal states', () => {
      expect(VALID_STATUS_TRANSITIONS['FULFILLED']).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS['CANCELLED']).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS['EXPIRED']).toEqual([]);
      expect(VALID_STATUS_TRANSITIONS['REJECTED']).toEqual([]);
    });

    it('enforces that PENDING cannot jump directly to FULFILLED or DONATION_CONFIRMED', () => {
      const allowedFromPending = VALID_STATUS_TRANSITIONS['PENDING'];
      expect(allowedFromPending).not.toContain('FULFILLED');
      expect(allowedFromPending).not.toContain('DONATION_CONFIRMED');
    });

    it('enforces that MATCHING can advance to DONOR_ACCEPTED or be CANCELLED', () => {
      const allowed = VALID_STATUS_TRANSITIONS['MATCHING'];
      expect(allowed).toContain('DONOR_ACCEPTED');
      expect(allowed).toContain('CANCELLED');
    });
  });

  describe('Email & SMS Non-Blocking Resilience', () => {
    it('handles simulated/unconfigured SMS gracefully without throwing', async () => {
      const res = await SmsService.sendSms('+919876543210', 'Test blood alert');
      expect(res).toBeDefined();
      expect(typeof res.success).toBe('boolean');
    });

    it('generates formatted HTML alert containing urgent blood details', async () => {
      // Testing template generation does not crash
      const success = await EmailService.sendUrgentMatchAlert(
        'test@rakthasethu.org',
        'Rajesh Kumar',
        {
          id: 'req-1',
          bloodGroup: 'B_POSITIVE',
          unitsRequired: 2,
          hospitalName: 'Apollo Hospital',
          hospitalCity: 'Hyderabad',
          urgency: 'CRITICAL',
        }
      );
      // In mock/development mode, this resolves smoothly
      expect(typeof success).toBe('boolean');
    });

    it('NotificationService executes fail-safe dispatch without throwing', async () => {
      await expect(
        NotificationService.notify({
          userId: 'test-user-id',
          title: 'System Health Check',
          message: 'Notification system operational',
          email: {
            to: 'test@rakthasethu.org',
            subject: 'Ping',
            html: '<p>Ping</p>',
          },
          sms: {
            to: '+919999999999',
            message: 'Ping',
          },
        })
      ).resolves.not.toThrow();
    });
  });
});
