import type { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import { PushService } from '../services/push.service.js';
import { NotificationPreferencesService } from '../services/notificationPreferences.service.js';
import type { AuthenticatedRequest, UserRole, NotificationPreferences } from '../types/index.js';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN']).default('EMPLOYEE'),
  settings: z.record(z.unknown()).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN']).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const changeUserPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateUserDeviceSchema = z.object({
  deviceId: z.string().optional(),
  pushToken: z.string().optional(),
});

const updatePushTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android']),
});

const updateNotificationPreferencesSchema = z.object({
  push: z.object({
    geofence: z.boolean().optional(),
    break: z.boolean().optional(),
    shift: z.boolean().optional(),
    corrections: z.boolean().optional(),
    businessTrips: z.boolean().optional(),
  }).optional(),
  email: z.object({
    geofence: z.boolean().optional(),
    break: z.boolean().optional(),
    shift: z.boolean().optional(),
    corrections: z.boolean().optional(),
    businessTrips: z.boolean().optional(),
  }).optional(),
});

class UserController {
  // Get all users in company
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Company is always available in AuthenticatedRequest

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const roleParam = req.query.role as string;
    const role = roleParam && ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE', 'ADMIN'].includes(roleParam) 
      ? roleParam as UserRole 
      : undefined;
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      companyId: req.company.id,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          deviceId: true,
          pushToken: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
          // Include attendance stats
          _count: {
            select: {
              attendanceEvents: true,
            },
          },
          // Include today's attendance events for status calculation
          attendanceEvents: {
            where: {
              timestamp: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Calculate attendance status for each user
    const usersWithStatus = users.map(user => {
      let currentAttendanceStatus = 'CLOCKED_OUT';
      let lastEventTime: Date | null = null;
      
      if (user.attendanceEvents.length > 0) {
        const lastEvent = user.attendanceEvents[0];
        lastEventTime = lastEvent.timestamp;
        
        switch (lastEvent.type) {
          case 'CLOCK_IN':
          case 'BREAK_END':
          case 'PERSONAL_END':
            currentAttendanceStatus = 'CLOCKED_IN';
            break;
          case 'BREAK_START':
            currentAttendanceStatus = 'ON_BREAK';
            break;
          case 'PERSONAL_START':
            currentAttendanceStatus = 'ON_PERSONAL';
            break;
          case 'BUSINESS_TRIP_START':
            currentAttendanceStatus = 'BUSINESS_TRIP';
            break;
          default:
            currentAttendanceStatus = 'CLOCKED_OUT';
        }
      }
      
      return {
        ...user,
        currentAttendanceStatus,
        lastEventTime,
        // Remove attendanceEvents from response to keep it clean
        attendanceEvents: undefined
      };
    });

    res.json({
      success: true,
      data: {
        users: usersWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  }

  // Get user by ID
  async getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    // Check if user can access this resource
    if (req.user.role === 'EMPLOYEE' && req.user.id !== id) {
      throw createError.forbidden('Access denied');
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        deviceId: true,
        pushToken: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            attendanceEvents: true,
            locationLogs: true,
            alerts: true,
            corrections: true,
          },
        },
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  }

  // Create new user
  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Company is always available in AuthenticatedRequest

    const validatedData = createUserSchema.parse(req.body);
    const { email, password, firstName, lastName, role, settings } = validatedData;

    // Check if user already exists in this company
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
         
         
         
        companyId: req.company.id,
      },
    });

    if (existingUser) {
      throw createError.conflict('User with this email already exists in company');
    }

    // Only super admins and company admins can create other admins
    if (role === 'COMPANY_ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      throw createError.forbidden('Cannot create company admin');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role,
         
         
         
        companyId: req.company.id,
        settings: settings as any ?? {},
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User created: ${user.email} (${user.role}) by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  }

  // Update user
  async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    const validatedData = updateUserSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'COMPANY_ADMIN' ||
      (req.user.id === id && !validatedData.role && !validatedData.isActive); // Users can update their own profile (except role/status)

    if (!canUpdate) {
      throw createError.forbidden('Access denied');
    }

    // Prevent role escalation
    if (validatedData.role) {
    if (req.user.role === 'MANAGER' || req.user.role === 'EMPLOYEE') {
        throw createError.forbidden('Cannot change user role');
      }

      if (validatedData.role === 'COMPANY_ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
        throw createError.forbidden('Cannot promote to company admin');
      }
    }

    // Check if email is being changed and if it's already taken
    if (validatedData.email && validatedData.email !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validatedData.email.toLowerCase(),
           
         
         
        companyId: req.company.id,
          id: { not: id },
        },
      });

      if (existingUser) {
        throw createError.conflict('Email already taken');
      }
    }

    // Update user
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.email) updateData.email = validatedData.email.toLowerCase();
    if (validatedData.firstName) updateData.firstName = validatedData.firstName;
    if (validatedData.lastName) updateData.lastName = validatedData.lastName;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.settings) updateData.settings = validatedData.settings;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`User updated: ${updatedUser.email} by ${req.user.email}`);

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  }

  // Delete user
  async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
      include: {
        _count: {
          select: {
            attendanceEvents: true,
          },
        },
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Prevent self-deletion
    if (req.user.id === id) {
      throw createError.badRequest('Cannot delete own account');
    }

    // Check if user has attendance data
    if (user._count.attendanceEvents > 0) {
      // Soft delete - deactivate instead of hard delete
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      logger.info(`User deactivated: ${user.email} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'User deactivated successfully (has attendance data)',
      });
    } else {
      // Hard delete if no attendance data
      await prisma.user.delete({
        where: { id },
      });

      logger.info(`User deleted: ${user.email} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    }
  }

  // Change user password (admin only)
  async changeUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    const { newPassword } = changeUserPasswordSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Only admins can change other users' passwords
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      throw createError.forbidden('Access denied');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    logger.info(`Password changed for user: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  }

  // Update user device info
  async updateUserDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    const validatedData = updateUserDeviceSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Users can only update their own device info
    if (req.user.id !== id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      throw createError.forbidden('Access denied');
    }

    // Update device info
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.deviceId !== undefined) updateData.deviceId = validatedData.deviceId;
    if (validatedData.pushToken !== undefined) updateData.pushToken = validatedData.pushToken;

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    logger.info(`Device info updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Device info updated successfully',
    });
  }

  // Get user attendance summary
  async getUserAttendanceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Company is always available in AuthenticatedRequest

    // Check permissions
    if (req.user.role === 'EMPLOYEE' && req.user.id !== id) {
      throw createError.forbidden('Access denied');
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        id,
         
         
         
        companyId: req.company.id,
      },
    });

    if (!user) {
      throw createError.notFound('User not found');
    }

    // Get attendance summary for current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const [
      totalEvents,
      clockInEvents,
      thisMonthEvents,
      lastEvent,
    ] = await Promise.all([
      // Total attendance events
      prisma.attendanceEvent.count({
        where: { userId: id },
      }),

      // Clock in events this month
      prisma.attendanceEvent.count({
        where: {
          userId: id,
          type: 'CLOCK_IN',
          timestamp: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // All events this month
      prisma.attendanceEvent.findMany({
        where: {
          userId: id,
          timestamp: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { timestamp: 'asc' },
      }),

      // Last attendance event
      prisma.attendanceEvent.findFirst({
        where: { userId: id },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    // Calculate total hours this month
    let totalHours = 0;
    const shifts: Array<{ clockIn: Date; clockOut?: Date }> = [];

    for (let i = 0; i < thisMonthEvents.length; i++) {
      const event = thisMonthEvents[i];
      
      if (event.type === 'CLOCK_IN') {
        // Find corresponding clock out
        const clockOut = thisMonthEvents.find((e, index) => 
          index > i && 
          e.type === 'CLOCK_OUT' && 
          e.timestamp > event.timestamp
        );

        const shift = { clockIn: event.timestamp, clockOut: clockOut?.timestamp };
        shifts.push(shift);

        if (clockOut) {
          const hours = (clockOut.timestamp.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
    }

    const summary = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      stats: {
        totalEvents,
        workingDaysThisMonth: clockInEvents,
        totalHoursThisMonth: Math.round(totalHours * 100) / 100,
        averageHoursPerDay: clockInEvents > 0 ? Math.round((totalHours / clockInEvents) * 100) / 100 : 0,
      },
      currentStatus: lastEvent ? {
        type: lastEvent.type,
        timestamp: lastEvent.timestamp,
        isWorking: lastEvent.type === 'CLOCK_IN',
      } : null,
      shifts: shifts.slice(-10), // Last 10 shifts
    };

    res.json({
      success: true,
      data: summary,
    });
  }

  // Bulk operations
  async bulkUpdateUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Company is always available in AuthenticatedRequest

    const { userIds, updates } = z.object({
      userIds: z.array(z.string()),
      updates: z.object({
        isActive: z.boolean().optional(),
        role: z.enum(['EMPLOYEE', 'MANAGER', 'COMPANY_ADMIN']).optional(),
      }),
    }).parse(req.body);

    // Only admins can do bulk operations
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      throw createError.forbidden('Access denied');
    }

    // Verify all users belong to the company
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
         
         
         
        companyId: req.company.id,
      },
    });

    if (users.length !== userIds.length) {
      throw createError.badRequest('Some users not found or not in company');
    }

    // Prevent self-deactivation
    if (updates.isActive === false && userIds.includes(req.user.id || '')) {
      throw createError.badRequest('Cannot deactivate own account');
    }

    // Update users
    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds },
         
         
         
        companyId: req.company.id,
      },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    logger.info(`Bulk updated ${result.count.toString()} users by ${req.user.email}`);

    res.json({
      success: true,
      data: { updatedCount: result.count },
      message: `${result.count.toString()} users updated successfully`,
    });
  }

  // Update push token
  async updatePushToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validatedData = updatePushTokenSchema.parse(req.body);

    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      await PushService.updateUserPushToken(
        req.user.id,
        validatedData.token,
        validatedData.platform
      );

      logger.info(`Push token updated for user ${req.user.email}`);

      res.json({
        success: true,
        message: 'Push token updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update push token:', error);
      throw createError.internalServerError('Failed to update push token');
    }
  }

  // Remove push token
  async removePushToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      await PushService.removeUserPushToken(req.user.id);

      logger.info(`Push token removed for user ${req.user.email}`);

      res.json({
        success: true,
        message: 'Push token removed successfully',
      });
    } catch (error) {
      logger.error('Failed to remove push token:', error);
      throw createError.internalServerError('Failed to remove push token');
    }
  }

  // Send test notification (development only)
  async sendTestNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (process.env.NODE_ENV !== 'development') {
      throw createError.forbidden('Test notifications only available in development');
    }

    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      await PushService.sendTestNotification(req.user.id);

      res.json({
        success: true,
        message: 'Test notification sent successfully',
      });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      throw createError.internalServerError('Failed to send test notification');
    }
  }

  // Get notification preferences
  async getNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      const preferences = await NotificationPreferencesService.getUserPreferences(req.user.id);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      logger.error('Failed to get notification preferences:', error);
      throw createError.internalServerError('Failed to get notification preferences');
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const validatedData = updateNotificationPreferencesSchema.parse(req.body);

    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      const updatedPreferences = await NotificationPreferencesService.updateUserPreferences(
        req.user.id,
        validatedData as Partial<NotificationPreferences>
      );

      logger.info(`Notification preferences updated for user ${req.user.email}`);

      res.json({
        success: true,
        data: updatedPreferences,
        message: 'Notification preferences updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      throw createError.internalServerError('Failed to update notification preferences');
    }
  }

  // Reset notification preferences to defaults
  async resetNotificationPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      const defaultPreferences = await NotificationPreferencesService.resetToDefaults(req.user.id);

      logger.info(`Notification preferences reset to defaults for user ${req.user.email}`);

      res.json({
        success: true,
        data: defaultPreferences,
        message: 'Notification preferences reset to defaults successfully',
      });
    } catch (error) {
      logger.error('Failed to reset notification preferences:', error);
      throw createError.internalServerError('Failed to reset notification preferences');
    }
  }

  // Enable all notifications
  async enableAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      await NotificationPreferencesService.enableAllNotifications(req.user.id);

      logger.info(`All notifications enabled for user ${req.user.email}`);

      res.json({
        success: true,
        message: 'All notifications enabled successfully',
      });
    } catch (error) {
      logger.error('Failed to enable all notifications:', error);
      throw createError.internalServerError('Failed to enable all notifications');
    }
  }

  // Disable all notifications (except critical)
  async disableAllNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user.id) {
      throw createError.unauthorized('User not authenticated');
    }

    try {
      await NotificationPreferencesService.disableAllNotifications(req.user.id);

      logger.info(`All non-critical notifications disabled for user ${req.user.email}`);

      res.json({
        success: true,
        message: 'All non-critical notifications disabled successfully',
      });
    } catch (error) {
      logger.error('Failed to disable all notifications:', error);
      throw createError.internalServerError('Failed to disable all notifications');
    }
  }

  // Get company notification preferences summary (admin only)
  async getCompanyNotificationSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    // Company is always available in AuthenticatedRequest

    // Only admins can view company summary
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COMPANY_ADMIN') {
      throw createError.forbidden('Access denied');
    }

    try {
      const summary = await NotificationPreferencesService.getCompanyPreferencesSummary(
        req.company.id
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Failed to get company notification summary:', error);
      throw createError.internalServerError('Failed to get company notification summary');
    }
  }
}

export const userController = new UserController();
