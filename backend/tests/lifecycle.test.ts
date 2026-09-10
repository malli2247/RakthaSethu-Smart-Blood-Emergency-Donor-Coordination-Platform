import { describe, it, expect } from 'vitest';
import { VALID_STATUS_TRANSITIONS } from '../src/modules/requests/requestService';

describe('Blood Request Lifecycle State Machine', () => {
  it('should allow valid transitions from PENDING', () => {
    expect(VALID_STATUS_TRANSITIONS['PENDING']).toContain('MATCHING');
    expect(VALID_STATUS_TRANSITIONS['PENDING']).toContain('CANCELLED');
    expect(VALID_STATUS_TRANSITIONS['PENDING']).toContain('REJECTED');
    expect(VALID_STATUS_TRANSITIONS['PENDING']).not.toContain('FULFILLED');
  });

  it('should allow valid flow from MATCHING through to FULFILLED', () => {
    // Flow: MATCHING -> DONOR_CONTACTED -> DONOR_ACCEPTED -> DONATION_CONFIRMED -> FULFILLED
    expect(VALID_STATUS_TRANSITIONS['MATCHING']).toContain('DONOR_CONTACTED');
    expect(VALID_STATUS_TRANSITIONS['DONOR_CONTACTED']).toContain('DONOR_ACCEPTED');
    expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).toContain('DONATION_CONFIRMED');
    expect(VALID_STATUS_TRANSITIONS['DONATION_CONFIRMED']).toContain('FULFILLED');
  });

  it('should treat FULFILLED, CANCELLED, and EXPIRED as terminal states', () => {
    expect(VALID_STATUS_TRANSITIONS['FULFILLED']).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS['CANCELLED']).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS['EXPIRED']).toEqual([]);
    expect(VALID_STATUS_TRANSITIONS['REJECTED']).toEqual([]);
  });

  it('should allow recovery if an accepted donor fails to donate', () => {
    // If DONOR_ACCEPTED fails or cancels, it can transition back to MATCHING
    expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).toContain('MATCHING');
  });
});
