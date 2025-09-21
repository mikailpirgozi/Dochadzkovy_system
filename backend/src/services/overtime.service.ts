import { prisma } from '../utils/database.js';
import { PushService } from './push.service.js';
import { AlertService } from './alert.service.js';
import { WebSocketService } from './websocket.service.js';
import type { User } from '@prisma/client';

export class OvertimeService {
  private static readonly STANDARD_WORK_DAY = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  private static readonly OVERTIME_WARNING_THRESHOLD = 9 * 60 * 60 * 1000; // 9 hours
  private static readonly EXCESSIVE_OVERTIME_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours
  private static readonly MAX_DAILY_HOURS = 16 * 60 * 60 * 1000; // 16 hours - legal limit

  /**
   * Check overtime warnings for all active users
   */
  static async checkOvertimeWarnings(): Promise<void> {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all users who are currently clocked in
      const users = await prisma.user.findMany({
        where: { 
          isActive: true,
          role: 'EMPLOYEE',
          attendanceEvents: {
            some: {
              type: 'CLOCK_IN',
              timestamp: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          }
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              settings: true
            }
          },
          attendanceEvents: {
            where: {
              timestamp: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      for (const user of users) {
        await this.checkUserOvertime(user);
      }
    } catch (error) {
      console.error('Error checking overtime warnings:', error);
    }
  }

  /**
   * Check overtime for a specific user
   */
  private static async checkUserOvertime(user: User & { 
    company: { id: string; name: string; settings: any } | null;
    attendanceEvents: Array<{ type: string; timestamp: Date }>;
  }): Promise<void> {
    try {
      const workingTime = this.calculateCurrentWorkingTime(user.attendanceEvents);
      const workingHours = Math.floor(workingTime / (60 * 60 * 1000));
      const workingMinutes = Math.floor((workingTime % (60 * 60 * 1000)) / (60 * 1000));

      // Check if user is still working (last event is CLOCK_IN or similar)
      const lastEvent = user.attendanceEvents[user.attendanceEvents.length - 1];
      const isCurrentlyWorking = lastEvent && ['CLOCK_IN', 'BREAK_END', 'PERSONAL_END'].includes(lastEvent.type);

      if (!isCurrentlyWorking) {
        return; // User is not currently working
      }

      // Get company overtime settings
      const companySettings = user.company?.settings;
      const overtimeWarningHours = companySettings?.overtimeWarningHours ?? 9;
      const maxDailyHours = companySettings?.maxDailyHours ?? 12;

      const warningThreshold = overtimeWarningHours * 60 * 60 * 1000;
      const maxThreshold = maxDailyHours * 60 * 60 * 1000;

      // Warning at configured hours (default 9 hours)
      if (workingTime >= warningThreshold && workingTime < maxThreshold) {
        await this.sendOvertimeWarning(user, workingHours, workingMinutes, 'warning');
      }
      
      // Critical alert at configured max hours (default 12 hours)
      else if (workingTime >= maxThreshold && workingTime < this.MAX_DAILY_HOURS) {
        await this.sendOvertimeWarning(user, workingHours, workingMinutes, 'critical');
      }
      
      // Legal limit exceeded (16 hours)
      else if (workingTime >= this.MAX_DAILY_HOURS) {
        await this.sendOvertimeWarning(user, workingHours, workingMinutes, 'legal_limit');
      }
    } catch (error) {
      console.error(`Error checking overtime for user ${user.id}:`, error);
    }
  }

  /**
   * Calculate current working time from events
   */
  private static calculateCurrentWorkingTime(events: Array<{ type: string; timestamp: Date }>): number {
    let totalWorkingTime = 0;
    let workStartTime: Date | null = null;
    let isWorking = false;

    for (const event of events) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
          if (!isWorking) {
            workStartTime = eventTime;
            isWorking = true;
          }
          break;

        case 'CLOCK_OUT':
          if (isWorking && workStartTime) {
            totalWorkingTime += eventTime.getTime() - workStartTime.getTime();
            isWorking = false;
            workStartTime = null;
          }
          break;

        case 'BREAK_START':
        case 'PERSONAL_START':
          if (isWorking && workStartTime) {
            totalWorkingTime += eventTime.getTime() - workStartTime.getTime();
            isWorking = false;
            workStartTime = null;
          }
          break;

        case 'BREAK_END':
        case 'PERSONAL_END':
          if (!isWorking) {
            workStartTime = eventTime;
            isWorking = true;
          }
          break;
      }
    }

    // If still working, add time until now
    if (workStartTime && isWorking) {
      const now = new Date();
      totalWorkingTime += now.getTime() - workStartTime.getTime();
    }

    return totalWorkingTime;
  }

  /**
   * Send overtime warning to user and managers
   */
  private static async sendOvertimeWarning(
    user: User & { company: { id: string; name: string } | null },
    hours: number,
    minutes: number,
    severity: 'warning' | 'critical' | 'legal_limit'
  ): Promise<void> {
    try {
      const timeString = `${hours}h ${minutes}min`;
      let title: string;
      let message: string;
      let alertType: string;

      switch (severity) {
        case 'warning':
          title = 'Nadčasové upozornenie';
          message = `Pracujete už ${timeString}. Zvážte ukončenie pracovnej doby.`;
          alertType = 'OVERTIME_WARNING';
          break;
        case 'critical':
          title = 'Kritické nadčasy';
          message = `Pracujete už ${timeString}! Odporúčame okamžite ukončiť pracovnú dobu.`;
          alertType = 'OVERTIME_WARNING';
          break;
        case 'legal_limit':
          title = 'Prekročený zákonný limit';
          message = `POZOR! Pracujete už ${timeString}. Prekročili ste zákonný limit pracovného času!`;
          alertType = 'OVERTIME_WARNING';
          break;
      }

      // Check if we already sent this type of alert today
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      const existingAlert = await prisma.alert.findFirst({
        where: {
          userId: user.id,
          type: alertType as any,
          createdAt: {
            gte: startOfDay
          }
        }
      });

      // Don't send duplicate alerts on the same day
      if (existingAlert) {
        return;
      }

      // Send push notification to user
      await PushService.sendToUsers([user.id], {
        title,
        body: message,
        data: { 
          type: 'alert', 
          hours: hours.toString(),
          minutes: minutes.toString()
        }
      } as any);

      // Create alert in database
      const alert = await AlertService.createAlert(
        user.id,
        alertType as any,
        `User has been working for ${timeString} today`,
        { severity: severity === 'legal_limit' ? 'HIGH' : severity === 'critical' ? 'MEDIUM' : 'LOW' }
      );

      // Send WebSocket notification to user
      WebSocketService.sendNotificationToUser(user.id, {
        id: alert.id,
        type: 'overtime_alert',
        title,
        message,
        severity,
        timestamp: new Date().toISOString(),
        data: { hours, minutes, timeString }
      });

      // Notify managers for critical and legal limit alerts
      if (severity === 'critical' || severity === 'legal_limit') {
        await this.notifyManagers(user, hours, minutes, severity);
      }

      // Broadcast to company dashboard
      if (user.company) {
        WebSocketService.broadcastAlert(user.company.id, {
          id: alert.id,
          type: alertType,
          message: `${user.firstName} ${user.lastName}: ${message}`,
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          createdAt: alert.createdAt,
          severity: severity === 'legal_limit' ? 'high' : severity === 'critical' ? 'medium' : 'low'
        });
      }

      console.log(`Sent ${severity} overtime alert to user ${user.firstName} ${user.lastName} (${timeString})`);
    } catch (error) {
      console.error('Error sending overtime warning:', error);
    }
  }

  /**
   * Notify managers about employee overtime
   */
  private static async notifyManagers(
    user: User & { company: { id: string; name: string } | null },
    hours: number,
    minutes: number,
    severity: 'critical' | 'legal_limit'
  ): Promise<void> {
    try {
      if (!user.company) return;

      // Get all managers in the company
      const managers = await prisma.user.findMany({
        where: {
          companyId: user.company.id,
          role: { in: ['MANAGER', 'ADMIN'] },
          isActive: true
        }
      });

      if (managers.length === 0) return;

      const timeString = `${hours}h ${minutes}min`;
      const title = severity === 'legal_limit' 
        ? 'Zamestnanec prekročil zákonný limit' 
        : 'Zamestnanec má kritické nadčasy';
      
      const message = `${user.firstName} ${user.lastName} pracuje už ${timeString}. ${
        severity === 'legal_limit' 
          ? 'Prekročil zákonný limit pracovného času!' 
          : 'Odporúčame kontaktovať zamestnanca.'
      }`;

      // Send notifications to all managers
      const managerIds = managers.map(m => m.id);
      
      await PushService.sendToUsers(managerIds, {
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

      // Send WebSocket notifications to managers
      for (const manager of managers) {
        WebSocketService.sendNotificationToUser(manager.id, {
          type: 'employee_overtime',
          title,
          message,
          severity,
          timestamp: new Date().toISOString(),
          data: {
            employeeId: user.id,
            employeeName: `${user.firstName} ${user.lastName}`,
            hours,
            minutes,
            timeString
          }
        });
      }
    } catch (error) {
      console.error('Error notifying managers:', error);
    }
  }

  /**
   * Get overtime statistics for a company
   */
  static async getOvertimeStats(companyId: string, dateRange?: { from: Date; to: Date }) {
    try {
      const range = dateRange ?? {
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        to: new Date()
      };

      // Get all overtime alerts in the date range
      const alerts = await prisma.alert.findMany({
        where: {
          companyId,
          type: { in: ['OVERTIME_WARNING', 'OVERTIME_CRITICAL', 'OVERTIME_LEGAL_LIMIT'] },
          createdAt: {
            gte: range.from,
            lte: range.to
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
        orderBy: { createdAt: 'desc' }
      });

      // Calculate statistics
      const totalAlerts = alerts.length;
      const warningAlerts = alerts.filter(a => a.type === 'OVERTIME_WARNING').length;
      const criticalAlerts = alerts.filter(a => a.type === 'OVERTIME_CRITICAL').length;
      const legalLimitAlerts = alerts.filter(a => a.type === 'OVERTIME_LEGAL_LIMIT').length;

      // Group by user
      const userStats = alerts.reduce<Record<string, any>>((acc, alert) => {
        const userId = alert.user.id;
        if (!acc[userId]) {
          acc[userId] = {
            user: alert.user,
            totalAlerts: 0,
            warningAlerts: 0,
            criticalAlerts: 0,
            legalLimitAlerts: 0,
            lastAlert: alert.createdAt
          };
        }
        
        acc[userId].totalAlerts++;
        if (alert.type === 'OVERTIME_WARNING') acc[userId].warningAlerts++;
        if (alert.type === 'OVERTIME_CRITICAL') acc[userId].criticalAlerts++;
        if (alert.type === 'OVERTIME_LEGAL_LIMIT') acc[userId].legalLimitAlerts++;
        
        if (alert.createdAt > acc[userId].lastAlert) {
          acc[userId].lastAlert = alert.createdAt;
        }
        
        return acc;
      }, {});

      return {
        dateRange: range,
        totalAlerts,
        warningAlerts,
        criticalAlerts,
        legalLimitAlerts,
        affectedEmployees: Object.keys(userStats).length,
        userStats: Object.values(userStats),
        recentAlerts: alerts.slice(0, 10) // Last 10 alerts
      };
    } catch (error) {
      console.error('Error getting overtime stats:', error);
      throw new Error('Failed to get overtime statistics');
    }
  }

  /**
   * Get current overtime status for all employees
   */
  static async getCurrentOvertimeStatus(companyId: string) {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const users = await prisma.user.findMany({
        where: { 
          companyId,
          isActive: true,
          role: 'EMPLOYEE'
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const overtimeStatus = users.map(user => {
        const workingTime = this.calculateCurrentWorkingTime(user.attendanceEvents);
        const workingHours = workingTime / (60 * 60 * 1000);
        
        const lastEvent = user.attendanceEvents[user.attendanceEvents.length - 1];
        const isCurrentlyWorking = lastEvent && ['CLOCK_IN', 'BREAK_END', 'PERSONAL_END'].includes(lastEvent.type);
        
        let status = 'normal';
        if (workingTime >= this.MAX_DAILY_HOURS) {
          status = 'legal_limit';
        } else if (workingTime >= this.EXCESSIVE_OVERTIME_THRESHOLD) {
          status = 'critical';
        } else if (workingTime >= this.OVERTIME_WARNING_THRESHOLD) {
          status = 'warning';
        }

        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          workingHours: Math.round(workingHours * 10) / 10,
          isCurrentlyWorking,
          overtimeStatus: status,
          lastEventTime: lastEvent?.timestamp,
          lastEventType: lastEvent?.type
        };
      });

      return {
        date: today.toISOString().split('T')[0],
        employees: overtimeStatus,
        summary: {
          total: overtimeStatus.length,
          working: overtimeStatus.filter(e => e.isCurrentlyWorking).length,
          overtime: overtimeStatus.filter(e => e.overtimeStatus !== 'normal').length,
          warning: overtimeStatus.filter(e => e.overtimeStatus === 'warning').length,
          critical: overtimeStatus.filter(e => e.overtimeStatus === 'critical').length,
          legalLimit: overtimeStatus.filter(e => e.overtimeStatus === 'legal_limit').length
        }
      };
    } catch (error) {
      console.error('Error getting current overtime status:', error);
      throw new Error('Failed to get current overtime status');
    }
  }
}
