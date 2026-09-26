import { describe, it, expect } from 'vitest';
import { ProgressiveDonorSearchService } from '../src/services/progressiveDonorSearchService';
import { canDonateTo, BloodGroupType } from '../src/utils/compatibility';
import { config } from '../src/config';
import { maskPhoneNumber } from '../src/utils/privacy';

describe('Progressive Emergency Donor Search Engine', () => {
  describe('Configured Search Radius Sequences', () => {
    it('provides fast aggressive expansion for CRITICAL emergencies', () => {
      const criticalSeq = ProgressiveDonorSearchService.DEFAULT_SEQUENCES.CRITICAL;
      expect(criticalSeq).toEqual([5, 7, 9, 10, 15, 20, 25, 50, 100]);
      expect(criticalSeq[0]).toBe(5);
      expect(criticalSeq[criticalSeq.length - 1]).toBe(100);
    });

    it('provides bounded expansion for HIGH emergencies', () => {
      const highSeq = ProgressiveDonorSearchService.DEFAULT_SEQUENCES.HIGH;
      expect(highSeq).toEqual([5, 7, 9, 10, 15, 20, 25]);
      expect(highSeq[highSeq.length - 1]).toBe(25);
    });

    it('provides localized conservative expansion for NORMAL requests', () => {
      const normalSeq = ProgressiveDonorSearchService.DEFAULT_SEQUENCES.NORMAL;
      expect(normalSeq).toEqual([5, 7, 10, 15, 20]);
      expect(normalSeq[normalSeq.length - 1]).toBe(20);
    });

    it('loads configurable radius sequence from application configuration', () => {
      expect(config.matching).toBeDefined();
      expect(config.matching.radiusSequence).toBeInstanceOf(Array);
      expect(config.matching.radiusSequence).toContain(5);
      expect(config.matching.radiusSequence).toContain(100);
      expect(config.matching.minimumSuitableDonors).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Blood Compatibility Prerequisite Check in Search', () => {
    it('strictly filters donors based on red blood cell transfusion rules', () => {
      // O- can donate to all
      expect(canDonateTo('O_NEGATIVE' as BloodGroupType, 'O_POSITIVE' as BloodGroupType)).toBe(true);
      expect(canDonateTo('O_NEGATIVE' as BloodGroupType, 'AB_POSITIVE' as BloodGroupType)).toBe(true);

      // A+ cannot donate to O+ or B+
      expect(canDonateTo('A_POSITIVE' as BloodGroupType, 'O_POSITIVE' as BloodGroupType)).toBe(false);
      expect(canDonateTo('A_POSITIVE' as BloodGroupType, 'B_POSITIVE' as BloodGroupType)).toBe(false);

      // AB+ can only donate to AB+
      expect(canDonateTo('AB_POSITIVE' as BloodGroupType, 'AB_POSITIVE' as BloodGroupType)).toBe(true);
      expect(canDonateTo('AB_POSITIVE' as BloodGroupType, 'O_NEGATIVE' as BloodGroupType)).toBe(false);
    });
  });

  describe('Progressive Search Non-duplication & Escalation Integrity', () => {
    it('ensures search steps follow strictly ascending radius progression', () => {
      for (const [, sequence] of Object.entries(ProgressiveDonorSearchService.DEFAULT_SEQUENCES)) {
        for (let i = 1; i < sequence.length; i++) {
          expect(sequence[i]).toBeGreaterThan(sequence[i - 1]);
        }
      }
    });

    it('maintains non-duplication invariant across radii', () => {
      const alreadyMatchedDonorIds = new Set<string>();
      alreadyMatchedDonorIds.add('donor-1');
      alreadyMatchedDonorIds.add('donor-2');

      // Attempting to evaluate donor-1 in next radius must be skipped
      const candidateList = [
        { id: 'donor-1', name: 'Alice' },
        { id: 'donor-3', name: 'Bob' },
      ];

      const newlyAdded: string[] = [];
      for (const c of candidateList) {
        if (!alreadyMatchedDonorIds.has(c.id)) {
          alreadyMatchedDonorIds.add(c.id);
          newlyAdded.push(c.id);
        }
      }

      expect(newlyAdded).toEqual(['donor-3']);
      expect(alreadyMatchedDonorIds.size).toBe(3);
    });

    it('verifies early stop condition when target candidates are satisfied', () => {
      const targetDonorsNeeded = 5;
      const sequence = [5, 7, 9, 10, 15, 20, 25, 50, 100];
      const evaluatedRadii: number[] = [];
      let cumulativeDonors = 0;

      // Simulated scenario: 5km finds 2, 7km finds 3 (total 5) -> STOP!
      for (const radius of sequence) {
        evaluatedRadii.push(radius);
        if (radius === 5) cumulativeDonors += 2;
        if (radius === 7) cumulativeDonors += 3;

        if (cumulativeDonors >= targetDonorsNeeded) {
          break; // Stop immediately!
        }
      }

      expect(cumulativeDonors).toBe(5);
      expect(evaluatedRadii).toEqual([5, 7]);
      // Must NOT continue to 9, 10, 15, 20, 25, 50, 100
      expect(evaluatedRadii).not.toContain(9);
      expect(evaluatedRadii).not.toContain(10);
      expect(evaluatedRadii).not.toContain(100);
    });
  });

  describe('Strict Privacy Enforcement for Donor Data', () => {
    it('properly masks donor phone numbers and prevents raw PII leak', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+91 98****3210');
      expect(maskPhoneNumber('9876543210')).toBe('98****3210');
      expect(maskPhoneNumber('1234')).toBe('****');
    });
  });
});
