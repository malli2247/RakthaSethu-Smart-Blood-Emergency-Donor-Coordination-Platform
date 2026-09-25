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
  respondToMatch: (matchId: string, action: 'ACCEPT' | 'DECLINE', notes?: string) =>
    api.post(`/requests/matches/${matchId}/respond`, { action, notes }),
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
  confirmDonation: (data: any) => api.post('/hospitals/confirm-donation', data),
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

export const campaignApi = {
  list: (params?: any) => api.get('/campaigns', { params }),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  register: (campaignId: string) => api.post(`/campaigns/${campaignId}/register`),
  cancel: (campaignId: string) => api.delete(`/campaigns/${campaignId}/register`),
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, data: any) => api.patch(`/admin/users/${id}/status`, data),
  getVerifications: () => api.get('/admin/verifications'),
  verifyOrg: (type: string, id: string, data: any) =>
    api.patch(`/admin/verifications/${type}/${id}`, data),
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

