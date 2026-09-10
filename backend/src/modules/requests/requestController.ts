import { Request, Response, NextFunction } from 'express';
import { RequestService } from './requestService';
import { sendSuccess, AppError } from '../../utils/response';

export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requesterId = req.user!.id;
    const request = await RequestService.createRequest(requesterId, req.body);
    sendSuccess(res, request, 'Emergency blood request created and matching started', 201);
  } catch (error) {
    next(error);
  }
}

export async function listRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await RequestService.listRequests(req.query as any);
    sendSuccess(res, result.requests, 'Requests retrieved successfully', 200, result.pagination);
  } catch (error) {
    next(error);
  }
}

export async function getRequestById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const request = await RequestService.getRequestById(req.params.id);
    sendSuccess(res, request);
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, notes } = req.body;
    const userId = req.user!.id;
    const updated = await RequestService.updateStatus(req.params.id, status, userId, notes);
    sendSuccess(res, updated, `Request status updated to ${status}`);
  } catch (error) {
    next(error);
  }
}

export async function respondToMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId } = req.params;
    const { action, notes } = req.body; // action: 'ACCEPT' | 'DECLINE'
    const userId = req.user!.id;

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      throw new AppError('Action must be ACCEPT or DECLINE', 400);
    }

    const updatedMatch = await RequestService.respondToMatch(userId, matchId, action, notes);
    sendSuccess(res, updatedMatch, `Match response recorded: ${action}`);
  } catch (error) {
    next(error);
  }
}
