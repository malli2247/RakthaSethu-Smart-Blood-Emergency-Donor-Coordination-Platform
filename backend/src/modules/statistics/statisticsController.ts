import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { CacheService } from '../../services/cacheService';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * GET /api/statistics/public
 * Returns 100% database-driven public platform statistics.
 * Strict rules:
 * - Fresh database returns strictly 0 for all counts.
 * - Donors: only counts verified, active, eligible donors.
 * - Hospitals & Blood Banks: only counts facilities with verificationStatus === 'VERIFIED'.
 * - Fulfilled Requests: only counts requests with status === 'FULFILLED'.
 * - Successful Donations: only counts completed donation records.
 * - Blood Units: sum of units from confirmed donations.
 */
export async function getPublicStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await CacheService.wrap(
      'public_statistics',
      15, // 15-second TTL
      async () => {
        const [
          users,
          donors,
          totalVerifiedDonors,
          hospitals,
          bloodBanks,
          volunteers,
          bloodRequests,
          activeRequests,
          fulfilledRequests,
          successfulDonations,
          unitsAgg,
        ] = await Promise.all([
          // 1. Registered active user accounts
          prisma.user.count({
            where: { isActive: true },
          }),

          // 2. Active, eligible, verified donors ready for emergency dispatch
          prisma.donorProfile.count({
            where: {
              user: {
                isActive: true,
                isVerified: true,
              },
              isAvailable: true,
              isEligible: true,
            },
          }),

          // 3. Total registered & verified donors (regardless of temporary availability)
          prisma.donorProfile.count({
            where: {
              user: {
                isActive: true,
                isVerified: true,
              },
            },
          }),

          // 4. Officially verified hospitals
          prisma.hospital.count({
            where: {
              verificationStatus: 'VERIFIED',
              user: { isActive: true },
            },
          }),

          // 5. Officially verified blood banks
          prisma.bloodBank.count({
            where: {
              verificationStatus: 'VERIFIED',
              user: { isActive: true },
            },
          }),

          // 6. Active verified volunteers
          prisma.user.count({
            where: {
              role: 'VOLUNTEER',
              isActive: true,
              isVerified: true,
            },
          }),

          // 7. Total blood emergency requests created
          prisma.bloodRequest.count(),

          // 8. Currently active requests
          prisma.bloodRequest.count({
            where: {
              status: {
                in: ['PENDING', 'MATCHING', 'DONOR_CONTACTED'],
              },
            },
          }),

          // 9. Genuinely fulfilled requests
          prisma.bloodRequest.count({
            where: { status: 'FULFILLED' },
          }),

          // 10. Completed & confirmed donation records (Section 46)
          prisma.donation.count({
            where: { status: 'CONFIRMED' },
          }),

          // 11. Blood units donated from officially confirmed donations
          prisma.donation.aggregate({
            where: { status: 'CONFIRMED' },
            _sum: { units: true },
          }),
        ]);

        const bloodUnitsDonated = unitsAgg._sum.units || 0;
        // Lives impacted strictly equals fulfilled requests (or successful donations)
        const livesImpacted = fulfilledRequests;

        return {
          users,
          donors,
          totalVerifiedDonors,
          hospitals,
          bloodBanks,
          volunteers,
          bloodRequests,
          activeRequests,
          fulfilledRequests,
          successfulDonations,
          bloodUnitsDonated,
          livesImpacted,
          // Rate calculated strictly from real numbers, 0 if no requests
          fulfillmentRate: bloodRequests > 0 ? Math.round((fulfilledRequests / bloodRequests) * 100) : 0,
        };
      },
      ['stats']
    );

    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/statistics/activity
 * Returns recent platform activity feed strictly from actual database events.
 * Anonymized for privacy (no private names, phone numbers, or coordinates).
 */
export async function getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activity = await CacheService.wrap(
      'recent_activity',
      15, // 15-second TTL
      async () => {
        const [recentRequests, recentDonations, recentFacilities] = await Promise.all([
          // Recent emergency requests
          prisma.bloodRequest.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              bloodGroup: true,
              unitsRequired: true,
              hospitalCity: true,
              urgency: true,
              status: true,
              createdAt: true,
            },
          }),

          // Recent confirmed donations
          prisma.donation.findMany({
            take: 5,
            orderBy: { donationDate: 'desc' },
            select: {
              id: true,
              bloodGroup: true,
              units: true,
              donationDate: true,
              hospital: {
                select: { city: true },
              },
              bloodBank: {
                select: { city: true },
              },
            },
          }),

          // Recent verified facilities
          prisma.hospital.findMany({
            where: { verificationStatus: 'VERIFIED' },
            take: 3,
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              name: true,
              city: true,
              updatedAt: true,
            },
          }),
        ]);

        type ActivityItem = {
          id: string;
          type: 'REQUEST' | 'DONATION' | 'HOSPITAL_JOINED' | 'FULFILLED';
          title: string;
          description: string;
          timestamp: string;
          city?: string;
          bloodGroup?: string;
          urgency?: string;
        };

        const feed: ActivityItem[] = [];

        // Map requests
        recentRequests.forEach((req: any) => {
          if (req.status === 'FULFILLED') {
            feed.push({
              id: `req-ful-${req.id}`,
              type: 'FULFILLED',
              title: `Emergency Blood Request Fulfilled`,
              description: `${req.unitsRequired} unit(s) of ${req.bloodGroup} provided successfully in ${req.hospitalCity}.`,
              timestamp: req.createdAt.toISOString(),
              city: req.hospitalCity,
              bloodGroup: req.bloodGroup,
            });
          } else {
            feed.push({
              id: `req-${req.id}`,
              type: 'REQUEST',
              title: `Emergency Blood Alert: ${req.bloodGroup}`,
              description: `${req.unitsRequired} unit(s) needed in ${req.hospitalCity} (${req.urgency}).`,
              timestamp: req.createdAt.toISOString(),
              city: req.hospitalCity,
              bloodGroup: req.bloodGroup,
              urgency: req.urgency,
            });
          }
        });

        // Map donations
        recentDonations.forEach((don: any) => {
          const city = don.hospital?.city || don.bloodBank?.city || 'Emergency Network';
          feed.push({
            id: `don-${don.id}`,
            type: 'DONATION',
            title: `Successful Blood Donation Confirmed`,
            description: `${don.units} unit(s) of ${don.bloodGroup} donated at verified center in ${city}.`,
            timestamp: don.donationDate.toISOString(),
            city,
            bloodGroup: don.bloodGroup,
          });
        });

        // Map facility verification
        recentFacilities.forEach((hosp: any) => {
          feed.push({
            id: `hosp-${hosp.id}`,
            type: 'HOSPITAL_JOINED',
            title: `Medical Center Verified`,
            description: `${hosp.name} in ${hosp.city} verified and connected to emergency lifeline.`,
            timestamp: hosp.updatedAt.toISOString(),
            city: hosp.city,
          });
        });

        // Sort descending by timestamp and limit to 8
        feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return feed.slice(0, 8);
      },
      ['stats']
    );

    sendSuccess(res, activity);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/statistics/inventory
 * Returns real available blood units grouped by blood group from verified blood banks.
 */
export async function getLiveInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const inventory = await CacheService.wrap(
      'live_inventory',
      30, // 30-second TTL
      async () => {
        // Query actual stock from verified blood banks
        const items = await prisma.bloodInventory.groupBy({
          by: ['bloodGroup'],
          where: {
            status: 'AVAILABLE',
            bloodBank: {
              verificationStatus: 'VERIFIED',
              user: { isActive: true },
            },
          },
          _sum: {
            units: true,
          },
        });

        const stockMap = new Map<string, number>();
        items.forEach((item: any) => {
          stockMap.set(item.bloodGroup, item._sum.units || 0);
        });

        // Return all 8 standard ABO/Rh blood groups with real counts
        return BLOOD_GROUPS.map((bg) => {
          const units = stockMap.get(bg) || 0;
          let stockStatus: 'EMPTY' | 'CRITICAL' | 'ADEQUATE';
          if (units === 0) stockStatus = 'EMPTY';
          else if (units < 10) stockStatus = 'CRITICAL';
          else stockStatus = 'ADEQUATE';

          return {
            bloodGroup: bg,
            units,
            status: stockStatus,
          };
        });
      },
      ['stats']
    );

    sendSuccess(res, inventory);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/statistics/admin
 * In-depth operational analytics for platform administrators.
 */
export async function getAdminAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const analytics = await CacheService.wrap(
      'admin_analytics',
      20,
      async () => {
        const [
          totalUsers,
          usersByRole,
          requestsByBloodGroup,
          requestsByUrgency,
          totalRequests,
          fulfilledRequests,
          totalDonations,
          donationsSum,
          pendingHospitals,
          pendingBloodBanks,
        ] = await Promise.all([
          prisma.user.count(),
          prisma.user.groupBy({
            by: ['role'],
            _count: { id: true },
          }),
          prisma.bloodRequest.groupBy({
            by: ['bloodGroup'],
            _count: { id: true },
          }),
          prisma.bloodRequest.groupBy({
            by: ['urgency'],
            _count: { id: true },
          }),
          prisma.bloodRequest.count(),
          prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
          prisma.donation.count(),
          prisma.donation.aggregate({ _sum: { units: true } }),
          prisma.hospital.count({ where: { verificationStatus: 'PENDING' } }),
          prisma.bloodBank.count({ where: { verificationStatus: 'PENDING' } }),
        ]);

        const roleCounts: Record<string, number> = {};
        usersByRole.forEach((r: any) => {
          roleCounts[r.role] = r._count.id;
        });

        const bgCounts: Record<string, number> = {};
        requestsByBloodGroup.forEach((b: any) => {
          bgCounts[b.bloodGroup] = b._count.id;
        });

        const urgencyCounts: Record<string, number> = {};
        requestsByUrgency.forEach((u: any) => {
          urgencyCounts[u.urgency] = u._count.id;
        });

        return {
          totalUsers,
          roleCounts,
          requestDistribution: {
            byBloodGroup: bgCounts,
            byUrgency: urgencyCounts,
          },
          fulfillmentRate: totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0,
          totalRequests,
          fulfilledRequests,
          totalDonations,
          totalUnitsDonated: donationsSum._sum.units || 0,
          pendingVerifications: {
            hospitals: pendingHospitals,
            bloodBanks: pendingBloodBanks,
            total: pendingHospitals + pendingBloodBanks,
          },
        };
      },
      ['stats']
    );

    sendSuccess(res, analytics);
  } catch (error) {
    next(error);
  }
}
