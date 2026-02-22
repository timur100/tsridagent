/**
 * WebSocket Context für Echtzeit-Updates in der gesamten App
 * Mit Fallback-Polling für zuverlässige Updates
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import webSocketService from '../services/WebSocketService';

const WebSocketContext = createContext(null);

// Polling interval in ms (30 seconds as fallback)
const POLLING_INTERVAL = 30000;

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const pollingIntervalRef = useRef(null);
  
  // Data state that will be updated in real-time
  const [realtimeData, setRealtimeData] = useState({
    devices: null,
    locations: null,
    dashboardStats: null,
  });
  
  // Polling trigger - increments to force data refresh
  const [pollTrigger, setPollTrigger] = useState(0);

  // Get tenant_id (support both single and array format)
  const tenantId = user?.tenant_id || (user?.tenant_ids && user?.tenant_ids[0]) || null;

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    console.log('[WS Context] Starting fallback polling');
    pollingIntervalRef.current = setInterval(() => {
      console.log('[WS Context] Polling for updates...');
      setPollTrigger(prev => prev + 1);
    }, POLLING_INTERVAL);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('[WS Context] Stopped fallback polling');
    }
  }, []);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      webSocketService.connect(tenantId);
      // Start polling as fallback (will work even if WebSocket fails)
      startPolling();
    } else {
      webSocketService.disconnect();
      stopPolling();
    }

    return () => {
      webSocketService.disconnect();
      stopPolling();
    };
  }, [isAuthenticated, tenantId, startPolling, stopPolling]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reconnect and trigger immediate poll
        console.log('[WS Context] App came to foreground, refreshing');
        if (isAuthenticated && tenantId) {
          if (!webSocketService.isConnected) {
            webSocketService.connect(tenantId);
          }
          // Trigger immediate data refresh
          setPollTrigger(prev => prev + 1);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        console.log('[WS Context] App going to background');
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, tenantId]);

  // Set up event listeners
  useEffect(() => {
    // Connection status listener
    const unsubscribeConnection = webSocketService.addEventListener('connection_status', (status) => {
      setIsConnected(status.connected);
      console.log('[WS Context] Connection status:', status.connected ? 'Connected' : 'Disconnected');
    });

    // Device update listener
    const unsubscribeDevice = webSocketService.addEventListener('device_update', (data) => {
      console.log('[WS Context] Device update received');
      setLastUpdate({ type: 'device', timestamp: new Date(), data });
      setRealtimeData(prev => ({
        ...prev,
        devices: { ...prev.devices, lastUpdate: new Date(), updateData: data }
      }));
    });

    // Location update listener
    const unsubscribeLocation = webSocketService.addEventListener('location_update', (data) => {
      console.log('[WS Context] Location update received');
      setLastUpdate({ type: 'location', timestamp: new Date(), data });
      setRealtimeData(prev => ({
        ...prev,
        locations: { ...prev.locations, lastUpdate: new Date(), updateData: data }
      }));
    });

    // Dashboard stats listener
    const unsubscribeDashboard = webSocketService.addEventListener('dashboard_stats', (data) => {
      console.log('[WS Context] Dashboard stats update received');
      setLastUpdate({ type: 'dashboard', timestamp: new Date(), data });
      setRealtimeData(prev => ({
        ...prev,
        dashboardStats: data
      }));
    });

    return () => {
      unsubscribeConnection();
      unsubscribeDevice();
      unsubscribeLocation();
      unsubscribeDashboard();
    };
  }, []);

  // Subscribe to specific update types
  const subscribe = useCallback((eventType, callback) => {
    return webSocketService.addEventListener(eventType, callback);
  }, []);

  // Request an immediate update
  const requestUpdate = useCallback((updateType) => {
    webSocketService.requestUpdate(updateType);
  }, []);

  // Force reconnect
  const reconnect = useCallback(() => {
    if (tenantId) {
      webSocketService.disconnect();
      webSocketService.connect(tenantId);
    }
  }, [tenantId]);

  // Force manual refresh
  const triggerRefresh = useCallback(() => {
    console.log('[WS Context] Manual refresh triggered');
    setPollTrigger(prev => prev + 1);
  }, []);

  const value = {
    isConnected,
    lastUpdate,
    realtimeData,
    subscribe,
    requestUpdate,
    reconnect,
    triggerRefresh,
    pollTrigger, // Screens can watch this to know when to refresh
    tenantId,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook um WebSocket-Context zu verwenden
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

/**
 * Hook um auf bestimmte Updates zu lauschen
 * Automatisches Cleanup beim Unmount
 */
export const useRealtimeUpdates = (eventType, callback) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
};

/**
 * Hook für Auto-Polling-Updates
 * Wird alle 30 Sekunden getriggert und bei WebSocket-Events
 */
export const usePollingUpdates = (callback) => {
  const { pollTrigger } = useWebSocket();
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Trigger callback when pollTrigger changes
  useEffect(() => {
    if (pollTrigger > 0) {
      callbackRef.current?.();
    }
  }, [pollTrigger]);
};

export default WebSocketContext;
