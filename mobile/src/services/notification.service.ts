import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiService } from './api';
import type { PermissionResponse } from 'expo-notifications';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'geofence_violation' | 'break_reminder' | 'shift_end' | 'correction_approved' | 'business_trip_approved' | 'general';
  userId?: string;
  eventId?: string;
  message?: string;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  data?: NotificationData;
  trigger: {
    seconds: number;
  };
}

export class NotificationService {
  private static pushToken: string | null = null;
  private static notificationListener: { remove: () => void } | null = null;
  private static responseListener: { remove: () => void } | null = null;

  /**
   * Initialize notification service - call this on app startup
   */
  static async initialize(): Promise<void> {
    try {
      await this.registerForPushNotifications();
      this.setupNotificationListeners();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  /**
   * Register for push notifications and get token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Skip push notifications in development
      if (__DEV__) {
        console.warn('Push notifications disabled in development');
        return null;
      }

      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const existingPermissions: PermissionResponse = await Notifications.getPermissionsAsync();
      let finalStatus = existingPermissions.status;

      // Request permissions if not granted
      if (existingPermissions.status !== 'granted') {
        const newPermissions: PermissionResponse = await Notifications.requestPermissionsAsync();
        finalStatus = newPermissions.status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'd0564238-9aa3-4e70-b4ce-5656ec4a811e',
      });

      this.pushToken = tokenData.data;

      // Send token to backend
      await this.sendTokenToServer(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.warn('Failed to register for push notifications:', error);
      // Gracefully handle push notification registration failure
      // App should continue to work without push notifications
      return null;
    }
  }

  /**
   * Send push token to backend
   */
  private static async sendTokenToServer(token: string): Promise<void> {
    try {
      await apiService.client.post('/users/push-token', { 
        token,
        platform: Platform.OS 
      });
    } catch (error) {
      console.error('Failed to send push token to server:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private static setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.warn('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.warn('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle notification received while app is active
   */
  private static handleNotificationReceived(notification: Notifications.Notification): void {
    const { data } = notification.request.content;
    
    // Custom handling based on notification type
    if (data?.type === 'geofence_violation') {
      // Could show in-app alert or update UI
      console.warn('Geofence violation notification received');
    }
  }

  /**
   * Handle notification tap/response
   */
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { data } = response.notification.request.content;
    
    // Navigate to specific screen based on notification type
    if (data?.type === 'correction_approved') {
      // Navigate to corrections screen
      console.warn('Navigate to corrections screen');
    } else if (data?.type === 'business_trip_approved') {
      // Navigate to business trips screen
      console.warn('Navigate to business trips screen');
    }
  }

  /**
   * Schedule local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    delaySeconds: number = 0,
    data?: NotificationData
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data as unknown as Record<string, unknown>,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
        },
        trigger: delaySeconds > 0 ? { 
          seconds: delaySeconds 
        } as Notifications.NotificationTriggerInput : null,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  static async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Schedule break reminder notification
   */
  static async scheduleBreakReminder(breakDurationMinutes: number = 60): Promise<string> {
    const reminderTime = (breakDurationMinutes + 5) * 60; // 5 minutes after break limit

    return await this.scheduleLocalNotification(
      'Upozornenie na obed',
      `Obed trvá už ${breakDurationMinutes + 5} minút. Nezabudni sa vrátiť!`,
      reminderTime,
      { type: 'break_reminder' }
    );
  }

  /**
   * Schedule shift end reminder
   */
  static async scheduleShiftEndReminder(shiftEndTime: Date): Promise<string> {
    const now = new Date();
    const delaySeconds = Math.max(0, Math.floor((shiftEndTime.getTime() - now.getTime()) / 1000));

    return await this.scheduleLocalNotification(
      'Koniec pracovnej zmeny',
      'Pracovný čas skončil. Chceš sa odpipnúť?',
      delaySeconds,
      { type: 'shift_end' }
    );
  }

  /**
   * Schedule geofence violation reminder
   */
  static async scheduleGeofenceViolationReminder(delayMinutes: number = 5): Promise<string> {
    return await this.scheduleLocalNotification(
      'Upozornenie na polohu',
      `Si mimo pracoviska už ${delayMinutes} minút. Nezabudni sa odpipnúť!`,
      delayMinutes * 60,
      { type: 'geofence_violation' }
    );
  }

  /**
   * Show immediate notification
   */
  static async showImmediateNotification(
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<string> {
    return await this.scheduleLocalNotification(title, body, 0, data);
  }

  /**
   * Get notification permissions status
   */
  static async getPermissionStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowDisplayInCarPlay: true,
      },
    });
  }

  /**
   * Set notification badge count (iOS)
   */
  static async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Cleanup notification service
   */
  static cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Get current push token
   */
  static getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Test notification (development only)
   */
  static async testNotification(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      await this.showImmediateNotification(
        'Test Notification',
        'This is a test notification from Dochádzka Pro',
        { type: 'general' }
      );
    }
  }
}
