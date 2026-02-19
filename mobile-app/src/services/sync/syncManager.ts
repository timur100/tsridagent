/**
 * TSRID Mobile App - Sync Manager
 * 
 * Verwaltet die Synchronisation zwischen App und Server:
 * - Echtzeit-Sync wenn online
 * - Offline-Queue wenn keine Verbindung
 * - Automatischer Sync bei Reconnect
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

// Sync-Status
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

// Sync-Item für Queue
export interface SyncItem {
  id: string;
  type: 'asset_create' | 'asset_update' | 'asset_assign' | 'id_scan';
  data: any;
  timestamp: number;
  retries: number;
  lastError?: string;
}

// Sync-Event Typ
export interface SyncEvent {
  type: 'sync_start' | 'sync_complete' | 'sync_error' | 'item_synced' | 'offline' | 'online';
  data?: any;
}

type SyncEventListener = (event: SyncEvent) => void;

class SyncManager {
  private isOnline: boolean = true;
  private syncStatus: SyncStatus = 'idle';
  private queue: SyncItem[] = [];
  private listeners: SyncEventListener[] = [];
  private syncInProgress: boolean = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  // Storage Keys
  private readonly QUEUE_KEY = 'sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync';

  /**
   * Sync Manager initialisieren
   */
  async initialize(): Promise<void> {
    // Queue aus Storage laden
    await this.loadQueue();

    // Netzwerk-Status überwachen
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleConnectivityChange.bind(this));

    // Initialen Status prüfen
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;

    console.log(`[SyncManager] Initialized. Online: ${this.isOnline}, Queue: ${this.queue.length} items`);

    // Wenn online, Queue abarbeiten
    if (this.isOnline && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Netzwerk-Änderung verarbeiten
   */
  private handleConnectivityChange(state: NetInfoState) {
    const wasOffline = !this.isOnline;
    this.isOnline = state.isConnected ?? false;

    if (wasOffline && this.isOnline) {
      console.log('[SyncManager] Back online');
      this.emit({ type: 'online' });
      this.processQueue();
    } else if (!this.isOnline) {
      console.log('[SyncManager] Went offline');
      this.syncStatus = 'offline';
      this.emit({ type: 'offline' });
    }
  }

  /**
   * Queue aus Storage laden
   */
  private async loadQueue(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('[SyncManager] Error loading queue:', error);
    }
  }

  /**
   * Queue in Storage speichern
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[SyncManager] Error saving queue:', error);
    }
  }

  /**
   * Item zur Queue hinzufügen
   */
  async addToQueue(type: SyncItem['type'], data: any): Promise<string> {
    const item: SyncItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(item);
    await this.saveQueue();

    console.log(`[SyncManager] Added to queue: ${item.id} (${type})`);

    // Wenn online, sofort verarbeiten
    if (this.isOnline && !this.syncInProgress) {
      this.processQueue();
    }

    return item.id;
  }

  /**
   * Daten synchronisieren (mit Offline-Fallback)
   */
  async sync<T>(
    type: SyncItem['type'],
    action: () => Promise<T>
  ): Promise<{ success: boolean; data?: T; queued?: boolean; queueId?: string }> {
    if (this.isOnline) {
      try {
        const data = await action();
        return { success: true, data };
      } catch (error) {
        console.error('[SyncManager] Sync failed, queueing:', error);
        // Bei Fehler zur Queue hinzufügen
        const queueId = await this.addToQueue(type, { action: action.toString() });
        return { success: false, queued: true, queueId };
      }
    } else {
      // Offline - zur Queue hinzufügen
      const queueId = await this.addToQueue(type, { action: action.toString() });
      return { success: false, queued: true, queueId };
    }
  }

  /**
   * Queue abarbeiten
   */
  async processQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.syncStatus = 'syncing';
    this.emit({ type: 'sync_start' });

    console.log(`[SyncManager] Processing ${this.queue.length} items`);

    const failedItems: SyncItem[] = [];

    for (const item of this.queue) {
      try {
        await this.processItem(item);
        console.log(`[SyncManager] Item ${item.id} synced successfully`);
        this.emit({ type: 'item_synced', data: { id: item.id, type: item.type } });
      } catch (error: any) {
        item.retries++;
        item.lastError = error.message;

        if (item.retries < 3) {
          failedItems.push(item);
          console.warn(`[SyncManager] Item ${item.id} failed, will retry (${item.retries}/3)`);
        } else {
          console.error(`[SyncManager] Item ${item.id} failed permanently after 3 retries`);
        }
      }
    }

    // Nur fehlgeschlagene Items behalten
    this.queue = failedItems;
    await this.saveQueue();

    // Letzten Sync speichern
    await AsyncStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());

    this.syncInProgress = false;
    this.syncStatus = failedItems.length > 0 ? 'error' : 'idle';
    this.emit({ 
      type: 'sync_complete', 
      data: { 
        synced: this.queue.length - failedItems.length,
        failed: failedItems.length 
      } 
    });
  }

  /**
   * Einzelnes Item verarbeiten
   */
  private async processItem(item: SyncItem): Promise<void> {
    const { API_ENDPOINTS } = await import('../../config/api');

    switch (item.type) {
      case 'asset_create':
        await apiClient.post(
          `${API_ENDPOINTS.assets.intake}?received_by=${encodeURIComponent(item.data.receivedBy || 'Mobile App')}`,
          item.data.asset,
          undefined,
          false // Nicht erneut queuen
        );
        break;

      case 'asset_update':
        await apiClient.post(
          API_ENDPOINTS.assets.bulkEdit,
          item.data,
          undefined,
          false
        );
        break;

      case 'asset_assign':
        await apiClient.post(
          `${API_ENDPOINTS.assets.assignLocation(item.data.manufacturerSn)}?location_id=${encodeURIComponent(item.data.locationId)}&technician=${encodeURIComponent(item.data.technician || '')}`,
          undefined,
          undefined,
          false
        );
        break;

      case 'id_scan':
        await apiClient.post(
          API_ENDPOINTS.idScans.create,
          item.data,
          undefined,
          false
        );
        break;

      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  /**
   * Event-Listener hinzufügen
   */
  addListener(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Event emittieren
   */
  private emit(event: SyncEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SyncManager] Listener error:', error);
      }
    });
  }

  /**
   * Status abrufen
   */
  getStatus(): {
    isOnline: boolean;
    syncStatus: SyncStatus;
    queueLength: number;
    lastSync: string | null;
  } {
    return {
      isOnline: this.isOnline,
      syncStatus: this.syncStatus,
      queueLength: this.queue.length,
      lastSync: null // Wird async geladen
    };
  }

  /**
   * Letzten Sync-Zeitpunkt abrufen
   */
  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(this.LAST_SYNC_KEY);
  }

  /**
   * Queue manuell leeren (für Debugging)
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    console.log('[SyncManager] Queue cleared');
  }

  /**
   * Manuellen Sync auslösen
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Keine Internetverbindung');
    }
    await this.processQueue();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    this.listeners = [];
  }
}

// Singleton-Export
export const syncManager = new SyncManager();
export default syncManager;
