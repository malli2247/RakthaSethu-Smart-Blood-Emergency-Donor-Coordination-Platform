import { BloodGroupType } from '../../utils/compatibility';

export interface ParsedVoiceRequest {
  rawTranscript: string;
  bloodGroup: BloodGroupType | null;
  bloodGroupFormatted: string | null;
  unitsRequired: number;
  hospitalName: string | null;
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  confidence: number;
  missingFields: string[];
  suggestedPrompt?: string;
}

export class VoiceParserService {
  private static readonly BLOOD_GROUP_PATTERNS: Array<{ regex: RegExp; group: BloodGroupType; formatted: string }> = [
    { regex: /\b(o\s*negative|o\s*neg|o\s*-\b)/i, group: 'O_NEGATIVE', formatted: 'O- Negative' },
    { regex: /\b(o\s*positive|o\s*pos|o\s*\+\b)/i, group: 'O_POSITIVE', formatted: 'O+ Positive' },
    { regex: /\b(a\s*negative|a\s*neg|a\s*-\b)/i, group: 'A_NEGATIVE', formatted: 'A- Negative' },
    { regex: /\b(a\s*positive|a\s*pos|a\s*\+\b)/i, group: 'A_POSITIVE', formatted: 'A+ Positive' },
    { regex: /\b(b\s*negative|b\s*neg|b\s*-\b)/i, group: 'B_NEGATIVE', formatted: 'B- Negative' },
    { regex: /\b(b\s*positive|b\s*pos|b\s*\+\b)/i, group: 'B_POSITIVE', formatted: 'B+ Positive' },
    { regex: /\b(ab\s*negative|ab\s*neg|ab\s*-\b)/i, group: 'AB_NEGATIVE', formatted: 'AB- Negative' },
    { regex: /\b(ab\s*positive|ab\s*pos|ab\s*\+\b)/i, group: 'AB_POSITIVE', formatted: 'AB+ Positive' },
  ];

  private static readonly NUMBER_WORDS: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    single: 1,
    couple: 2,
  };

  /**
   * Parses natural language speech-to-text transcript into structured requisition fields
   */
  static parseSpeechTranscript(transcript: string): ParsedVoiceRequest {
    const text = (transcript || '').trim();
    const lower = text.toLowerCase();
    const missingFields: string[] = [];
    let confidencePoints = 0;

    // 1. Detect Blood Group
    let detectedGroup: BloodGroupType | null = null;
    let formattedGroup: string | null = null;

    for (const pattern of this.BLOOD_GROUP_PATTERNS) {
      if (pattern.regex.test(lower)) {
        detectedGroup = pattern.group;
        formattedGroup = pattern.formatted;
        confidencePoints += 35;
        break;
      }
    }

    if (!detectedGroup) {
      missingFields.push('bloodGroup');
    }

    // 2. Detect Units Required
    let units = 1;
    const unitNumberMatch = lower.match(/\b(\d+)\s*(unit|units|bottle|bottles|packet|packets)?\b/);
    if (unitNumberMatch && parseInt(unitNumberMatch[1], 10) > 0) {
      units = parseInt(unitNumberMatch[1], 10);
      confidencePoints += 25;
    } else {
      // Check word numbers like "two units"
      for (const [word, val] of Object.entries(this.NUMBER_WORDS)) {
        if (new RegExp(`\\b${word}\\s+(unit|units|bottle|bottles)\\b`).test(lower)) {
          units = val;
          confidencePoints += 25;
          break;
        }
      }
    }

    // 3. Detect Hospital Name
    let hospitalName: string | null = null;
    // Look for phrases like "at [Hospital Name] Hospital" or "in [Hospital Name]"
    const hospitalMatch = lower.match(/(?:at|in|near)\s+([a-z0-9\s.]+?)(?:\s+hospital|\s+clinic|\s+medical\s+center|\s+care|$)/i);
    if (hospitalMatch && hospitalMatch[1].trim().length > 2) {
      const extracted = hospitalMatch[1].trim();
      hospitalName = `${extracted.charAt(0).toUpperCase() + extracted.slice(1)} Hospital`;
      confidencePoints += 25;
    } else if (lower.includes('hospital')) {
      const parts = lower.split('hospital')[0].trim().split(' ');
      const candidateName = parts.slice(-2).join(' ');
      if (candidateName) {
        hospitalName = `${candidateName.charAt(0).toUpperCase() + candidateName.slice(1)} Hospital`;
        confidencePoints += 15;
      }
    }

    if (!hospitalName) {
      missingFields.push('hospitalName');
    }

    // 4. Urgency Classification
    let urgency: 'NORMAL' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    if (/\b(critical|immediately|emergency|dying|bleeding|accident|trauma|urgent)\b/i.test(lower)) {
      urgency = 'CRITICAL';
      confidencePoints += 15;
    } else if (/\b(surgery|operation|tomorrow|cancer|dialysis|priority)\b/i.test(lower)) {
      urgency = 'HIGH';
      confidencePoints += 15;
    } else {
      confidencePoints += 10;
    }

    const confidence = Math.min(1.0, Math.max(0.2, Number((confidencePoints / 100).toFixed(2))));

    return {
      rawTranscript: text,
      bloodGroup: detectedGroup,
      bloodGroupFormatted: formattedGroup,
      unitsRequired: units,
      hospitalName,
      urgency,
      confidence,
      missingFields,
      suggestedPrompt: missingFields.length > 0 ? `Please verify the ${missingFields.join(' and ')} before continuing.` : undefined,
    };
  }
}
