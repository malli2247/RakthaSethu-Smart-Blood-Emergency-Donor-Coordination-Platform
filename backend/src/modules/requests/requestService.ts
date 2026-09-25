import { prisma } from '../../config/database';
import { AppError } from '../../utils/response';
import { MatchingService } from '../matching/matchingService';
import { sanitizeDonorView } from '../../utils/privacy';
import { NotificationService } from '../../services/notificationService';
import { EmailService } from '../../services/emailService';

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['MATCHING', 'CANCELLED', 'REJECTED'],
  MATCHING: ['DONOR_CONTACTED', 'DONOR_ACCEPTED', 'CANCELLED', 'EXPIRED'],
  DONOR_CONTACTED: ['DONOR_ACCEPTED', 'MATCHING', 'CANCELLED', 'EXPIRED'],
  DONOR_ACCEPTED: ['DONATION_CONFIRMED', 'MATCHING', 'CANCELLED'],
  DONATION_CONFIRMED: ['FULFILLED', 'CANCELLED'],
  FULFILLED: [],
  CANCELLED: [],
  EXPIRED: [],
  REJECTED: [],
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
            select: { matches: true },
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
   * Get single request with detail and matches, masking donor PII unless authorized
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
        },
      },
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    const isRequester = Boolean(viewerId && viewerId === request.requesterId);
    const isAdmin = viewerRole === 'ADMIN';
    const isHospitalStaff = viewerRole === 'HOSPITAL';

    // Mask donor contacts on matches according to Phase 10 privacy rules
    const sanitizedMatches = request.matches.map((match: any) => {
      const isMatchDonor = Boolean(viewerId && match.donor.userId === viewerId);
      const isMatchAccepted = match.status === 'ACCEPTED';
      const canViewFullDetails =
        isAdmin ||
        isMatchDonor ||
        (isMatchAccepted && (isRequester || isHospitalStaff));

      return {
        ...match,
        donor: sanitizeDonorView(match.donor, canViewFullDetails),
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
    });

    if (!request) {
      throw new AppError('Blood request not found', 404);
    }

    // Role & Ownership IDOR authorization guard
    const isRequester = userId === request.requesterId;
    const isAdmin = userRole === 'ADMIN';
    const isHospital = userRole === 'HOSPITAL';

    if (!isAdmin) {
      if (nextStatus === 'CANCELLED') {
        if (!isRequester && !isHospital) {
          throw new AppError('Unauthorized: Only the requester or assigned hospital can cancel this request', 403);
        }
      } else if (nextStatus === 'FULFILLED') {
        if (!isRequester && !isHospital) {
          throw new AppError('Unauthorized: Only the requester or assigned hospital can fulfill this request', 403);
        }
      } else if (nextStatus === 'DONATION_CONFIRMED') {
        if (!isHospital) {
          throw new AppError('Unauthorized: Only hospital staff can confirm physical donation completion', 403);
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

    // Notify requester with multi-channel notification
    await NotificationService.notify({
      userId: request.requesterId,
      title: `Blood Request Status Updated`,
      message: `Your request for ${request.patientName} (${request.bloodGroup}) is now: ${nextStatus}.`,
      type: nextStatus === 'FULFILLED' ? 'REQUEST_FULFILLED' : 'SYSTEM_NOTICE',
      link: `/patient/requests/${requestId}`,
    });

    return updated;
  }

  /**
   * Donor accepts or declines a match
   */
  static async respondToMatch(donorUserId: string, matchId: string, action: 'ACCEPT' | 'DECLINE', responseNotes?: string) {
    const donorProfile = await prisma.donorProfile.findUnique({
      where: { userId: donorUserId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!donorProfile) {
      throw new AppError('Donor profile not found', 404);
    }

    const match = await prisma.donorMatch.findUnique({
      where: { id: matchId },
      include: {
        request: true,
      },
    });

    if (!match) {
      throw new AppError('Match not found', 404);
    }

    if (match.donorId !== donorProfile.id) {
      throw new AppError('Unauthorized: You can only respond to your own matches', 403);
    }

    const newMatchStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';

    const updatedMatch = await prisma.donorMatch.update({
      where: { id: matchId },
      data: {
        status: newMatchStatus,
        respondedAt: new Date(),
        responseNotes: responseNotes || (action === 'ACCEPT' ? 'Donor agreed to donate' : 'Donor declined'),
      },
    });

    if (action === 'ACCEPT') {
      // Update request status to DONOR_ACCEPTED
      await prisma.bloodRequest.update({
        where: { id: match.requestId },
        data: { status: 'DONOR_ACCEPTED' },
      });

      // Get requester user details
      const requesterUser = await prisma.user.findUnique({
        where: { id: match.request.requesterId },
        select: { id: true, email: true, phone: true },
      });

      if (requesterUser) {
        const donorPhone = donorProfile.user.phone || 'Contact via platform';
        await NotificationService.notify({
          userId: requesterUser.id,
          title: `Good news! Donor Accepted Your Request`,
          message: `${donorProfile.fullName} (${donorProfile.bloodGroup}) has accepted your emergency blood request! Contact: ${donorPhone}`,
          type: 'DONOR_ACCEPTED',
          link: `/patient/requests/${match.requestId}`,
          ...(requesterUser.phone
            ? {
                sms: {
                  to: requesterUser.phone,
                  message: `[RakthaSethu] Donor ${donorProfile.fullName} (${donorProfile.bloodGroup}) accepted your request for ${match.request.patientName}. Donor contact: ${donorPhone}`,
                },
              }
            : {}),
        });

        // Send detailed email alert
        EmailService.sendDonorAcceptedAlert(
          requesterUser.email,
          match.request.contactName,
          donorProfile.fullName,
          donorProfile.bloodGroup,
          donorPhone
        ).catch(() => {});
      }
    }

    return updatedMatch;
  }
}
