import { describe, it, expect } from 'vitest';
import { ResponsePredictionService } from '../src/modules/ml/responsePredictionService';
import { DemandForecastingService } from '../src/modules/ml/demandForecastingService';

describe('AI/ML Intelligence Services', () => {
  describe('Donor Response Probability Prediction', () => {
    it('predicts significantly higher response probability for closer donors', async () => {
      const closeDonor = await ResponsePredictionService.predictDonorResponse({
        donorId: 'd-close',
        distanceKm: 3.5,
        urgency: 'CRITICAL',
        hourOfDay: 14,
        emergencyAvailable: true,
        totalDonations: 4,
      });

      const distantDonor = await ResponsePredictionService.predictDonorResponse({
        donorId: 'd-distant',
        distanceKm: 45.0,
        urgency: 'CRITICAL',
        hourOfDay: 14,
        emergencyAvailable: false,
        totalDonations: 0,
      });

      expect(closeDonor.responseProbability).toBeGreaterThan(distantDonor.responseProbability);
      expect(closeDonor.probabilityPercent).toBeGreaterThan(distantDonor.probabilityPercent);
      expect(closeDonor.responseProbability).toBeGreaterThan(0.70);
      expect(distantDonor.responseProbability).toBeLessThan(0.70);
    });

    it('returns structured contributing factors for explainability', async () => {
      const pred = await ResponsePredictionService.predictDonorResponse({
        donorId: 'd-explain',
        distanceKm: 4.0,
        urgency: 'CRITICAL',
        hourOfDay: 10,
        emergencyAvailable: true,
        totalDonations: 6,
      });

      expect(Array.isArray(pred.contributingFactors)).toBe(true);
      expect(pred.contributingFactors.length).toBeGreaterThan(0);
      expect(pred.confidenceScore).toBeGreaterThanOrEqual(0.80);
    });
  });

  describe('7-Day Regional Blood Demand Forecasting', () => {
    it('generates demand projections for all 8 standard blood groups', async () => {
      const forecast = await DemandForecastingService.getRegionalDemandForecast();
      expect(forecast.forecastHorizonDays).toBe(7);
      expect(forecast.groups.length).toBe(8);

      const oNeg = forecast.groups.find((g) => g.bloodGroup === 'O_NEGATIVE');
      expect(oNeg).toBeDefined();
      expect(oNeg?.shortageRiskLevel).toBe('CRITICAL');

      const oPos = forecast.groups.find((g) => g.bloodGroup === 'O_POSITIVE');
      expect(oPos).toBeDefined();
      expect(oPos?.expectedWeeklyDemandUnits).toBeGreaterThan(0);
    });
  });
});
