import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types/index.js';
import { AuditService } from '../services/audit.service.js';
import type { AuditAction } from '@prisma/client';

// Validation schemas
const GetAuditLogsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  entityType: z.string().optional(),
  userId: z.string().optional(),
  action: z.nativeEnum({
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    CLOCK_IN: 'CLOCK_IN',
    CLOCK_OUT: 'CLOCK_OUT',
    BREAK_START: 'BREAK_START',
    BREAK_END: 'BREAK_END',
    PERSONAL_START: 'PERSONAL_START',
    PERSONAL_END: 'PERSONAL_END',
    BUSINESS_TRIP_START: 'BUSINESS_TRIP_START',
    BUSINESS_TRIP_END: 'BUSINESS_TRIP_END',
    CORRECTION_REQUEST: 'CORRECTION_REQUEST',
    CORRECTION_APPROVE: 'CORRECTION_APPROVE',
    CORRECTION_REJECT: 'CORRECTION_REJECT',
  } as Record<AuditAction, AuditAction>).optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const GetEntityAuditLogsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const GetAuditStatisticsSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

const CleanOldAuditLogsSchema = z.object({
  olderThanDays: z.number().min(1).max(3650).default(365),
});

 
export class AuditController {
  /**
   * GET /audit/logs
   * Get audit logs for company with filtering and pagination
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const validatedQuery = GetAuditLogsSchema.parse(req.query);

      const result = await AuditService.getAuditLogs(targetCompanyId, {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        entityType: validatedQuery.entityType,
        userId: validatedQuery.userId,
        action: validatedQuery.action,
        startDate: validatedQuery.startDate,
        endDate: validatedQuery.endDate,
      });

      res.json({
        success: true,
        data: result.auditLogs,
        pagination: result.pagination
      });
    } catch (error) {
      // console.error('Error getting audit logs:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get audit logs'
      });
    }
  }

  /**
   * GET /audit/entity/:entityType/:entityId
   * Get audit logs for a specific entity
   */
  static async getEntityAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const validatedParams = GetEntityAuditLogsSchema.parse({
        ...req.params,
        ...req.query
      });

      const result = await AuditService.getEntityAuditLogs(
        targetCompanyId,
        validatedParams.entityType,
        validatedParams.entityId,
        {
          page: validatedParams.page,
          limit: validatedParams.limit,
        }
      );

      res.json({
        success: true,
        data: result.auditLogs,
        pagination: result.pagination
      });
    } catch (error) {
      // console.error('Error getting entity audit logs:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid parameters',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get entity audit logs'
      });
    }
  }

  /**
   * GET /audit/statistics
   * Get audit statistics for company
   */
  static async getAuditStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const validatedQuery = GetAuditStatisticsSchema.parse(req.query);

      const statistics = await AuditService.getAuditStatistics(targetCompanyId, {
        startDate: validatedQuery.startDate,
        endDate: validatedQuery.endDate,
      });

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      // console.error('Error getting audit statistics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get audit statistics'
      });
    }
  }

  /**
   * DELETE /audit/clean
   * Clean old audit logs (admin only)
   */
  static async cleanOldAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only company admins and super admins can clean audit logs
      if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        res.status(403).json({
          error: 'Insufficient permissions to clean audit logs'
        });
        return;
      }

      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? (req.body as { companyId: string }).companyId
        : companyId;

      const validatedBody = CleanOldAuditLogsSchema.parse(req.body);

      const deletedCount = await AuditService.cleanOldAuditLogs(
        targetCompanyId,
        validatedBody.olderThanDays
      );

      res.json({
        success: true,
        data: {
          deletedCount,
          olderThanDays: validatedBody.olderThanDays
        }
      });
    } catch (error) {
      // console.error('Error cleaning old audit logs:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid request body',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to clean old audit logs'
      });
    }
  }

  /**
   * GET /audit/export
   * Export audit logs as CSV (admin only)
   */
  static async exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only company admins and super admins can export audit logs
      if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        res.status(403).json({
          error: 'Insufficient permissions to export audit logs'
        });
        return;
      }

      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const validatedQuery = GetAuditLogsSchema.parse(req.query);

      // Get all audit logs (no pagination for export)
      const result = await AuditService.getAuditLogs(targetCompanyId, {
        page: 1,
        limit: 10000, // Large limit for export
        entityType: validatedQuery.entityType,
        userId: validatedQuery.userId,
        action: validatedQuery.action,
        startDate: validatedQuery.startDate,
        endDate: validatedQuery.endDate,
      });

      // Convert to CSV format
      const csvHeaders = [
        'Timestamp',
        'User',
        'Action',
        'Entity Type',
        'Entity ID',
        'IP Address',
        'User Agent',
        'Old Values',
        'New Values'
      ];

      const csvRows = result.auditLogs.map(log => [
        log.timestamp.toISOString(),
        log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System',
        log.action,
        log.entityType,
        log.entityId ?? '',
        log.ipAddress ?? '',
        log.userAgent ?? '',
        log.oldValues ? JSON.stringify(log.oldValues) : '',
        log.newValues ? JSON.stringify(log.newValues) : ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const filename = `audit-logs-${targetCompanyId}-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      // console.error('Error exporting audit logs:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to export audit logs'
      });
    }
  }
}
