import { Router } from 'express';
import {
  classifyRequestUrgency,
  askAssistant,
  parseVoiceRequest,
  getDemandForecast,
  getShortageForecast,
  evaluateRequestTrust,
} from './aiController';
import { optionalAuth, authenticateToken } from '../../middleware/auth';

export const aiRouter = Router();

aiRouter.post('/classify-urgency', optionalAuth, classifyRequestUrgency);
aiRouter.post('/chat', optionalAuth, askAssistant);
aiRouter.post('/voice-request', optionalAuth, parseVoiceRequest);
aiRouter.get('/demand-forecast', optionalAuth, getDemandForecast);
aiRouter.get('/shortage-forecast/:bloodBankId', optionalAuth, getShortageForecast);
aiRouter.post('/evaluate-trust', authenticateToken, evaluateRequestTrust);
