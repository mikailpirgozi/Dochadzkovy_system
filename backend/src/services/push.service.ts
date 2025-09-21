import { Expo, type ExpoPushMessage, type ExpoPushTicket, type ExpoPushReceiptId } from 'expo-server-sdk';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '@prisma/client';

export interface PushNotificationData {
  type: 'geofence_violation' | 'break_reminder' | 'shift_end' | 'correction_approved' | 'business_trip_approved' | 'alert' | 'general';
  userId?: string;
  eventId?: string;
  alertId?: string;
  correctionId?: string;
  businessTripId?: string;
  message?: string;
  timestamp?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: boolean;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

export class PushService {
  private static readonly expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
    useFcmV1: true, // Use FCM v1 API for better reliability
  });

  /**
   * Send push notification to specific users
   */
  static async sendToUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<ExpoPushTicket[]> {
    try {
      // Get push tokens for users
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          pushToken: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          pushToken: true,
          firstName: true,
          lastName: true,
        },
      });

      if (users.length === 0) {
        logger.warn('No users with push tokens found for notification');
        return [];
      }

      const pushTokens = users
        .map(user => user.pushToken)
        .filter((token): token is string => token !== null);

      return await this.sendToTokens(pushTokens, payload);
    } catch (error) {
      logger.error('Failed to send push notification to users:', error);
      throw error;
    }
  }

  /**
   * Send push notification to specific push tokens
   */
  static async sendToTokens(
    pushTokens: string[],
    payload: NotificationPayload
  ): Promise<ExpoPushTicket[]> {
    try {
      // Filter valid Expo push tokens
      const validTokens = pushTokens.filter(token => 
        Expo.isExpoPushToken(token)
      );

      if (validTokens.length === 0) {
        logger.warn('No valid push tokens provided');
        return [];
      }

      // Create messages
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: payload.sound !== false ? 'default' : undefined,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        badge: payload.badge,
        priority: payload.priority ?? 'default',
        channelId: payload.channelId,
      }));

      // Send in chunks to handle Expo's limits
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          
          // Log successful sends
          logger.info(`Sent ${chunk.length} push notifications successfully`);
        } catch (error) {
          logger.error('Error sending push notification chunk:', error);
        }
      }

      // Handle tickets and check for errors
      await this.handlePushTickets(tickets, validTokens);

      return tickets;
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification to all users in a company
   */
  static async sendToCompany(
    companyId: string,
    payload: NotificationPayload,
    roles?: string[]
  ): Promise<ExpoPushTicket[]> {
    try {
      const whereClause: {
        companyId: string;
        pushToken: { not: null };
        isActive: boolean;
        role?: { in: UserRole[] };
      } = {
        companyId,
        pushToken: { not: null },
        isActive: true,
      };

      if (roles && roles.length > 0) {
        whereClause.role = { in: roles as UserRole[] };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, pushToken: true },
      });

      const userIds = users.map(user => user.id);
      return await this.sendToUsers(userIds, payload);
    } catch (error) {
      logger.error('Failed to send push notification to company:', error);
      throw error;
    }
  }

  /**
   * Send geofence violation notification
   */
  static async sendGeofenceViolation(
    userId: string,
    userName: string,
    companyId: string
  ): Promise<void> {
    try {
      // Notify the user
      await this.sendToUsers([userId], {
        title: 'Upozornenie na polohu',
        body: 'Si mimo pracoviska už viac ako 5 minút. Nezabudni sa odpipnúť!',
        data: {
          type: 'geofence_violation',
          userId,
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'high',
        channelId: 'geofence_alerts',
      });

      // Notify managers and admins
      await this.sendToCompany(companyId, {
        title: 'Geofence Alert',
        body: `${userName} opustil(a) pracovisko bez odpipnutia`,
        data: {
          type: 'alert',
          userId,
          message: 'geofence_violation',
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'high',
        channelId: 'admin_alerts',
      }, ['COMPANY_ADMIN', 'MANAGER']);

    } catch (error) {
      logger.error('Failed to send geofence violation notification:', error);
    }
  }

  /**
   * Send break reminder notification
   */
  static async sendBreakReminder(
    userId: string,
    breakDurationMinutes: number
  ): Promise<void> {
    try {
      await this.sendToUsers([userId], {
        title: 'Upozornenie na obed',
        body: `Obed trvá už ${String(breakDurationMinutes)} minút. Nezabudni sa vrátiť!`,
        data: {
          type: 'break_reminder',
          userId,
          message: `break_duration_${String(breakDurationMinutes)}`,
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'normal',
        channelId: 'break_reminders',
      });
    } catch (error) {
      logger.error('Failed to send break reminder notification:', error);
    }
  }

  /**
   * Send shift end reminder
   */
  static async sendShiftEndReminder(userId: string): Promise<void> {
    try {
      await this.sendToUsers([userId], {
        title: 'Koniec pracovnej zmeny',
        body: 'Pracovný čas skončil. Chceš sa odpipnúť?',
        data: {
          type: 'shift_end',
          userId,
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'normal',
        channelId: 'shift_reminders',
      });
    } catch (error) {
      logger.error('Failed to send shift end reminder:', error);
    }
  }

  /**
   * Send correction status notification
   */
  static async sendCorrectionStatus(
    userId: string,
    correctionId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<void> {
    try {
      const isApproved = status === 'APPROVED';
      
      await this.sendToUsers([userId], {
        title: `Korekcia ${isApproved ? 'schválená' : 'zamietnutá'}`,
        body: isApproved 
          ? 'Tvoja požiadavka na korekciu bola schválená'
          : `Tvoja požiadavka na korekciu bola zamietnutá${reason ? `: ${reason}` : ''}`,
        data: {
          type: 'correction_approved',
          userId,
          correctionId,
          message: status.toLowerCase(),
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'normal',
        channelId: 'corrections',
      });
    } catch (error) {
      logger.error('Failed to send correction status notification:', error);
    }
  }

  /**
   * Send business trip status notification
   */
  static async sendBusinessTripStatus(
    userId: string,
    businessTripId: string,
    status: 'APPROVED' | 'REJECTED',
    destination: string,
    reason?: string
  ): Promise<void> {
    try {
      const isApproved = status === 'APPROVED';
      
      await this.sendToUsers([userId], {
        title: `Služobná cesta ${isApproved ? 'schválená' : 'zamietnutá'}`,
        body: isApproved
          ? `Služobná cesta do ${destination} bola schválená`
          : `Služobná cesta do ${destination} bola zamietnutá${reason ? `: ${reason}` : ''}`,
        data: {
          type: 'business_trip_approved',
          userId,
          businessTripId,
          message: status.toLowerCase(),
          timestamp: new Date().toISOString(),
        },
        sound: true,
        priority: 'normal',
        channelId: 'business_trips',
      });
    } catch (error) {
      logger.error('Failed to send business trip status notification:', error);
    }
  }

  /**
   * Send custom notification
   */
  static async sendCustomNotification(
    userIds: string[],
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<void> {
    try {
      await this.sendToUsers(userIds, {
        title,
        body,
        data: {
          type: 'general',
          timestamp: new Date().toISOString(),
          ...data,
        },
        sound: true,
        priority: 'normal',
        channelId: 'general',
      });
    } catch (error) {
      logger.error('Failed to send custom notification:', error);
    }
  }

  /**
   * Handle push tickets and check for errors
   */
  private static async handlePushTickets(
    tickets: ExpoPushTicket[],
    pushTokens: string[]
  ): Promise<void> {
    const receiptIds: ExpoPushReceiptId[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = pushTokens[i];

      if (ticket && ticket.status === 'error') {
        const errorTicket = ticket as { message?: string; details?: { error?: string } };
        logger.error(`Push notification error for token ${token}:`, errorTicket.message);
        
        // Handle invalid tokens
        if (errorTicket.details?.error === 'DeviceNotRegistered' && token) {
          await this.removeInvalidToken(token);
        }
      } else if (ticket && ticket.status === 'ok') {
        const successTicket = ticket as { id: string };
        receiptIds.push(successTicket.id);
      }
    }

    // Check receipts for detailed error handling
    if (receiptIds.length > 0) {
      setTimeout(() => {
        this.checkPushReceipts(receiptIds).catch(console.error);
      }, 15 * 60 * 1000); // Check receipts after 15 minutes
    }
  }

  /**
   * Check push receipts for delivery status
   */
  private static async checkPushReceipts(receiptIds: ExpoPushReceiptId[]): Promise<void> {
    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];

          if (receipt && receipt.status === 'error') {
            const errorReceipt = receipt as { message?: string; details?: { error?: string } };
            logger.error(`Push notification delivery error:`, errorReceipt.message);
            
            // Handle specific errors
            if (errorReceipt.details?.error === 'DeviceNotRegistered') {
              // Token is no longer valid, we should remove it
              logger.info(`Removing invalid push token due to receipt error`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check push receipts:', error);
    }
  }

  /**
   * Remove invalid push token from database
   */
  private static async removeInvalidToken(token: string): Promise<void> {
    try {
      await prisma.user.updateMany({
        where: { pushToken: token },
        data: { pushToken: null },
      });

      logger.info(`Removed invalid push token: ${token}`);
    } catch (error) {
      logger.error('Failed to remove invalid push token:', error);
    }
  }

  /**
   * Update user's push token
   */
  static async updateUserPushToken(
    userId: string,
    token: string,
    platform: string
  ): Promise<void> {
    try {
      if (!Expo.isExpoPushToken(token)) {
        throw new Error('Invalid Expo push token format');
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          pushToken: token,
          pushTokenPlatform: platform,
          pushTokenUpdatedAt: new Date(),
        },
      });

      logger.info(`Updated push token for user ${userId}`);
    } catch (error) {
      logger.error('Failed to update user push token:', error);
      throw error;
    }
  }

  /**
   * Remove user's push token
   */
  static async removeUserPushToken(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { 
          pushToken: null,
          pushTokenPlatform: null,
          pushTokenUpdatedAt: new Date(),
        },
      });

      logger.info(`Removed push token for user ${userId}`);
    } catch (error) {
      logger.error('Failed to remove user push token:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(companyId?: string): Promise<{
    totalUsers: number;
    usersWithTokens: number;
    recentNotifications: number;
  }> {
    try {
      const whereClause = companyId ? { companyId } : {};

      const [totalUsers, usersWithTokens] = await Promise.all([
        prisma.user.count({
          where: { ...whereClause, isActive: true },
        }),
        prisma.user.count({
          where: { 
            ...whereClause, 
            isActive: true,
            pushToken: { not: null },
          },
        }),
      ]);

      // This would require a notifications log table to track sent notifications
      const recentNotifications = 0; // Placeholder

      return {
        totalUsers,
        usersWithTokens,
        recentNotifications,
      };
    } catch (error) {
      logger.error('Failed to get notification stats:', error);
      throw error;
    }
  }

  /**
   * Test notification (development only)
   */
  static async sendTestNotification(userId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Test notifications only available in development');
    }

    await this.sendToUsers([userId], {
      title: 'Test Notification',
      body: 'This is a test notification from Dochádzka Pro backend',
      data: {
        type: 'general',
        message: 'test',
        timestamp: new Date().toISOString(),
      },
      sound: true,
      priority: 'normal',
    });
  }
}
