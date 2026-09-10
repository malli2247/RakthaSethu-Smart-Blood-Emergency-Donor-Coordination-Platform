import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, AppError } from '../../utils/response';
import { config } from '../../config';

export async function getBloodBankProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const bloodBank = await prisma.bloodBank.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, phone: true, isVerified: true } },
      },
    });

    if (!bloodBank) {
      throw new AppError('Blood Bank profile not found', 404);
    }

    sendSuccess(res, bloodBank);
  } catch (error) {
    next(error);
  }
}

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const bloodBank = await prisma.bloodBank.findUnique({ where: { userId } });
    if (!bloodBank) {
      throw new AppError('Blood Bank profile not found', 404);
    }

    const inventory = await prisma.bloodInventory.findMany({
      where: { bloodBankId: bloodBank.id },
      orderBy: [{ bloodGroup: 'asc' }, { expiryDate: 'asc' }],
    });

    // Compute stock summary and warnings
    const now = new Date();
    const expiryThreshold = new Date();
    expiryThreshold.setDate(now.getDate() + config.constants.EXPIRY_WARNING_DAYS);

    const stockSummary: Record<string, number> = {};
    const lowStockAlerts: string[] = [];
    const expiringSoonUnits: any[] = [];

    for (const item of inventory) {
      if (item.status === 'AVAILABLE') {
        stockSummary[item.bloodGroup] = (stockSummary[item.bloodGroup] || 0) + item.units;
        if (new Date(item.expiryDate) <= expiryThreshold && new Date(item.expiryDate) >= now) {
          expiringSoonUnits.push(item);
        }
      }
    }

    // Check low stock
    const allGroups = [
      'A_POSITIVE',
      'A_NEGATIVE',
      'B_POSITIVE',
      'B_NEGATIVE',
      'AB_POSITIVE',
      'AB_NEGATIVE',
      'O_POSITIVE',
      'O_NEGATIVE',
    ];
    for (const bg of allGroups) {
      const units = stockSummary[bg] || 0;
      if (units < config.constants.LOW_STOCK_THRESHOLD) {
        lowStockAlerts.push(bg);
      }
    }

    sendSuccess(res, {
      items: inventory,
      summary: stockSummary,
      lowStockAlerts,
      expiringSoonUnits,
    });
  } catch (error) {
    next(error);
  }
}

export async function addInventoryBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bloodGroup, componentType = 'WHOLE_BLOOD', units, batchNumber, collectionDate, expiryDate } = req.body;

    const bloodBank = await prisma.bloodBank.findUnique({ where: { userId } });
    if (!bloodBank) {
      throw new AppError('Blood Bank profile not found', 404);
    }

    const batch = batchNumber || `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const collDate = collectionDate ? new Date(collectionDate) : new Date();

    // Default expiry: 35-42 days for Whole Blood / RBC, 5 days for Platelets
    let expDate: Date;
    if (expiryDate) {
      expDate = new Date(expiryDate);
    } else {
      expDate = new Date(collDate);
      if (componentType === 'PLATELETS') {
        expDate.setDate(collDate.getDate() + 5);
      } else {
        expDate.setDate(collDate.getDate() + 35);
      }
    }

    const item = await prisma.bloodInventory.create({
      data: {
        bloodBankId: bloodBank.id,
        bloodGroup,
        componentType,
        units: Number(units),
        batchNumber: batch,
        collectionDate: collDate,
        expiryDate: expDate,
        status: 'AVAILABLE',
      },
    });

    sendSuccess(res, item, 'Inventory batch added successfully', 201);
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, units } = req.body; // AVAILABLE, RESERVED, EXPIRED, DISCARDED

    const updated = await prisma.bloodInventory.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(units !== undefined && { units: Number(units) }),
      },
    });

    sendSuccess(res, updated, 'Inventory record updated');
  } catch (error) {
    next(error);
  }
}
