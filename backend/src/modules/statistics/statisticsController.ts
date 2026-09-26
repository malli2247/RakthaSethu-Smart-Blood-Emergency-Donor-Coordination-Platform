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
          verifiedCamps,
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

          // 12. Officially verified blood donation camps
          prisma.bloodDonationCamp.count({
            where: { verificationStatus: 'VERIFIED' },
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
          bloodCamps: verifiedCamps,
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
    const user = req.user!;
    const cacheKey = `activity_${user.role}_${user.id}`;

    const activity = await CacheService.wrap(
      cacheKey,
      10, // 10-second TTL
      async () => {
        type ActivityItem = {
          id: string;
          type: 'REQUEST' | 'DONATION' | 'HOSPITAL_JOINED' | 'FULFILLED' | 'MATCH';
          title: string;
          description: string;
          timestamp: string;
          city?: string;
          bloodGroup?: string;
          urgency?: string;
          status?: string;
        };

        const feed: ActivityItem[] = [];

        // 1. ADMIN & SUPER_ADMIN: Global operational emergency feed
        if (['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          const [recentRequests, recentDonations, recentFacilities] = await Promise.all([
            prisma.bloodRequest.findMany({
              take: 8,
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
            prisma.donation.findMany({
              where: { status: 'CONFIRMED' },
              take: 5,
              orderBy: { donationDate: 'desc' },
              select: {
                id: true,
                bloodGroup: true,
                units: true,
                donationDate: true,
                hospital: { select: { city: true } },
                bloodBank: { select: { city: true } },
              },
            }),
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

          recentRequests.forEach((r: any) => {
            if (r.status === 'FULFILLED') {
              feed.push({
                id: `req-ful-${r.id}`,
                type: 'FULFILLED',
                title: 'Emergency Blood Request Fulfilled',
                description: `${r.unitsRequired} unit(s) of ${r.bloodGroup} provided successfully in ${r.hospitalCity}.`,
                timestamp: r.createdAt.toISOString(),
                city: r.hospitalCity,
                bloodGroup: r.bloodGroup,
                status: r.status,
              });
            } else {
              feed.push({
                id: `req-${r.id}`,
                type: 'REQUEST',
                title: `Emergency Blood Alert: ${r.bloodGroup}`,
                description: `${r.unitsRequired} unit(s) needed in ${r.hospitalCity} (${r.urgency}).`,
                timestamp: r.createdAt.toISOString(),
                city: r.hospitalCity,
                bloodGroup: r.bloodGroup,
                urgency: r.urgency,
                status: r.status,
              });
            }
          });

          recentDonations.forEach((d: any) => {
            const city = d.hospital?.city || d.bloodBank?.city || 'Medical Center';
            feed.push({
              id: `don-${d.id}`,
              type: 'DONATION',
              title: 'Successful Blood Donation Confirmed',
              description: `${d.units} unit(s) of ${d.bloodGroup} donated at verified center in ${city}.`,
              timestamp: d.donationDate.toISOString(),
              city,
              bloodGroup: d.bloodGroup,
            });
          });

          recentFacilities.forEach((h: any) => {
            feed.push({
              id: `hosp-${h.id}`,
              type: 'HOSPITAL_JOINED',
              title: 'Medical Center Verified',
              description: `${h.name} in ${h.city} verified and connected to emergency lifeline.`,
              timestamp: h.updatedAt.toISOString(),
              city: h.city,
            });
          });
        }
        // 2. DONOR: Only emergency requests matched to this donor & donor's personal confirmed donations
        else if (user.role === 'DONOR') {
          const donorProfile = await prisma.donorProfile.findUnique({
            where: { userId: user.id },
            select: { id: true },
          });

          if (donorProfile) {
            const [matches, donations] = await Promise.all([
              prisma.donorMatch.findMany({
                where: { donorId: donorProfile.id },
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: {
                  request: {
                    select: {
                      id: true,
                      bloodGroup: true,
                      unitsRequired: true,
                      hospitalName: true,
                      hospitalCity: true,
                      urgency: true,
                      status: true,
                    },
                  },
                },
              }),
              prisma.donation.findMany({
                where: { donorId: donorProfile.id, status: 'CONFIRMED' },
                take: 5,
                orderBy: { donationDate: 'desc' },
                select: {
                  id: true,
                  bloodGroup: true,
                  units: true,
                  donationDate: true,
                  hospital: { select: { name: true, city: true } },
                },
              }),
            ]);

            matches.forEach((m: any) => {
              feed.push({
                id: `match-${m.id}`,
                type: 'MATCH',
                title: `Emergency Blood Match: ${m.request.bloodGroup}`,
                description: `You are eligible and matched for ${m.request.unitsRequired} unit(s) at ${m.request.hospitalName}, ${m.request.hospitalCity}. Status: ${m.status}.`,
                timestamp: m.createdAt.toISOString(),
                city: m.request.hospitalCity,
                bloodGroup: m.request.bloodGroup,
                urgency: m.request.urgency,
                status: m.status,
              });
            });

            donations.forEach((d: any) => {
              feed.push({
                id: `don-${d.id}`,
                type: 'DONATION',
                title: 'Donation Completed & Confirmed',
                description: `Successfully donated ${d.units} unit(s) of ${d.bloodGroup} at ${d.hospital?.name || 'Authorized Center'}.`,
                timestamp: d.donationDate.toISOString(),
                bloodGroup: d.bloodGroup,
              });
            });
          }
        }
        // 3. PATIENT / RECEIVER: Only their own blood requests
        else if (['PATIENT', 'RECEIVER'].includes(user.role)) {
          const requests = await prisma.bloodRequest.findMany({
            where: { requesterId: user.id },
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              bloodGroup: true,
              unitsRequired: true,
              unitsFulfilled: true,
              hospitalCity: true,
              urgency: true,
              status: true,
              createdAt: true,
            },
          });

          requests.forEach((r: any) => {
            feed.push({
              id: `patient-req-${r.id}`,
              type: r.status === 'FULFILLED' ? 'FULFILLED' : 'REQUEST',
              title: `Your Blood Request: ${r.bloodGroup} (${r.status})`,
              description: `${r.unitsRequired} unit(s) requested for ${r.hospitalCity}. Fulfilled: ${r.unitsFulfilled}/${r.unitsRequired}.`,
              timestamp: r.createdAt.toISOString(),
              city: r.hospitalCity,
              bloodGroup: r.bloodGroup,
              status: r.status,
            });
          });
        }
        // 4. HOSPITAL: Only authorized hospital requests & donations
        else if (user.role === 'HOSPITAL') {
          const hospital = await prisma.hospital.findUnique({
            where: { userId: user.id },
            select: { id: true, name: true, city: true },
          });

          if (hospital) {
            const [requests, donations] = await Promise.all([
              prisma.bloodRequest.findMany({
                where: {
                  OR: [
                    { requesterId: user.id },
                    { hospitalName: hospital.name },
                  ],
                },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                  id: true,
                  bloodGroup: true,
                  unitsRequired: true,
                  unitsFulfilled: true,
                  urgency: true,
                  status: true,
                  createdAt: true,
                },
              }),
              prisma.donation.findMany({
                where: { hospitalId: hospital.id },
                take: 5,
                orderBy: { donationDate: 'desc' },
                select: {
                  id: true,
                  bloodGroup: true,
                  units: true,
                  status: true,
                  donationDate: true,
                },
              }),
            ]);

            requests.forEach((r: any) => {
              feed.push({
                id: `hosp-req-${r.id}`,
                type: r.status === 'FULFILLED' ? 'FULFILLED' : 'REQUEST',
                title: `Hospital Emergency Request: ${r.bloodGroup}`,
                description: `${r.unitsRequired} unit(s) needed (${r.urgency}). Status: ${r.status}.`,
                timestamp: r.createdAt.toISOString(),
                bloodGroup: r.bloodGroup,
                status: r.status,
              });
            });

            donations.forEach((d: any) => {
              feed.push({
                id: `hosp-don-${d.id}`,
                type: 'DONATION',
                title: `Donation Session: ${d.bloodGroup}`,
                description: `${d.units} unit(s) logged at your hospital. Status: ${d.status}.`,
                timestamp: d.donationDate.toISOString(),
                bloodGroup: d.bloodGroup,
                status: d.status,
              });
            });
          }
        }
        // 5. BLOOD BANK: Only authorized inventory & donations
        else if (user.role === 'BLOOD_BANK') {
          const bloodBank = await prisma.bloodBank.findUnique({
            where: { userId: user.id },
            select: { id: true, name: true },
          });

          if (bloodBank) {
            const [donations, inventoryBatches] = await Promise.all([
              prisma.donation.findMany({
                where: { bloodBankId: bloodBank.id },
                take: 5,
                orderBy: { donationDate: 'desc' },
                select: {
                  id: true,
                  bloodGroup: true,
                  units: true,
                  status: true,
                  donationDate: true,
                },
              }),
              prisma.bloodInventory.findMany({
                where: { bloodBankId: bloodBank.id },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                  id: true,
                  bloodGroup: true,
                  units: true,
                  status: true,
                  updatedAt: true,
                },
              }),
            ]);

            donations.forEach((d: any) => {
              feed.push({
                id: `bb-don-${d.id}`,
                type: 'DONATION',
                title: `Blood Center Intake: ${d.bloodGroup}`,
                description: `${d.units} unit(s) collected at facility. Status: ${d.status}.`,
                timestamp: d.donationDate.toISOString(),
                bloodGroup: d.bloodGroup,
              });
            });

            inventoryBatches.forEach((b: any) => {
              feed.push({
                id: `bb-inv-${b.id}`,
                type: 'FULFILLED',
                title: `Inventory Stock: ${b.bloodGroup}`,
                description: `${b.units} unit(s) updated in cold storage. Status: ${b.status}.`,
                timestamp: b.updatedAt.toISOString(),
                bloodGroup: b.bloodGroup,
              });
            });
          }
        }
        // 6. VOLUNTEER: Only assigned / local service area tasks
        else if (user.role === 'VOLUNTEER') {
          const volunteer = await prisma.volunteer.findUnique({
            where: { userId: user.id },
            select: { serviceAreaCity: true },
          });

          if (volunteer?.serviceAreaCity) {
            const localRequests = await prisma.bloodRequest.findMany({
              where: {
                hospitalCity: volunteer.serviceAreaCity,
                status: { in: ['PENDING', 'MATCHING', 'DONOR_CONTACTED'] },
              },
              take: 5,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                bloodGroup: true,
                unitsRequired: true,
                hospitalName: true,
                hospitalCity: true,
                urgency: true,
                status: true,
                createdAt: true,
              },
            });

            localRequests.forEach((r: any) => {
              feed.push({
                id: `vol-req-${r.id}`,
                type: 'REQUEST',
                title: `Local Task Alert: ${r.bloodGroup}`,
                description: `Emergency coordination in ${r.hospitalCity} at ${r.hospitalName} (${r.urgency}).`,
                timestamp: r.createdAt.toISOString(),
                city: r.hospitalCity,
                bloodGroup: r.bloodGroup,
                urgency: r.urgency,
                status: r.status,
              });
            });
          }
        }

        // Sort descending by timestamp
        feed.sort((a: ActivityItem, b: ActivityItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return feed.slice(0, 10);
      },
      ['stats', `user_${user.id}`]
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
