import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/config/database';
import { RequestService, VALID_STATUS_TRANSITIONS } from '../src/modules/requests/requestService';

describe('Blood Request Lifecycle Full State Machine & Privacy Audit', () => {
  it('enforces that DONOR_ACCEPTED is not FULFILLED', () => {
    // Section 1 & 3: Acceptance must NOT equal fulfillment
    expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).toContain('DONOR_TRAVELLING');
    expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).toContain('DONOR_ARRIVED');
    expect(VALID_STATUS_TRANSITIONS['DONOR_ACCEPTED']).not.toContain('FULFILLED');
  });

  it('enforces that DONOR_ARRIVED is not FULFILLED', () => {
    // Section 19: Arrived is not fulfilled
    expect(VALID_STATUS_TRANSITIONS['DONOR_ARRIVED']).toContain('DONATION_STARTED');
    expect(VALID_STATUS_TRANSITIONS['DONOR_ARRIVED']).not.toContain('FULFILLED');
  });

  it('enforces that DONATION_STARTED cannot transition directly to FULFILLED', () => {
    expect(VALID_STATUS_TRANSITIONS['DONATION_STARTED']).toContain('DONATION_COMPLETED');
    expect(VALID_STATUS_TRANSITIONS['DONATION_STARTED']).not.toContain('FULFILLED');
  });

  it('supports the complete progression chain from PENDING to FULFILLED', () => {
    let state = 'PENDING';
    const chain = [
      'MATCHING',
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

    for (const nextState of chain) {
      const allowed = VALID_STATUS_TRANSITIONS[state];
      expect(allowed).toContain(nextState);
      state = nextState;
    }

    expect(state).toBe('FULFILLED');
  });

  it('supports PARTIALLY_FULFILLED and return to MATCHING', () => {
    expect(VALID_STATUS_TRANSITIONS['DONATION_CONFIRMED']).toContain('PARTIALLY_FULFILLED');
    expect(VALID_STATUS_TRANSITIONS['PARTIALLY_FULFILLED']).toContain('MATCHING');
  });

  it('supports FULFILLMENT_ISSUE when receiver or hospital reports problem', () => {
    expect(VALID_STATUS_TRANSITIONS['DONOR_ARRIVED']).toContain('FULFILLMENT_ISSUE');
    expect(VALID_STATUS_TRANSITIONS['DONATION_CONFIRMED']).toContain('FULFILLMENT_ISSUE');
    expect(VALID_STATUS_TRANSITIONS['BLOOD_RECEIVED']).toContain('FULFILLMENT_ISSUE');
    expect(VALID_STATUS_TRANSITIONS['FULFILLMENT_ISSUE']).toContain('FULFILLED');
    expect(VALID_STATUS_TRANSITIONS['FULFILLMENT_ISSUE']).toContain('UNABLE_TO_FULFILL');
  });
});
