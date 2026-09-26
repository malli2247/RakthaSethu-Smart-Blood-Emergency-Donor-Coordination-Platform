import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { MatchingService } from '../matching/matchingService';
import { sanitizeDonorView } from '../../utils/privacy';
import { NotificationService } from '../../services/notificationService';
import { EmailService } from '../../services/emailService';

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['VALIDATING', 'MATCHING', 'CANCELLED', 'REJECTED', 'EXPIRED'],
  VALIDATING: ['MATCHING', 'REJECTED', 'CANCELLED'],
  MATCHING: ['DONORS_FOUND', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'UNABLE_TO_FULFILL', 'CANCELLED', 'EXPIRED'],
  DONORS_FOUND: ['DONOR_CONTACTED', 'DONOR_ACCEPTED', 'MATCHING', 'CANCELLED', 'EXPIRED'],
  DONOR_CONTACTED: ['DONOR_ACCEPTED', 'MATCHING', 'CANCELLED', 'EXPIRED'],
  DONOR_ACCEPTED: ['DONOR_TRAVELLING', 'DONOR_ARRIVED', 'DONATION_STARTED', 'DONATION_CONFIRMED', 'MATCHING', 'CANCELLED', 'EXPIRED'],
  DONOR_TRAVELLING: ['DONOR_ARRIVED', 'DONOR_ACCEPTED', 'DONATION_STARTED', 'DONATION_CONFIRMED', 'MATCHING', 'CANCELLED'],
  DONOR_ARRIVED: ['DONATION_STARTED', 'DONATION_COMPLETED', 'DONATION_CONFIRMED', 'MATCHING', 'CANCELLED', 'FULFILLMENT_ISSUE'],
  DONATION_STARTED: ['DONATION_COMPLETED', 'DONATION_CONFIRMED', 'FULFILLMENT_ISSUE', 'CANCELLED'],
  DONATION_COMPLETED: ['DONATION_VERIFICATION_PENDING', 'DONATION_CONFIRMED', 'FULFILLMENT_ISSUE'],
  DONATION_VERIFICATION_PENDING: ['DONATION_CONFIRMED', 'FULFILLMENT_ISSUE', 'REJECTED'],
  DONATION_CONFIRMED: ['BLOOD_RECEIVED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED', 'FULFILLMENT_ISSUE'],
  BLOOD_RECEIVED: ['FULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLMENT_ISSUE'],
  PARTIALLY_FULFILLED: ['MATCHING', 'DONOR_CONTACTED', 'DONOR_ACCEPTED', 'DONATION_CONFIRMED', 'FULFILLED', 'CANCELLED'],
  FULFILLMENT_ISSUE: ['BLOOD_RECEIVED', 'DONATION_CONFIRMED', 'FULFILLED', 'UNABLE_TO_FULFILL', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
  EXPIRED: [],
  REJECTED: [],
  UNABLE_TO_FULFILL: [],
};

export class RequestService {
  /**
   * Create a new emergency blood request
   */
  static async createRequest(requesterId: string, data: any) {
    const request = await prisma.bloodRequest.create({
      data: {
        requesterId,
        patientName: data.patientName,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        bloodGroup: data.bloodGroup,
        unitsRequired: data.unitsRequired,
        hospitalName: data.hospitalName,
        hospitalCity: data.hospitalCity,
        hospitalState: data.hospitalState,
        hospitalAddress: data.hospitalAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        requiredBy: new Date(data.requiredBy),
        urgency: data.urgency,
        medicalReason: data.medicalReason,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        status: 'MATCHING',
        additionalNotes: data.additionalNotes,
      },
    });

    // Automatically trigger matching engine asynchronously
    try {
      await MatchingService.matchRequest(request.id);
    } catch (err) {
      console.error('Error during auto matching:', err);
    }

    return request;
  }

  /**
   * List blood requests with search filters and pagination
   */
  static async listRequests(query: {
    status?: string;
    urgency?: string;
    bloodGroup?: string;
    city?: string;
    state?: string;
    requesterId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      urgency,
      bloodGroup,
      city,
      state,
      requesterId,
      page = 1,
      limit = 20,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (bloodGroup) where.bloodGroup = bloodGroup;
    if (city) where.hospitalCity = { contains: city };
    if (state) where.hospitalState = { contains: state };
    if (requesterId) where.requesterId = requesterId;

    const [total, requests] = await Promise.all([
      prisma.bloodRequest.count({ where }),
      prisma.bloodRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        include: {
          requester: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: { matches: true, donations: true },
          },
        },
      }),
    ]);

    return {
      requests,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get single request with detail, matches, donations, and receipts, masking donor PII unless authorized
   */
  static async getRequestById(id: string, viewerId?: string, viewerRole?: string) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
        matches: {
          include: {
            donor: {
              include: {
                user: {
                  select: {
                    id: true,
                    phone: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        donations: {
          include: {
            hospital: { select: { id: true, name: true, city: true } },
            bloodBank: { select: { id: true, name: true, city: true } },
            donor: { select: { id: true, fullName: true, bloodGroup: true } },
          },
          orderBy: { donationDate: 'desc' },
        },
        receipts: {
          include: {
            receiver: { select: { id: true, email: true, phone: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const isRequester = Boolean(viewerId && viewerId === request.requesterId);
    const isAdmin = viewerRole === 'ADMIN' || viewerRole === 'SUPER_ADMIN';
    const isHospitalStaff = viewerRole === 'HOSPITAL';

    // Mask donor contacts on matches according to Section 5 privacy rules
    const sanitizedMatches = request.matches.map((match: any) => {
      const isMatchDonor = Boolean(viewerId && match.donor.userId === viewerId);
      const isMatchAccepted = ['ACCEPTED', 'TRAVELLING', 'ARRIVED', 'DONATION_STARTED', 'DONATION_COMPLETED', 'CONFIRMED'].includes(match.status);
      const canViewFullDetails =
        isAdmin ||
        isMatchDonor ||
        (isMatchAccepted && (isRequester || isHospitalStaff));

      return {
        ...match,
        donor: sanitizeDonorView(match.donor, canViewFullDetails, isMatchDonor),
      };
    });

    return {
      ...request,
      matches: sanitizedMatches,
    };
  }

  /**
   * Update request status enforcing state machine and role-based ownership guards
   */
  static async updateStatus(
    requestId: string,
    nextStatus: string,
    userId: string,
    userRole?: string,
    notes?: string
  ) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        donations: true,
        receipts: true,
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const isRequester = userId === request.requesterId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    const isHospital = userRole === 'HOSPITAL';

    if (!isAdmin) {
      if (nextStatus === 'CANCELLED') {
        if (!isRequester && !isHospital) {
          throw new AppError('Unauthorized: Only the requester or assigned hospital can cancel this request', 403);
        }
      } else if (nextStatus === 'FULFILLED') {
        // Enforce Section 19: FULFILLED requires both hospital donation confirmation AND receiver confirmation
        const hasConfirmedDonation = request.donations.some((d: any) => d.status === 'CONFIRMED');
        const hasConfirmedReceipt = request.receipts.some((r: any) => r.confirmed);

        if (!hasConfirmedDonation) {
          throw new AppError('Cannot fulfill request: Hospital has not officially confirmed blood donation', 400);
        }
        if (!hasConfirmedReceipt) {
          throw new AppError('Cannot fulfill request: Recipient has not confirmed blood receipt', 400);
        }
      } else if (nextStatus === 'DONATION_CONFIRMED') {
        if (!isHospital) {
          throw new AppError('Unauthorized: Only hospital staff can confirm physical donation completion', 403);
        }
      } else if (nextStatus === 'BLOOD_RECEIVED') {
        if (!isRequester) {
          throw new AppError('Unauthorized: Only recipient can confirm blood receipt', 403);
        }
      } else {
        throw new AppError('Unauthorized: You do not have permission to transition to this status', 403);
      }
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[request.status] || [];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new AppError(
        `Invalid status transition from ${request.status} to ${nextStatus}. Allowed: ${allowedTransitions.join(', ') || 'None (terminal state)'}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updated = await prisma.bloodRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus as any,
        ...(notes && { additionalNotes: `${request.additionalNotes || ''}\n[Status update to ${nextStatus}]: ${notes}` }),
      },
    });

    // Multi-channel notification for requester
    await NotificationService.notify({
      userId: request.requesterId,
      title: `Blood Request Status: ${nextStatus.replace(/_/g, ' ')}`,
      message: `Your emergency request for ${request.patientName} (${request.bloodGroup}) is now: ${nextStatus.replace(/_/g, ' ')}.`,
      type: nextStatus === 'FULFILLED' ? 'REQUEST_FULFILLED' : 'REQUEST_STATUS_CHANGED',
      priority: ['CRITICAL', 'URGENT'].includes(request.urgency) ? 'HIGH' : 'NORMAL',
      category: 'EMERGENCY',
      link: `/patient/requests/${requestId}`,
      actionUrl: `/patient/requests/${requestId}`,
      metadata: { requestId, nextStatus, patientName: request.patientName },
    });

    // Notify donors when request is completely fulfilled
    if (nextStatus === 'FULFILLED') {
      prisma.donorMatch.findMany({
        where: { requestId },
        include: { donor: true },
      }).then((matches: any[]) => {
        for (const m of matches) {
          if (m.donor?.userId) {
            NotificationService.notify({
              userId: m.donor.userId,
              title: `Request Fulfilled — Thank You!`,
              message: `The emergency blood request for ${request.patientName} (${request.bloodGroup}) has been successfully fulfilled. Thank you for your humanitarian readiness.`,
              type: 'REQUEST_FULFILLED',
              priority: 'NORMAL',
              category: 'DONATION',
              link: '/donor/history',
              actionUrl: '/donor/history',
              metadata: { requestId, patientName: request.patientName },
            }).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Donor responds to match (ACCEPT, DECLINE, or CANCEL)
   */
  static async respondToMatch(
    donorUserId: string,
    matchId: string,
    action: 'ACCEPT' | 'DECLINE' | 'CANCEL',
    responseNotes?: string
  ) {
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: donorUserId },
      include: {
        user: { select: { id: true, phone: true, email: true } },
      },
    });

    if (!donorProfile) {
      throw new AppError('Donor profile not found', 404);
    }

    const match = await prisma.donorMatch.findUnique({
      where: { id: matchId },
      include: { request: true },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    if (match.donorId !== donorProfile.id) {
      throw new AppError('Unauthorized: You can only respond to your own matches', 403);
    }

    let newMatchStatus: string;
    if (action === 'ACCEPT') newMatchStatus = 'ACCEPTED';
    else if (action === 'DECLINE') newMatchStatus = 'DECLINED';
    else newMatchStatus = 'CANCELLED';

    const updatedMatch = await prisma.donorMatch.update({
      where: { id: matchId },
      data: {
        status: newMatchStatus,
        respondedAt: new Date(),
        responseNotes: responseNotes || (action === 'ACCEPT' ? 'Donor agreed to donate' : action === 'CANCEL' ? 'Donor had to cancel' : 'Donor declined'),
      },
    });

    if (action === 'ACCEPT') {
      // Step 3 & 4: DONOR ACCEPTANCE IS NOT FULFILLMENT. Transition to DONOR_ACCEPTED
      await prisma.bloodRequest.update({
        where: { id: match.requestId },
        data: { status: 'DONOR_ACCEPTED' },
      });

      // Notify requester with privacy-safe alert
      await NotificationService.notify({
        userId: match.request.requesterId,
        title: `Donor Accepted Your Emergency Request!`,
        message: `A compatible voluntary donor has accepted your blood request for ${match.request.patientName}. Donor will travel to ${match.request.hospitalName}.`,
        type: 'DONOR_ACCEPTED',
        priority: 'HIGH',
        category: 'MATCH',
        link: `/patient/requests/${match.requestId}`,
        actionUrl: `/patient/requests/${match.requestId}`,
        metadata: { requestId: match.requestId, donorId: donorProfile.id },
      });
    } else if (action === 'CANCEL') {
      // Check remaining accepted donors
      const remainingAccepted = await prisma.donorMatch.count({
        where: { requestId: match.requestId, status: { in: ['ACCEPTED', 'TRAVELLING', 'ARRIVED'] } },
      });

      if (remainingAccepted === 0) {
        // Revert to MATCHING and re-trigger matching
        await prisma.bloodRequest.update({
          where: { id: match.requestId },
          data: { status: 'MATCHING' },
        });

        MatchingService.matchRequest(match.requestId).catch(() => {});

        await NotificationService.notify({
          userId: match.request.requesterId,
          title: `Donor Cancelled — Searching Replacement`,
          message: `A donor was unable to proceed. The matching engine has automatically resumed searching for compatible donors.`,
          type: 'REQUEST_STATUS_CHANGED',
          priority: 'URGENT',
          category: 'EMERGENCY',
          link: `/patient/requests/${match.requestId}`,
          actionUrl: `/patient/requests/${match.requestId}`,
        });
      }
    }

    return updatedMatch;
  }

  /**
   * Donor starts navigation/travel to hospital
   */
  static async startDonorTravel(donorUserId: string, matchId: string) {
    const donorProfile = await prisma.donorProfile.findUnique({ where: { userId: donorUserId } });
    if (!donorProfile) throw new AppError('Donor profile not found', 404);

    const match = await prisma.donorMatch.findUnique({
      where: { id: matchId },
      include: { request: true },
    });

    if (!match || match.donorId !== donorProfile.id) {
      throw new AppError('Unauthorized: Match record not found or inaccessible', 403);
    }

    const updatedMatch = await prisma.donorMatch.update({
      where: { id: matchId },
      data: {
        status: 'TRAVELLING',
        startedTravellingAt: new Date(),
      },
    });

    // Update request state if currently DONOR_ACCEPTED
    if (match.request.status === 'DONOR_ACCEPTED') {
      await prisma.bloodRequest.update({
        where: { id: match.requestId },
        data: { status: 'DONOR_TRAVELLING' },
      });
    }

    // Notify requester
    await NotificationService.notify({
      userId: match.request.requesterId,
      title: `Donor is Travelling to Hospital`,
      message: `Your matched donor has departed and is en route to ${match.request.hospitalName}.`,
      type: 'DONOR_TRAVELLING',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: `/patient/requests/${match.requestId}`,
      actionUrl: `/patient/requests/${match.requestId}`,
    });

    return updatedMatch;
  }

  /**
   * Donor reports arrival at hospital
   */
  static async markDonorArrived(donorUserId: string, matchId: string) {
    const donorProfile = await prisma.donorProfile.findUnique({ where: { userId: donorUserId } });
    if (!donorProfile) throw new AppError('Donor profile not found', 404);

    const match = await prisma.donorMatch.findUnique({
      where: { id: matchId },
      include: { request: true },
    });

    if (!match || match.donorId !== donorProfile.id) {
      throw new AppError('Unauthorized: Match record not found or inaccessible', 403);
    }

    const updatedMatch = await prisma.donorMatch.update({
      where: { id: matchId },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date(),
      },
    });

    // Update request state to DONOR_ARRIVED
    if (['DONOR_ACCEPTED', 'DONOR_TRAVELLING'].includes(match.request.status)) {
      await prisma.bloodRequest.update({
        where: { id: match.requestId },
        data: { status: 'DONOR_ARRIVED' },
      });
    }

    // Notify requester
    await NotificationService.notify({
      userId: match.request.requesterId,
      title: `Matched Donor Has Arrived!`,
      message: `Matched donor has reached ${match.request.hospitalName}. Awaiting hospital medical check-in and donation.`,
      type: 'DONOR_ARRIVED',
      priority: 'HIGH',
      category: 'EMERGENCY',
      link: `/patient/requests/${match.requestId}`,
      actionUrl: `/patient/requests/${match.requestId}`,
    });

    return updatedMatch;
  }

  /**
   * Receiver confirms physical blood receipt or reports an issue
   */
  static async confirmReceipt(
    receiverUserId: string,
    requestId: string,
    action: 'CONFIRM' | 'NOT_RECEIVED',
    notes?: string,
    reportedIssue?: string
  ) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        donations: { where: { status: 'CONFIRMED' } },
        matches: { include: { donor: true } },
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    if (request.requesterId !== receiverUserId) {
      const user = await prisma.user.findUnique({ where: { id: receiverUserId } });
      if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        throw new AppError('Unauthorized: Only the requester can confirm receipt of blood', 403);
      }
    }

    if (action === 'CONFIRM') {
      const receipt = await prisma.bloodReceipt.create({
        data: {
          requestId,
          receiverId: receiverUserId,
          unitsReceived: request.unitsRequired,
          confirmed: true,
          confirmedAt: new Date(),
          notes: notes || 'Recipient confirmed blood received successfully',
        },
      });

      // Calculate confirmed donation units
      const confirmedUnits = request.donations.reduce((sum, d) => sum + d.units, 0);

      // Section 14 & 19: If hospital confirmed donation AND receiver confirms receipt -> FULFILLED!
      if (confirmedUnits >= request.unitsRequired) {
        await prisma.bloodRequest.update({
          where: { id: requestId },
          data: {
            status: 'FULFILLED',
            unitsFulfilled: confirmedUnits,
          },
        });

        // Notify all participants
        await NotificationService.notify({
          userId: request.requesterId,
          title: `Blood Request Successfully Fulfilled!`,
          message: `Your emergency request for ${request.patientName} (${request.bloodGroup}) is officially fulfilled. Thank you for using RakthaSethu.`,
          type: 'REQUEST_FULFILLED',
          priority: 'NORMAL',
          category: 'EMERGENCY',
          link: `/patient/requests/${requestId}`,
          actionUrl: `/patient/requests/${requestId}`,
        });

        // Notify donors
        for (const m of request.matches) {
          if (m.donor?.userId) {
            NotificationService.notify({
              userId: m.donor.userId,
              title: `Request Fulfilled — Life Saved!`,
              message: `Recipient has confirmed receipt of blood for ${request.patientName}. Thank you for your humanitarian donation!`,
              type: 'REQUEST_FULFILLED',
              priority: 'NORMAL',
              category: 'DONATION',
              link: '/donor/history',
              actionUrl: '/donor/history',
            }).catch(() => {});
          }
        }
      } else {
        // Receiver confirmed, but hospital verification is pending or partial
        await prisma.bloodRequest.update({
          where: { id: requestId },
          data: { status: 'BLOOD_RECEIVED' },
        });

        await NotificationService.notify({
          userId: request.requesterId,
          title: `Receipt Recorded — Awaiting Hospital Verification`,
          message: `You confirmed receipt of blood. Awaiting hospital staff to complete official donation documentation.`,
          type: 'BLOOD_RECEIVED',
          priority: 'NORMAL',
          category: 'EMERGENCY',
          link: `/patient/requests/${requestId}`,
          actionUrl: `/patient/requests/${requestId}`,
        });
      }

      return receipt;
    } else {
      // Receiver clicked NO / NOT RECEIVED -> Section 17: FULFILLMENT_ISSUE
      const receipt = await prisma.bloodReceipt.create({
        data: {
          requestId,
          receiverId: receiverUserId,
          unitsReceived: 0,
          confirmed: false,
          reportedIssue: reportedIssue || notes || 'Recipient reported blood was not received',
        },
      });

      await prisma.bloodRequest.update({
        where: { id: requestId },
        data: { status: 'FULFILLMENT_ISSUE' },
      });

      // Operational incident notification to Hospital & Admin
      NotificationService.broadcast({
        title: `⚠️ Fulfillment Issue Reported: Request #${requestId.substring(0, 8)}`,
        message: `Recipient for ${request.patientName} (${request.bloodGroup}) states blood was not received. Staff intervention required.`,
        type: 'FULFILLMENT_ISSUE',
        priority: 'CRITICAL',
        category: 'EMERGENCY',
        link: `/patient/requests/${requestId}`,
        actionUrl: `/patient/requests/${requestId}`,
      }).catch(() => {});

      return receipt;
    }
  }

  /**
   * Builds centralized chronological event timeline strictly from actual database records (Section 37)
   */
  static async getRequestTimeline(requestId: string) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        matches: { include: { donor: true }, orderBy: { createdAt: 'asc' } },
        donations: { include: { hospital: true, bloodBank: true }, orderBy: { donationDate: 'asc' } },
        receipts: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const events: any[] = [];

    // 1. Request Created
    events.push({
      key: 'REQUEST_CREATED',
      title: 'Emergency Request Created',
      timestamp: request.createdAt,
      actor: request.contactName,
      description: `Emergency request broadcasted for ${request.patientName} (${request.bloodGroup}, ${request.unitsRequired} units) at ${request.hospitalName}.`,
      completed: true,
    });

    // 2. Matching Engine Started
    events.push({
      key: 'MATCHING_STARTED',
      title: 'Matching Engine Dispatched',
      timestamp: request.createdAt,
      actor: 'AI Matching Engine',
      description: `Smart radius and blood compatibility algorithm scanning for active voluntary donors in ${request.hospitalCity}.`,
      completed: true,
    });

    // 3. Donors Contacted
    const contactedCount = request.matches.length;
    if (contactedCount > 0) {
      const firstMatch = request.matches[0];
      events.push({
        key: 'DONOR_CONTACTED',
        title: `${contactedCount} Compatible Donor${contactedCount > 1 ? 's' : ''} Contacted`,
        timestamp: firstMatch.contactedAt || firstMatch.createdAt,
        actor: 'Notification Service',
        description: `Dispatched multi-channel notifications to compatible voluntary donors.`,
        completed: true,
      });
    }

    // 4. Donor Accepted
    const acceptedMatch = request.matches.find((m) => ['ACCEPTED', 'TRAVELLING', 'ARRIVED', 'DONATION_STARTED', 'DONATION_COMPLETED', 'CONFIRMED'].includes(m.status));
    if (acceptedMatch && acceptedMatch.respondedAt) {
      events.push({
        key: 'DONOR_ACCEPTED',
        title: 'Donor Accepted Request',
        timestamp: acceptedMatch.respondedAt,
        actor: 'Matched Donor',
        description: `Donor agreed to donate blood at ${request.hospitalName}. Coordination established.`,
        completed: true,
      });
    }

    // 5. Donor Travelling
    if (acceptedMatch?.startedTravellingAt) {
      events.push({
        key: 'DONOR_TRAVELLING',
        title: 'Donor En Route',
        timestamp: acceptedMatch.startedTravellingAt,
        actor: 'Matched Donor',
        description: `Donor started navigation and is traveling to ${request.hospitalName}.`,
        completed: true,
      });
    }

    // 6. Donor Arrived
    if (acceptedMatch?.arrivedAt) {
      events.push({
        key: 'DONOR_ARRIVED',
        title: 'Donor Arrived at Hospital',
        timestamp: acceptedMatch.arrivedAt,
        actor: 'Matched Donor',
        description: `Donor reached ${request.hospitalName} donor reception.`,
        completed: true,
      });
    }

    // 7. Donation Process (Started, Completed, Confirmed)
    for (const d of request.donations) {
      if (d.startedAt) {
        events.push({
          key: 'DONATION_STARTED',
          title: 'Donation Process Started',
          timestamp: d.startedAt,
          actor: d.hospital?.name || 'Medical Staff',
          description: `Medical check-in and blood collection began (${d.units} Unit).`,
          completed: true,
        });
      }

      if (d.completedAt) {
        events.push({
          key: 'DONATION_COMPLETED',
          title: 'Blood Collection Completed',
          timestamp: d.completedAt,
          actor: d.hospital?.name || 'Medical Staff',
          description: `Blood collection complete. Awaiting official verification.`,
          completed: true,
        });
      }

      if (d.status === 'CONFIRMED') {
        events.push({
          key: 'DONATION_CONFIRMED',
          title: 'Hospital Confirmed Donation',
          timestamp: d.verifiedAt || d.donationDate,
          actor: d.hospital?.name || d.verifiedBy || 'Authorized Hospital Staff',
          description: `Official medical donation verified. Certificate #${d.certificateCode} issued.`,
          completed: true,
        });
      }
    }

    // 8. Blood Receipt
    for (const r of request.receipts) {
      if (r.confirmed) {
        events.push({
          key: 'BLOOD_RECEIVED',
          title: 'Recipient Confirmed Blood Receipt',
          timestamp: r.confirmedAt || r.createdAt,
          actor: request.patientName || 'Recipient',
          description: `Patient/attendant confirmed blood was safely received.`,
          completed: true,
        });
      } else if (r.reportedIssue) {
        events.push({
          key: 'FULFILLMENT_ISSUE',
          title: 'Fulfillment Issue Reported',
          timestamp: r.createdAt,
          actor: 'Recipient',
          description: `Problem reported: ${r.reportedIssue}`,
          completed: true,
        });
      }
    }

    // 9. Fulfilled
    if (request.status === 'FULFILLED') {
      events.push({
        key: 'FULFILLED',
        title: 'Blood Request Successfully Fulfilled',
        timestamp: request.updatedAt,
        actor: 'RakthaSethu Platform',
        description: `All ${request.unitsRequired} units successfully donated, verified by hospital, and confirmed by recipient.`,
        completed: true,
      });
    }

    return events;
  }

  /**
   * Stuck request detection for Admin & Emergency Command Center (Section 31)
   */
  static async getStuckRequests() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fortyFiveMinsAgo = new Date(now.getTime() - 45 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

    const [delayedDonors, delayedArrivals, pendingReceipts, issues] = await Promise.all([
      // DONOR_ACCEPTED but no travel/arrival after 60 mins
      prisma.bloodRequest.findMany({
        where: {
          status: 'DONOR_ACCEPTED',
          updatedAt: { lte: oneHourAgo },
        },
        include: { matches: { where: { status: 'ACCEPTED' }, include: { donor: true } } },
      }),
      // DONOR_ARRIVED but donation not started/confirmed after 45 mins
      prisma.bloodRequest.findMany({
        where: {
          status: 'DONOR_ARRIVED',
          updatedAt: { lte: fortyFiveMinsAgo },
        },
      }),
      // DONATION_CONFIRMED but receiver hasn't confirmed receipt after 2 hours
      prisma.bloodRequest.findMany({
        where: {
          status: 'DONATION_CONFIRMED',
          updatedAt: { lte: twoHoursAgo },
        },
      }),
      // Explicit FULFILLMENT_ISSUE open
      prisma.bloodRequest.findMany({
        where: { status: 'FULFILLMENT_ISSUE' },
        include: { receipts: true },
      }),
    ]);

    return {
      delayedDonors: delayedDonors.map((r) => ({
        ...r,
        alertType: 'DELAYED_DONOR',
        alertMessage: 'Donor accepted over 60 minutes ago without travelling/arriving',
      })),
      delayedArrivals: delayedArrivals.map((r) => ({
        ...r,
        alertType: 'DONATION_PENDING',
        alertMessage: 'Donor arrived over 45 minutes ago but donation has not been initiated/completed',
      })),
      pendingReceipts: pendingReceipts.map((r) => ({
        ...r,
        alertType: 'RECIPIENT_CONFIRMATION_PENDING',
        alertMessage: 'Donation confirmed by hospital over 2 hours ago; awaiting recipient receipt confirmation',
      })),
      fulfillmentIssues: issues.map((r) => ({
        ...r,
        alertType: 'FULFILLMENT_ISSUE',
        alertMessage: 'Recipient reported blood was not received. Staff intervention required.',
      })),
    };
  }
}
