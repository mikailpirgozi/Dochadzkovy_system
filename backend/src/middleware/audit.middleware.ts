import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { AuditService } from '../services/audit.service.js';
import type { AuditAction } from '@prisma/client';

interface AuditOptions {
  action: AuditAction;
  entityType: string;
  getEntityId?: (req: AuthenticatedRequest, res: Response) => string | undefined;
  getOldValues?: (req: AuthenticatedRequest, res: Response) => any;
  getNewValues?: (req: AuthenticatedRequest, res: Response) => any;
  skipAudit?: (req: AuthenticatedRequest) => boolean;
}

/**
 * Middleware to automatically log audit events
 */
export const auditMiddleware = (options: AuditOptions) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip audit if condition is met
      if (options.skipAudit?.(req)) {
        next();
        return;
      }

      // Store original res.json to intercept response
      const originalJson = res.json.bind(res);
      let responseData: any;

      res.json = function(data: any) {
        responseData = data;
        return originalJson(data);
      };

      // Store original res.end to intercept response
      const originalEnd = res.end.bind(res);
      res.end = function(chunk?: any, encoding?: any) {
        // Only log audit if request was successful (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Don't await to avoid blocking the response
          logAuditEvent();
        }
        return originalEnd(chunk, encoding);
      };

      const logAuditEvent = async () => {
        try {
          const user = req.user;
          const company = req.company;

          if (!user || !company) {
            return;
          }

          const entityId = options.getEntityId ? options.getEntityId(req, res) : undefined;
          const oldValues = options.getOldValues ? options.getOldValues(req, res) : undefined;
          const newValues = options.getNewValues ? options.getNewValues(req, res) : responseData;

          // Get client IP and user agent
          const ipAddress = req.ip || 
            req.socket.remoteAddress ||
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
          
          const userAgent = req.headers['user-agent'];

          await AuditService.createAuditLog({
            companyId: company.id,
            userId: user.id,
            action: options.action,
            entityType: options.entityType,
            entityId,
            oldValues,
            newValues,
            ipAddress,
            userAgent,
          });
        } catch (error) {
          console.error('Error logging audit event:', error);
          // Don't throw error to avoid breaking the main operation
        }
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Predefined audit middleware for common operations
 */
export const auditMiddlewares = {
  // User operations
  createUser: auditMiddleware({
    action: 'CREATE',
    entityType: 'USER',
    getEntityId: (req) => req.body?.id,
    getNewValues: (req) => req.body,
  }),

  updateUser: auditMiddleware({
    action: 'UPDATE',
    entityType: 'USER',
    getEntityId: (req) => req.params.id,
    getNewValues: (req) => req.body,
  }),

  deleteUser: auditMiddleware({
    action: 'DELETE',
    entityType: 'USER',
    getEntityId: (req) => req.params.id,
  }),

  // Attendance operations
  clockIn: auditMiddleware({
    action: 'CLOCK_IN',
    entityType: 'ATTENDANCE_EVENT',
    getEntityId: (_req: AuthenticatedRequest, res: Response) => (res as any).locals?.attendanceEventId,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      location: req.body.location,
      qrCode: req.body.qrCode,
      notes: req.body.notes,
    }),
  }),

  clockOut: auditMiddleware({
    action: 'CLOCK_OUT',
    entityType: 'ATTENDANCE_EVENT',
    getEntityId: (_req: AuthenticatedRequest, res: Response) => (res as any).locals?.attendanceEventId,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      location: req.body.location,
      qrCode: req.body.qrCode,
      notes: req.body.notes,
    }),
  }),

  breakStart: auditMiddleware({
    action: 'BREAK_START',
    entityType: 'ATTENDANCE_EVENT',
    getEntityId: (_req: AuthenticatedRequest, res: Response) => (res as any).locals?.attendanceEventId,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      type: req.body.type,
      location: req.body.location,
      notes: req.body.notes,
    }),
  }),

  breakEnd: auditMiddleware({
    action: 'BREAK_END',
    entityType: 'ATTENDANCE_EVENT',
    getEntityId: (_req: AuthenticatedRequest, res: Response) => (res as any).locals?.attendanceEventId,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      location: req.body.location,
      notes: req.body.notes,
    }),
  }),

  // Correction operations
  createCorrection: auditMiddleware({
    action: 'CORRECTION_REQUEST',
    entityType: 'CORRECTION',
    getEntityId: (req, res) => res.locals?.correctionId,
    getNewValues: (req) => req.body,
  }),

  approveCorrection: auditMiddleware({
    action: 'CORRECTION_APPROVE',
    entityType: 'CORRECTION',
    getEntityId: (req) => req.params.id,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      reviewNotes: req.body.reviewNotes,
    }),
  }),

  rejectCorrection: auditMiddleware({
    action: 'CORRECTION_REJECT',
    entityType: 'CORRECTION',
    getEntityId: (req) => req.params.id,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      reviewNotes: req.body.reviewNotes,
    }),
  }),

  // Business trip operations
  createBusinessTrip: auditMiddleware({
    action: 'CREATE',
    entityType: 'BUSINESS_TRIP',
    getEntityId: (req, res) => res.locals?.businessTripId,
    getNewValues: (req) => req.body,
  }),

  startBusinessTrip: auditMiddleware({
    action: 'BUSINESS_TRIP_START',
    entityType: 'BUSINESS_TRIP',
    getEntityId: (req) => req.params.id,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      location: req.body.location,
    }),
  }),

  endBusinessTrip: auditMiddleware({
    action: 'BUSINESS_TRIP_END',
    entityType: 'BUSINESS_TRIP',
    getEntityId: (req) => req.params.id,
    getNewValues: (req: AuthenticatedRequest, _res: Response) => ({
      location: req.body.location,
    }),
  }),

  // Company operations
  updateCompany: auditMiddleware({
    action: 'UPDATE',
    entityType: 'COMPANY',
    getEntityId: (req) => req.params.id,
    getNewValues: (req) => req.body,
  }),

  updateCompanySettings: auditMiddleware({
    action: 'UPDATE',
    entityType: 'COMPANY_SETTINGS',
    getEntityId: (req) => req.params.id,
    getNewValues: (req) => req.body,
  }),
};
