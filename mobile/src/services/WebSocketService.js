/**
 * WebSocket Service für Echtzeit-Updates
 * Verbindet mit dem Backend-WebSocket und verteilt Updates an die App
 */
import Constants from 'expo-constants';
import { authAPI } from './api';

// Get WebSocket URL from API URL (replace http with ws)
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://windows-heartbeat.preview.emergentagent.com';
const WS_BASE_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.heartbeatInterval = null;
    this.tenantId = null;
    this.token = null;
    
    // Event listeners
    this.listeners = {
      device_update: [],
      location_update: [],
      dashboard_stats: [],
      ticket_update: [],
      connection_status: [],
      opening_hours_update: [],
    };
  }

  /**
   * Verbindung zum WebSocket-Server herstellen
   */
  async connect(tenantId) {
    if (this.isConnected && this.tenantId === tenantId) {
      console.log('[WS] Already connected to tenant:', tenantId);
      return;
    }

    // Disconnect existing connection if switching tenants
    if (this.socket) {
      this.disconnect();
    }

    this.tenantId = tenantId;
    this.token = await authAPI.getToken();

    if (!this.token) {
      console.error('[WS] No auth token available');
      return;
    }

    const wsUrl = `${WS_BASE_URL}/api/ws/${tenantId}?token=${this.token}`;
    console.log('[WS] Connecting to:', wsUrl.substring(0, 60) + '...');

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[WS] Connected to tenant:', tenantId);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners('connection_status', { connected: true, tenantId });
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this.notifyListeners('connection_status', { connected: false, tenantId });
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('[WS] Error:', error.message || 'Unknown error');
        this.isConnected = false;
      };

    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Verbindung trennen
   */
  disconnect() {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.tenantId = null;
    this.reconnectAttempts = 0;
    console.log('[WS] Disconnected');
  }

  /**
   * Eingehende Nachrichten verarbeiten
   */
  handleMessage(message) {
    const { type, data, action } = message;
    console.log('[WS] Received:', type);

    switch (type) {
      case 'connection_established':
        console.log('[WS] Connection confirmed for tenant:', message.tenant_id);
        break;

      case 'ping':
        // Respond to heartbeat
        this.sendMessage({ type: 'pong' });
        break;

      case 'device_update':
        this.notifyListeners('device_update', data);
        break;

      case 'location_update':
        this.notifyListeners('location_update', data);
        break;

      case 'dashboard_stats':
        this.notifyListeners('dashboard_stats', data);
        break;

      case 'ticket_update':
        this.notifyListeners('ticket_update', { ...data, action });
        break;

      case 'opening_hours_update':
        this.notifyListeners('opening_hours_update', data);
        break;

      case 'location_created':
        this.notifyListeners('location_update', { ...message.location, action: 'created' });
        break;

      case 'error':
        console.error('[WS] Server error:', message.message);
        break;

      default:
        console.log('[WS] Unknown message type:', type);
    }
  }

  /**
   * Nachricht an Server senden
   */
  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Heartbeat starten
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Send pong preemptively to keep connection alive
        this.sendMessage({ type: 'pong' });
      }
    }, 25000); // Every 25 seconds
  }

  /**
   * Heartbeat stoppen
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reconnect planen
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`[WS] Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && this.tenantId) {
        this.connect(this.tenantId);
      }
    }, delay);
  }

  /**
   * Event-Listener registrieren
   */
  addEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback);
    }
    
    // Return unsubscribe function
    return () => {
      this.removeEventListener(eventType, callback);
    };
  }

  /**
   * Event-Listener entfernen
   */
  removeEventListener(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }
  }

  /**
   * Alle Listener für einen Event-Typ benachrichtigen
   */
  notifyListeners(eventType, data) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WS] Listener error for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Update für bestimmten Typ anfordern
   */
  requestUpdate(updateType) {
    this.sendMessage({
      type: 'request_update',
      requestType: updateType
    });
  }

  /**
   * Verbindungsstatus prüfen
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      tenantId: this.tenantId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton-Instanz exportieren
export const webSocketService = new WebSocketService();
export default webSocketService;
