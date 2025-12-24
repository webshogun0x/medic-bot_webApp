import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  linkRFID: (userId, rfidNumber) => api.post('/auth/link-rfid', { userId, rfidNumber }),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getMedications: () => api.get('/users/medications'),
  addMedication: (data) => api.post('/users/medications', data),
};

export const readingsAPI = {
  getLatest: () => api.get('/readings/latest'),
  getHistory: (days = 7) => api.get(`/readings/history?days=${days}`),
  getAnalytics: (days = 30) => api.get(`/readings/analytics?days=${days}`),
};

export const aiAPI = {
  generateRecommendations: () => api.post('/ai/generate'),
  getHistory: () => api.get('/ai/history'),
};

export default api;
