import { prisma } from '../config/database';
import { getCityCentroid } from '../utils/indianCityCentroids';
import { logger } from '../utils/logger';

export interface RawCampRecord {
  sourceCampId?: string;
  campName: string;
  venue: string;
  address?: string;
  city: string;
  district?: string;
  state: string;
  campDate: string | Date;
  startTime?: string;
  endTime?: string;
  organizerName: string;
  bloodBankName?: string;
  contactPhone?: string;
  contactEmail?: string;
  registrationUrl?: string;
  sourceUrl?: string;
  latitude?: number;
  longitude?: number;
}

export class ERaktKoshSyncService {
  private static readonly OFFICIAL_CAMP_SCHEDULE_URL =
    'https://eraktkosh.mohfw.gov.in/BLDAHIMS/bloodbank/campSchedule.cnt';

  /**
   * Fetches latest official camp data from the authorized e-RaktKosh endpoint or configured feed URL.
   * If the external portal is unavailable or protected, it handles the failure gracefully
   * and records an audit log without throwing or creating fake records.
   */
  static async syncFromSource(adminUserId?: string): Promise<{
    success: boolean;
    fetched: number;
    inserted: number;
    updated: number;
    message: string;
  }> {
    const feedUrl =
      process.env.ERAKTKOSH_CAMPS_URL ||
      process.env.ERAKTKOSH_FEED_URL ||
      null;

    logger.info(`[e-RaktKosh Sync] Initiating synchronization... Feed configured: ${Boolean(feedUrl)}`);

    // If no authorized API feed URL is configured in the environment,
    // we document that the official portal requires authorized credentials or batch import,
    // and log the audit entry safely.
    if (!feedUrl) {
      const log = await prisma.campSyncLog.create({
        data: {
          source: 'E_RAKTKOSH',
          status: 'SUCCESS',
          campsFetched: 0,
          campsInserted: 0,
          campsUpdated: 0,
          errorMessage:
            'External e-RaktKosh automated polling endpoint not configured. Relying on verified hospital submissions and admin batch imports.',
          syncedBy: adminUserId || null,
        },
      });

      return {
        success: true,
        fetched: 0,
        inserted: 0,
        updated: 0,
        message:
          'No direct e-RaktKosh automated API endpoint configured. System is operating in authoritative import & hospital-verified publication mode.',
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'RakthaSethu-Emergency-Network/1.0 (MoHFW Integration Adapter)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`e-RaktKosh returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const records: RawCampRecord[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.camps)
        ? data.camps
        : [];

      const result = await this.processBatchRecords(records, 'E_RAKTKOSH', adminUserId);

      await prisma.campSyncLog.create({
        data: {
          source: 'E_RAKTKOSH',
          status: 'SUCCESS',
          campsFetched: records.length,
          campsInserted: result.inserted,
          campsUpdated: result.updated,
          syncedBy: adminUserId || null,
        },
      });

      return {
        success: true,
        fetched: records.length,
        inserted: result.inserted,
        updated: result.updated,
        message: `Successfully synchronized ${records.length} camps from e-RaktKosh (${result.inserted} added, ${result.updated} updated).`,
      };
    } catch (err: any) {
      logger.error('[e-RaktKosh Sync] Synchronization failed:', err.message);

      await prisma.campSyncLog.create({
        data: {
          source: 'E_RAKTKOSH',
          status: 'FAILED',
          campsFetched: 0,
          campsInserted: 0,
          campsUpdated: 0,
          errorMessage: err.message || 'External source unreachable',
          syncedBy: adminUserId || null,
        },
      });

      return {
        success: false,
        fetched: 0,
        inserted: 0,
        updated: 0,
        message: `e-RaktKosh synchronization failed: ${err.message}. Retaining last verified data.`,
      };
    }
  }

  /**
   * Processes a verified batch of camp records (from authorized sync or admin file import)
   */
  static async processBatchRecords(
    records: RawCampRecord[],
    source: string = 'E_RAKTKOSH',
    verifiedByUserId?: string
  ): Promise<{ inserted: number; updated: number; skipped: number; errors: string[] }> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const r of records) {
      try {
        if (!r.campName || !r.venue || !r.city || !r.state || !r.campDate) {
          skipped++;
          errors.push(`Missing mandatory fields for camp "${r.campName || 'Unnamed'}"`);
          continue;
        }

        const campDate = new Date(r.campDate);
        if (isNaN(campDate.getTime())) {
          skipped++;
          errors.push(`Invalid date format for camp "${r.campName}"`);
          continue;
        }

        // Filter out expired camps before importing
        if (campDate < today) {
          skipped++;
          continue;
        }

        // Coordinate assignment & confidence
        let lat: number | null = r.latitude ? Number(r.latitude) : null;
        let lon: number | null = r.longitude ? Number(r.longitude) : null;
        let confidence = 'NONE';

        if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
          confidence = 'EXACT';
        } else {
          const centroid = getCityCentroid(r.city);
          if (centroid) {
            lat = centroid.latitude;
            lon = centroid.longitude;
            confidence = 'CITY_LEVEL';
          }
        }

        const sourceCampId = r.sourceCampId || null;
        const sourceUrl = r.sourceUrl || this.OFFICIAL_CAMP_SCHEDULE_URL;

        // Check if camp already exists by (source, sourceCampId) or (campName, campDate, city, venue)
        let existing = null;
        if (sourceCampId) {
          existing = await prisma.bloodDonationCamp.findUnique({
            where: {
              source_sourceCampId: {
                source,
                sourceCampId,
              },
            },
          });
        }

        if (!existing) {
          existing = await prisma.bloodDonationCamp.findFirst({
            where: {
              campName: r.campName.trim(),
              campDate: campDate,
              city: r.city.trim(),
              venue: r.venue.trim(),
            },
          });
        }

        if (existing) {
          await prisma.bloodDonationCamp.update({
            where: { id: existing.id },
            data: {
              venue: r.venue.trim(),
              address: r.address?.trim() || existing.address,
              district: r.district?.trim() || existing.district,
              state: r.state.trim(),
              startTime: r.startTime || existing.startTime,
              endTime: r.endTime || existing.endTime,
              organizerName: r.organizerName.trim(),
              contactPhone: r.contactPhone || existing.contactPhone,
              contactEmail: r.contactEmail || existing.contactEmail,
              registrationUrl: r.registrationUrl || existing.registrationUrl,
              latitude: lat || existing.latitude,
              longitude: lon || existing.longitude,
              coordinateConfidence: confidence !== 'NONE' ? confidence : existing.coordinateConfidence,
              sourceLastUpdatedAt: now,
              lastFetchedAt: now,
              verificationStatus: 'VERIFIED',
              verificationSource: 'OFFICIAL_GOV_FEED',
            },
          });
          updated++;
        } else {
          await prisma.bloodDonationCamp.create({
            data: {
              source,
              sourceCampId,
              campName: r.campName.trim(),
              venue: r.venue.trim(),
              address: r.address?.trim() || `${r.venue.trim()}, ${r.city.trim()}`,
              city: r.city.trim(),
              district: r.district?.trim() || null,
              state: r.state.trim(),
              latitude: lat,
              longitude: lon,
              coordinateConfidence: confidence,
              organizerName: r.organizerName.trim(),
              campDate,
              startTime: r.startTime || '09:00',
              endTime: r.endTime || '16:00',
              status: 'UPCOMING',
              verificationStatus: 'VERIFIED',
              sourceUrl,
              sourceLastUpdatedAt: now,
              lastFetchedAt: now,
              verifiedBy: verifiedByUserId || null,
              verifiedAt: now,
              verificationSource: 'OFFICIAL_GOV_FEED',
              contactPhone: r.contactPhone || null,
              contactEmail: r.contactEmail || null,
              registrationUrl: r.registrationUrl || null,
            },
          });
          inserted++;
        }
      } catch (err: any) {
        skipped++;
        errors.push(`Failed to process "${r.campName}": ${err.message}`);
      }
    }

    return { inserted, updated, skipped, errors };
  }

  /**
   * Retrieves synchronization history and system status for Admin review
   */
  static async getSyncStatus(): Promise<{
    lastSync: any | null;
    totalVerifiedCamps: number;
    pendingCamps: number;
    recentLogs: any[];
  }> {
    const lastSync = await prisma.campSyncLog.findFirst({
      orderBy: { syncedAt: 'desc' },
    });

    const [totalVerifiedCamps, pendingCamps, recentLogs] = await Promise.all([
      prisma.bloodDonationCamp.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      prisma.bloodDonationCamp.count({
        where: { verificationStatus: 'PENDING' },
      }),
      prisma.campSyncLog.findMany({
        take: 10,
        orderBy: { syncedAt: 'desc' },
      }),
    ]);

    return {
      lastSync,
      totalVerifiedCamps,
      pendingCamps,
      recentLogs,
    };
  }
}
