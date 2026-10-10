import { prisma } from '../config/database';
import { AppError } from '../utils/response';
import { logger } from '../utils/logger';

export interface DonorConsentPreferences {
  rareBloodMatchingConsent?: boolean;
  rareEmergencyAlertsEnabled?: boolean;
  criticalAlertsEnabled?: boolean;
  urgentAlertsEnabled?: boolean;
  generalAlertsEnabled?: boolean;
  locationPrivacyLevel?: 'APPROXIMATE_REGION' | 'REVEAL_AFTER_ACCEPT' | 'MAXIMUM_PRIVACY';
  contactPrivacyLevel?: 'HIDDEN_UNTIL_ACCEPTANCE' | 'CONTROLLED_COORDINATION';
  notificationFrequencyLimit?: number;
}

export class DonorConsentService {
  /**
   * Updates privacy preferences and consent settings for an authenticated donor.
   */
  static async updateConsent(userId: string, prefs: DonorConsentPreferences, ipAddress?: string): Promise<any> {
    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const updated = await prisma.donorProfile.update({
      where: { userId },
      data: {
        ...(prefs.rareBloodMatchingConsent !== undefined && {
          rareBloodMatchingConsent: Boolean(prefs.rareBloodMatchingConsent),
          // If re-enabling consent, clear withdrawal date
          ...(prefs.rareBloodMatchingConsent && { consentWithdrawnAt: null }),
        }),
        ...(prefs.rareEmergencyAlertsEnabled !== undefined && {
          rareEmergencyAlertsEnabled: Boolean(prefs.rareEmergencyAlertsEnabled),
        }),
        ...(prefs.criticalAlertsEnabled !== undefined && {
          criticalAlertsEnabled: Boolean(prefs.criticalAlertsEnabled),
        }),
        ...(prefs.urgentAlertsEnabled !== undefined && {
          urgentAlertsEnabled: Boolean(prefs.urgentAlertsEnabled),
        }),
        ...(prefs.generalAlertsEnabled !== undefined && {
          generalAlertsEnabled: Boolean(prefs.generalAlertsEnabled),
        }),
        ...(prefs.locationPrivacyLevel && {
          locationPrivacyLevel: prefs.locationPrivacyLevel,
        }),
        ...(prefs.contactPrivacyLevel && {
          contactPrivacyLevel: prefs.contactPrivacyLevel,
        }),
        ...(prefs.notificationFrequencyLimit !== undefined && {
          notificationFrequencyLimit: Math.max(1, Math.min(20, prefs.notificationFrequencyLimit)),
        }),
        consentTimestamp: new Date(),
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DONOR_CONSENT_UPDATED',
        entity: 'DonorProfile',
        entityId: donor.id,
        details: JSON.stringify(prefs),
        ipAddress: ipAddress || null,
      },
    });

    logger.info(`[DonorConsentService] Consent updated for donor ${donor.id}`);
    return updated;
  }

  /**
   * Withdraws donor consent for matching and emergency notifications.
   * Section 22: Immediately removes donor from future matching and cancels active pending matches.
   */
  static async withdrawConsent(userId: string, reason?: string, ipAddress?: string): Promise<any> {
    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const now = new Date();
    const updated = await prisma.donorProfile.update({
      where: { userId },
      data: {
        rareBloodMatchingConsent: false,
        rareEmergencyAlertsEnabled: false,
        criticalAlertsEnabled: false,
        urgentAlertsEnabled: false,
        generalAlertsEnabled: false,
        consentWithdrawnAt: now,
      },
    });

    // Invalidate active pending matches
    await prisma.donorMatch.updateMany({
      where: {
        donorId: donor.id,
        status: 'PENDING',
      },
      data: {
        status: 'DECLINED',
        responseNotes: 'Consent withdrawn by donor.',
      },
    });

    // Record security audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DONOR_CONSENT_WITHDRAWN',
        entity: 'DonorProfile',
        entityId: donor.id,
        details: reason ? `Reason: ${reason}` : 'Donor explicitly withdrew matching consent.',
        ipAddress: ipAddress || null,
      },
    });

    logger.info(`[DonorConsentService] Consent withdrawn for donor ${donor.id}. Active pending matches invalidated.`);
    return updated;
  }
}
