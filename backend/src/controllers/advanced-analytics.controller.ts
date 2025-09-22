import { Request, Response } from 'express';
import { AdvancedAnalyticsService } from '../services/advanced-analytics.service.js';
import { AuthenticatedRequest } from '../types/index.js';

export class AdvancedAnalyticsController {
  /**
   * Get advanced analytics data
   */
  static async getAdvancedAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      const analytics = await AdvancedAnalyticsService.getAdvancedAnalytics(companyId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting advanced analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get advanced analytics'
      });
    }
  }

  /**
   * Get productivity trends
   */
  static async getProductivityTrends(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { period } = req.query;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      if (!period || !['week', 'month', 'quarter'].includes(period as string)) {
        return res.status(400).json({
          success: false,
          error: 'Valid period is required (week, month, quarter)'
        });
      }

      const trends = await AdvancedAnalyticsService.getProductivityTrends(
        companyId,
        period as 'week' | 'month' | 'quarter'
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Error getting productivity trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get productivity trends'
      });
    }
  }

  /**
   * Get attendance heatmap
   */
  static async getAttendanceHeatmap(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      const heatmap = await AdvancedAnalyticsService.getAttendanceHeatmap(companyId);

      res.json({
        success: true,
        data: heatmap
      });
    } catch (error) {
      console.error('Error getting attendance heatmap:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get attendance heatmap'
      });
    }
  }

  /**
   * Get cost analysis
   */
  static async getCostAnalysis(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { period } = req.query;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      if (!period || !['week', 'month', 'quarter'].includes(period as string)) {
        return res.status(400).json({
          success: false,
          error: 'Valid period is required (week, month, quarter)'
        });
      }

      const costAnalysis = await AdvancedAnalyticsService.getCostAnalysis(
        companyId,
        period as 'week' | 'month' | 'quarter'
      );

      res.json({
        success: true,
        data: costAnalysis
      });
    } catch (error) {
      console.error('Error getting cost analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cost analysis'
      });
    }
  }
}
