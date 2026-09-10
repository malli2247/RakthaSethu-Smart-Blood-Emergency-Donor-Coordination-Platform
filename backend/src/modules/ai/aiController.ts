import { Request, Response, NextFunction } from 'express';
import { AiService } from './aiService';
import { sendSuccess } from '../../utils/response';

export async function classifyRequestUrgency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { medicalReason } = req.body;
    const result = await AiService.classifyUrgency(medicalReason || '');
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function askAssistant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { question } = req.body;
    const response = await AiService.answerEmergencyQuestion(question || '');
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
}
