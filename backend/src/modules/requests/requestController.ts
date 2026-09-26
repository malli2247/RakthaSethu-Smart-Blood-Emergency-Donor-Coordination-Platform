import { Request, Response, NextFunction } from 'express';
import { RequestService } from './requestService';
import { sendSuccess, AppError } from '../../utils/response';
import { CacheService } from '../../services/cacheService';

export async function createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requesterId = req.user!.id;
    const request = await RequestService.createRequest(requesterId, req.body);
    CacheService.invalidateByTag('stats');
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
    const request = await RequestService.getRequestById(req.params.id, req.user?.id, req.user?.role);
    sendSuccess(res, request);
  } catch (error) {
    next(error);
  }
}

export async function updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, notes } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const updated = await RequestService.updateStatus(req.params.id, status, userId, userRole, notes);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, `Request status updated to ${status}`);
  } catch (error) {
    next(error);
  }
}

export async function respondToMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId } = req.params;
    const { action, notes } = req.body; // action: 'ACCEPT' | 'DECLINE' | 'CANCEL'
    const userId = req.user!.id;

    if (!['ACCEPT', 'DECLINE', 'CANCEL'].includes(action)) {
      throw new AppError('Action must be ACCEPT, DECLINE, or CANCEL', 400);
    }

    const updatedMatch = await RequestService.respondToMatch(userId, matchId, action, notes);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updatedMatch, `Match response recorded: ${action}`);
  } catch (error) {
    next(error);
  }
}

export async function startDonorTravel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId } = req.params;
    const userId = req.user!.id;

    const updated = await RequestService.startDonorTravel(userId, matchId);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'Donor status updated to travelling to hospital');
  } catch (error) {
    next(error);
  }
}

export async function markDonorArrived(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { matchId } = req.params;
    const userId = req.user!.id;

    const updated = await RequestService.markDonorArrived(userId, matchId);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, updated, 'Donor arrival recorded at hospital');
  } catch (error) {
    next(error);
  }
}

export async function confirmReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { action = 'CONFIRM', notes, reportedIssue } = req.body;
    const userId = req.user!.id;

    if (!['CONFIRM', 'NOT_RECEIVED'].includes(action)) {
      throw new AppError('Action must be CONFIRM or NOT_RECEIVED', 400);
    }

    const result = await RequestService.confirmReceipt(userId, id, action, notes, reportedIssue);
    CacheService.invalidateByTag('stats');
    sendSuccess(res, result, action === 'CONFIRM' ? 'Blood receipt confirmed successfully' : 'Fulfillment issue recorded');
  } catch (error) {
    next(error);
  }
}

export async function getRequestTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const timeline = await RequestService.getRequestTimeline(req.params.id);
    sendSuccess(res, timeline, 'Request timeline retrieved');
  } catch (error) {
    next(error);
  }
}
