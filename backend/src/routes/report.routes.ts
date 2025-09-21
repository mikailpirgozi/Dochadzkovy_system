import { Router } from 'express';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { ReportController } from '../controllers/report.controller.js';

const router = Router();

router.use(authMiddleware);
router.use(requireManager);

// Main reports endpoints
router.get('/attendance', (authenticatedAsyncHandler(ReportController.getAttendanceReport) as any));
router.get('/summary', (authenticatedAsyncHandler(ReportController.getAttendanceSummary) as any));

// Export endpoints
router.get('/export/csv', (authenticatedAsyncHandler(ReportController.exportCSV) as any));
router.get('/export/excel', (authenticatedAsyncHandler(ReportController.exportExcel) as any));

// Employee-specific reports
router.get('/employee/:employeeId', (authenticatedAsyncHandler(ReportController.getEmployeeReport) as any));

export default router;
