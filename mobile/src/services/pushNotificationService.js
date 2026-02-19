// Push Notification Service
// Handles local and remote notifications for sync status, alerts, etc.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification channels (Android)
const CHANNELS = {
  SYNC: 'sync-notifications',
  ALERTS: 'alert-notifications',
  UPDATES: 'update-notifications',
};

// Notification types
const NOTIFICATION_TYPES = {
  SYNC_COMPLETE: 'sync_complete',
  SYNC_FAILED: 'sync_failed',
  SYNC_PENDING: 'sync_pending',
  OFFLINE_QUEUE: 'offline_queue',
  NEW_ASSET: 'new_asset',
  ASSET_UPDATE: 'asset_update',
  LOW_BATTERY: 'low_battery',
  PRINTER_STATUS: 'printer_status',
};

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  // Initialize notification service
  async initialize() {
    if (this.isInitialized) return;

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permissions
    const { status } = await this.requestPermissions();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Create notification channels (Android)
    if (Platform.OS === 'android') {
      await this.createChannels();
    }

    // Get push token
    this.expoPushToken = await this.registerForPushNotifications();

    // Set up listeners
    this.setupListeners();

    this.isInitialized = true;
    console.log('Push notifications initialized');
    return true;
  }

  // Request notification permissions
  async requestPermissions() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return { status: finalStatus };
    }
    
    return { status: 'granted' }; // Simulator/emulator
  }

  // Create Android notification channels
  async createChannels() {
    await Notifications.setNotificationChannelAsync(CHANNELS.SYNC, {
      name: 'Synchronisation',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(CHANNELS.ALERTS, {
      name: 'Wichtige Hinweise',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(CHANNELS.UPDATES, {
      name: 'Updates',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
    });
  }

  // Register for push notifications and get token
  async registerForPushNotifications() {
    let token;
    
    if (Device.isDevice) {
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);
        
        // Store token
        await AsyncStorage.setItem('pushToken', token);
      } catch (error) {
        console.error('Failed to get push token:', error);
      }
    }
    
    return token;
  }

  // Set up notification listeners
  setupListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotification(notification);
      }
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  // Handle received notification
  handleNotification(notification) {
    const { data } = notification.request.content;
    
    // Emit event for app to handle
    if (this.onNotificationCallback) {
      this.onNotificationCallback(notification);
    }
  }

  // Handle notification tap
  handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    // Navigate based on notification type
    if (this.onNotificationTapCallback) {
      this.onNotificationTapCallback(data);
    }
  }

  // Set callback for received notifications
  onNotification(callback) {
    this.onNotificationCallback = callback;
  }

  // Set callback for notification taps
  onNotificationTap(callback) {
    this.onNotificationTapCallback = callback;
  }

  // Schedule a local notification
  async scheduleNotification(options) {
    const {
      title,
      body,
      data = {},
      trigger = null, // null = immediate
      channelId = CHANNELS.ALERTS,
    } = options;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger,
    });

    return notificationId;
  }

  // Show sync complete notification
  async notifySyncComplete(itemCount) {
    return this.scheduleNotification({
      title: 'Synchronisation abgeschlossen',
      body: `${itemCount} Element${itemCount !== 1 ? 'e' : ''} synchronisiert`,
      data: { type: NOTIFICATION_TYPES.SYNC_COMPLETE, itemCount },
      channelId: CHANNELS.SYNC,
    });
  }

  // Show sync failed notification
  async notifySyncFailed(error) {
    return this.scheduleNotification({
      title: 'Synchronisation fehlgeschlagen',
      body: error || 'Bitte versuchen Sie es später erneut',
      data: { type: NOTIFICATION_TYPES.SYNC_FAILED, error },
      channelId: CHANNELS.ALERTS,
    });
  }

  // Show offline queue notification
  async notifyOfflineQueue(pendingCount) {
    return this.scheduleNotification({
      title: 'Ausstehende Änderungen',
      body: `${pendingCount} Änderung${pendingCount !== 1 ? 'en' : ''} warten auf Synchronisation`,
      data: { type: NOTIFICATION_TYPES.OFFLINE_QUEUE, pendingCount },
      channelId: CHANNELS.SYNC,
    });
  }

  // Show new asset notification
  async notifyNewAsset(asset) {
    return this.scheduleNotification({
      title: 'Neues Asset erfasst',
      body: `${asset.warehouse_asset_id || asset.asset_id} - ${asset.type_label || 'Asset'}`,
      data: { type: NOTIFICATION_TYPES.NEW_ASSET, assetId: asset.asset_id },
      channelId: CHANNELS.UPDATES,
    });
  }

  // Show printer status notification
  async notifyPrinterStatus(status, printerName) {
    const messages = {
      connected: `Drucker ${printerName} verbunden`,
      disconnected: `Drucker ${printerName} getrennt`,
      error: `Druckerfehler: ${printerName}`,
      paper_low: `Papier niedrig: ${printerName}`,
    };

    return this.scheduleNotification({
      title: 'Drucker-Status',
      body: messages[status] || `Drucker: ${status}`,
      data: { type: NOTIFICATION_TYPES.PRINTER_STATUS, status, printerName },
      channelId: status === 'error' ? CHANNELS.ALERTS : CHANNELS.UPDATES,
    });
  }

  // Cancel a scheduled notification
  async cancelNotification(notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear badge
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
  }

  // Clean up listeners
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    this.isInitialized = false;
  }
}

// Singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;
export { PushNotificationService, NOTIFICATION_TYPES, CHANNELS };
