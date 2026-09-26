import { api } from './api';

export interface ProgressiveSearchStep {
  radiusKm: number;
  newDonorsFound: number;
  cumulativeDonors: number;
  isSufficient: boolean;
  message: string;
}

export interface ScoredCandidate {
  donorId: string;
  userId: string;
  fullName: string;
  bloodGroup: string;
  bloodGroupLabel: string;
  city: string;
  state: string;
  distanceKm: number | null;
  score: number;
  scoreBreakdown: {
    compatibility: number;
    exactMatchBonus: number;
    availability: number;
    emergencyReadiness: number;
    proximity: number;
    experience: number;
    predictedResponseBonus: number;
  };
  predictedResponseProbability: number;
  maskedPhone: string;
  totalDonations: number;
  isAvailable: boolean;
  emergencyAvailable: boolean;
  discoveredAtRadiusKm: number;
}

export interface RadiusMetrics {
  radiusKm: number;
  candidatesEvaluated: number;
  compatibleCount: number;
  eligibleCount: number;
  availableCount: number;
  alreadyContactedCount: number;
  newDonorsAtRadius: number;
  cumulativeDonors: number;
  remainingTarget: number;
}

export interface StageChecklist {
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
}

export interface ProgressiveSearchResult {
  searchId: string;
  requestId: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: string;
  targetDonorsNeeded: number;
  finalRadiusKm: number;
  totalDonorsFound: number;
  isCompleted: boolean;
  isEscalated: boolean;
  searchSteps: ProgressiveSearchStep[];
  candidates: ScoredCandidate[];
  escalationPlan: Array<{ priority: number; action: string; description: string }> | null;
  searchDurationMs?: number;
  metrics?: RadiusMetrics[];
}

export interface CoordinationRoomData {
  room: {
    id: string;
    requestId: string;
    status: string;
    unitsSecured: number;
    unitsTarget: number;
    hospitalNotes: string | null;
    messages: Array<{
      id: string;
      senderName: string;
      senderRole: string;
      message: string;
      messageType: string;
      isPredefined: boolean;
      createdAt: string;
    }>;
  };
  bloodRequest: {
    id: string;
    patientName: string;
    bloodGroup: string;
    unitsRequired: number;
    urgency: string;
    hospitalName: string;
    hospitalAddress: string;
    hospitalCity: string;
    contactName: string;
    contactPhone: string;
    status: string;
  };
  acceptedDonors: Array<{
    matchId: string;
    donorId: string;
    donorName: string;
    bloodGroup: string;
    city: string;
    distanceKm: number | null;
    estimatedTravelMins: number;
    contactPhone: string;
    respondedAt: string;
  }>;
  navigation: {
    hospitalName: string;
    address: string;
    directionsUrl: string;
    estimatedTravelMins: number;
  };
}

export const emergencyService = {
  async runProgressiveSearch(requestId: string, customSequence?: number[]): Promise<ProgressiveSearchResult> {
    const { data } = await api.post('/emergency/search', { requestId, customSequence });
    return data.data;
  },

  async startProgressiveSearch(
    requestId?: string,
    customSequence?: number[],
    minimumSuitableDonors?: number
  ): Promise<{ searchId: string; status: string; target: number; radiusSequence: number[] }> {
    if (!requestId) throw new Error('requestId is required');
    const { data } = await api.post(`/blood-requests/${requestId}/matching/start`, {
      customSequence,
      minimumSuitableDonors,
    });
    return data.data;
  },

  async getSearchJob(searchId?: string): Promise<any> {
    if (!searchId) return null;
    const { data } = await api.get(`/matching/search/${searchId}`);
    return data.data;
  },

  async cancelProgressiveSearch(searchId?: string): Promise<any> {
    if (!searchId) return null;
    const { data } = await api.post(`/matching/search/${searchId}/cancel`);
    return data.data;
  },

  async continueProgressiveSearch(searchId?: string, additionalRadii?: number[]): Promise<any> {
    if (!searchId) return null;
    const { data } = await api.post(`/matching/search/${searchId}/continue`, { additionalRadii });
    return data.data;
  },

  async getSearchStatus(requestId?: string): Promise<any> {
    if (!requestId) return null;
    const { data } = await api.get(`/emergency/search/${requestId}`);
    return data.data;
  },

  async getCommandCenterData(): Promise<any> {
    const { data } = await api.get('/emergency/command-center');
    return data.data;
  },

  async getMapLayers(filters?: { bloodGroup?: string; urgency?: string }): Promise<any> {
    const { data } = await api.get('/emergency/map-layers', { params: filters });
    return data.data;
  },

  async getCoordinationRoom(requestId: string): Promise<CoordinationRoomData> {
    const { data } = await api.get(`/coordination/requests/${requestId}`);
    return data.data;
  },

  async sendCoordinationMessage(roomId: string, message: string, messageType = 'TEXT', isPredefined = false): Promise<any> {
    const { data } = await api.post(`/coordination/rooms/${roomId}/messages`, {
      message,
      messageType,
      isPredefined,
    });
    return data.data;
  },

  async confirmArrival(roomId: string, donorId: string): Promise<any> {
    const { data } = await api.post(`/coordination/rooms/${roomId}/arrival`, { donorId });
    return data.data;
  },

  async simulateEmergency(params: any): Promise<any> {
    const { data } = await api.post('/emergency/simulate', params);
    return data.data;
  },

  async parseVoiceRequest(transcript: string): Promise<any> {
    const { data } = await api.post('/ai/voice-request', { transcript });
    return data.data;
  },

  async getDemandForecast(): Promise<any> {
    const { data } = await api.get('/ai/demand-forecast');
    return data.data;
  },

  async getShortageForecast(bloodBankId: string): Promise<any> {
    const { data } = await api.get(`/ai/shortage-forecast/${bloodBankId}`);
    return data.data;
  },

  async syncOfflineAction(action: { idempotencyKey: string; actionType: string; payload: any }): Promise<any> {
    const { data } = await api.post('/emergency/sync', action);
    return data.data;
  },
};
