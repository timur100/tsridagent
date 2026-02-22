import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get API URL from app config or use default
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://tc78-device-portal.preview.emergentagent.com';

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

// Helper to identify what type of identifier matched
function identifyMatchType(asset, identifier) {
  const normalizedId = identifier.replace(/[:\-\s]/g, '').toUpperCase();
  
  if (asset.warehouse_asset_id === identifier) return 'Asset-ID';
  if (asset.asset_id === identifier) return 'Asset-ID';
  if (asset.manufacturer_sn === identifier) return 'Seriennummer';
  
  const normalizedMac = (asset.mac || '').replace(/[:\-\s]/g, '').toUpperCase();
  if (normalizedMac === normalizedId) return 'MAC-Adresse';
  
  const normalizedMacWifi = (asset.mac_wifi || '').replace(/[:\-\s]/g, '').toUpperCase();
  if (normalizedMacWifi === normalizedId) return 'MAC WiFi';
  
  const normalizedMacBt = (asset.mac_bluetooth || '').replace(/[:\-\s]/g, '').toUpperCase();
  if (normalizedMacBt === normalizedId) return 'MAC Bluetooth';
  
  if (asset.imei === identifier) return 'IMEI';
  if (asset.imei2 === identifier) return 'IMEI 2';
  if (asset.eid === identifier) return 'EID';
  if (asset.sim_number === identifier) return 'SIM-Nummer';
  
  return 'Unbekannt';
}


// Assets API
export const assetsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/asset-mgmt/assets', { params });
    return response.data;
  },
  
  getById: async (assetId) => {
    const response = await api.get(`/api/asset-mgmt/assets/${assetId}`);
    return response.data;
  },
  
  getByBarcode: async (barcode) => {
    // Search by serial number, asset ID, MAC, or IMEI
    const response = await api.get('/api/asset-mgmt/assets', { 
      params: { search: barcode } 
    });
    const assets = response.data?.assets || [];
    
    // Normalize barcode for comparison (remove colons, dashes, spaces)
    const normalizedBarcode = barcode.replace(/[:\-\s]/g, '').toUpperCase();
    
    // Find asset matching any identifier
    const found = assets.find(a => {
      // Direct matches
      if (a.manufacturer_sn === barcode) return true;
      if (a.warehouse_asset_id === barcode) return true;
      if (a.asset_id === barcode) return true;
      
      // Normalized MAC address comparison
      const normalizedMac = (a.mac || '').replace(/[:\-\s]/g, '').toUpperCase();
      const normalizedMacWifi = (a.mac_wifi || '').replace(/[:\-\s]/g, '').toUpperCase();
      const normalizedMacBt = (a.mac_bluetooth || '').replace(/[:\-\s]/g, '').toUpperCase();
      if (normalizedMac === normalizedBarcode) return true;
      if (normalizedMacWifi === normalizedBarcode) return true;
      if (normalizedMacBt === normalizedBarcode) return true;
      
      // IMEI comparison
      if (a.imei === barcode || a.imei2 === barcode) return true;
      
      // EID comparison
      if (a.eid === barcode) return true;
      
      // SIM number comparison
      if (a.sim_number === barcode) return true;
      
      return false;
    });
    
    return { 
      success: !!found, 
      data: found,
      matchType: found ? identifyMatchType(found, barcode) : null
    };
  },
  
  // Enhanced search that returns match details
  searchByIdentifier: async (identifier) => {
    const response = await api.get('/api/asset-mgmt/assets', { 
      params: { search: identifier } 
    });
    const assets = response.data?.assets || [];
    const normalizedId = identifier.replace(/[:\-\s]/g, '').toUpperCase();
    
    // Find all matching assets and their match types
    const matches = assets.filter(a => {
      const normalizedMac = (a.mac || '').replace(/[:\-\s]/g, '').toUpperCase();
      const normalizedMacWifi = (a.mac_wifi || '').replace(/[:\-\s]/g, '').toUpperCase();
      const normalizedMacBt = (a.mac_bluetooth || '').replace(/[:\-\s]/g, '').toUpperCase();
      
      return (
        a.manufacturer_sn === identifier ||
        a.warehouse_asset_id === identifier ||
        a.asset_id === identifier ||
        normalizedMac === normalizedId ||
        normalizedMacWifi === normalizedId ||
        normalizedMacBt === normalizedId ||
        a.imei === identifier ||
        a.imei2 === identifier ||
        a.eid === identifier ||
        a.sim_number === identifier
      );
    }).map(asset => ({
      asset,
      matchType: identifyMatchType(asset, identifier)
    }));
    
    return { 
      success: matches.length > 0, 
      matches,
      count: matches.length
    };
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

// Tenants API
export const tenantsAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/api/tenants/list');
      return response.data;
    } catch (error) {
      console.log('Tenants list error, trying alt endpoint');
      try {
        const response = await api.get('/api/portal/tenants');
        return response.data;
      } catch (e) {
        return { tenants: [] };
      }
    }
  },
};

// Locations API - Tenant Locations (AAHC01, AGBC02, etc.)
export const locationsAPI = {
  getAll: async () => {
    try {
      // Use tenant-locations endpoint with 'all' for all locations
      const response = await api.get('/api/tenant-locations/all');
      return response.data;
    } catch (error) {
      console.log('Locations error:', error.message);
      return { locations: [], total: 0 };
    }
  },
  
  getByTenant: async (tenantId) => {
    try {
      // Use the tenant-locations endpoint with tenant_id
      const response = await api.get(`/api/tenant-locations/${tenantId}`);
      return response.data;
    } catch (error) {
      console.log('Tenant locations error:', error.message);
      return { locations: [], total: 0 };
    }
  },
  
  getDetails: async (locationId) => {
    try {
      const response = await api.get(`/api/tenant-locations/details/${locationId}`);
      return response.data;
    } catch (error) {
      console.log('Location details error:', error.message);
      return { location: null };
    }
  },
};

// Devices API - Tenant Devices (AAHC01-01, BERC01-01, etc.)
export const devicesAPI = {
  getAll: async (tenantId = null) => {
    try {
      let url = '/api/tenant-devices/';
      if (tenantId) {
        url = `/api/tenant-devices/${tenantId}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.log('Devices error:', error.message);
      return { devices: [], total: 0 };
    }
  },
  
  getByTenant: async (tenantId) => {
    try {
      const response = await api.get(`/api/tenant-devices/${tenantId}`);
      return response.data;
    } catch (error) {
      console.log('Tenant devices error:', error.message);
      return { devices: [], total: 0 };
    }
  },
  
  getStats: async (tenantId) => {
    try {
      const response = await api.get(`/api/tenant-devices/${tenantId}/stats`);
      return response.data;
    } catch (error) {
      console.log('Device stats error:', error.message);
      return { total: 0, online: 0, offline: 0, in_preparation: 0 };
    }
  },
};

// Goods Receipt API (Wareneingang)
export const goodsReceiptAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/api/goods-receipt/list');
      return response.data;
    } catch (error) {
      console.log('Goods receipt error:', error.message);
      return { receipts: [] };
    }
  },
  
  create: async (data) => {
    const response = await api.post('/api/goods-receipt/create', data);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/goods-receipt/${id}`);
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
