import { prisma } from '../../config/database';
import { BloodGroupType } from '../../utils/compatibility';

export interface GroupDemandForecast {
  bloodGroup: BloodGroupType;
  expectedWeeklyDemandUnits: number;
  trend: 'RISING' | 'STABLE' | 'DECLINING';
  shortageRiskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidencePercent: number;
  insights: string;
}

export interface BloodBankShortageForecast {
  bloodBankId: string;
  bloodBankName: string;
  overallShortageRisk: 'CRITICAL' | 'HIGH' | 'STABLE';
  inventorySummary: Array<{
    bloodGroup: string;
    currentUnits: number;
    dailyBurnRate: number;
    estimatedDaysRemaining: number;
    isCritical: boolean;
  }>;
  expiringSoonUnits: number;
  proactiveRecommendations: string[];
}

export class DemandForecastingService {
  private static readonly BASELINE_DISTRIBUTION: Record<BloodGroupType, number> = {
    O_POSITIVE: 38.0,
    B_POSITIVE: 30.0,
    A_POSITIVE: 20.0,
    AB_POSITIVE: 6.0,
    O_NEGATIVE: 2.5,
    B_NEGATIVE: 1.8,
    A_NEGATIVE: 1.2,
    AB_NEGATIVE: 0.5,
  };

  /**
   * Generates 7-day blood demand forecast across regional blood groups
   */
  static async getRegionalDemandForecast(): Promise<{
    generatedAt: string;
    forecastHorizonDays: number;
    groups: GroupDemandForecast[];
  }> {
    // Query historical blood requests over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRequests = await prisma.bloodRequest.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { bloodGroup: true, unitsRequired: true, urgency: true },
    });

    const historicalCounts: Record<string, number> = {};
    for (const req of recentRequests) {
      const multiplier = req.urgency === 'CRITICAL' ? 1.5 : 1.0;
      historicalCounts[req.bloodGroup] = (historicalCounts[req.bloodGroup] || 0) + req.unitsRequired * multiplier;
    }

    const allGroups: BloodGroupType[] = [
      'O_POSITIVE',
      'O_NEGATIVE',
      'A_POSITIVE',
      'A_NEGATIVE',
      'B_POSITIVE',
      'B_NEGATIVE',
      'AB_POSITIVE',
      'AB_NEGATIVE',
    ];

    const totalRecent = Object.values(historicalCounts).reduce((acc, v) => acc + v, 0);

    const groups: GroupDemandForecast[] = allGroups.map((group) => {
      const historical = historicalCounts[group] || 0;
      const baselineShare = this.BASELINE_DISTRIBUTION[group] / 100;
      const estimatedUnits = Math.max(
        1,
        Math.round((totalRecent > 0 ? (historical / totalRecent) * 70 : 50 * baselineShare))
      );

      // Universal donors (O-) and heavy emergency groups get elevated risk tags
      let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let trend: 'RISING' | 'STABLE' | 'DECLINING' = 'STABLE';
      let insights = 'Steady projected patient demand.';

      if (group === 'O_NEGATIVE') {
        riskLevel = 'CRITICAL';
        trend = 'RISING';
        insights = 'Universal donor RBC units face chronic high emergency trauma drawdown.';
      } else if (group === 'O_POSITIVE' || group === 'B_POSITIVE') {
        riskLevel = 'HIGH';
        trend = 'RISING';
        insights = 'Dominant population demand necessitates regular replenishment cycles.';
      } else if (group === 'AB_NEGATIVE' || group === 'B_NEGATIVE') {
        riskLevel = 'MEDIUM';
        trend = 'STABLE';
        insights = 'Rare blood group. Maintain minimum buffer for targeted emergency cases.';
      }

      return {
        bloodGroup: group,
        expectedWeeklyDemandUnits: estimatedUnits,
        trend,
        shortageRiskLevel: riskLevel,
        confidencePercent: totalRecent > 20 ? 92 : 84,
        insights,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      forecastHorizonDays: 7,
      groups,
    };
  }

  /**
   * Forecasts inventory exhaustion and shortage risk for an individual blood bank
   */
  static async forecastBloodBankShortage(bloodBankId: string): Promise<BloodBankShortageForecast> {
    const bloodBank = await prisma.bloodBank.findUnique({
      where: { id: bloodBankId },
      include: {
        inventory: {
          where: { status: 'AVAILABLE' },
        },
      },
    });

    if (!bloodBank) {
      throw new Error('Blood bank not found');
    }

    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(now.getDate() + 7);

    // Group inventory by blood group
    const groupStock: Record<string, number> = {};
    let expiringSoonCount = 0;

    for (const item of bloodBank.inventory) {
      groupStock[item.bloodGroup] = (groupStock[item.bloodGroup] || 0) + item.units;
      if (new Date(item.expiryDate) <= expiryThreshold) {
        expiringSoonCount += item.units;
      }
    }

    const allGroups = [
      'O_POSITIVE',
      'O_NEGATIVE',
      'A_POSITIVE',
      'A_NEGATIVE',
      'B_POSITIVE',
      'B_NEGATIVE',
      'AB_POSITIVE',
      'AB_NEGATIVE',
    ];

    const inventorySummary = allGroups.map((bg) => {
      const units = groupStock[bg] || 0;
      // Daily burn rate baseline: O+ ~ 3 units/day, O- ~ 2 units/day, etc.
      const dailyBurnRate = bg.startsWith('O') ? 2.5 : bg.startsWith('B') ? 2.0 : 1.2;
      const estimatedDays = units > 0 ? Number((units / dailyBurnRate).toFixed(1)) : 0.0;
      const isCritical = estimatedDays <= 3.0;

      return {
        bloodGroup: bg,
        currentUnits: units,
        dailyBurnRate,
        estimatedDaysRemaining: estimatedDays,
        isCritical,
      };
    });

    const hasCritical = inventorySummary.some((i) => i.isCritical && (i.bloodGroup === 'O_NEGATIVE' || i.bloodGroup === 'O_POSITIVE'));
    const recommendations: string[] = [];

    if (hasCritical) {
      recommendations.push('Launch targeted O-Negative emergency donation campaign within 48 hours.');
      recommendations.push('Notify verified regional volunteer transport network to request hospital unit cross-shipment.');
    }

    if (expiringSoonCount > 0) {
      recommendations.push(`Alert clinical coordinators: ${expiringSoonCount} units expiring in less than 7 days.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Current inventory levels meet normal operational safety threshold.');
    }

    return {
      bloodBankId: bloodBank.id,
      bloodBankName: bloodBank.name,
      overallShortageRisk: hasCritical ? 'CRITICAL' : expiringSoonCount > 10 ? 'HIGH' : 'STABLE',
      inventorySummary,
      expiringSoonUnits: expiringSoonCount,
      proactiveRecommendations: recommendations,
    };
  }
}
