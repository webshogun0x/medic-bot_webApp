import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  linkRFID: (userId: string, rfidNumber: string) => api.post('/auth/link-rfid', { userId, rfidNumber }),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getMedications: () => api.get('/users/medications'),
  addMedication: (data: any) => api.post('/users/medications', data),
  deleteMedication: (id: string) => api.delete(`/users/medications/${id}`),
  changePassword: (currentPassword: string, newPassword: string) => api.post('/users/change-password', { currentPassword, newPassword }),
  deleteAccount: () => api.delete('/users/account'),
};

export const readingsAPI = {
  getLatest: () => api.get('/readings/latest'),
  getHistory: (days = 7) => api.get(`/readings/history?days=${days}`),
  getAnalytics: (days = 30) => api.get(`/readings/analytics?days=${days}`),
};

export const aiAPI = {
  chat: (message: string) => api.post('/ai/chat', { message }),
  generateRecommendations: () => api.post('/ai/generate'),
  getHistory: () => api.get('/ai/history'),
};

export const dashboardAPI = {
  getDashboardData: () => api.get('/dashboard/data'),
  getChartData: () => api.get('/dashboard/chart-data'),
};

export const adminAPI = {
  getPatients: () => api.get('/admin/patients'),
  getPatientDetails: (uid: string) => api.get(`/admin/patients/${uid}`),
  assignRFID: (uid: string, rfidNumber: string) => api.post(`/admin/patients/${uid}/assign-rfid`, { rfidNumber }),
  getStats: () => api.get('/admin/stats'),
  getRecentReadings: (limit = 10) => api.get(`/admin/recent-readings?limit=${limit}`),
  searchPatients: (query: string) => api.get(`/admin/search?q=${query}`),
  makeAdmin: (userId: string, email: string) => api.post('/admin/make-admin', { userId, email }),
  removeAdmin: (userId: string) => api.delete(`/admin/remove-admin/${userId}`),
  getAdmins: () => api.get('/admin/admins'),
  getActivityLogs: (limit = 50) => api.get(`/admin/activity-logs?limit=${limit}`),
};

export default api;