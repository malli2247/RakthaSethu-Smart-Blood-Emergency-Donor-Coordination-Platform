import { prisma } from '../config/database';
import { calculateDistanceKm } from '../utils/distance';
import { getCityCentroid } from '../utils/indianCityCentroids';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';

export interface CampQueryFilters {
  lat?: number;
  lon?: number;
  city?: string;
  district?: string;
  state?: string;
  radiusKm?: number;
  expandRadiusIfNeeded?: boolean;
  status?: string;
  verificationStatus?: string;
  includeCompleted?: boolean;
  isAdmin?: boolean;
  limit?: number;
}

export interface CampResponseItem {
  id: string;
  source: string;
  sourceCampId: string | null;
  campName: string;
  description: string | null;
  venue: string;
  address: string;
  city: string;
  district: string | null;
  state: string;
  latitude: number | null;
  longitude: number | null;
  coordinateConfidence: string;
  organizerName: string;
  bloodBankId: string | null;
  bloodBankName?: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  registrationUrl: string | null;
  campDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  verificationStatus: string;
  sourceUrl: string | null;
  sourceLastUpdatedAt: Date | null;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  distanceKm?: number | null;
  isCityApproximate?: boolean;
  registrationCount?: number;
  isRegistered?: boolean;
}

export class CampService {
  /**
   * Evaluates dynamic camp status (UPCOMING, TODAY, ONGOING, COMPLETED, CANCELLED, EXPIRED)
   * based on the exact real-time calendar and clock.
   */
  static evaluateCampStatus(
    campDate: Date,
    startTime: string,
    endTime: string,
    currentStatus: string
  ): string {
    if (currentStatus === 'CANCELLED') return 'CANCELLED';

    const now = new Date();
    const campDay = new Date(campDate);

    // Normalize to date-only comparison in UTC/Local
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(campDay.getFullYear(), campDay.getMonth(), campDay.getDate());

    const diffDays = Math.round((targetDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return 'UPCOMING';
    } else if (diffDays < 0) {
      return 'COMPLETED';
    } else {
      // It is TODAY: check start and end time if parsable
      try {
        const [sh, sm] = startTime.split(':').map((s) => parseInt(s, 10));
        const [eh, em] = endTime.split(':').map((s) => parseInt(s, 10));

        if (!isNaN(sh) && !isNaN(eh)) {
          const startMinutes = sh * 60 + (sm || 0);
          const endMinutes = eh * 60 + (em || 0);
          const nowMinutes = now.getHours() * 60 + now.getMinutes();

          if (nowMinutes < startMinutes) return 'TODAY';
          if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) return 'ONGOING';
          if (nowMinutes > endMinutes) return 'COMPLETED';
        }
      } catch {
        // Fallback to TODAY
      }
      return 'TODAY';
    }
  }

  /**
   * Periodically updates past camps to COMPLETED or EXPIRED in the database.
   */
  static async updateExpiredCamps(): Promise<number> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);

      const res = await prisma.bloodDonationCamp.updateMany({
        where: {
          campDate: { lt: yesterday },
          status: { in: ['UPCOMING', 'TODAY', 'ONGOING'] },
        },
        data: {
          status: 'COMPLETED',
        },
      });

      return res.count;
    } catch (err) {
      logger.error('[CampService] Error updating expired camps:', err);
      return 0;
    }
  }

  /**
   * Retrieves verified blood donation camps near a given location,
   * applying distance filtering, verification policy, and radius expansion rules.
   */
  static async listCamps(
    filters: CampQueryFilters,
    currentUserId?: string
  ): Promise<{
    camps: CampResponseItem[];
    metadata: {
      total: number;
      radiusKm: number;
      requestedRadiusKm: number;
      expanded: boolean;
      expansionMessage: string | null;
      locationUsed: {
        type: 'COORDINATES' | 'CITY' | 'ALL';
        label: string;
      };
    };
  }> {
    await this.updateExpiredCamps();

    const {
      lat,
      lon,
      city,
      district,
      state,
      radiusKm = 25,
      expandRadiusIfNeeded = true,
      status,
      verificationStatus = 'VERIFIED',
      includeCompleted = false,
      isAdmin = false,
      limit,
    } = filters;

    // Build Prisma query condition
    const where: any = {};

    // 1. Strict Verification Policy:
    // Only verified camps are shown to public users.
    if (!isAdmin) {
      where.verificationStatus = 'VERIFIED';
    } else if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = verificationStatus;
    }

    // 2. Strict Expiration / Completion Policy:
    // Public queries never return completed or cancelled camps unless explicitly requested.
    if (!includeCompleted && !isAdmin) {
      where.status = { in: ['UPCOMING', 'TODAY', 'ONGOING'] };
    } else if (status && status !== 'ALL') {
      where.status = status;
    }

    // 3. City / State filtering if provided without coordinates
    if (city && (lat === undefined || lon === undefined)) {
      where.city = { contains: city.trim() };
    }
    if (district) {
      where.district = { contains: district.trim() };
    }
    if (state) {
      where.state = { contains: state.trim() };
    }

    // Fetch matching records from DB
    const dbCamps = await prisma.bloodDonationCamp.findMany({
      where,
      include: {
        bloodBank: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
        ...(currentUserId
          ? {
              registrations: {
                where: { donor: { userId: currentUserId } },
                select: { id: true },
              },
            }
          : {}),
      },
      orderBy: [{ campDate: 'asc' }, { createdAt: 'desc' }],
    });

    const hasUserCoords =
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon);

    // Map into CampResponseItem with dynamic status & distance
    const processed: CampResponseItem[] = dbCamps.map((c) => {
      const dynamicStatus = CampService.evaluateCampStatus(
        c.campDate,
        c.startTime,
        c.endTime,
        c.status
      );

      let distanceKm: number | null = null;
      let isCityApproximate = false;

      if (hasUserCoords && c.latitude !== null && c.longitude !== null) {
        distanceKm = calculateDistanceKm(lat, lon, c.latitude, c.longitude);
        if (c.coordinateConfidence === 'CITY_LEVEL') {
          isCityApproximate = true;
        }
      }

      return {
        id: c.id,
        source: c.source,
        sourceCampId: c.sourceCampId,
        campName: c.campName,
        description: c.description,
        venue: c.venue,
        address: c.address,
        city: c.city,
        district: c.district,
        state: c.state,
        latitude: c.latitude,
        longitude: c.longitude,
        coordinateConfidence: c.coordinateConfidence,
        organizerName: c.organizerName,
        bloodBankId: c.bloodBankId,
        bloodBankName: c.bloodBank?.name || null,
        contactPhone: c.contactPhone,
        contactEmail: c.contactEmail,
        registrationUrl: c.registrationUrl,
        campDate: c.campDate,
        startTime: c.startTime,
        endTime: c.endTime,
        status: dynamicStatus,
        verificationStatus: c.verificationStatus,
        sourceUrl: c.sourceUrl,
        sourceLastUpdatedAt: c.sourceLastUpdatedAt,
        lastFetchedAt: c.lastFetchedAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        distanceKm,
        isCityApproximate,
        registrationCount: c._count?.registrations || 0,
        isRegistered: currentUserId ? (c as any).registrations?.length > 0 : false,
      };
    });

    // If no coordinates provided, return city/text-based results
    if (!hasUserCoords) {
      const resultCamps = limit ? processed.slice(0, limit) : processed;
      return {
        camps: resultCamps,
        metadata: {
          total: resultCamps.length,
          radiusKm,
          requestedRadiusKm: radiusKm,
          expanded: false,
          expansionMessage: null,
          locationUsed: {
            type: city ? 'CITY' : 'ALL',
            label: city ? `City: ${city}` : 'All Locations',
          },
        },
      };
    }

    // Distance-based filtering
    let activeRadius = radiusKm;
    let inRadius = processed.filter(
      (c) => c.distanceKm !== null && c.distanceKm <= activeRadius
    );
    let expanded = false;
    let expansionMessage: string | null = null;

    // Radius expansion policy:
    // If no verified camps found in initial radius, sequentially expand:
    // 25km -> 50km -> 100km. Never silently expand.
    if (inRadius.length === 0 && expandRadiusIfNeeded) {
      const tiers = [50, 100].filter((t) => t > radiusKm);
      for (const tier of tiers) {
        const tierMatches = processed.filter(
          (c) => c.distanceKm !== null && c.distanceKm <= tier
        );
        if (tierMatches.length > 0) {
          activeRadius = tier;
          inRadius = tierMatches;
          expanded = true;
          expansionMessage = `No verified camps found within ${radiusKm} km. Showing verified camps within ${tier} km.`;
          break;
        }
      }
    }

    // Sort by distance ascending
    inRadius.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));

    const finalCamps = limit ? inRadius.slice(0, limit) : inRadius;

    return {
      camps: finalCamps,
      metadata: {
        total: finalCamps.length,
        radiusKm: activeRadius,
        requestedRadiusKm: radiusKm,
        expanded,
        expansionMessage,
        locationUsed: {
          type: 'COORDINATES',
          label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        },
      },
    };
  }

  /**
   * Get single verified camp by ID
   */
  static async getCampById(campId: string, currentUserId?: string): Promise<CampResponseItem | null> {
    const c = await prisma.bloodDonationCamp.findUnique({
      where: { id: campId },
      include: {
        bloodBank: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
        ...(currentUserId
          ? {
              registrations: {
                where: { donor: { userId: currentUserId } },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    if (!c) return null;

    const dynamicStatus = CampService.evaluateCampStatus(
      c.campDate,
      c.startTime,
      c.endTime,
      c.status
    );

    return {
      id: c.id,
      source: c.source,
      sourceCampId: c.sourceCampId,
      campName: c.campName,
      description: c.description,
      venue: c.venue,
      address: c.address,
      city: c.city,
      district: c.district,
      state: c.state,
      latitude: c.latitude,
      longitude: c.longitude,
      coordinateConfidence: c.coordinateConfidence,
      organizerName: c.organizerName,
      bloodBankId: c.bloodBankId,
      bloodBankName: c.bloodBank?.name || null,
      contactPhone: c.contactPhone,
      contactEmail: c.contactEmail,
      registrationUrl: c.registrationUrl,
      campDate: c.campDate,
      startTime: c.startTime,
      endTime: c.endTime,
      status: dynamicStatus,
      verificationStatus: c.verificationStatus,
      sourceUrl: c.sourceUrl,
      sourceLastUpdatedAt: c.sourceLastUpdatedAt,
      lastFetchedAt: c.lastFetchedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      registrationCount: c._count?.registrations || 0,
      isRegistered: currentUserId ? (c as any).registrations?.length > 0 : false,
    };
  }

  /**
   * Hospital or Blood Bank creates a new blood donation camp.
   * Starts with verificationStatus = 'PENDING' (unless ADMIN creates it).
   */
  static async createCamp(
    creatorUserId: string,
    creatorRole: string,
    data: {
      campName: string;
      venue: string;
      address: string;
      city: string;
      district?: string;
      state: string;
      campDate: string | Date;
      startTime: string;
      endTime: string;
      organizerName: string;
      description?: string;
      contactPhone?: string;
      contactEmail?: string;
      registrationUrl?: string;
      bloodBankId?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    const {
      campName,
      venue,
      address,
      city,
      district,
      state,
      campDate,
      startTime,
      endTime,
      organizerName,
      description,
      contactPhone,
      contactEmail,
      registrationUrl,
      bloodBankId,
      latitude,
      longitude,
    } = data;

    // Validate date is not past
    const targetDate = new Date(campDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      throw new Error('Blood donation camp date cannot be in the past.');
    }

    // Determine coordinate confidence
    let finalLat: number | null = latitude || null;
    let finalLon: number | null = longitude || null;
    let confidence = 'NONE';

    if (finalLat && finalLon) {
      confidence = 'EXACT';
    } else {
      const cityCentroid = getCityCentroid(city);
      if (cityCentroid) {
        finalLat = cityCentroid.latitude;
        finalLon = cityCentroid.longitude;
        confidence = 'CITY_LEVEL';
      }
    }

    const isAdmin = creatorRole === 'ADMIN' || creatorRole === 'SUPER_ADMIN';

    const newCamp = await prisma.bloodDonationCamp.create({
      data: {
        source: 'RAKTHASETHU',
        campName,
        venue,
        address,
        city,
        district: district || null,
        state,
        latitude: finalLat,
        longitude: finalLon,
        coordinateConfidence: confidence,
        organizerName,
        description: description || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        registrationUrl: registrationUrl || null,
        bloodBankId: bloodBankId || null,
        campDate: targetDate,
        startTime,
        endTime,
        status: 'UPCOMING',
        verificationStatus: isAdmin ? 'VERIFIED' : 'PENDING',
        createdBy: creatorUserId,
        verifiedBy: isAdmin ? creatorUserId : null,
        verifiedAt: isAdmin ? new Date() : null,
        verificationSource: isAdmin ? 'ADMIN_DIRECT_PUBLISH' : null,
      },
    });

    logger.info(
      `[CampService] Camp created "${newCamp.campName}" in ${newCamp.city} (Status: ${newCamp.verificationStatus})`
    );

    return newCamp;
  }

  /**
   * Admin approves and verifies a pending camp.
   * Immediately notifies eligible registered donors in the area.
   */
  static async verifyCamp(campId: string, adminUserId: string, notes?: string) {
    const camp = await prisma.bloodDonationCamp.findUnique({
      where: { id: campId },
    });

    if (!camp) {
      throw new Error('Camp not found');
    }

    const updated = await prisma.bloodDonationCamp.update({
      where: { id: campId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        verificationSource: 'ADMIN_VERIFIED',
        verificationNotes: notes || 'Verified by RakthaSethu Admin after authenticity check.',
      },
    });

    // Notify registered donors in the city/state with campaign alerts enabled
    this.broadcastVerifiedCampNotification(updated).catch((err) =>
      logger.error('[CampService] Error broadcasting camp notification:', err)
    );

    return updated;
  }

  /**
   * Admin rejects a camp with a reason.
   */
  static async rejectCamp(campId: string, adminUserId: string, notes?: string) {
    return prisma.bloodDonationCamp.update({
      where: { id: campId },
      data: {
        verificationStatus: 'REJECTED',
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        verificationNotes: notes || 'Rejected during administrative review.',
      },
    });
  }

  /**
   * Cancels a camp.
   */
  static async cancelCamp(campId: string, reason?: string) {
    return prisma.bloodDonationCamp.update({
      where: { id: campId },
      data: {
        status: 'CANCELLED',
        verificationNotes: reason ? `Cancelled: ${reason}` : 'Cancelled by organizer.',
      },
    });
  }

  /**
   * Broadcasts push/in-app notification to local donors about a newly verified camp
   */
  private static async broadcastVerifiedCampNotification(camp: any) {
    try {
      const donors = await prisma.donorProfile.findMany({
        where: {
          city: camp.city,
          isEligible: true,
          user: {
            notificationPreferences: {
              campaignAlerts: true,
            },
          },
        },
        include: { user: true },
        take: 50, // Respect rate limits
      });

      for (const donor of donors) {
        await NotificationService.notify({
          userId: donor.userId,
          title: `🩸 Verified Blood Donation Camp in ${camp.city}`,
          message: `Join "${camp.campName}" at ${camp.venue} on ${new Date(camp.campDate).toLocaleDateString()}. Save lives in your neighborhood!`,
          type: 'SYSTEM_NOTICE',
          priority: 'NORMAL',
          category: 'CAMPAIGN',
          actionUrl: `/campaigns`,
        });
      }
    } catch (err) {
      logger.error('[CampService] Broadcast failed:', err);
    }
  }
}
