import { Router } from 'express';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { OvertimeController } from '../controllers/overtime.controller.js';

const router = Router();

router.use(authMiddleware);

// All overtime routes require manager permissions
router.use(requireManager);

// Get overtime statistics
router.get('/statistics', (authenticatedAsyncHandler(OvertimeController.getOvertimeStatistics) as any));

// Get currently working employees
router.get('/current-working', (authenticatedAsyncHandler(OvertimeController.getCurrentlyWorking) as any));

// Get current overtime status
router.get('/current-status', (authenticatedAsyncHandler(OvertimeController.getCurrentOvertimeStatus) as any));

// Manual overtime check (admin only)
router.post('/check-now', (authenticatedAsyncHandler(OvertimeController.checkOvertimeNow) as any));

// Scheduled jobs management (admin only)
router.get('/jobs-status', (authenticatedAsyncHandler(OvertimeController.getJobsStatus) as any));
router.post('/jobs/:jobName/start', (authenticatedAsyncHandler(OvertimeController.startJob) as any));
router.post('/jobs/:jobName/stop', (authenticatedAsyncHandler(OvertimeController.stopJob) as any));

export default router;
