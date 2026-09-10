import { Router } from 'express';
import { classifyRequestUrgency, askAssistant } from './aiController';
import { optionalAuth } from '../../middleware/auth';

export const aiRouter = Router();

aiRouter.post('/classify-urgency', optionalAuth, classifyRequestUrgency);
aiRouter.post('/chat', optionalAuth, askAssistant);
