import { describe, it, expect } from 'vitest';
import { VoiceParserService } from '../src/modules/ai/voiceParserService';

describe('Voice Blood Requisition Parser', () => {
  it('correctly extracts blood group, units, and hospital from spoken transcript', () => {
    const transcript = 'I need two units of O positive blood at Apollo Hospital';
    const parsed = VoiceParserService.parseSpeechTranscript(transcript);

    expect(parsed.bloodGroup).toBe('O_POSITIVE');
    expect(parsed.unitsRequired).toBe(2);
    expect(parsed.hospitalName).toBe('Apollo Hospital');
    expect(parsed.missingFields.length).toBe(0);
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it('detects emergency urgency keywords and single unit requirement', () => {
    const transcript = 'Urgent requirement of 1 unit of A negative blood at Care Clinic';
    const parsed = VoiceParserService.parseSpeechTranscript(transcript);

    expect(parsed.bloodGroup).toBe('A_NEGATIVE');
    expect(parsed.unitsRequired).toBe(1);
    expect(parsed.urgency).toBe('CRITICAL');
  });

  it('flags missing fields when speech is incomplete', () => {
    const transcript = 'We need B positive blood immediately';
    const parsed = VoiceParserService.parseSpeechTranscript(transcript);

    expect(parsed.bloodGroup).toBe('B_POSITIVE');
    expect(parsed.missingFields).toContain('hospitalName');
    expect(parsed.suggestedPrompt).toBeDefined();
  });
});
