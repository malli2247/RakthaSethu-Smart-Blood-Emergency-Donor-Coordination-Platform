import { Router } from 'express';
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  registerForCampaign,
  cancelCampaignRegistration,
} from './campaignController';
import { authenticateToken, optionalAuth, requireRole } from '../../middleware/auth';

export const campaignRouter = Router();

campaignRouter.get('/', optionalAuth, listCampaigns);
campaignRouter.get('/:id', optionalAuth, getCampaignById);

campaignRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN', 'HOSPITAL', 'BLOOD_BANK'),
  createCampaign
);

campaignRouter.post(
  '/:campaignId/register',
  authenticateToken,
  requireRole('DONOR'),
  registerForCampaign
);

campaignRouter.delete(
  '/:campaignId/register',
  authenticateToken,
  requireRole('DONOR'),
  cancelCampaignRegistration
);
