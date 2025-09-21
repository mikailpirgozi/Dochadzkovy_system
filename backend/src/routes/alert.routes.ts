import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { AlertService } from '../services/alert.service.js';
import { validateRequest } from '../middleware/validation.middleware.js';

const router = Router();

// Validation schemas
const GeofenceViolationSchema = z.object({
  userId: z.string().cuid(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive(),
    timestamp: z.number(),
  }),
  distance: z.number().positive(),
  timestamp: z.number(),
  violationType: z.enum(['LEFT_GEOFENCE', 'GPS_DISABLED']),
});

const ResolveAlertSchema = z.object({
  alertId: z.string().cuid(),
});

const GetAlertsQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  type: z.string().optional(),
  resolved: z.string().optional().transform(val => val === 'true'),
});

/**
 * POST /alerts/geofence-violation
 * Report geofence violation from mobile app
 */
router.post(
  '/geofence-violation',
  authMiddleware,
  validateRequest({ body: GeofenceViolationSchema }),
  (async (req: any, res: any) => {
    const violation = req.body;
    
    // Verify that the user reporting the violation is the same as authenticated user
    if (violation.userId !== req.user.id) {
      res.status(403).json({
        error: 'Unauthorized to report violation for another user'
      });
      return;
    }

    await AlertService.processGeofenceViolation(violation);

    res.status(200).json({
      success: true,
      message: 'Geofence violation processed'
    });
  })
);

/**
 * GET /alerts
 * Get alerts for company (managers/admins only)
 */
router.get(
  '/',
  authMiddleware,
  validateRequest({ query: GetAlertsQuerySchema }),
  (async (req: any, res: any) => {
    // Check if user has permission to view alerts
    if (!['COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      res.status(403).json({
        error: 'Insufficient permissions to view alerts'
      });
      return;
    }

    const { page, limit, type, resolved } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

    // For super admin, get alerts from all companies
    const alerts = await AlertService.getActiveAlerts(
      req.user?.role === 'SUPER_ADMIN' ? undefined : companyId,
      limit
    );

    // Apply filters
    let filteredAlerts = alerts;
    
    if (type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
    }
    
    if (resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved === resolved);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedAlerts = filteredAlerts.slice(startIndex, startIndex + limit);

    res.json({
      alerts: paginatedAlerts,
      pagination: {
        page,
        limit,
        total: filteredAlerts.length,
        pages: Math.ceil(filteredAlerts.length / limit)
      }
    });
  })
);

/**
 * GET /alerts/active
 * Get active alerts for company
 */
router.get(
  '/active',
  authMiddleware,
  (async (req: any, res: any) => {
    // Check permissions
    if (!['COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      res.status(403).json({
        error: 'Insufficient permissions to view alerts'
      });
      return;
    }

    const companyId = req.user?.companyId;
    
    if (!companyId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

    const alerts = await AlertService.getActiveAlerts(
      req.user?.role === 'SUPER_ADMIN' ? undefined : companyId,
      20
    );

    res.json({ 
      success: true, 
      data: alerts 
    });
  })
);

/**
 * POST /alerts/resolve
 * Resolve an alert
 */
router.post(
  '/resolve',
  authMiddleware,
  validateRequest({ body: ResolveAlertSchema }),
  (async (req: any, res: any) => {
    // Check permissions
    if (!['COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      res.status(403).json({
        error: 'Insufficient permissions to resolve alerts'
      });
      return;
    }

    const { alertId } = req.body;
    const resolvedBy = req.user?.id;

    if (!resolvedBy) {
      res.status(400).json({
        error: 'User ID required'
      });
      return;
    }

    await AlertService.resolveAlert(alertId, resolvedBy);

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  })
);

/**
 * GET /alerts/stats
 * Get alert statistics for dashboard
 */
router.get(
  '/stats',
  authMiddleware,
  (async (req: any, res: any) => {
    // Check permissions
    if (!['COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      res.status(403).json({
        error: 'Insufficient permissions to view alert statistics'
      });
      return;
    }

    const companyId = req.user?.companyId;
    const timeRange = parseInt(req.query.hours as string) || 24;

    if (!companyId && req.user?.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

    if (req.user?.role === 'SUPER_ADMIN') {
      // For super admin, we need to modify the service to handle undefined companyId
      // For now, use empty string as fallback
      const stats = await AlertService.getAlertStats('', timeRange);
      res.json({ stats });
      return;
    }
    
    const stats = await AlertService.getAlertStats(companyId, timeRange);

    res.json({ stats });
  })
);

/**
 * GET /alerts/my
 * Get alerts for current user
 */
router.get(
  '/my',
  authMiddleware,
  (async (req: any, res: any) => {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(400).json({
        error: 'User ID required'
      });
      return;
    }

    // Get user's alerts from the last 30 days
    const alerts = await AlertService.getUserAlerts(userId, 30);

    res.json({ alerts });
  })
);

/**
 * POST /alerts/test
 * Send test alert (admin only)
 */
router.post(
  '/test',
  authMiddleware,
  (async (req: any, res: any) => {
    // Check permissions - only super admin can send test alerts
    if (req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: 'Only super admin can send test alerts'
      });
      return;
    }

    const { userId, type = 'LEFT_GEOFENCE' } = req.body;

    if (!userId) {
      res.status(400).json({
        error: 'User ID required for test alert'
      });
      return;
    }

    await AlertService.createAlert(
      userId,
      type,
      'This is a test alert generated by admin'
    );

    res.json({
      success: true,
      message: 'Test alert created successfully'
    });
  })
);

/**
 * DELETE /alerts/cleanup
 * Cleanup old resolved alerts (admin only)
 */
router.delete(
  '/cleanup',
  authMiddleware,
  (async (req: any, res: any) => {
    // Check permissions
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user?.role || '')) {
      res.status(403).json({
        error: 'Insufficient permissions to cleanup alerts'
      });
      return;
    }

    const daysOld = parseInt(req.query.days as string) || 30;
    const deletedCount = await AlertService.cleanupOldAlerts(daysOld);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old alerts`,
      deletedCount
    });
  })
);

export default router;