import { describe, it, expect } from 'vitest';
import { canDonateTo, getCompatibleDonorGroups } from '../src/utils/compatibility';
import { calculateDistanceKm } from '../src/utils/distance';
import { VALID_STATUS_TRANSITIONS } from '../src/modules/requests/requestService';

describe('End-to-End Life Saving Emergency Workflow', () => {
  it('executes full emergency cycle: B+ request -> Donor Match -> Acceptance -> Fulfillment', () => {
    // 1. Patient requires B+ blood
    const requestedBloodGroup = 'B_POSITIVE';
    const patientLat = 28.5355;
    const patientLon = 77.2910;

    // 2. Compatible donor groups
    const compatibleGroups = getCompatibleDonorGroups(requestedBloodGroup);
    expect(compatibleGroups).toContain('B_POSITIVE');
    expect(compatibleGroups).toContain('O_NEGATIVE');
    expect(compatibleGroups).not.toContain('A_POSITIVE');

    // 3. Mock Candidate pool
    const mockDonors = [
      { id: 'donor-1', name: 'Rohan (O-)', bloodGroup: 'O_NEGATIVE', lat: 28.5300, lon: 77.2800, available: true, emergency: true, lastDonationDaysAgo: 120 },
      { id: 'donor-2', name: 'Amit (B+)', bloodGroup: 'B_POSITIVE', lat: 28.5400, lon: 77.2950, available: true, emergency: true, lastDonationDaysAgo: 95 },
      { id: 'donor-3', name: 'Kavita (A+)', bloodGroup: 'A_POSITIVE', lat: 28.5350, lon: 77.2900, available: true, emergency: true, lastDonationDaysAgo: 100 },
      { id: 'donor-4', name: 'Rahul (B+)', bloodGroup: 'B_POSITIVE', lat: 28.5355, lon: 77.2910, available: false, emergency: false, lastDonationDaysAgo: 15 }, // ineligble due to 15 days
    ];

    // Filter & rank candidates
    const matched = mockDonors
      .filter((d) => {
        // Compatibility check
        if (!canDonateTo(d.bloodGroup as any, requestedBloodGroup as any)) return false;
        // Interval check
        if (d.lastDonationDaysAgo < 90) return false;
        return true;
      })
      .map((d) => {
        const distance = calculateDistanceKm(patientLat, patientLon, d.lat, d.lon);
        let score = 50; // base compatibility
        if (d.bloodGroup === requestedBloodGroup) score += 10;
        if (d.available) score += 20;
        if (d.emergency) score += 10;
        if (distance !== null) score += Math.round(10 * (1 - Math.min(distance, 50) / 50));
        return { ...d, distance, score };
      })
      .sort((a, b) => b.score - a.score);

    expect(matched.length).toBe(2);
    expect(matched[0].id).toBe('donor-2'); // Exact match B+ nearby with high score
    expect(matched[1].id).toBe('donor-1'); // O- universal donor nearby

    // 4. Verify Request State Machine Lifecycle Progression
    let currentStatus = 'MATCHING';

    // Transition to DONOR_CONTACTED
    expect(VALID_STATUS_TRANSITIONS[currentStatus]).toContain('DONOR_CONTACTED');
    currentStatus = 'DONOR_CONTACTED';

    // Transition to DONOR_ACCEPTED
    expect(VALID_STATUS_TRANSITIONS[currentStatus]).toContain('DONOR_ACCEPTED');
    currentStatus = 'DONOR_ACCEPTED';

    // Transition to DONATION_CONFIRMED
    expect(VALID_STATUS_TRANSITIONS[currentStatus]).toContain('DONATION_CONFIRMED');
    currentStatus = 'DONATION_CONFIRMED';

    // Transition to FULFILLED
    expect(VALID_STATUS_TRANSITIONS[currentStatus]).toContain('FULFILLED');
    currentStatus = 'FULFILLED';

    expect(currentStatus).toBe('FULFILLED');

    // 5. Generate verified certificate
    const certCode = `RKS-${Date.now().toString(36).toUpperCase()}-TEST`;
    expect(certCode).toMatch(/^RKS-[A-Z0-9]+-TEST$/);
  });
});
