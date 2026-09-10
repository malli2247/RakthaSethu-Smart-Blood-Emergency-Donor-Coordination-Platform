import { describe, it, expect } from 'vitest';
import { AiService } from '../src/modules/ai/aiService';

describe('Modular AI Service Layer', () => {
  it('should accurately classify acute trauma and hemorrhage as CRITICAL', async () => {
    const res = await AiService.classifyUrgency(
      'Severe vehicular trauma with arterial rupture and massive internal hemorrhage.'
    );
    expect(res.urgency).toBe('CRITICAL');
    expect(res.confidence).toBeGreaterThan(0.85);
    expect(res.recommendedActions.length).toBeGreaterThan(0);
  });

  it('should accurately classify scheduled surgery or chemotherapy as HIGH', async () => {
    const res = await AiService.classifyUrgency(
      'Scheduled bypass surgery tomorrow morning, patient undergoing chemotherapy.'
    );
    expect(res.urgency).toBe('HIGH');
  });

  it('should classify routine transfusions as NORMAL', async () => {
    const res = await AiService.classifyUrgency(
      'Mild weakness, routine checkup and periodic support.'
    );
    expect(res.urgency).toBe('NORMAL');
  });

  it('should provide medically disclaimed answers for O- universal donor query', async () => {
    const res = await AiService.answerEmergencyQuestion('Why is O negative blood special?');
    expect(res.reply).toContain('Universal Red Blood Cell Donor');
    expect(res.disclaimer).toContain('Medical Disclaimer');
    expect(res.suggestedFollowUps).toBeDefined();
  });

  it('should explain eligibility intervals', async () => {
    const res = await AiService.answerEmergencyQuestion('What is the eligibility donation interval?');
    expect(res.reply).toContain('90 days');
    expect(res.disclaimer).toContain('Medical Disclaimer');
  });
});
