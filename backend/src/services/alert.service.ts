import type { AlertType, User, Company } from '@prisma/client';
import type { LocationData } from '../types';
import { calculateDistance } from '../utils/helpers.js';
import { PushService } from './push.service.js';
import { EmailService } from './email.service.js';
import { NotificationPreferencesService } from './notificationPreferences.service.js';
// import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';

export interface AlertData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface GeofenceViolation {
  userId: string;
  location: LocationData;
  distance: number;
  timestamp: number;
  violationType: 'LEFT_GEOFENCE' | 'GPS_DISABLED';
}

export interface AlertEmailData {
  employeeName: string;
  timestamp: string;
  description: string;
  location: string;
  companyName: string;
}

// Constants
const GEOFENCE_ALERT_COOLDOWN = 10 * 60 * 1000; // 10 minutes
const LONG_BREAK_THRESHOLD = 65 * 60 * 1000; // 65 minutes
const MISSING_CLOCK_OUT_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours

export const AlertService = {

  /**
   * Process geofence violation from mobile app
   */
  async processGeofenceViolation(violation: GeofenceViolation): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: violation.userId },
      include: { 
        company: true,
        attendanceEvents: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!user?.company) {
      // console.error('User or company not found for geofence violation');
      return;
    }

    // Check if user is currently clocked in
    if (user.attendanceEvents.length === 0) {
        // console.log('User has no attendance events, ignoring geofence violation');
        return;
      }
      
      const lastEvent = user.attendanceEvents[0];
      
      if (lastEvent.type !== 'CLOCK_IN') {
        // console.log('User not clocked in, ignoring geofence violation');
        return;
      }

      // Check if alert already exists for this violation (prevent spam)
      const existingAlert = await AlertService.findRecentAlert(
        violation.userId,
        'LEFT_GEOFENCE',
        GEOFENCE_ALERT_COOLDOWN
      );

      if (existingAlert) {
        // console.log('Recent geofence alert already exists, skipping');
        return;
      }

      // Create alert
      await AlertService.createAlert(
        violation.userId,
        'LEFT_GEOFENCE',
        `User left work area (${String(Math.round(violation.distance))}m away) without clocking out`
      );

      // Send notifications
      await AlertService.handleGeofenceViolationNotifications(user, violation);

      // console.log('Geofence violation processed:', alert.id);
  },

  /**
   * Check for geofence violations based on location update
   */
  async checkGeofenceViolation(userId: string, location: LocationData): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          company: true,
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

      if (!user) return;

      // Check if user is currently clocked in
      const lastEvent = user.attendanceEvents.find(event => 
        ['CLOCK_IN', 'CLOCK_OUT'].includes(event.type)
      );
      
      if (!lastEvent || lastEvent.type !== 'CLOCK_IN') {
        return; // User not clocked in
      }

      // Check if outside geofence
      const geofence = user.company.geofence as { latitude: number; longitude: number; radius?: number } | null;
      if (!geofence?.latitude || !geofence.longitude) {
        return;
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      const isWithinGeofence = distance <= (geofence.radius ?? 100);

      if (!isWithinGeofence) {
        // Check if alert already exists
        const existingAlert = await AlertService.findRecentAlert(
          userId,
          'LEFT_GEOFENCE',
          GEOFENCE_ALERT_COOLDOWN
        );

        if (!existingAlert) {
          // Create geofence violation
          const violation: GeofenceViolation = {
            userId,
            location,
            distance,
            timestamp: Date.now(),
            violationType: 'LEFT_GEOFENCE'
          };

          await AlertService.processGeofenceViolation(violation);
        }
      }
    } catch (_error) {
      // console.error('Error checking geofence violation:', _error);
    }
  },

  /**
   * Check for long break violations
   */
  async checkLongBreakViolation(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          company: true,
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

      if (!user) return;

      // Find last break start event
      const lastBreakStart = user.attendanceEvents.find(event => 
        event.type === 'BREAK_START' || event.type === 'PERSONAL_START'
      );

      if (!lastBreakStart) return;

      // Check if break is still ongoing
      const breakEnd = user.attendanceEvents.find(event => 
        (event.type === 'BREAK_END' || event.type === 'PERSONAL_END') &&
        event.timestamp > lastBreakStart.timestamp
      );

      if (breakEnd) return; // Break already ended

      // Check break duration
      const breakDuration = Date.now() - lastBreakStart.timestamp.getTime();
      
      if (breakDuration > LONG_BREAK_THRESHOLD) {
        // Check if alert already exists
        const existingAlert = await AlertService.findRecentAlert(
          userId,
          'LONG_BREAK',
          LONG_BREAK_THRESHOLD
        );

        if (!existingAlert) {
          const breakType = lastBreakStart.type === 'BREAK_START' ? 'obed' : 'súkromné veci';
          const durationMinutes = Math.round(breakDuration / (60 * 1000));
          
          await AlertService.createAlert(
            userId,
            'LONG_BREAK',
            `User has been on ${breakType} for ${String(durationMinutes)} minutes`
          );

          // Send notification to user
          await PushService.sendToUsers([userId], {
            title: 'Dlhá prestávka',
            body: `${breakType.charAt(0).toUpperCase() + breakType.slice(1)} trvá už ${String(durationMinutes)} minút. Nezabudnite sa vrátiť!`,
            data: {
              type: 'break_reminder',
              userId,
              message: `${String(durationMinutes)} minút`
            }
          });

          // Notify managers after 90 minutes
          if (durationMinutes > 90) {
            await AlertService.notifyManagers(user.companyId, {
              title: 'Dlhá prestávka',
              body: `${user.firstName} ${user.lastName} má ${breakType} už ${String(durationMinutes)} minút`,
              data: {
                type: 'alert',
                userId,
                message: `Employee long break: ${String(durationMinutes)} minutes`
              }
            });
          }
        }
      }
    } catch (_error) {
      // console.error('Error checking long break violation:', _error);
    }
  },

  /**
   * Check for missing clock out
   */
  async checkMissingClockOut(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - MISSING_CLOCK_OUT_THRESHOLD);
      
      // Find users who clocked in but haven't clocked out in the last 12 hours
      const usersWithMissingClockOut = await prisma.user.findMany({
        where: {
          isActive: true,
          attendanceEvents: {
            some: {
              type: 'CLOCK_IN',
              timestamp: {
                gte: cutoffTime
              }
            }
          }
        },
        include: {
          company: true,
          attendanceEvents: {
            where: {
              timestamp: {
                gte: cutoffTime
              }
            },
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      for (const user of usersWithMissingClockOut) {
        const lastEvent = user.attendanceEvents[0];
        
        if (lastEvent.type === 'CLOCK_IN') {
          // Check if alert already exists
          const existingAlert = await AlertService.findRecentAlert(
            user.id,
            'MISSING_CLOCK_OUT',
            MISSING_CLOCK_OUT_THRESHOLD
          );

          if (!existingAlert) {
            const hoursAgo = Math.round(
              (Date.now() - lastEvent.timestamp.getTime()) / (60 * 60 * 1000)
            );

            await AlertService.createAlert(
              user.id,
              'MISSING_CLOCK_OUT',
              `User clocked in ${String(hoursAgo)} hours ago but hasn't clocked out`
            );

            // Send notification to user
            await PushService.sendToUsers([user.id], {
              title: 'Nezabudnite sa odpipnúť',
              body: `Ste pripnutí v práci už ${String(hoursAgo)} hodín. Nezabudnite sa odpipnúť!`,
              data: {
                type: 'shift_end',
                userId: user.id,
                message: `${String(hoursAgo)} hodín`
              }
            });

            // Notify managers
            await AlertService.notifyManagers(user.companyId, {
              title: 'Chýbajúce odpipnutie',
              body: `${user.firstName} ${user.lastName} sa nezapipol už ${String(hoursAgo)} hodín`,
              data: {
                type: 'alert',
                userId: user.id,
                message: `Missing clock out: ${String(hoursAgo)} hours`
              }
            });
          }
        }
      }
    } catch (_error) {
      // console.error('Error checking missing clock out:', _error);
    }
  },

  /**
   * Create a new alert
   */
  async createAlert(
    userId: string,
    type: AlertType,
    message: string,
    data?: Record<string, unknown>
  ) {
    // Get user to get companyId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return await prisma.alert.create({
      data: {
        userId,
        companyId: user.companyId,
        title: `Alert: ${type}`,
        type,
        message,
        data: data as any ?? {},
        resolved: false,
        createdAt: new Date()
      }
    });
  },

  /**
   * Find recent alert of specific type
   */
  async findRecentAlert(
    userId: string,
    type: AlertType,
    timeThreshold: number
  ) {
    const cutoffTime = new Date(Date.now() - timeThreshold);
    
    return await prisma.alert.findFirst({
      where: {
        userId,
        type,
        createdAt: {
          gte: cutoffTime
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  /**
   * Handle geofence violation notifications
   */
  async handleGeofenceViolationNotifications(
    user: User & { company: Company },
    violation: GeofenceViolation
  ): Promise<void> {
    try {
      const userName = `${user.firstName} ${user.lastName}`;
      const violationTime = new Date(violation.timestamp).toLocaleString('sk-SK');
      const locationString = `${violation.location.latitude.toFixed(6)}, ${violation.location.longitude.toFixed(6)}`;

      // Check user's notification preferences and send accordingly
      const shouldReceivePush = await NotificationPreferencesService.shouldReceiveNotification(
        user.id, 
        'geofence', 
        'push'
      );

      if (shouldReceivePush) {
        await PushService.sendGeofenceViolation(user.id, userName, user.companyId);
      }

      // Send email notification if user prefers it
      const shouldReceiveEmail = await NotificationPreferencesService.shouldReceiveNotification(
        user.id,
        'geofence',
        'email'
      );

      if (shouldReceiveEmail) {
        await EmailService.sendGeofenceViolationEmail(
          user.email,
          userName,
          user.company.name,
          violationTime,
          locationString
        );
      }

      // Notify managers and admins
      await AlertService.notifyManagers(user.companyId, {
        title: 'Geofence Alert',
        body: `${userName} opustil(a) pracovisko (${String(Math.round(violation.distance))}m)`,
        data: { 
          type: 'employee_geofence_violation', 
          userId: user.id,
          distance: violation.distance 
        }
      });

      // Send email to managers if distance > 500m
      if (violation.distance > 500) {
        await AlertService.sendGeofenceViolationEmail(user, violation);
      }
    } catch (_error) {
      // console.error('Error sending geofence violation notifications:', error);
    }
  },

  /**
   * Send email notification for serious geofence violations
   */
  async sendGeofenceViolationEmail(
    user: User & { company: Company },
    violation: GeofenceViolation
  ): Promise<void> {
    try {
      // Get managers emails
      const managers = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
          isActive: true
        },
        select: { email: true, firstName: true, lastName: true }
      });

      const managerEmails = managers.map(m => m.email);
      
      if (managerEmails.length === 0) return;

      const alertData: AlertEmailData = {
        employeeName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date(violation.timestamp).toLocaleString('sk-SK'),
        description: `Zamestnanec opustil pracovisko bez odpipnutia a nachádza sa ${String(Math.round(violation.distance))}m od firmy`,
        location: `${violation.location.latitude.toFixed(6)}, ${violation.location.longitude.toFixed(6)}`,
        companyName: user.company.name
      };

      for (const email of managerEmails) {
        await EmailService.sendAlertEmail(
          email,
          `⚠️ Geofence Alert - ${user.company.name}`,
          alertData
        );
      }
    } catch (_error) {
      // console.error('Error sending geofence violation email:', error);
    }
  },

  /**
   * Notify managers of alerts
   */
  async notifyManagers(companyId: string, alert: AlertData): Promise<void> {
    try {
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
          isActive: true
        },
        select: { id: true, pushToken: true, email: true }
      });

      const managerIds = managers.map(m => m.id);

      // Send push notifications to managers who want them
      await PushService.sendToCompany(companyId, {
        title: alert.title,
        body: alert.body,
        data: {
          type: 'alert',
          ...(alert.data ?? {}),
        },
        sound: true,
        priority: 'high',
        channelId: 'admin_alerts',
      }, ['COMPANY_ADMIN', 'MANAGER']);

      // Create alert records for managers
      for (const managerId of managerIds) {
        await AlertService.createAlert(
          managerId,
          'SYSTEM_ERROR', // Use appropriate alert type
          alert.body,
          alert.data
        );
      }
    } catch (_error) {
      // console.error('Error notifying managers:', error);
    }
  },

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date()
      }
    });
  },

  /**
   * Get active alerts for company
   */
  async getActiveAlerts(companyId?: string, limit = 50) {
    return await prisma.alert.findMany({
      where: companyId ? {
        user: {
          companyId
        },
        resolved: false
      } : {
        resolved: false
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
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  /**
   * Get alerts for specific user
   */
  async getUserAlerts(userId: string, daysBack = 30) {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return await prisma.alert.findMany({
      where: {
        userId,
        createdAt: {
          gte: cutoffDate
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  },

  /**
   * Get alert statistics for dashboard
   */
  async getAlertStats(companyId: string, timeRange = 24) {
    const cutoffTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const stats = await prisma.alert.groupBy({
      by: ['type'],
      where: {
        user: {
          companyId
        },
        createdAt: {
          gte: cutoffTime
        }
      },
      _count: {
        type: true
      }
    });

    return stats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.type;
      return acc;
    }, {} as Record<AlertType, number>);
  },

  /**
   * Cleanup old resolved alerts
   */
  async cleanupOldAlerts(daysOld = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.alert.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: cutoffDate
        }
      }
    });

    // console.log(`Cleaned up ${result.count} old alerts`);
    return result.count;
  },

  /**
   * Run periodic alert checks
   */
  async runPeriodicChecks(): Promise<void> {
    try {
      // console.log('Running periodic alert checks...');
      
      // Get all active users
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true }
      });

      // Check long breaks for all users
      for (const user of activeUsers) {
        await AlertService.checkLongBreakViolation(user.id);
      }

      // Check missing clock outs
      await AlertService.checkMissingClockOut();

      // console.log('Periodic alert checks completed');
    } catch (_error) {
      // console.error('Error running periodic checks:', error);
    }
  }
};
