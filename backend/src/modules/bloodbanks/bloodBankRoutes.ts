import { Router } from 'express';
import {
  getBloodBankProfile,
  getInventory,
  addInventoryBatch,
  updateInventoryStatus,
} from './bloodBankController';
import { authenticateToken, requireRole, requireVerified } from '../../middleware/auth';

export const bloodBankRouter = Router();

bloodBankRouter.use(authenticateToken);
bloodBankRouter.use(requireRole('BLOOD_BANK', 'ADMIN'));

bloodBankRouter.get('/profile', getBloodBankProfile);
bloodBankRouter.get('/inventory', getInventory);
bloodBankRouter.post('/inventory', requireVerified, addInventoryBatch);
bloodBankRouter.patch('/inventory/:id', requireVerified, updateInventoryStatus);
