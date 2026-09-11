import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { RealtimeEventService } from '../../services/realtimeEventService';
import { NotificationService } from '../../services/notificationService';
import { maskPhoneNumber } from '../../utils/privacy';

export async function getCoordinationRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const bloodRequest = await prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, email: true, phone: true } },
        matches: {
          where: { status: 'ACCEPTED' },
          include: {
            donor: {
              include: {
                user: { select: { id: true, phone: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!bloodRequest) {
      throw new AppError('Blood request not found', 404);
    }

    // Access control: requester, accepted donor, hospital, volunteer, or admin
    const isRequester = bloodRequest.requesterId === userId;
    const isAcceptedDonor = bloodRequest.matches.some((m) => m.donor.userId === userId);
    const isHospital = userRole === 'HOSPITAL';
    const isStaffOrAdmin = ['ADMIN', 'VOLUNTEER'].includes(userRole);

    if (!isRequester && !isAcceptedDonor && !isHospital && !isStaffOrAdmin) {
      throw new AppError('Access denied: You are not an active participant in this emergency coordination', 403);
    }

    // Upsert Coordination Room
    let room = await prisma.emergencyCoordinationRoom.findUnique({
      where: { requestId: bloodRequest.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!room) {
      room = await prisma.emergencyCoordinationRoom.create({
        data: {
          requestId: bloodRequest.id,
          unitsTarget: bloodRequest.unitsRequired,
          unitsSecured: bloodRequest.matches.length,
          status: 'ACTIVE',
        },
        include: {
          messages: true,
        },
      });
    }

    // Calculate approximate travel time and directions URL
    const destinationQuery = encodeURIComponent(`${bloodRequest.hospitalName}, ${bloodRequest.hospitalCity}`);
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}`;

    // Mask donor contacts unless viewer is requester or hospital
    const sanitizedDonors = bloodRequest.matches.map((m) => {
      const canSeeContact = isRequester || isHospital || isStaffOrAdmin || m.donor.userId === userId;
      return {
        matchId: m.id,
        donorId: m.donorId,
        donorName: m.donor.fullName,
        bloodGroup: m.donor.bloodGroup,
        city: m.donor.city,
        distanceKm: m.distanceKm,
        estimatedTravelMins: m.distanceKm ? Math.round(m.distanceKm * 2.5 + 5) : 20,
        contactPhone: canSeeContact ? m.donor.user.phone : maskPhoneNumber(m.donor.user.phone),
        respondedAt: m.respondedAt,
      };
    });

    sendSuccess(res, {
      room,
      bloodRequest: {
        id: bloodRequest.id,
        patientName: bloodRequest.patientName,
        bloodGroup: bloodRequest.bloodGroup,
        unitsRequired: bloodRequest.unitsRequired,
        urgency: bloodRequest.urgency,
        hospitalName: bloodRequest.hospitalName,
        hospitalAddress: bloodRequest.hospitalAddress,
        hospitalCity: bloodRequest.hospitalCity,
        contactName: bloodRequest.contactName,
        contactPhone: bloodRequest.contactPhone,
        status: bloodRequest.status,
      },
      acceptedDonors: sanitizedDonors,
      navigation: {
        hospitalName: bloodRequest.hospitalName,
        address: `${bloodRequest.hospitalAddress}, ${bloodRequest.hospitalCity}`,
        directionsUrl,
        estimatedTravelMins: sanitizedDonors[0]?.estimatedTravelMins || 15,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function sendCoordinationMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomId } = req.params;
    const { message, messageType = 'TEXT', isPredefined = false } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!message || message.trim().length === 0) {
      throw new AppError('Message text cannot be empty', 400);
    }

    const room = await prisma.emergencyCoordinationRoom.findUnique({
      where: { id: roomId },
      include: { request: true },
    });

    if (!room) {
      throw new AppError('Coordination room not found', 404);
    }

    if (room.status !== 'ACTIVE') {
      throw new AppError('This coordination room is closed or archived', 400);
    }

    // Determine sender display name
    let senderName = 'Participant';
    if (userRole === 'DONOR') {
      const donor = await prisma.donorProfile.findUnique({ where: { userId } });
      senderName = donor?.fullName || 'Donor';
    } else if (userRole === 'HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({ where: { userId } });
      senderName = hospital?.name || 'Hospital Coordinator';
    } else if (userId === room.request.requesterId) {
      senderName = room.request.contactName || 'Requester / Attendant';
    } else if (userRole === 'ADMIN') {
      senderName = 'Emergency Admin Coordinator';
    }

    const newMessage = await prisma.emergencyMessage.create({
      data: {
        roomId: room.id,
        senderId: userId,
        senderName,
        senderRole: userRole,
        message: message.trim(),
        messageType,
        isPredefined: Boolean(isPredefined),
      },
    });

    // Broadcast message to all active participants in real-time
    RealtimeEventService.sendToRequest(room.requestId, 'COORDINATION_MESSAGE', newMessage);

    sendSuccess(res, newMessage, 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function confirmDonorArrival(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roomId } = req.params;
    const { donorId } = req.body;
    const userId = req.user!.id;

    const room = await prisma.emergencyCoordinationRoom.findUnique({
      where: { id: roomId },
      include: { request: true },
    });

    if (!room) {
      throw new AppError('Coordination room not found', 404);
    }

    const donor = await prisma.donorProfile.findUnique({ where: { id: donorId } });
    if (!donor) {
      throw new AppError('Donor profile not found', 404);
    }

    const updatedRoom = await prisma.emergencyCoordinationRoom.update({
      where: { id: roomId },
      data: {
        unitsSecured: { increment: 1 },
      },
    });

    // Create system message in chat
    const systemMsg = await prisma.emergencyMessage.create({
      data: {
        roomId: room.id,
        senderId: userId,
        senderName: 'System Notice',
        senderRole: 'SYSTEM',
        message: `Donor ${donor.fullName} has arrived at ${room.request.hospitalName}. Blood collection initiated.`,
        messageType: 'STATUS_UPDATE',
      },
    });

    RealtimeEventService.sendToRequest(room.requestId, 'DONOR_ARRIVED', {
      roomId,
      donorId,
      donorName: donor.fullName,
      unitsSecured: updatedRoom.unitsSecured,
      message: systemMsg,
    });

    sendSuccess(res, updatedRoom, 'Donor arrival confirmed');
  } catch (error) {
    next(error);
  }
}
