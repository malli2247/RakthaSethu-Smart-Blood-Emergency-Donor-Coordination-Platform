import { Router } from 'express';
import {
  getCoordinationRoom,
  sendCoordinationMessage,
  confirmDonorArrival,
} from './coordinationController';
import { authenticateToken } from '../../middleware/auth';

export const coordinationRouter = Router();

coordinationRouter.use(authenticateToken);

coordinationRouter.get('/requests/:requestId', getCoordinationRoom);
coordinationRouter.post('/rooms/:roomId/messages', sendCoordinationMessage);
coordinationRouter.post('/rooms/:roomId/arrival', confirmDonorArrival);
