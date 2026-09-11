import { Router } from 'express';
import {
  streamEmergencyEvents,
  runProgressiveSearch,
  getSearchStatus,
  getCommandCenterData,
  getMapLayers,
  simulateEmergency,
  syncOfflineActions,
} from './emergencyController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const emergencyRouter = Router();

// Real-time SSE stream (supports both public ping and request-specific feeds)
emergencyRouter.get('/events', streamEmergencyEvents);

// Progressive search
emergencyRouter.post('/search', authenticateToken, runProgressiveSearch);
emergencyRouter.get('/search/:requestId', optionalAuth, getSearchStatus);

// Live Emergency Command Center
emergencyRouter.get('/command-center', optionalAuth, getCommandCenterData);

// Privacy-preserving map data
emergencyRouter.get('/map-layers', optionalAuth, getMapLayers);

// Emergency Simulator (Admin / Coordinator)
emergencyRouter.post('/simulate', optionalAuth, simulateEmergency);

// Offline Action Queue Synchronizer
emergencyRouter.post('/sync', optionalAuth, syncOfflineActions);
