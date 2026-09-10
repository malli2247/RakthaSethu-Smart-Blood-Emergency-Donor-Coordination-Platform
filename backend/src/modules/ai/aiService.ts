import { config } from '../../config';
import { BloodGroupType, canDonateTo } from '../../utils/compatibility';

export interface AiClassificationResult {
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  confidence: number;
  reasoning: string;
  recommendedActions: string[];
}

export interface AiChatbotResponse {
  reply: string;
  disclaimer: string;
  suggestedFollowUps?: string[];
}

export class AiService {
  /**
   * Classifies request urgency based on clinical context and diagnosis notes
   */
  static async classifyUrgency(medicalContext: string): Promise<AiClassificationResult> {
    const text = (medicalContext || '').toLowerCase();

    const criticalKeywords = [
      'trauma',
      'massive hemorrhage',
      'icu emergency',
      'cardiac arrest',
      'accident',
      'arterial rupture',
      'gunshot',
      'emergency surgery',
      'life support',
      'immediately',
      'acute bleeding',
    ];

    const highKeywords = [
      'cancer',
      'chemotherapy',
      'scheduled surgery',
      'surgery tomorrow',
      'anemia',
      'leukemia',
      'dialysis',
      'maternity',
      'cesarean',
      'c-section',
      'bypass',
      'procedure',
      'internal bleeding',
    ];

    const hasCritical = criticalKeywords.some((k) => text.includes(k));
    const hasHigh = highKeywords.some((k) => text.includes(k));

    if (hasCritical && !text.includes('scheduled')) {
      return {
        urgency: 'CRITICAL',
        confidence: 0.94,
        reasoning: 'Symptoms or procedure indicate acute blood loss or immediate emergency intervention.',
        recommendedActions: [
          'Immediate broadcast to nearby emergency-ready donors within 25km radius',
          'Automated hospital coordinator alert triggered',
          'Cross-match blood bank availability',
        ],
      };
    }

    if (hasHigh || hasCritical) {
      return {
        urgency: 'HIGH',
        confidence: 0.88,
        reasoning: 'Clinical context involves severe condition or pending surgical requirement.',
        recommendedActions: [
          'Match with compatible donors within 50km radius',
          'Send push & SMS notifications to verified active donors',
        ],
      };
    }

    return {
      urgency: 'NORMAL',
      confidence: 0.82,
      reasoning: 'Standard blood requirement or routine support procedure.',
      recommendedActions: [
        'Standard pool donor matching within 50km-100km radius',
        'Portal notification to matched voluntary donors',
      ],
    };
  }

  /**
   * AI Emergency & Blood FAQ Assistant
   */
  static async answerEmergencyQuestion(question: string): Promise<AiChatbotResponse> {
    const disclaimer =
      '⚠️ Medical Disclaimer: RakthaSethu AI Assistant provides informational guidance only and is NOT a substitute for professional medical advice, clinical diagnosis, or emergency healthcare services. In a life-threatening emergency, call local emergency numbers (e.g. 112 / 911) or visit the nearest hospital emergency room immediately.';

    const q = (question || '').toLowerCase();

    if (q.includes('o-') || q.includes('o negative')) {
      return {
        reply:
          'O-negative (O-) is known as the **Universal Red Blood Cell Donor** because its red cells do not have A, B, or Rh antigens on their surface. This means O- blood can be safely transfused to patients of any blood group (A+, A-, B+, B-, AB+, AB-, O+, O-) during critical emergencies when there is no time for cross-matching.\n\nHowever, individuals with O- blood can **only receive O- blood**. For this reason, O- donors are in continuous, high demand.',
        disclaimer,
        suggestedFollowUps: [
          'How can I find O- donors nearby?',
          'Who can donate to O positive blood?',
          'How often can I donate blood?',
        ],
      };
    }

    if (q.includes('ab+') || q.includes('ab positive')) {
      return {
        reply:
          'AB-positive (AB+) is known as the **Universal Red Blood Cell Recipient**. Individuals with AB+ blood have both A and B antigens and Rh factor on their red cells, meaning their immune system does not produce antibodies against A, B, or Rh factors. They can safely receive red blood cells from any blood group.\n\nConversely, AB+ blood can only be donated to other AB+ patients.',
        disclaimer,
        suggestedFollowUps: [
          'What is plasma donation compatibility for AB+?',
          'How does blood compatibility work in emergencies?',
        ],
      };
    }

    if (q.includes('compatibility') || q.includes('can i donate') || q.includes('who can donate')) {
      return {
        reply:
          'Blood compatibility for red blood cell transfusions is determined by ABO antigens and the Rh factor:\n- **O-**: Can donate to all blood groups (Universal Donor).\n- **O+**: Can donate to O+, A+, B+, AB+.\n- **A-**: Can donate to A-, A+, AB-, AB+.\n- **A+**: Can donate to A+, AB+.\n- **B-**: Can donate to B-, B+, AB-, AB+.\n- **B+**: Can donate to B+, AB+.\n- **AB-**: Can donate to AB-, AB+.\n- **AB+**: Can donate to AB+ (Universal Recipient).\n\nYou can also use the interactive **Blood Compatibility Calculator** directly on RakthaSethu!',
        disclaimer,
        suggestedFollowUps: [
          'Who is eligible to donate blood?',
          'How do I create an emergency blood request?',
        ],
      };
    }

    if (q.includes('emergency') || q.includes('urgent') || q.includes('what should i do')) {
      return {
        reply:
          'During a blood emergency:\n1. **Create an Emergency Request** immediately on RakthaSethu by clicking "Need Blood Now". Specify the exact blood group, hospital name, and units.\n2. **Contact Hospital Blood Bank**: Ensure the attending physician has issued a requisition form and blood sample for cross-matching.\n3. **Coordinate with Donors**: As soon as donors accept your request on RakthaSethu, call them directly or use the platform contact button.\n4. **Reach Out to Volunteers**: Our verified volunteer network is notified for Critical emergency requests to coordinate transport if necessary.',
        disclaimer,
        suggestedFollowUps: [
          'How fast does RakthaSethu match donors?',
          'How can I find blood banks near me?',
        ],
      };
    }

    if (q.includes('eligibility') || q.includes('eligible') || q.includes('how often') || q.includes('interval')) {
      return {
        reply:
          'General blood donation eligibility guidelines:\n- **Age**: 18 to 65 years old\n- **Weight**: At least 45 - 50 kg (depending on local regulations)\n- **Hemoglobin level**: Minimum 12.5 g/dL\n- **Interval**: Minimum **90 days (3 months)** between whole blood donations for men, and 120 days for women (or 56 days in certain jurisdictions).\n- **Health**: Must be free from active colds, flu, fever, or recent major surgeries.',
        disclaimer,
        suggestedFollowUps: [
          'Can I donate blood if I have tattoos?',
          'What happens during a blood donation?',
        ],
      };
    }

    return {
      reply:
        'RakthaSethu is designed to save lives by bridging the critical minutes between a patient in need and an altruistic blood donor. You can search for compatible donors, browse nearby blood bank inventories, or submit an emergency request in under 60 seconds.',
      disclaimer,
      suggestedFollowUps: [
        'How does RakthaSethu donor matching work?',
        'How does blood compatibility work?',
        'What should I do during a blood emergency?',
      ],
    };
  }
}
