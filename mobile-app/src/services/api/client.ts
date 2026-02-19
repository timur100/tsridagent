/**
 * TSRID Mobile App - API Client
 * 
 * Axios-basierter API-Client mit:
 * - Automatischer Token-Verwaltung
 * - Retry-Logik
 * - Offline-Queue
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL, REQUEST_TIMEOUT, RETRY_CONFIG } from '../../config/api';

// Offline Queue für Requests die später gesendet werden sollen
interface QueuedRequest {
  id: string;
  config: AxiosRequestConfig;
  timestamp: number;
  retries: number;
}

class ApiClient {
  private client: AxiosInstance;
  private offlineQueue: QueuedRequest[] = [];
  private isOnline: boolean = true;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupNetworkListener();
    this.loadOfflineQueue();
  }

  /**
   * Request/Response Interceptors
   */
  private setupInterceptors() {
    // Request Interceptor - Token hinzufügen
    this.client.interceptors.request.use(
      async (config) => {
        // Token aus Storage laden falls nicht gesetzt
        if (!this.authToken) {
          this.authToken = await AsyncStorage.getItem('auth_token');
        }
        
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor - Fehlerbehandlung
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // 401 - Token abgelaufen
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          // Token löschen und Benutzer ausloggen
          await this.clearAuth();
          // Event für App-weites Logout werfen
          // EventEmitter.emit('AUTH_EXPIRED');
        }
        
        // Retry bei bestimmten Fehlercodes
        if (
          originalRequest &&
          !originalRequest._retry &&
          error.response?.status &&
          RETRY_CONFIG.retryOn.includes(error.response.status)
        ) {
          originalRequest._retry = true;
          await this.delay(RETRY_CONFIG.retryDelay);
          return this.client(originalRequest);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Netzwerk-Status überwachen
   */
  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Wenn wieder online, Queue abarbeiten
      if (wasOffline && this.isOnline) {
        console.log('[API] Back online - processing queue');
        this.processOfflineQueue();
      }
    });
  }

  /**
   * Offline-Queue laden
   */
  private async loadOfflineQueue() {
    try {
      const queueJson = await AsyncStorage.getItem('offline_queue');
      if (queueJson) {
        this.offlineQueue = JSON.parse(queueJson);
        console.log(`[API] Loaded ${this.offlineQueue.length} queued requests`);
      }
    } catch (error) {
      console.error('[API] Error loading offline queue:', error);
    }
  }

  /**
   * Offline-Queue speichern
   */
  private async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('[API] Error saving offline queue:', error);
    }
  }

  /**
   * Request zur Offline-Queue hinzufügen
   */
  private async addToQueue(config: AxiosRequestConfig): Promise<string> {
    const queuedRequest: QueuedRequest = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      timestamp: Date.now(),
      retries: 0,
    };
    
    this.offlineQueue.push(queuedRequest);
    await this.saveOfflineQueue();
    
    console.log(`[API] Request queued: ${queuedRequest.id}`);
    return queuedRequest.id;
  }

  /**
   * Offline-Queue abarbeiten
   */
  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`[API] Processing ${this.offlineQueue.length} queued requests`);
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const request of queue) {
      try {
        await this.client(request.config);
        console.log(`[API] Queued request ${request.id} succeeded`);
      } catch (error) {
        if (request.retries < RETRY_CONFIG.maxRetries) {
          request.retries++;
          this.offlineQueue.push(request);
          console.log(`[API] Queued request ${request.id} failed, will retry`);
        } else {
          console.error(`[API] Queued request ${request.id} failed permanently`);
        }
      }
    }
    
    await this.saveOfflineQueue();
  }

  /**
   * Auth Token setzen
   */
  async setAuth(token: string) {
    this.authToken = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  /**
   * Auth löschen
   */
  async clearAuth() {
    this.authToken = null;
    await AsyncStorage.removeItem('auth_token');
  }

  /**
   * Hilfsfunktion: Verzögerung
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET Request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST Request (mit Offline-Queue Unterstützung)
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig, queueOffline = true): Promise<T | { queued: true; queueId: string }> {
    if (!this.isOnline && queueOffline) {
      const queueId = await this.addToQueue({
        ...config,
        method: 'POST',
        url,
        data,
      });
      return { queued: true, queueId };
    }
    
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT Request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH Request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE Request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * Online-Status abrufen
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Queue-Länge abrufen
   */
  getQueueLength(): number {
    return this.offlineQueue.length;
  }

  /**
   * Queue manuell verarbeiten
   */
  async flushQueue(): Promise<void> {
    if (this.isOnline) {
      await this.processOfflineQueue();
    }
  }
}

// Singleton-Export
export const apiClient = new ApiClient();
export default apiClient;
