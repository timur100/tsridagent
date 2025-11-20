/**
 * Custom React Hook for WebSocket Integration
 * Provides easy WebSocket integration with automatic connection management
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import websocketService from '../services/websocket.service';

/**
 * Custom hook for WebSocket connection
 * @param {string} tenantId - The tenant ID to connect to
 * @param {string} token - JWT authentication token
 * @param {object} options - Configuration options
 * @returns {object} WebSocket state and handlers
 */
export const useWebSocket = (tenantId, token, options = {}) => {
  const {
    autoConnect = true,
    enableFallback = true,
    pollingInterval = 30000,
    onLocationUpdate = null,
    onDeviceUpdate = null,
    onDashboardStats = null,
    onRefreshAll = null,
    onOpeningHoursUpdate = null,
    onLocationCreated = null,
    onLocationDeleted = null
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
    if (!tenantId || !token) {
      console.warn('[useWebSocket] Cannot connect: missing tenantId or token');
      return;
    }

    console.log('[useWebSocket] Connecting to WebSocket for tenant:', tenantId);
    websocketService.connect(tenantId, token);
  }, [tenantId, token]);

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
    };
  }, []); // Empty deps - only run on mount/unmount

  // Auto-connect on mount
  useEffect(() => {
    console.log('[useWebSocket] Auto-connect effect - tenantId:', tenantId, 'token:', token ? 'present' : 'missing', 'autoConnect:', autoConnect);
    
    if (autoConnect && tenantId && token) {
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
  }, [tenantId, token, autoConnect, connect, disconnect]);

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
