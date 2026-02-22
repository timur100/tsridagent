/**
 * WebSocket Context für Echtzeit-Updates in der gesamten App
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import webSocketService from '../services/WebSocketService';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Data state that will be updated in real-time
  const [realtimeData, setRealtimeData] = useState({
    devices: null,
    locations: null,
    dashboardStats: null,
  });

  // Get tenant_id (support both single and array format)
  const tenantId = user?.tenant_id || (user?.tenant_ids && user?.tenant_ids[0]) || null;

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && tenantId) {
      webSocketService.connect(tenantId);
    } else {
      webSocketService.disconnect();
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [isAuthenticated, tenantId]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reconnect if needed
        console.log('[WS Context] App came to foreground, checking connection');
        if (isAuthenticated && tenantId && !webSocketService.isConnected) {
          webSocketService.connect(tenantId);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background - optionally disconnect to save battery
        console.log('[WS Context] App going to background');
        // Note: We keep the connection for now to receive updates
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

  const value = {
    isConnected,
    lastUpdate,
    realtimeData,
    subscribe,
    requestUpdate,
    reconnect,
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

export default WebSocketContext;
