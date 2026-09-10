import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';

export async function listCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { city, state, status } = req.query;

    const where: any = {};
    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (state) where.state = { contains: String(state), mode: 'insensitive' };
    if (status) where.status = String(status);

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    sendSuccess(res, campaigns);
  } catch (error) {
    next(error);
  }
}

export async function getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        registrations: {
          include: {
            donor: {
              select: {
                id: true,
                fullName: true,
                bloodGroup: true,
                city: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    sendSuccess(res, campaign);
  } catch (error) {
    next(error);
  }
}

export async function createCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const organizerId = req.user!.id;
    const {
      title,
      description,
      startDate,
      endDate,
      location,
      address,
      city,
      state,
      latitude,
      longitude,
      bloodGroupsNeeded = 'ALL',
      targetUnits = 100,
    } = req.body;

    const campaign = await prisma.campaign.create({
      data: {
        organizerId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        address,
        city,
        state,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bloodGroupsNeeded,
        targetUnits: Number(targetUnits),
        status: 'UPCOMING',
      },
    });

    sendSuccess(res, campaign, 'Campaign created successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function registerForCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { campaignId } = req.params;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Only registered blood donors can register for donation camps', 400);
    }

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }

    const registration = await prisma.$transaction(async (tx) => {
      const reg = await tx.campaignRegistration.upsert({
        where: {
          campaignId_donorId: {
            campaignId,
            donorId: donor.id,
          },
        },
        create: {
          campaignId,
          donorId: donor.id,
          status: 'CONFIRMED',
        },
        update: {
          status: 'CONFIRMED',
        },
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: { registeredCount: { increment: 1 } },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Registered for Blood Donation Camp',
          message: `You have successfully registered for "${campaign.title}" on ${new Date(campaign.startDate).toLocaleDateString()}. Thank you for saving lives!`,
          type: 'SYSTEM_NOTICE',
          link: `/campaigns/${campaignId}`,
        },
      });

      return reg;
    });

    sendSuccess(res, registration, 'Registered for campaign successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function cancelCampaignRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { campaignId } = req.params;

    const donor = await prisma.donorProfile.findUnique({ where: { userId } });
    if (!donor) {
      throw new AppError('Donor not found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.campaignRegistration.deleteMany({
        where: {
          campaignId,
          donorId: donor.id,
        },
      });

      await tx.campaign.update({
        where: { id: campaignId },
        data: { registeredCount: { decrement: 1 } },
      });
    });

    sendSuccess(res, null, 'Registration cancelled');
  } catch (error) {
    next(error);
  }
}
