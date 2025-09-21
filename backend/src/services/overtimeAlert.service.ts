import { prisma } from '../utils/database.js';
import { PushService } from './push.service.js';
import { AlertService } from './alert.service.js';
import { WebSocketService } from './websocket.service.js';
import type { User, AttendanceEvent } from '@prisma/client';

interface UserWithEvents extends User {
  attendanceEvents: AttendanceEvent[];
}

export class OvertimeAlertService {
  private static readonly STANDARD_WORK_DAY = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  private static readonly OVERTIME_WARNING_THRESHOLD = 9 * 60 * 60 * 1000; // 9 hours
  private static readonly EXCESSIVE_OVERTIME_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours
  private static readonly MAX_WORK_DAY = 16 * 60 * 60 * 1000; // 16 hours (safety limit)

  /**
   * Check overtime warnings for all active users
   */
  static async checkOvertimeWarnings(): Promise<void> {
    try {
      console.log('Running overtime check...');
      
      const users = await this.getActiveWorkingUsers();
      console.log(`Found ${users.length} users currently working`);

      for (const user of users) {
        await this.processUserOvertimeCheck(user);
      }
    } catch (error) {
      console.error('Error checking overtime warnings:', error);
    }
  }

  /**
   * Get all users who are currently working (clocked in)
   */
  private static async getActiveWorkingUsers(): Promise<UserWithEvents[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return await prisma.user.findMany({
      where: {
        isActive: true,
        role: 'EMPLOYEE',
        attendanceEvents: {
          some: {
            type: 'CLOCK_IN',
            timestamp: {
              gte: today,
              lt: tomorrow
            }
          }
        }
      },
      include: {
        attendanceEvents: {
          where: {
            timestamp: {
              gte: today,
              lt: tomorrow
            }
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });
  }

  /**
   * Process overtime check for a single user
   */
  private static async processUserOvertimeCheck(user: UserWithEvents): Promise<void> {
    try {
      const workingTime = this.calculateCurrentWorkingTime(user.attendanceEvents);
      const isCurrentlyWorking = this.isUserCurrentlyWorking(user.attendanceEvents);

      if (!isCurrentlyWorking) {
        return; // User is not currently working
      }

      console.log(`User ${user.firstName} ${user.lastName} has been working for ${Math.floor(workingTime / (60 * 60 * 1000))} hours`);

      // Check for different overtime thresholds
      if (workingTime >= this.MAX_WORK_DAY) {
        await this.sendCriticalOvertimeAlert(user, workingTime);
      } else if (workingTime >= this.EXCESSIVE_OVERTIME_THRESHOLD) {
        await this.sendExcessiveOvertimeAlert(user, workingTime);
      } else if (workingTime >= this.OVERTIME_WARNING_THRESHOLD) {
        await this.sendOvertimeWarning(user, workingTime);
      }
    } catch (error) {
      console.error(`Error processing overtime check for user ${user.id}:`, error);
    }
  }

  /**
   * Calculate current working time for a user today
   */
  private static calculateCurrentWorkingTime(events: AttendanceEvent[]): number {
    if (events.length === 0) return 0;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalWorkingTime = 0;
    let workStartTime: Date | null = null;
    let isWorking = false;

    for (const event of sortedEvents) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
        case 'BUSINESS_TRIP_START':
          workStartTime = eventTime;
          isWorking = true;
          break;
        
        case 'CLOCK_OUT':
        case 'BUSINESS_TRIP_END':
          if (workStartTime && isWorking) {
            totalWorkingTime += (eventTime.getTime() - workStartTime.getTime());
          }
          workStartTime = null;
          isWorking = false;
          break;
        
        case 'BREAK_START':
        case 'PERSONAL_START':
          // Pause working time - add time worked until now
          if (workStartTime && isWorking) {
            totalWorkingTime += (eventTime.getTime() - workStartTime.getTime());
          }
          isWorking = false;
          break;
        
        case 'BREAK_END':
        case 'PERSONAL_END':
          // Resume working time
          workStartTime = eventTime;
          isWorking = true;
          break;
      }
    }

    // If still working, add time until now
    if (workStartTime && isWorking) {
      const now = new Date();
      totalWorkingTime += (now.getTime() - workStartTime.getTime());
    }

    return totalWorkingTime;
  }

  /**
   * Check if user is currently working
   */
  private static isUserCurrentlyWorking(events: AttendanceEvent[]): boolean {
    if (events.length === 0) return false;

    const lastEvent = events[events.length - 1];
    return ['CLOCK_IN', 'BREAK_END', 'PERSONAL_END', 'BUSINESS_TRIP_START'].includes(lastEvent.type);
  }

  /**
   * Send overtime warning (9+ hours)
   */
  private static async sendOvertimeWarning(user: UserWithEvents, workingTime: number): Promise<void> {
    const hours = Math.floor(workingTime / (60 * 60 * 1000));
    const minutes = Math.floor((workingTime % (60 * 60 * 1000)) / (60 * 1000));

    // Check if we already sent this warning today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAlert = await prisma.alert.findFirst({
      where: {
        userId: user.id,
        type: 'OVERTIME_WARNING',
        createdAt: {
          gte: today
        }
      }
    });

    if (existingAlert) {
      return; // Already sent warning today
    }

    const message = `Pracujete už ${hours}h ${minutes}m. Zvážte ukončenie pracovnej doby.`;

    // Send push notification
    if (user.pushToken) {
      await PushService.sendToUsers([user.id], {
        title: 'Nadčasové upozornenie',
        body: message,
        data: { 
          type: 'alert', 
          hours: hours.toString(),
          minutes: minutes.toString()
        }
      } as any);
    }

    // Create alert
    await AlertService.createAlert(
      user.id,
      'OVERTIME_WARNING',
      message
    );

    // Send WebSocket notification
    WebSocketService.sendNotificationToUser(user.id, {
      type: 'overtime_warning',
      title: 'Nadčasové upozornenie',
      message,
      timestamp: new Date().toISOString(),
      severity: 'medium'
    });

    console.log(`Sent overtime warning to ${user.firstName} ${user.lastName} (${hours}h ${minutes}m)`);
  }

  /**
   * Send excessive overtime alert (12+ hours)
   */
  private static async sendExcessiveOvertimeAlert(user: UserWithEvents, workingTime: number): Promise<void> {
    const hours = Math.floor(workingTime / (60 * 60 * 1000));
    const minutes = Math.floor((workingTime % (60 * 60 * 1000)) / (60 * 1000));

    // Check if we already sent this alert today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAlert = await prisma.alert.findFirst({
      where: {
        userId: user.id,
        type: 'EXCESSIVE_OVERTIME',
        createdAt: {
          gte: today
        }
      }
    });

    if (existingAlert) {
      return; // Already sent alert today
    }

    const message = `UPOZORNENIE: Pracujete už ${hours}h ${minutes}m! Okamžite ukončite pracovnú dobu.`;

    // Send push notification
    if (user.pushToken) {
      await PushService.sendToUsers([user.id], {
        title: 'KRITICKÉ: Nadmerné nadčasy',
        body: message,
        data: { 
          type: 'alert', 
          hours: hours.toString(),
          minutes: minutes.toString()
        }
      } as any);
    }

    // Create high-priority alert
    await AlertService.createAlert(
      user.id,
      'EXCESSIVE_OVERTIME',
      message
    );

    // Send WebSocket notification
    WebSocketService.sendNotificationToUser(user.id, {
      type: 'excessive_overtime',
      title: 'KRITICKÉ: Nadmerné nadčasy',
      message,
      timestamp: new Date().toISOString(),
      severity: 'high'
    });

    // Also notify company admins
    await this.notifyCompanyAdmins(user, workingTime);

    console.log(`Sent excessive overtime alert to ${user.firstName} ${user.lastName} (${hours}h ${minutes}m)`);
  }

  /**
   * Send critical overtime alert (16+ hours - safety limit)
   */
  private static async sendCriticalOvertimeAlert(user: UserWithEvents, workingTime: number): Promise<void> {
    const hours = Math.floor(workingTime / (60 * 60 * 1000));
    const minutes = Math.floor((workingTime % (60 * 60 * 1000)) / (60 * 1000));

    const message = `KRITICKÉ: Zamestnanec ${user.firstName} ${user.lastName} pracuje už ${hours}h ${minutes}m! Okamžite zastavte prácu!`;

    // Send push notification to user
    if (user.pushToken) {
      await PushService.sendToUsers([user.id], {
        title: 'KRITICKÉ: Bezpečnostný limit prekročený',
        body: message,
        data: { 
          type: 'alert', 
          hours: hours.toString(),
          minutes: minutes.toString()
        }
      } as any);
    }

    // Create critical alert
    await AlertService.createAlert(
      user.id,
      'CRITICAL_OVERTIME',
      message
    );

    // Send WebSocket notification
    WebSocketService.sendNotificationToUser(user.id, {
      type: 'critical_overtime',
      title: 'KRITICKÉ: Bezpečnostný limit prekročený',
      message,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    });

    // Notify all company admins immediately
    await this.notifyCompanyAdmins(user, workingTime, true);

    console.log(`Sent CRITICAL overtime alert for ${user.firstName} ${user.lastName} (${hours}h ${minutes}m)`);
  }

  /**
   * Notify company admins about employee overtime
   */
  private static async notifyCompanyAdmins(user: UserWithEvents, workingTime: number, isCritical = false): Promise<void> {
    try {
      const hours = Math.floor(workingTime / (60 * 60 * 1000));
      const minutes = Math.floor((workingTime % (60 * 60 * 1000)) / (60 * 1000));

      // Get company admins
      const admins = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          role: 'COMPANY_ADMIN',
          isActive: true
        }
      });

      const title = isCritical ? 'KRITICKÉ: Bezpečnostný limit prekročený' : 'Nadmerné nadčasy zamestnanca';
      const message = `Zamestnanec ${user.firstName} ${user.lastName} pracuje už ${hours}h ${minutes}m. ${isCritical ? 'Okamžite zastavte prácu!' : 'Zvážte ukončenie pracovnej doby.'}`;

      // Send push notifications to admins
      const adminIds = admins.map(admin => admin.id);
      if (adminIds.length > 0) {
        await PushService.sendToUsers(adminIds, {
          title,
          body: message,
          data: { 
            type: 'alert',
            employeeId: user.id,
            employeeName: `${user.firstName} ${user.lastName}`,
            hours: hours.toString(),
            minutes: minutes.toString()
          }
        } as any);
      }

      // Send WebSocket notifications to admins
      for (const admin of admins) {
        WebSocketService.sendNotificationToUser(admin.id, {
          type: isCritical ? 'critical_overtime_admin' : 'excessive_overtime_admin',
          title,
          message,
          timestamp: new Date().toISOString(),
          severity: isCritical ? 'critical' : 'high',
          employeeId: user.id,
          employeeName: `${user.firstName} ${user.lastName}`
        });
      }

      console.log(`Notified ${admins.length} company admins about ${user.firstName} ${user.lastName} overtime`);
    } catch (error) {
      console.error('Error notifying company admins:', error);
    }
  }

  /**
   * Get overtime statistics for a company
   */
  static async getOvertimeStatistics(companyId: string, startDate?: Date, endDate?: Date) {
    try {
      const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30)); // Last 30 days
      const end = endDate || new Date();

      // Get all attendance events in the date range
      const events = await prisma.attendanceEvent.findMany({
        where: {
          companyId,
          timestamp: {
            gte: start,
            lte: end
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Group events by user and date
      const userDailyEvents: Record<string, Record<string, AttendanceEvent[]>> = {};
      
      for (const event of events) {
        const userId = event.userId;
        const dateKey = event.timestamp.toISOString().split('T')[0];
        
        if (!userDailyEvents[userId]) {
          userDailyEvents[userId] = {};
        }
        if (!userDailyEvents[userId][dateKey]) {
          userDailyEvents[userId][dateKey] = [];
        }
        userDailyEvents[userId][dateKey].push(event);
      }

      // Calculate overtime statistics
      const overtimeStats: any[] = [];
      let totalOvertimeHours = 0;
      let totalOvertimeDays = 0;

      for (const userId in userDailyEvents) {
        const userEvents = userDailyEvents[userId];
        let userOvertimeHours = 0;
        let userOvertimeDays = 0;

        for (const dateKey in userEvents) {
          const dayEvents = userEvents[dateKey];
          const workingTime = this.calculateCurrentWorkingTime(dayEvents);
          const workingHours = workingTime / (60 * 60 * 1000);

          if (workingHours > 8) {
            const overtimeHours = workingHours - 8;
            userOvertimeHours += overtimeHours;
            userOvertimeDays++;
            totalOvertimeHours += overtimeHours;
            totalOvertimeDays++;
          }
        }

        if (userOvertimeHours > 0) {
          const user = events.find(e => e.userId === userId)?.user;
          if (user) {
            overtimeStats.push({
              userId,
              userName: `${user.firstName} ${user.lastName}`,
              userEmail: user.email,
              totalOvertimeHours: Math.round(userOvertimeHours * 10) / 10,
              overtimeDays: userOvertimeDays,
              averageOvertimePerDay: Math.round((userOvertimeHours / userOvertimeDays) * 10) / 10
            });
          }
        }
      }

      return {
        startDate: start,
        endDate: end,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
        totalOvertimeDays,
        averageOvertimePerDay: totalOvertimeDays > 0 ? Math.round((totalOvertimeHours / totalOvertimeDays) * 10) / 10 : 0,
        employeesWithOvertime: overtimeStats.length,
        overtimeByEmployee: overtimeStats.sort((a: any, b: any) => b.totalOvertimeHours - a.totalOvertimeHours)
      };
    } catch (error) {
      console.error('Error getting overtime statistics:', error);
      throw new Error('Failed to get overtime statistics');
    }
  }
}
