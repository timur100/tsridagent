/**
 * TSRID Mobile App - API Konfiguration
 * 
 * Verbindung zum bestehenden Backend.
 * WICHTIG: Verwendet die gleichen Endpoints wie das Admin Portal!
 */

// API-URL aus Environment oder Fallback
export const API_BASE_URL = __DEV__ 
  ? 'https://agent-control-desk-2.preview.emergentagent.com'  // Development
  : 'https://your-production-url.com';                   // Production

// API Endpoints (identisch mit Admin Portal)
export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/portal/login',
    logout: '/api/portal/logout',
    me: '/api/portal/me',
    pinLogin: '/api/scanapp/pin-login'
  },
  
  // Assets / Wareneingang
  assets: {
    list: '/api/asset-mgmt/assets',
    detail: (id: string) => `/api/asset-mgmt/assets/${id}`,
    intake: '/api/asset-mgmt/inventory/intake-with-auto-id',
    bulkEdit: '/api/asset-mgmt/inventory/bulk-edit',
    assignLocation: (sn: string) => `/api/asset-mgmt/inventory/assign-to-location/${sn}`,
    removeLocation: (sn: string) => `/api/asset-mgmt/inventory/remove-from-location/${sn}`,
    delete: (sn: string) => `/api/asset-mgmt/inventory/unassigned/${sn}`,
    unassigned: '/api/asset-mgmt/inventory/unassigned',
    previewNextId: '/api/asset-mgmt/inventory/preview-next-id',
    stats: '/api/asset-mgmt/stats'
  },
  
  // Locations
  locations: {
    list: '/api/asset-mgmt/locations',
    detail: (id: string) => `/api/asset-mgmt/locations/${id}`,
    assets: (id: string) => `/api/asset-mgmt/locations/${id}/assets`
  },
  
  // Label Templates
  labels: {
    templates: '/api/label-templates',
    templateDetail: (id: string) => `/api/label-templates/${id}`
  },
  
  // ID Scans
  idScans: {
    list: '/api/id-scans',
    create: '/api/id-scans',
    detail: (id: string) => `/api/id-scans/${id}`
  },
  
  // Audit
  audit: {
    log: '/api/audit/log',
    statistics: '/api/audit/statistics'
  },
  
  // Device Sync
  sync: {
    devices: '/api/devices',
    status: '/api/devices/sync-status'
  }
};

// Request Timeout
export const REQUEST_TIMEOUT = 30000; // 30 Sekunden

// Retry-Konfiguration
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 Sekunde
  retryOn: [408, 500, 502, 503, 504]
};
