import { Request, Response, NextFunction } from 'express';
import { AiService } from './aiService';
import { VoiceParserService } from './voiceParserService';
import { DemandForecastingService } from '../ml/demandForecastingService';
import { FraudDetectionService } from '../ml/fraudDetectionService';
import { sendSuccess, AppError } from '../../utils/response';

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

export async function parseVoiceRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      throw new AppError('Transcript text is required', 400);
    }
    const parsed = VoiceParserService.parseSpeechTranscript(transcript);
    sendSuccess(res, parsed, 'Voice request parsed successfully');
  } catch (error) {
    next(error);
  }
}

export async function getDemandForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const forecast = await DemandForecastingService.getRegionalDemandForecast();
    sendSuccess(res, forecast, '7-day demand forecast retrieved');
  } catch (error) {
    next(error);
  }
}

export async function getShortageForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bloodBankId } = req.params;
    const forecast = await DemandForecastingService.forecastBloodBankShortage(bloodBankId);
    sendSuccess(res, forecast, 'Blood bank inventory shortage forecast retrieved');
  } catch (error) {
    next(error);
  }
}

export async function evaluateRequestTrust(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      throw new AppError('requestId is required', 400);
    }
    const evaluation = await FraudDetectionService.evaluateRequestTrust(requestId);
    sendSuccess(res, evaluation, 'Request trust score evaluated');
  } catch (error) {
    next(error);
  }
}
