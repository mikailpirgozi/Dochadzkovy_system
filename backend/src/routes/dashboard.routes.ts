import { Router } from 'express';
import { authMiddleware, requireManager, requireEmployee } from '../middleware/auth.middleware.js';
import { authenticatedAsyncHandler } from '../middleware/errorHandler.js';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

// Dashboard statistics - accessible to all employees
router.get('/stats', requireEmployee, (authenticatedAsyncHandler(DashboardController.getStats) as any));

// Company analytics with date range - managers only
router.get('/analytics', requireManager, (authenticatedAsyncHandler(DashboardController.getAnalytics) as any));

// Recent activity feed - accessible to all employees
router.get('/recent-activity', requireEmployee, (authenticatedAsyncHandler(DashboardController.getRecentActivity) as any));

// Employee statistics by period - accessible to all employees
router.get('/statistics', requireEmployee, (authenticatedAsyncHandler(DashboardController.getEmployeeStatistics) as any));

// Detailed day activities - accessible to all employees
router.get('/day-activities', requireEmployee, (authenticatedAsyncHandler(DashboardController.getDayActivities) as any));

// Debug calculations - managers only
router.get('/debug-calculations', requireManager, (authenticatedAsyncHandler(DashboardController.debugCalculations) as any));

// Chart data endpoints - accessible to all employees
router.get('/charts/weekly', requireEmployee, (authenticatedAsyncHandler(DashboardController.getWeeklyChartData) as any));
router.get('/charts/monthly', requireEmployee, (authenticatedAsyncHandler(DashboardController.getMonthlyChartData) as any));
router.get('/charts/comparison', requireEmployee, (authenticatedAsyncHandler(DashboardController.getComparisonChartData) as any));

export default router;
