import { prisma } from '../utils/database.js';
import type { AuditAction } from '@prisma/client';

interface AuditLogData {
  companyId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Create an audit log entry
   */
  static async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          companyId: data.companyId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          oldValues: data.oldValues ? JSON.parse(JSON.stringify(data.oldValues)) : null,
          newValues: data.newValues ? JSON.parse(JSON.stringify(data.newValues)) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get audit logs for a company with pagination
   */
  static async getAuditLogs(
    companyId: string,
    options: {
      page?: number;
      limit?: number;
      entityType?: string;
      userId?: string;
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    try {
      const {
        page = 1,
        limit = 50,
        entityType,
        userId,
        action,
        startDate,
        endDate,
      } = options;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        companyId,
      };

      if (entityType) {
        where.entityType = entityType;
      }

      if (userId) {
        where.userId = userId;
      }

      if (action) {
        where.action = action;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = startDate;
        }
        if (endDate) {
          where.timestamp.lte = endDate;
        }
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get audit logs
      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      });

      return {
        auditLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw new Error('Failed to get audit logs');
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(
    companyId: string,
    entityType: string,
    entityId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where = {
        companyId,
        entityType,
        entityId,
      };

      const total = await prisma.auditLog.count({ where });

      const auditLogs = await prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      });

      return {
        auditLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting entity audit logs:', error);
      throw new Error('Failed to get entity audit logs');
    }
  }

  /**
   * Get audit statistics for a company
   */
  static async getAuditStatistics(
    companyId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    try {
      const { startDate, endDate } = options;

      const where: any = {
        companyId,
      };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = startDate;
        }
        if (endDate) {
          where.timestamp.lte = endDate;
        }
      }

      // Get total audit logs count
      const totalLogs = await prisma.auditLog.count({ where });

      // Get logs by action
      const logsByAction = await prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
      });

      // Get logs by entity type
      const logsByEntityType = await prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: {
          entityType: true,
        },
        orderBy: {
          _count: {
            entityType: 'desc',
          },
        },
      });

      // Get most active users
      const mostActiveUsers = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          userId: { not: null },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      });

      // Get user details for most active users
      const userIds = mostActiveUsers.map(u => u.userId).filter(Boolean) as string[];
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      const mostActiveUsersWithDetails = mostActiveUsers.map(userStat => {
        const user = users.find(u => u.id === userStat.userId);
        return {
          userId: userStat.userId,
          count: userStat._count.userId,
          user: user ? {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          } : null,
        };
      });

      return {
        totalLogs,
        logsByAction: logsByAction.map(item => ({
          action: item.action,
          count: item._count.action,
        })),
        logsByEntityType: logsByEntityType.map(item => ({
          entityType: item.entityType,
          count: item._count.entityType,
        })),
        mostActiveUsers: mostActiveUsersWithDetails,
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw new Error('Failed to get audit statistics');
    }
  }

  /**
   * Clean old audit logs (older than specified days)
   */
  static async cleanOldAuditLogs(companyId: string, olderThanDays = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await prisma.auditLog.deleteMany({
        where: {
          companyId,
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning old audit logs:', error);
      throw new Error('Failed to clean old audit logs');
    }
  }

  /**
   * Helper method to log attendance events
   */
  static async logAttendanceEvent(
    companyId: string,
    userId: string,
    action: AuditAction,
    attendanceEventId: string,
    eventData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      companyId,
      userId,
      action,
      entityType: 'ATTENDANCE_EVENT',
      entityId: attendanceEventId,
      newValues: eventData,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper method to log user changes
   */
  static async logUserChange(
    companyId: string,
    userId: string,
    action: AuditAction,
    targetUserId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      companyId,
      userId,
      action,
      entityType: 'USER',
      entityId: targetUserId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper method to log correction events
   */
  static async logCorrectionEvent(
    companyId: string,
    userId: string,
    action: AuditAction,
    correctionId: string,
    correctionData: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.createAuditLog({
      companyId,
      userId,
      action,
      entityType: 'CORRECTION',
      entityId: correctionId,
      newValues: correctionData,
      ipAddress,
      userAgent,
    });
  }
}
