import { Router } from 'express';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { AuditController } from '../controllers/audit.controller.js';

const router = Router();

router.use(authMiddleware);

// All audit routes require manager permissions
router.use(requireManager);

// Get audit logs with filtering and pagination
router.get('/logs', (authenticatedAsyncHandler(AuditController.getAuditLogs) as any));

// Get audit logs for specific entity
router.get('/entity/:entityType/:entityId', (authenticatedAsyncHandler(AuditController.getEntityAuditLogs) as any));

// Get audit statistics
router.get('/statistics', (authenticatedAsyncHandler(AuditController.getAuditStatistics) as any));

// Export audit logs as CSV
router.get('/export', (authenticatedAsyncHandler(AuditController.exportAuditLogs) as any));

// Clean old audit logs (admin only)
router.delete('/clean', (authenticatedAsyncHandler(AuditController.cleanOldAuditLogs) as any));

export default router;
