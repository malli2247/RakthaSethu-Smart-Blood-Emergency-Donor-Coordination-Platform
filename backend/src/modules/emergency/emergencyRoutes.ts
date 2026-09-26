import { Router } from 'express';
import {
  streamEmergencyEvents,
  runProgressiveSearch,
  getSearchStatus,
  getCommandCenterData,
  getMapLayers,
  simulateEmergency,
  syncOfflineActions,
  startEmergencyProgressiveSearch,
  streamEmergencySearch,
  cancelEmergencySearch,
  continueEmergencySearch,
  getEmergencySearchJob,
} from './emergencyController';
import { authenticateToken, optionalAuth } from '../../middleware/auth';

export const emergencyRouter = Router();

// Real-time SSE stream (supports both public ping and request-specific feeds)
emergencyRouter.get('/events', streamEmergencyEvents);

// Progressive search lifecycle routes
emergencyRouter.post('/search/start', optionalAuth, startEmergencyProgressiveSearch);
emergencyRouter.get('/search/:searchId/stream', optionalAuth, streamEmergencySearch);
emergencyRouter.get('/search/job/:searchId', optionalAuth, getEmergencySearchJob);
emergencyRouter.post('/search/:searchId/cancel', optionalAuth, cancelEmergencySearch);
emergencyRouter.post('/search/:searchId/continue', optionalAuth, continueEmergencySearch);

// Progressive search (backward-compatible)
emergencyRouter.post('/search', optionalAuth, runProgressiveSearch);
emergencyRouter.get('/search/:requestId', optionalAuth, getSearchStatus);

// Live Emergency Command Center
emergencyRouter.get('/command-center', optionalAuth, getCommandCenterData);

// Privacy-preserving map data
emergencyRouter.get('/map-layers', optionalAuth, getMapLayers);

// Emergency Simulator (Admin / Coordinator)
emergencyRouter.post('/simulate', optionalAuth, simulateEmergency);

// Offline Action Queue Synchronizer
emergencyRouter.post('/sync', optionalAuth, syncOfflineActions);
