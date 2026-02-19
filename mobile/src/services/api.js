import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get API URL from app config or use default
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://tc78-fieldwork-app.preview.emergentagent.com';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear stored data
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/portal/auth/login', { email, password });
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/api/portal/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/portal/auth/me');
    return response.data;
  },
  
  // Token management
  setToken: async (token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  
  getToken: async () => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },
  
  setUser: async (user) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },
  
  getUser: async () => {
    const userData = await SecureStore.getItemAsync(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },
};

// Assets API
export const assetsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/asset-mgmt/inventory/all', { params });
    return response.data;
  },
  
  getById: async (assetId) => {
    const response = await api.get(`/api/asset-mgmt/inventory/${assetId}`);
    return response.data;
  },
  
  getByBarcode: async (barcode) => {
    const response = await api.get(`/api/asset-mgmt/inventory/barcode/${barcode}`);
    return response.data;
  },
  
  update: async (assetId, data) => {
    const response = await api.put(`/api/asset-mgmt/inventory/${assetId}`, data);
    return response.data;
  },
  
  updateStatus: async (assetId, status) => {
    const response = await api.patch(`/api/asset-mgmt/inventory/${assetId}/status`, { status });
    return response.data;
  },
};

// Goods Receipt (Wareneingang) API
export const goodsReceiptAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/asset-mgmt/inventory/all', { params });
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/api/asset-mgmt/inventory', data);
    return response.data;
  },
  
  assignToLocation: async (assetId, locationId) => {
    const response = await api.post(`/api/asset-mgmt/inventory/${assetId}/assign`, { location_id: locationId });
    return response.data;
  },
};

// Locations API
export const locationsAPI = {
  getAll: async () => {
    const response = await api.get('/api/portal/locations/list');
    return response.data;
  },
  
  getById: async (locationId) => {
    const response = await api.get(`/api/portal/locations/${locationId}`);
    return response.data;
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    const response = await api.get('/api/tenants/stats');
    return response.data;
  },
  
  getTenantStats: async (tenantId) => {
    const response = await api.get(`/api/tenants/${tenantId}/dashboard-stats`);
    return response.data;
  },
};

// Health/Status API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default api;
