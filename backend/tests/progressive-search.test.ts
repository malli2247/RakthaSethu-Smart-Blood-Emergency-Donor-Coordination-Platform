import { describe, it, expect } from 'vitest';
import { ProgressiveDonorSearchService } from '../src/services/progressiveDonorSearchService';
import { canDonateTo, BloodGroupType } from '../src/utils/compatibility';

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
  });
});
