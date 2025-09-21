import { Router } from 'express';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { ExportController } from '../controllers/export.controller.js';

const router = Router();
const exportController = new ExportController();

router.use(authMiddleware);

// Export endpoints (manager/admin only)
router.get('/attendance', requireManager, (authenticatedAsyncHandler(exportController.exportAttendance) as any));
router.get('/business-trips', requireManager, (authenticatedAsyncHandler(exportController.exportBusinessTrips) as any));
router.get('/corrections', requireManager, (authenticatedAsyncHandler(exportController.exportCorrections) as any));

// Export utility endpoints
router.get('/options', requireManager, (authenticatedAsyncHandler(exportController.getExportOptions) as any));
router.get('/preview', requireManager, (authenticatedAsyncHandler(exportController.previewExport) as any));

export default router;
