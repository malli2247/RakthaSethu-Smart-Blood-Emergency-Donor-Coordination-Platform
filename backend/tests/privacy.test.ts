import { describe, it, expect } from 'vitest';
import { maskPhoneNumber, maskEmail, sanitizeDonorView } from '../src/utils/privacy';

describe('Privacy & PII Protection Utilities', () => {
  describe('maskPhoneNumber', () => {
    it('masks Indian and international mobile numbers appropriately', () => {
      const masked = maskPhoneNumber('+919876543210');
      expect(masked).toBe('+91 98****3210');
    });

    it('masks 10-digit mobile numbers cleanly', () => {
      const masked = maskPhoneNumber('9876543210');
      expect(masked).toBe('98****3210');
    });

    it('handles short or missing numbers safely without throwing', () => {
      expect(maskPhoneNumber('')).toBe('');
      expect(maskPhoneNumber(null)).toBe('');
      expect(maskPhoneNumber('123')).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('masks email username while preserving domain', () => {
      const masked = maskEmail('rakthasethu_donor@gmail.com');
      expect(masked).toBe('r******r@gmail.com');
      expect(masked).toContain('@gmail.com');
    });

    it('handles short username safely', () => {
      expect(maskEmail('ab@hospital.org')).toBe('a*@hospital.org');
    });

    it('handles missing or malformed email values', () => {
      expect(maskEmail(null)).toBe('');
      expect(maskEmail('invalid-email')).toBe('****@****');
    });
  });

  describe('sanitizeDonorView', () => {
    const rawDonor = {
      id: 'donor-1',
      fullName: 'Suresh Varma',
      bloodGroup: 'O_POSITIVE',
      city: 'Hyderabad',
      state: 'Telangana',
      address: 'Plot 42, Jubilee Hills, Road No 10',
      latitude: 17.432,
      longitude: 78.407,
      user: {
        id: 'u-1',
        phone: '+919876543210',
        email: 'suresh@example.com',
      },
    };

    it('redacts exact street address, coordinates, and masks phone/email for unauthorized viewers', () => {
      const sanitized = sanitizeDonorView(rawDonor, false);

      expect(sanitized.user.phone).toBe('+91 98****3210');
      expect(sanitized.user.email).toBe('s****h@example.com');
      expect(sanitized.address).toBe('Hyderabad, Telangana');
      expect(sanitized.address).not.toContain('Plot 42');
      expect(sanitized.latitude).toBeUndefined();
      expect(sanitized.longitude).toBeUndefined();
    });

    it('reveals full details when viewer has verified permission', () => {
      const full = sanitizeDonorView(rawDonor, true);

      expect(full.user.phone).toBe('+919876543210');
      expect(full.user.email).toBe('suresh@example.com');
      expect(full.address).toBe('Plot 42, Jubilee Hills, Road No 10');
      expect(full.latitude).toBe(17.432);
      expect(full.longitude).toBe(78.407);
    });
  });
});
