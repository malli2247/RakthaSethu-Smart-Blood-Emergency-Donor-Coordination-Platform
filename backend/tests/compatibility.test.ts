import { describe, it, expect } from 'vitest';
import {
  canDonateTo,
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  ALL_BLOOD_GROUPS,
  BloodGroupType,
} from '../src/utils/compatibility';

describe('Red Blood Cell (RBC) Compatibility Matrix', () => {
  it('should recognize O- as Universal Donor for all 8 blood groups', () => {
    for (const recipient of ALL_BLOOD_GROUPS) {
      expect(canDonateTo('O_NEGATIVE', recipient)).toBe(true);
    }
  });

  it('should recognize AB+ as Universal Recipient from all 8 blood groups', () => {
    for (const donor of ALL_BLOOD_GROUPS) {
      expect(canDonateTo(donor, 'AB_POSITIVE')).toBe(true);
    }
  });

  it('should only allow O- to receive from O-', () => {
    const compatibleWithONeg = getCompatibleDonorGroups('O_NEGATIVE');
    expect(compatibleWithONeg).toEqual(['O_NEGATIVE']);
  });

  it('should allow O+ to receive from O- and O+ only', () => {
    const compatibleWithOPos = getCompatibleDonorGroups('O_POSITIVE');
    expect(compatibleWithOPos.sort()).toEqual(['O_NEGATIVE', 'O_POSITIVE'].sort());
  });

  it('should allow A+ to receive from O-, O+, A-, A+', () => {
    const compatible = getCompatibleDonorGroups('A_POSITIVE');
    expect(compatible.sort()).toEqual(
      ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE'].sort()
    );
  });

  it('should allow B+ to receive from O-, O+, B-, B+', () => {
    const compatible = getCompatibleDonorGroups('B_POSITIVE');
    expect(compatible.sort()).toEqual(
      ['O_NEGATIVE', 'O_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE'].sort()
    );
  });

  it('should not allow Rh+ blood to be transfused to Rh- recipient', () => {
    // Rh+ has Rh antigen; Rh- recipient will develop anti-Rh antibodies
    expect(canDonateTo('A_POSITIVE', 'A_NEGATIVE')).toBe(false);
    expect(canDonateTo('B_POSITIVE', 'B_NEGATIVE')).toBe(false);
    expect(canDonateTo('O_POSITIVE', 'O_NEGATIVE')).toBe(false);
    expect(canDonateTo('AB_POSITIVE', 'AB_NEGATIVE')).toBe(false);
  });

  it('should verify AB+ can only donate to other AB+ patients', () => {
    const recipients = getCompatibleRecipientGroups('AB_POSITIVE');
    expect(recipients).toEqual(['AB_POSITIVE']);
  });

  it('should verify reciprocal compatibility between donor and recipient matrices', () => {
    for (const donor of ALL_BLOOD_GROUPS) {
      for (const recipient of ALL_BLOOD_GROUPS) {
        const directCheck = canDonateTo(donor, recipient);
        const recipientListCheck = getCompatibleDonorGroups(recipient).includes(donor);
        const donorListCheck = getCompatibleRecipientGroups(donor).includes(recipient);
        expect(directCheck).toBe(recipientListCheck);
        expect(directCheck).toBe(donorListCheck);
      }
    }
  });
});
