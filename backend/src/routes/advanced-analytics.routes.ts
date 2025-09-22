import { Router } from 'express';
import { AdvancedAnalyticsController } from '../controllers/advanced-analytics.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * @route GET /api/advanced-analytics
 * @desc Get comprehensive advanced analytics data
 * @access Private (Admin, Manager)
 */
router.get(
  '/',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  AdvancedAnalyticsController.getAdvancedAnalytics as any
);

/**
 * @route GET /api/advanced-analytics/productivity-trends
 * @desc Get productivity trends over time
 * @access Private (Admin, Manager)
 * @query period - week, month, quarter
 */
router.get(
  '/productivity-trends',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  AdvancedAnalyticsController.getProductivityTrends
);

/**
 * @route GET /api/advanced-analytics/attendance-heatmap
 * @desc Get attendance heatmap data
 * @access Private (Admin, Manager)
 */
router.get(
  '/attendance-heatmap',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  AdvancedAnalyticsController.getAttendanceHeatmap
);

/**
 * @route GET /api/advanced-analytics/cost-analysis
 * @desc Get cost analysis data
 * @access Private (Admin, Manager)
 * @query period - week, month, quarter
 */
router.get(
  '/cost-analysis',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  AdvancedAnalyticsController.getCostAnalysis
);

export default router;
