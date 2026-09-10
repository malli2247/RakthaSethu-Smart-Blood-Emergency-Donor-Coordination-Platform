import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';

export async function getVolunteerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, phone: true } },
      },
    });

    if (!volunteer) {
      throw new AppError('Volunteer profile not found', 404);
    }

    sendSuccess(res, volunteer);
  } catch (error) {
    next(error);
  }
}

export async function updateVolunteerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { fullName, serviceAreaCity, serviceAreaState, isAvailable, skills } = req.body;

    const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
    if (!volunteer) {
      throw new AppError('Volunteer profile not found', 404);
    }

    const updated = await prisma.volunteer.update({
      where: { userId },
      data: {
        ...(fullName && { fullName }),
        ...(serviceAreaCity && { serviceAreaCity }),
        ...(serviceAreaState && { serviceAreaState }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(skills && { skills }),
      },
    });

    sendSuccess(res, updated, 'Volunteer profile updated');
  } catch (error) {
    next(error);
  }
}

export async function getEmergencyCoordinationTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const volunteer = await prisma.volunteer.findUnique({ where: { userId } });
    if (!volunteer) {
      throw new AppError('Volunteer profile not found', 404);
    }

    // Find pending/matching critical or high emergency requests in the volunteer's service area
    const urgentRequests = await prisma.bloodRequest.findMany({
      where: {
        status: { in: ['PENDING', 'MATCHING', 'DONOR_CONTACTED'] },
        urgency: { in: ['CRITICAL', 'HIGH'] },
        hospitalCity: { contains: volunteer.serviceAreaCity, mode: 'insensitive' },
      },
      include: {
        matches: {
          include: {
            donor: true,
          },
        },
      },
      orderBy: { urgency: 'desc' },
    });

    sendSuccess(res, urgentRequests);
  } catch (error) {
    next(error);
  }
}
