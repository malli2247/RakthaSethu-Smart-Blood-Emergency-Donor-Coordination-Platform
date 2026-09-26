import axios from 'axios';

const normalizeApiUrl = (url?: string): string => {
  if (!url) return '/api';
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) return '/api';
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const API_BASE_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rakthasethu_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token expiry / refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('rakthasethu_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });
          if (data.data?.accessToken) {
            localStorage.setItem('rakthasethu_token', data.data.accessToken);
            if (data.data.refreshToken) {
              localStorage.setItem('rakthasethu_refresh_token', data.data.refreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
        } catch {
          // If refresh fails, clear tokens
          localStorage.removeItem('rakthasethu_token');
          localStorage.removeItem('rakthasethu_refresh_token');
          localStorage.removeItem('rakthasethu_user');
        }
      }
    }
    return Promise.reject(error);
  }
);

// Modular API endpoints
export const authApi = {
  login: (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: (refreshToken?: string) => api.post('/auth/logout', { refreshToken }),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; newPassword: string }) => api.post('/auth/reset-password', data),
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
};

export const matchingApi = {
  findDonors: (data: any) => api.post('/matching/find-donors', data),
  getRequestMatches: (requestId: string) => api.get(`/matching/request/${requestId}`),
  triggerMatching: (requestId: string) => api.post(`/matching/request/${requestId}/run`),
};

export const requestsApi = {
  list: (params?: any) => api.get('/requests', { params }),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post('/requests', data),
  updateStatus: (id: string, data: { status: string; notes?: string }) =>
    api.patch(`/requests/${id}/status`, data),
  respondToMatch: (matchId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL', notes?: string) =>
    api.post(`/requests/matches/${matchId}/respond`, { action, notes }),
  startTravel: (matchId: string) => api.post(`/requests/matches/${matchId}/start-travel`),
  markArrived: (matchId: string) => api.post(`/requests/matches/${matchId}/arrived`),
  confirmReceipt: (
    id: string,
    data: { action: 'CONFIRM' | 'NOT_RECEIVED'; notes?: string; reportedIssue?: string }
  ) => api.post(`/requests/${id}/confirm-receipt`, data),
  getTimeline: (id: string) => api.get(`/requests/${id}/timeline`),
};

export const donorApi = {
  getProfile: () => api.get('/donors/profile'),
  updateProfile: (data: any) => api.patch('/donors/profile', data),
  getStats: () => api.get('/donors/stats'),
  getMatches: () => api.get('/donors/matches'),
  getHistory: () => api.get('/donors/history'),
  recordDonation: (data: any) => api.post('/donors/record-donation', data),
};

export const hospitalApi = {
  getProfile: () => api.get('/hospitals/profile'),
  updateProfile: (data: any) => api.patch('/hospitals/profile', data),
  getRequests: () => api.get('/hospitals/requests'),
  verifyArrival: (data: { requestId: string; donorId: string; staffNotes?: string }) =>
    api.post('/hospitals/verify-arrival', data),
  startDonation: (data: { requestId: string; donorId: string; units?: number }) =>
    api.post('/hospitals/start-donation', data),
  completeDonation: (data: { requestId: string; donorId: string; donationId?: string; notes?: string }) =>
    api.post('/hospitals/complete-donation', data),
  confirmDonation: (data: {
    requestId: string;
    donorId: string;
    units?: number;
    notes?: string;
    donationId?: string;
  }) => api.post('/hospitals/confirm-donation', data),
  reportIssue: (data: { requestId: string; donorId?: string; issueReason: string }) =>
    api.post('/hospitals/report-issue', data),
};

export const bloodBankApi = {
  getProfile: () => api.get('/blood-banks/profile'),
  getInventory: () => api.get('/blood-banks/inventory'),
  addBatch: (data: any) => api.post('/blood-banks/inventory', data),
  updateStatus: (id: string, data: any) => api.patch(`/blood-banks/inventory/${id}`, data),
};

export const volunteerApi = {
  getProfile: () => api.get('/volunteers/profile'),
  updateProfile: (data: any) => api.patch('/volunteers/profile', data),
  getTasks: () => api.get('/volunteers/tasks'),
};

export const campApi = {
  list: (params?: {
    lat?: number;
    lon?: number;
    city?: string;
    district?: string;
    state?: string;
    radius?: number;
    expand?: boolean;
    status?: string;
    limit?: number;
  }) => api.get('/camps', { params }),
  getById: (id: string) => api.get(`/camps/${id}`),
  create: (data: any) => api.post('/camps', data),
  register: (campId: string) => api.post(`/camps/${campId}/register`),
  cancel: (campId: string) => api.delete(`/camps/${campId}/register`),
  adminSync: () => api.post('/camps/admin/sync'),
  adminImport: (camps: any[], source?: string) => api.post('/camps/admin/import', { camps, source }),
  getSyncStatus: () => api.get('/camps/admin/sync-status'),
  verifyCamp: (id: string, notes?: string) => api.patch(`/camps/admin/${id}/verify`, { notes }),
  rejectCamp: (id: string, notes?: string) => api.patch(`/camps/admin/${id}/reject`, { notes }),
  cancelCamp: (id: string, reason?: string) => api.patch(`/camps/admin/${id}/cancel`, { reason }),
};

export const campaignApi = campApi;

export const notificationApi = {
  list: (params?: { filter?: string; page?: number; limit?: number }) =>
    api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
  getVapidPublicKey: () => api.get('/notifications/vapid-public-key'),
  registerPushSubscription: (data: {
    endpoint: string;
    keys: { p256dh?: string; auth?: string };
    userAgent?: string;
    deviceType?: string;
  }) => api.post('/notifications/push-subscription', data),
  revokePushSubscription: (data: { endpoint: string }) =>
    api.delete('/notifications/push-subscription', { data }),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: any) => api.patch('/notifications/preferences', data),
  sendTestPush: () => api.post('/notifications/test-push'),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, data: any) => api.patch(`/admin/users/${id}/status`, data),
  getVerifications: () => api.get('/admin/verifications'),
  verifyOrg: (type: string, id: string, data: any) =>
    api.patch(`/admin/verifications/${type}/${id}`, data),
  getStuckRequests: () => api.get('/admin/stuck-requests'),
  resolveRequest: (
    id: string,
    data: { action: 'FORCE_FULFILL' | 'RESTART_MATCHING' | 'CANCEL'; notes?: string }
  ) => api.post(`/admin/requests/${id}/resolve`, data),
  getSystemHealth: () => api.get('/admin/system-health'),
  getLiveEmergencies: () => api.get('/admin/live-emergencies'),
};

export const aiApi = {
  classifyUrgency: (medicalReason: string) => api.post('/ai/classify-urgency', { medicalReason }),
  chat: (question: string) => api.post('/ai/chat', { question }),
};

export const statisticsApi = {
  getPublic: () => api.get('/statistics/public'),
  getActivity: () => api.get('/statistics/activity'),
  getInventory: () => api.get('/statistics/inventory'),
  getAdminAnalytics: () => api.get('/statistics/admin'),
};

