/**
 * WebSocket Service for Real-Time Updates
 * Manages WebSocket connections with auto-reconnect and fallback to polling
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.tenantId = null;
    this.token = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.messageHandlers = {};
    this.connectionStatusCallback = null;
    
    // Get WebSocket URL from environment
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    // Convert HTTP to WS protocol
    this.wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  }

  /**
   * Connect to WebSocket server
   * @param {string} tenantId - The tenant ID to connect to
   * @param {string} token - JWT authentication token
   */
  connect(tenantId, token) {
    // Don't reconnect if already connected to same tenant
    if (this.isConnected && this.tenantId === tenantId) {
      console.log('[WebSocket] Already connected to tenant:', tenantId);
      return;
    }

    // Close existing connection if connecting to different tenant
    if (this.ws && this.tenantId !== tenantId) {
      this.disconnect();
    }

    this.tenantId = tenantId;
    this.token = token;

    const wsEndpoint = `${this.wsUrl}/api/ws/${tenantId}?token=${token}`;
    console.log('[WebSocket] Connecting to:', wsEndpoint);

    try {
      this.ws = new WebSocket(wsEndpoint);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to tenant:', tenantId);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Notify connection status
        this.notifyConnectionStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.notifyConnectionStatus('error');
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Notify connection status
        this.notifyConnectionStatus('disconnected');
        
        // Attempt to reconnect
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      this.notifyConnectionStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    console.log('[WebSocket] Disconnecting...');
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.tenantId = null;
    this.token = null;
    
    this.notifyConnectionStatus('disconnected');
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    // Don't reconnect if we don't have tenant/token info
    if (!this.tenantId || !this.token) {
      console.log('[WebSocket] No tenant/token info, not reconnecting');
      return;
    }

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached, giving up');
      this.notifyConnectionStatus('failed');
      return;
    }

    // Clear any existing timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    this.notifyConnectionStatus('reconnecting');

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.tenantId, this.token);
    }, delay);
  }

  /**
   * Start heartbeat/ping-pong
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Server sends ping, we respond with pong
        // The actual ping is sent by the server every 30 seconds
      }
    }, 35000); // Check slightly after server ping interval
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param {object} message - The parsed message object
   */
  handleMessage(message) {
    const { type, data, timestamp } = message;
    
    console.log('[WebSocket] Received message:', type, data);

    // Handle different message types
    switch (type) {
      case 'connection_established':
        console.log('[WebSocket] Connection established:', data);
        break;
      
      case 'ping':
        // Respond to server ping
        this.send({ type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'location_update':
        this.notifyHandlers('location_update', data);
        break;
      
      case 'device_update':
        this.notifyHandlers('device_update', data);
        break;
      
      case 'dashboard_stats':
        this.notifyHandlers('dashboard_stats', data);
        break;
      
      case 'refresh_all':
        this.notifyHandlers('refresh_all', data);
        break;
      
      case 'error':
        console.error('[WebSocket] Server error:', message.message);
        break;
      
      default:
        console.warn('[WebSocket] Unknown message type:', type);
    }
  }

  /**
   * Send message to server
   * @param {object} message - The message to send
   */
  send(message) {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Register a message handler for specific message types
   * @param {string} messageType - The message type to handle
   * @param {function} handler - The handler function
   */
  on(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

  /**
   * Unregister a message handler
   * @param {string} messageType - The message type
   * @param {function} handler - The handler function to remove
   */
  off(messageType, handler) {
    if (this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = this.messageHandlers[messageType].filter(
        h => h !== handler
      );
    }
  }

  /**
   * Notify all registered handlers for a message type
   * @param {string} messageType - The message type
   * @param {any} data - The data to pass to handlers
   */
  notifyHandlers(messageType, data) {
    if (this.messageHandlers[messageType]) {
      this.messageHandlers[messageType].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${messageType} handler:`, error);
        }
      });
    }
  }

  /**
   * Set connection status callback
   * @param {function} callback - Callback function that receives status string
   */
  onConnectionStatus(callback) {
    this.connectionStatusCallback = callback;
  }

  /**
   * Notify connection status change
   * @param {string} status - The connection status
   */
  notifyConnectionStatus(status) {
    if (this.connectionStatusCallback) {
      try {
        this.connectionStatusCallback(status);
      } catch (error) {
        console.error('[WebSocket] Error in connection status callback:', error);
      }
    }
  }

  /**
   * Get current connection status
   * @returns {object} Connection status info
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      tenantId: this.tenantId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create and export a singleton instance
const websocketService = new WebSocketService();
export default websocketService;
