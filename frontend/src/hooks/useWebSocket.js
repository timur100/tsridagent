/**
 * Custom React Hook for WebSocket Integration
 * Provides easy WebSocket integration with automatic connection management
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService from '../services/websocket.service';

/**
 * Custom hook for WebSocket connection
 * @param {string} tenantId - The tenant ID to connect to
 * @param {object} handlers - Event handlers object (e.g., { message_type: handlerFn })
 * @param {object} options - Configuration options
 * @returns {object} WebSocket state and handlers
 */
export const useWebSocket = (tenantId, handlers = {}, options = {}) => {
  const {
    autoConnect = true,
    enableFallback = true,
    pollingInterval = 30000,
    onLocationUpdate = handlers.location_update || null,
    onDeviceUpdate = handlers.device_update || null,
    onDashboardStats = handlers.dashboard_stats || null,
    onRefreshAll = handlers.refresh_all || null,
    onOpeningHoursUpdate = handlers.opening_hours_update || null,
    onLocationCreated = handlers.location_created || null,
    onLocationDeleted = handlers.location_deleted || null,
    onDeviceCreated = handlers.device_created || null,
    onDeviceDeleted = handlers.device_deleted || null,
    onDeviceStatusUpdate = handlers.device_status_update || null,
    onTenantUpdated = handlers.tenant_updated || null,
    onUserCreated = handlers.user_created || null,
    onUserUpdated = handlers.user_updated || null,
    onUserDeleted = handlers.user_deleted || null,
    onScanUpdate = handlers.scan_update || null,
    // Additional handlers from new parameter
    ...customHandlers
  } = options;

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdate, setLastUpdate] = useState(null);
  const fallbackPollingRef = useRef(null);
  const handlersRegistered = useRef(false);

  // Update connection status
  const updateConnectionStatus = useCallback((status) => {
    console.log('[useWebSocket] Connection status:', status);
    setConnectionStatus(status);
  }, []);

  // Handle location update
  const handleLocationUpdate = useCallback((data) => {
    console.log('[useWebSocket] Location update received:', data);
    setLastUpdate({ type: 'location_update', data, timestamp: new Date() });
    if (onLocationUpdate) {
      onLocationUpdate(data);
    }
  }, [onLocationUpdate]);

  // Handle device update
  const handleDeviceUpdate = useCallback((data) => {
    console.log('[useWebSocket] Device update received:', data);
    setLastUpdate({ type: 'device_update', data, timestamp: new Date() });
    if (onDeviceUpdate) {
      onDeviceUpdate(data);
    }
  }, [onDeviceUpdate]);

  // Handle dashboard stats update
  const handleDashboardStats = useCallback((data) => {
    console.log('[useWebSocket] Dashboard stats received:', data);
    setLastUpdate({ type: 'dashboard_stats', data, timestamp: new Date() });
    if (onDashboardStats) {
      onDashboardStats(data);
    }
  }, [onDashboardStats]);

  // Handle refresh all
  const handleRefreshAll = useCallback((data) => {
    console.log('[useWebSocket] Refresh all triggered');
    setLastUpdate({ type: 'refresh_all', data, timestamp: new Date() });
    if (onRefreshAll) {
      onRefreshAll(data);
    }
  }, [onRefreshAll]);

  // Handle opening hours update
  const handleOpeningHoursUpdate = useCallback((data) => {
    console.log('[useWebSocket] Opening hours update received:', data);
    setLastUpdate({ type: 'opening_hours_update', data, timestamp: new Date() });
    if (onOpeningHoursUpdate) {
      onOpeningHoursUpdate(data);
    }
  }, [onOpeningHoursUpdate]);

  // Handle location created
  const handleLocationCreated = useCallback((data) => {
    console.log('[useWebSocket] Location created:', data);
    setLastUpdate({ type: 'location_created', data, timestamp: new Date() });
    if (onLocationCreated) {
      onLocationCreated(data);
    }
  }, [onLocationCreated]);

  // Handle location deleted
  const handleLocationDeleted = useCallback((data) => {
    console.log('[useWebSocket] Location deleted:', data);
    setLastUpdate({ type: 'location_deleted', data, timestamp: new Date() });
    if (onLocationDeleted) {
      onLocationDeleted(data);
    }
  }, [onLocationDeleted]);

  // Handle device created
  const handleDeviceCreated = useCallback((data) => {
    console.log('[useWebSocket] Device created:', data);
    setLastUpdate({ type: 'device_created', data, timestamp: new Date() });
    if (onDeviceCreated) {
      onDeviceCreated(data);
    }
  }, [onDeviceCreated]);

  // Handle device deleted
  const handleDeviceDeleted = useCallback((data) => {
    console.log('[useWebSocket] Device deleted:', data);
    setLastUpdate({ type: 'device_deleted', data, timestamp: new Date() });
    if (onDeviceDeleted) {
      onDeviceDeleted(data);
    }
  }, [onDeviceDeleted]);

  // Handle device status update
  const handleDeviceStatusUpdate = useCallback((data) => {
    console.log('[useWebSocket] Device status update:', data);
    setLastUpdate({ type: 'device_status_update', data, timestamp: new Date() });
    if (onDeviceStatusUpdate) {
      onDeviceStatusUpdate(data);
    }
  }, [onDeviceStatusUpdate]);

  // Handle tenant updated
  const handleTenantUpdated = useCallback((data) => {
    console.log('[useWebSocket] Tenant updated:', data);
    setLastUpdate({ type: 'tenant_updated', data, timestamp: new Date() });
    if (onTenantUpdated) {
      onTenantUpdated(data);
    }
  }, [onTenantUpdated]);

  // Handle user created
  const handleUserCreated = useCallback((data) => {
    console.log('[useWebSocket] User created:', data);
    setLastUpdate({ type: 'user_created', data, timestamp: new Date() });
    if (onUserCreated) {
      onUserCreated(data);
    }
  }, [onUserCreated]);

  // Handle user updated
  const handleUserUpdated = useCallback((data) => {
    console.log('[useWebSocket] User updated:', data);
    setLastUpdate({ type: 'user_updated', data, timestamp: new Date() });
    if (onUserUpdated) {
      onUserUpdated(data);
    }
  }, [onUserUpdated]);

  // Handle user deleted
  const handleUserDeleted = useCallback((data) => {
    console.log('[useWebSocket] User deleted:', data);
    setLastUpdate({ type: 'user_deleted', data, timestamp: new Date() });
    if (onUserDeleted) {
      onUserDeleted(data);
    }
  }, [onUserDeleted]);

  // Handle scan update
  const handleScanUpdate = useCallback((data) => {
    console.log('[useWebSocket] Scan update:', data);
    setLastUpdate({ type: 'scan_update', data, timestamp: new Date() });
    if (onScanUpdate) {
      onScanUpdate(data);
    }
  }, [onScanUpdate]);

  // Start fallback polling
  const startFallbackPolling = useCallback(() => {
    if (!enableFallback || fallbackPollingRef.current) {
      return;
    }

    console.log('[useWebSocket] Starting fallback polling');
    
    fallbackPollingRef.current = setInterval(() => {
      console.log('[useWebSocket] Fallback polling triggered');
      if (onRefreshAll) {
        onRefreshAll({ source: 'fallback_polling' });
      }
    }, pollingInterval);
  }, [enableFallback, pollingInterval, onRefreshAll]);

  // Stop fallback polling
  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollingRef.current) {
      console.log('[useWebSocket] Stopping fallback polling');
      clearInterval(fallbackPollingRef.current);
      fallbackPollingRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!tenantId) {
      console.warn('[useWebSocket] Cannot connect: missing tenantId');
      return;
    }
    
    // Get token from localStorage as fallback
    const authToken = localStorage.getItem('portal_token');
    if (!authToken) {
      console.warn('[useWebSocket] Cannot connect: no token available');
      return;
    }

    console.log('[useWebSocket] Connecting to WebSocket for tenant:', tenantId);
    websocketService.connect(tenantId, authToken);
  }, [tenantId]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('[useWebSocket] Disconnecting from WebSocket');
    websocketService.disconnect();
    stopFallbackPolling();
  }, [stopFallbackPolling]);

  // Register message handlers - Run only once on mount
  useEffect(() => {
    console.log('[useWebSocket] Registering message handlers');

    // Register connection status callback
    websocketService.onConnectionStatus(updateConnectionStatus);

    // Register message handlers
    websocketService.on('location_update', handleLocationUpdate);
    websocketService.on('device_update', handleDeviceUpdate);
    websocketService.on('dashboard_stats', handleDashboardStats);
    websocketService.on('refresh_all', handleRefreshAll);
    websocketService.on('opening_hours_update', handleOpeningHoursUpdate);
    websocketService.on('location_created', handleLocationCreated);
    websocketService.on('location_deleted', handleLocationDeleted);
    websocketService.on('device_created', handleDeviceCreated);
    websocketService.on('device_deleted', handleDeviceDeleted);
    websocketService.on('device_status_update', handleDeviceStatusUpdate);
    websocketService.on('tenant_updated', handleTenantUpdated);
    websocketService.on('user_created', handleUserCreated);
    websocketService.on('user_updated', handleUserUpdated);
    websocketService.on('user_deleted', handleUserDeleted);
    websocketService.on('scan_update', handleScanUpdate);

    // Cleanup function
    return () => {
      console.log('[useWebSocket] Unregistering message handlers');
      websocketService.off('location_update', handleLocationUpdate);
      websocketService.off('device_update', handleDeviceUpdate);
      websocketService.off('dashboard_stats', handleDashboardStats);
      websocketService.off('refresh_all', handleRefreshAll);
      websocketService.off('opening_hours_update', handleOpeningHoursUpdate);
      websocketService.off('location_created', handleLocationCreated);
      websocketService.off('location_deleted', handleLocationDeleted);
      websocketService.off('device_created', handleDeviceCreated);
      websocketService.off('device_deleted', handleDeviceDeleted);
      websocketService.off('device_status_update', handleDeviceStatusUpdate);
      websocketService.off('tenant_updated', handleTenantUpdated);
      websocketService.off('user_created', handleUserCreated);
      websocketService.off('user_updated', handleUserUpdated);
      websocketService.off('user_deleted', handleUserDeleted);
      websocketService.off('scan_update', handleScanUpdate);
    };
  }, []); // Empty deps - only run on mount/unmount

  // Register custom handlers from the handlers parameter
  useEffect(() => {
    if (!handlers || Object.keys(handlers).length === 0) return;
    
    console.log('[useWebSocket] Registering custom handlers:', Object.keys(handlers));
    
    // Register each handler
    Object.keys(handlers).forEach(messageType => {
      websocketService.on(messageType, handlers[messageType]);
    });
    
    // Cleanup
    return () => {
      Object.keys(handlers).forEach(messageType => {
        websocketService.off(messageType, handlers[messageType]);
      });
    };
  }, [handlers]);

  // Auto-connect on mount
  useEffect(() => {
    const authToken = localStorage.getItem('portal_token');
    console.log('[useWebSocket] Auto-connect effect - tenantId:', tenantId, 'token:', authToken ? 'present' : 'missing', 'autoConnect:', autoConnect);
    
    if (autoConnect && tenantId && authToken) {
      console.log('[useWebSocket] Calling connect()...');
      connect();
    } else {
      console.log('[useWebSocket] Skipping connect - conditions not met');
    }

    // Cleanup on unmount
    return () => {
      console.log('[useWebSocket] Auto-connect cleanup - calling disconnect');
      if (autoConnect) {
        disconnect();
      }
    };
  }, [tenantId, autoConnect, connect, disconnect]);

  // Handle connection status changes for fallback
  useEffect(() => {
    if (connectionStatus === 'connected') {
      stopFallbackPolling();
    } else if (connectionStatus === 'failed' || connectionStatus === 'error') {
      if (enableFallback) {
        startFallbackPolling();
      }
    }
  }, [connectionStatus, enableFallback, startFallbackPolling, stopFallbackPolling]);

  // Send message to server
  const sendMessage = useCallback((message) => {
    websocketService.send(message);
  }, []);

  // Request immediate update
  const requestUpdate = useCallback(() => {
    sendMessage({ type: 'request_update' });
  }, [sendMessage]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastUpdate,
    connect,
    disconnect,
    sendMessage,
    requestUpdate
  };
};

export default useWebSocket;
