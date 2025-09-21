import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export interface NotificationPreferences {
  push: {
    geofence: boolean;
    break: boolean;
    shift: boolean;
    corrections: boolean;
    businessTrips: boolean;
  };
  email: {
    geofence: boolean;
    break: boolean;
    shift: boolean;
    corrections: boolean;
    businessTrips: boolean;
  };
}

export type NotificationType = 'geofence' | 'break' | 'shift' | 'corrections' | 'businessTrips';
export type NotificationChannel = 'push' | 'email';

export class NotificationPreferencesService {
  /**
   * Get default notification preferences
   */
  static getDefaultPreferences(): NotificationPreferences {
    return {
      push: {
        geofence: true,
        break: true,
        shift: true,
        corrections: true,
        businessTrips: true,
      },
      email: {
        geofence: true,
        break: false,
        shift: false,
        corrections: true,
        businessTrips: true,
      },
    };
  }

  /**
   * Get user's notification preferences
   */
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationSettings: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Parse and validate notification settings
      const settings = user.notificationSettings as any;
      
      // Merge with defaults to ensure all properties exist
      const defaultPrefs = this.getDefaultPreferences();
      const preferences: NotificationPreferences = {
        push: {
          ...defaultPrefs.push,
          ...settings.push,
        },
        email: {
          ...defaultPrefs.email,
          ...settings.email,
        },
      };

      return preferences;
    } catch (_error) {
      logger.error('Failed to get user notification preferences:', _error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Get current preferences
      const currentPrefs = await this.getUserPreferences(userId);

      // Merge with new preferences
      const updatedPrefs: NotificationPreferences = {
        push: {
          ...currentPrefs.push,
          ...preferences.push,
        },
        email: {
          ...currentPrefs.email,
          ...preferences.email,
        },
      };

      // Update in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          notificationSettings: updatedPrefs as any,
          updatedAt: new Date(),
        },
      });

      logger.info(`Updated notification preferences for user ${userId}`);
      return updatedPrefs;
    } catch (_error) {
      logger.error('Failed to update user notification preferences:', _error);
      throw _error;
    }
  }

  /**
   * Check if user wants to receive specific notification
   */
  static async shouldReceiveNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      return preferences[channel][type];
    } catch (_error) {
      logger.error('Failed to check notification preference:', _error);
      // Default to true for important notifications
      return type === 'geofence' || type === 'corrections';
    }
  }

  /**
   * Get users who want to receive specific notification type
   */
  static async getUsersForNotification(
    userIds: string[],
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<string[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          isActive: true,
        },
        select: {
          id: true,
          notificationSettings: true,
        },
      });

      const filteredUsers = users.filter(user => {
        try {
          const settings = user.notificationSettings as any;
          const preferences: NotificationPreferences = {
            push: {
              ...this.getDefaultPreferences().push,
              ...settings.push,
            },
            email: {
              ...this.getDefaultPreferences().email,
              ...settings.email,
            },
          };

          return preferences[channel][type];
        } catch (_error) {
          // If settings are corrupted, default to important notifications only
          return type === 'geofence' || type === 'corrections';
        }
      });

      return filteredUsers.map(user => user.id);
    } catch (_error) {
      logger.error('Failed to get users for notification:', _error);
      return [];
    }
  }

  /**
   * Update specific notification preference
   */
  static async updateNotificationPreference(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<void> {
    try {
      const currentPrefs = await this.getUserPreferences(userId);
      
      // Update specific preference
      currentPrefs[channel][type] = enabled;

      await this.updateUserPreferences(userId, currentPrefs);
    } catch (_error) {
      logger.error('Failed to update specific notification preference:', _error);
      throw _error;
    }
  }

  /**
   * Enable all notifications for user
   */
  static async enableAllNotifications(userId: string): Promise<void> {
    try {
      const allEnabled: NotificationPreferences = {
        push: {
          geofence: true,
          break: true,
          shift: true,
          corrections: true,
          businessTrips: true,
        },
        email: {
          geofence: true,
          break: true,
          shift: true,
          corrections: true,
          businessTrips: true,
        },
      };

      await this.updateUserPreferences(userId, allEnabled);
    } catch (_error) {
      logger.error('Failed to enable all notifications:', _error);
      throw _error;
    }
  }

  /**
   * Disable all notifications for user (except critical ones)
   */
  static async disableAllNotifications(userId: string): Promise<void> {
    try {
      const criticalOnly: NotificationPreferences = {
        push: {
          geofence: true, // Keep geofence as critical
          break: false,
          shift: false,
          corrections: false,
          businessTrips: false,
        },
        email: {
          geofence: true, // Keep geofence as critical
          break: false,
          shift: false,
          corrections: false,
          businessTrips: false,
        },
      };

      await this.updateUserPreferences(userId, criticalOnly);
    } catch (_error) {
      logger.error('Failed to disable all notifications:', _error);
      throw _error;
    }
  }

  /**
   * Get notification preferences for multiple users
   */
  static async getBulkUserPreferences(
    userIds: string[]
  ): Promise<Record<string, NotificationPreferences>> {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          isActive: true,
        },
        select: {
          id: true,
          notificationSettings: true,
        },
      });

      const preferences: Record<string, NotificationPreferences> = {};
      const defaultPrefs = this.getDefaultPreferences();

      users.forEach(user => {
        try {
          const settings = user.notificationSettings as any;
          preferences[user.id] = {
            push: {
              ...defaultPrefs.push,
              ...settings.push,
            },
            email: {
              ...defaultPrefs.email,
              ...settings.email,
            },
          };
        } catch (_error) {
          // Use defaults if settings are corrupted
          preferences[user.id] = defaultPrefs;
        }
      });

      return preferences;
    } catch (_error) {
      logger.error('Failed to get bulk user preferences:', _error);
      return {};
    }
  }

  /**
   * Reset user preferences to defaults
   */
  static async resetToDefaults(userId: string): Promise<NotificationPreferences> {
    try {
      const defaultPrefs = this.getDefaultPreferences();
      return await this.updateUserPreferences(userId, defaultPrefs);
    } catch (_error) {
      logger.error('Failed to reset notification preferences to defaults:', _error);
      throw _error;
    }
  }

  /**
   * Get notification preferences summary for company
   */
  static async getCompanyPreferencesSummary(companyId: string): Promise<{
    totalUsers: number;
    pushEnabled: Record<NotificationType, number>;
    emailEnabled: Record<NotificationType, number>;
  }> {
    try {
      const users = await prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
        },
        select: {
          notificationSettings: true,
        },
      });

      const summary = {
        totalUsers: users.length,
        pushEnabled: {
          geofence: 0,
          break: 0,
          shift: 0,
          corrections: 0,
          businessTrips: 0,
        } as Record<NotificationType, number>,
        emailEnabled: {
          geofence: 0,
          break: 0,
          shift: 0,
          corrections: 0,
          businessTrips: 0,
        } as Record<NotificationType, number>,
      };

      const defaultPrefs = this.getDefaultPreferences();

      users.forEach(user => {
        try {
          const settings = user.notificationSettings as any;
          const preferences: NotificationPreferences = {
            push: {
              ...defaultPrefs.push,
              ...settings.push,
            },
            email: {
              ...defaultPrefs.email,
              ...settings.email,
            },
          };

          // Count enabled preferences
          Object.keys(preferences.push).forEach(type => {
            const notificationType = type as NotificationType;
            if (preferences.push[notificationType]) {
              summary.pushEnabled[notificationType]++;
            }
            if (preferences.email[notificationType]) {
              summary.emailEnabled[notificationType]++;
            }
          });
        } catch (_error) {
          // Count defaults if settings are corrupted
          Object.keys(defaultPrefs.push).forEach(type => {
            const notificationType = type as NotificationType;
            if (defaultPrefs.push[notificationType]) {
              summary.pushEnabled[notificationType]++;
            }
            if (defaultPrefs.email[notificationType]) {
              summary.emailEnabled[notificationType]++;
            }
          });
        }
      });

      return summary;
    } catch (_error) {
      logger.error('Failed to get company preferences summary:', _error);
      throw _error;
    }
  }

  /**
   * Validate notification preferences structure
   */
  static validatePreferences(preferences: unknown): preferences is NotificationPreferences {
    try {
      return (
        typeof preferences === 'object' &&
        preferences !== null &&
        'push' in preferences &&
        'email' in preferences &&
        typeof (preferences as any).push.geofence === 'boolean' &&
        typeof (preferences as any).push.break === 'boolean' &&
        typeof (preferences as any).push.shift === 'boolean' &&
        typeof (preferences as any).push.corrections === 'boolean' &&
        typeof (preferences as any).push.businessTrips === 'boolean' &&
        typeof (preferences as any).email.geofence === 'boolean' &&
        typeof (preferences as any).email.break === 'boolean' &&
        typeof (preferences as any).email.shift === 'boolean' &&
        typeof (preferences as any).email.corrections === 'boolean' &&
        typeof (preferences as any).email.businessTrips === 'boolean'
      );
    } catch (_error) {
      return false;
    }
  }
}
