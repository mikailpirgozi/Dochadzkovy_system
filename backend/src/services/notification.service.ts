import { Expo, type ExpoPushMessage, type ExpoPushTicket, type ExpoPushReceiptId } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: boolean;
  priority?: 'default' | 'normal' | 'high' | 'max';
}

export class NotificationService {
  private static readonly expo = new Expo();

  private constructor() {
    // Static class
  }

  /**
   * Send push notification to a single user
   */
  static async sendToUser(userId: string, notification: PushNotificationData): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true, firstName: true }
      });

      if (!user?.pushToken) {
        console.log(`No push token found for user ${userId}`);
        return false;
      }

      return await this.sendToToken(user.pushToken, notification);
    } catch (error) {
      console.error('Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send push notification to multiple tokens
   */
  static async sendToMultiple(
    pushTokens: string[], 
    notification: PushNotificationData
  ): Promise<ExpoPushTicket[]> {
    try {
      const messages = this.createMessages(pushTokens, notification);
      
      if (messages.length === 0) {
        console.log('No valid push tokens to send to');
        return [];
      }

      return await this.sendMessages(messages);
    } catch (error) {
      console.error('Error sending notifications to multiple users:', error);
      return [];
    }
  }

  /**
   * Send push notification to a single token
   */
  static async sendToToken(pushToken: string, notification: PushNotificationData): Promise<boolean> {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error('Invalid push token:', pushToken);
        return false;
      }

      const message: ExpoPushMessage = {
        to: pushToken,
        sound: notification.sound !== false ? 'default' : undefined,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        priority: this.mapPriority(notification.priority ?? 'default'),
      };

      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket && ticket.status === 'error') {
        console.error('Push notification error:', (ticket as ExpoPushTicket & { message?: string }).message);
        
        // Handle invalid tokens
        if ((ticket as ExpoPushTicket & { details?: { error?: string } }).details?.error === 'DeviceNotRegistered') {
          await this.removeInvalidToken(pushToken);
        }
        
        return false;
      }

      // Store receipt ID for later checking
      if (ticket?.status === 'ok') {
        await this.storeReceipt((ticket as ExpoPushTicket & { id: string }).id, pushToken);
      }

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Send push notifications to all users in a company
   */
  static async sendToCompany(
    companyId: string, 
    notification: PushNotificationData,
    excludeUserId?: string
  ): Promise<number> {
    try {
      const users = await prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          pushToken: { not: null },
          ...(excludeUserId && { id: { not: excludeUserId } })
        },
        select: { pushToken: true }
      });

      const pushTokens = users
        .map(u => u.pushToken)
        .filter(Boolean) as string[];

      if (pushTokens.length === 0) {
        console.log(`No push tokens found for company ${companyId}`);
        return 0;
      }

      const tickets = await this.sendToMultiple(pushTokens, notification);
      const successfulTickets = tickets.filter(ticket => ticket.status === 'ok');

      console.log(`Sent ${successfulTickets.length}/${pushTokens.length} notifications to company ${companyId}`);
      return successfulTickets.length;
    } catch (error) {
      console.error('Error sending notifications to company:', error);
      return 0;
    }
  }

  /**
   * Send push notifications to users with specific roles
   */
  static async sendToRoles(
    companyId: string,
    roles: string[],
    notification: PushNotificationData
  ): Promise<number> {
    try {
      const users = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: roles as any },
          isActive: true,
          pushToken: { not: null }
        },
        select: { pushToken: true }
      });

      const pushTokens = users
        .map(u => u.pushToken)
        .filter(Boolean) as string[];

      if (pushTokens.length === 0) {
        console.log(`No push tokens found for roles ${roles.join(', ')} in company ${companyId}`);
        return 0;
      }

      const tickets = await this.sendToMultiple(pushTokens, notification);
      const successfulTickets = tickets.filter(ticket => ticket.status === 'ok');

      console.log(`Sent ${successfulTickets.length}/${pushTokens.length} notifications to roles ${roles.join(', ')}`);
      return successfulTickets.length;
    } catch (error) {
      console.error('Error sending notifications to roles:', error);
      return 0;
    }
  }

  /**
   * Register user's push token
   */
  static async registerPushToken(userId: string, pushToken: string): Promise<boolean> {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Invalid push token format: ${pushToken}`);
        return false;
      }

      await prisma.user.update({
        where: { id: userId },
        data: { pushToken }
      });

      console.log(`Push token registered for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }

  /**
   * Remove user's push token
   */
  static async removePushToken(userId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { pushToken: null }
      });

      console.log(`Push token removed for user ${userId}`);
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Send scheduled reminder notifications
   */
  static async sendScheduledReminders(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Send clock-in reminders at 8:00 AM
      if (currentHour === 8 && currentMinute === 0) {
        await this.sendClockInReminders();
      }

      // Send clock-out reminders at 5:00 PM
      if (currentHour === 17 && currentMinute === 0) {
        await this.sendClockOutReminders();
      }

      // Send break reminders after 4 hours of work
      await this.sendBreakReminders();

    } catch (error) {
      console.error('Error sending scheduled reminders:', error);
    }
  }

  /**
   * Send clock-in reminders
   */
  private static async sendClockInReminders(): Promise<void> {
    try {
      // Find users who haven't clocked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usersWithoutClockIn = await prisma.user.findMany({
        where: {
          isActive: true,
          pushToken: { not: null },
          attendanceEvents: {
            none: {
              type: 'CLOCK_IN',
              timestamp: {
                gte: today
              }
            }
          }
        },
        select: { 
          id: true, 
          pushToken: true, 
          firstName: true,
          company: {
            select: { name: true }
          }
        }
      });

      for (const user of usersWithoutClockIn) {
        if (user.pushToken) {
          await this.sendToToken(user.pushToken, {
            title: 'Pripomienka pipnutia',
            body: `Dobrý deň ${user.firstName}! Nezabudnite sa pripnúť do práce.`,
            data: { type: 'clock_in_reminder' },
            priority: 'normal'
          });
        }
      }

      console.log(`Sent clock-in reminders to ${usersWithoutClockIn.length} users`);
    } catch (error) {
      console.error('Error sending clock-in reminders:', error);
    }
  }

  /**
   * Send clock-out reminders
   */
  private static async sendClockOutReminders(): Promise<void> {
    try {
      // Find users who are still clocked in
      const usersStillClockedIn = await prisma.user.findMany({
        where: {
          isActive: true,
          pushToken: { not: null },
          attendanceEvents: {
            some: {
              type: 'CLOCK_IN',
              timestamp: {
                gte: new Date(Date.now() - 12 * 60 * 60 * 1000) // Last 12 hours
              }
            }
          }
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 12 * 60 * 60 * 1000)
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      for (const user of usersStillClockedIn) {
        const lastEvent = user.attendanceEvents[0];
        
        if (lastEvent && lastEvent.type === 'CLOCK_IN' && user.pushToken) {
          const hoursWorked = Math.round(
            (Date.now() - lastEvent.timestamp.getTime()) / (60 * 60 * 1000)
          );

          await this.sendToToken(user.pushToken, {
            title: 'Koniec pracovného času',
            body: `Pracujete už ${hoursWorked} hodín. Nezabudnite sa odpipnúť!`,
            data: { type: 'clock_out_reminder', hours: hoursWorked },
            priority: 'normal'
          });
        }
      }

      console.log(`Sent clock-out reminders to ${usersStillClockedIn.length} users`);
    } catch (error) {
      console.error('Error sending clock-out reminders:', error);
    }
  }

  /**
   * Send break reminders
   */
  private static async sendBreakReminders(): Promise<void> {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      // Find users who have been working for 4+ hours without a break
      const usersNeedingBreak = await prisma.user.findMany({
        where: {
          isActive: true,
          pushToken: { not: null },
          attendanceEvents: {
            some: {
              type: 'CLOCK_IN',
              timestamp: {
                lte: fourHoursAgo
              }
            }
          }
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            },
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      for (const user of usersNeedingBreak) {
        // Check if user hasn't taken a break recently
        const recentBreak = user.attendanceEvents.find(event =>
          ['BREAK_START', 'PERSONAL_START'].includes(event.type) &&
          event.timestamp > fourHoursAgo
        );

        if (!recentBreak && user.pushToken) {
          await this.sendToToken(user.pushToken, {
            title: 'Čas na prestávku',
            body: 'Pracujete už viac ako 4 hodiny. Nezabudnite si dať prestávku!',
            data: { type: 'break_reminder' },
            priority: 'normal'
          });
        }
      }

      console.log('Break reminders processed');
    } catch (error) {
      console.error('Error sending break reminders:', error);
    }
  }

  /**
   * Create push notification messages
   */
  private static createMessages(
    pushTokens: string[], 
    notification: PushNotificationData
  ): ExpoPushMessage[] {
    return pushTokens
      .filter(token => Expo.isExpoPushToken(token))
      .map(token => ({
        to: token,
        sound: notification.sound !== false ? 'default' : undefined,
        title: notification.title,
        body: notification.body,
        data: notification.data ?? {},
        priority: this.mapPriority(notification.priority ?? 'default'),
      }));
  }

  /**
   * Send messages in chunks
   */
  private static async sendMessages(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Store receipt IDs for successful notifications
        for (let i = 0; i < ticketChunk.length; i++) {
          const ticket = ticketChunk[i];
          if (ticket && ticket.status === 'ok') {
            await this.storeReceipt((ticket as any).id, (chunk[i] as any).to as string);
          }
        }
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return tickets;
  }

  /**
   * Store receipt for tracking delivery
   */
  private static async storeReceipt(receiptId: string, pushToken: string): Promise<void> {
    try {
      // In a production app, you might want to store receipts in a separate table
      // for tracking delivery status and handling failed notifications
      console.log(`Stored receipt ${receiptId} for token ${pushToken.substring(0, 10)}...`);
    } catch (error) {
      console.error('Error storing receipt:', error);
    }
  }

  /**
   * Remove invalid push token
   */
  private static async removeInvalidToken(pushToken: string): Promise<void> {
    try {
      await prisma.user.updateMany({
        where: { pushToken },
        data: { pushToken: null }
      });

      console.log(`Removed invalid push token: ${pushToken.substring(0, 10)}...`);
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }

  /**
   * Map priority levels
   */
  private static mapPriority(priority: string): 'default' | 'normal' | 'high' {
    switch (priority) {
      case 'max':
      case 'high':
        return 'high';
      case 'normal':
        return 'normal';
      default:
        return 'default';
    }
  }

  /**
   * Check delivery receipts
   */
  static async checkDeliveryReceipts(receiptIds: ExpoPushReceiptId[]): Promise<void> {
    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      
      for (const chunk of receiptIdChunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
        
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];
          
          if (receipt && receipt.status === 'error') {
            console.error(`Delivery error for ${receiptId}:`, (receipt as any).message);
            
            if ((receipt as any).details?.error === 'DeviceNotRegistered') {
              // Handle unregistered device
              console.log(`Device unregistered for receipt ${receiptId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking delivery receipts:', error);
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(companyId: string): Promise<{
    totalUsers: number;
    usersWithTokens: number;
    sentToday: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalUsers = await prisma.user.count({
        where: { companyId, isActive: true }
      });

      const usersWithTokens = await prisma.user.count({
        where: { 
          companyId, 
          isActive: true, 
          pushToken: { not: null } 
        }
      });

      // In a production app, you would track sent notifications in a separate table
      const sentToday = 0; // Placeholder

      return {
        totalUsers,
        usersWithTokens,
        sentToday
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { totalUsers: 0, usersWithTokens: 0, sentToday: 0 };
    }
  }
}
