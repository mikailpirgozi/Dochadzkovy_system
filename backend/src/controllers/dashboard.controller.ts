import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { DashboardService } from '../services/dashboard.service.js';
import { prisma } from '../utils/database.js';
import { z } from 'zod';

// Validation schemas (currently unused but kept for future use)
// const DateRangeSchema = z.object({
//   from: z.string().datetime().optional(),
//   to: z.string().datetime().optional(),
// });

 
export class DashboardController {
  /**
   * GET /dashboard/stats
   * Get dashboard statistics
   */
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const stats = await DashboardService.getDashboardStats(
        req.user.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (_error) {
      // console.error('Error getting dashboard stats:', _error);
      res.status(500).json({
        error: 'Failed to get dashboard statistics'
      });
    }
  }

  /**
   * GET /dashboard/analytics
   * Get company analytics for date range
   */
  static async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const analytics = await DashboardService.getDashboardStats(
        req.user.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (_error) {
      // console.error('Error getting analytics:', _error);
      
      if (_error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid date range parameters',
          details: _error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get analytics'
      });
    }
  }

  /**
   * GET /companies/:companyId/employees/live-locations
   * Get live employee locations
   */
  static async getLiveEmployeeLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      // Check permissions
      if (req.user.role !== 'SUPER_ADMIN' && req.user.companyId !== companyId) {
        res.status(403).json({
          error: 'Insufficient permissions to view this company data'
        });
        return;
      }

       
      const employees = await DashboardService.getLiveEmployeeLocations(companyId);

      res.json({
        success: true,
        data: employees
      });
    } catch (_error) {
      // console.error('Error getting live employee locations:', _error);
      res.status(500).json({
        error: 'Failed to get live employee locations'
      });
    }
  }

  /**
   * GET /dashboard/recent-activity
   * Get recent activity for dashboard
   */
  static async getRecentActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      // Get recent attendance events
      const recentEvents = await prisma.attendanceEvent.findMany({
        where: {
          companyId: targetCompanyId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      // Get recent alerts
      const recentAlerts = await prisma.alert.findMany({
        where: {
          companyId: targetCompanyId,
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      // Combine and sort by timestamp
      const activity = [
        ...recentEvents.map(event => ({
          type: 'attendance',
          timestamp: event.timestamp.toISOString(),
          description: `${event.user.firstName} ${event.user.lastName} - ${event.type}`,
          data: event
        })),
        ...recentAlerts.map(alert => ({
          type: 'alert',
          timestamp: alert.createdAt.toISOString(),
          description: `${alert.user.firstName} ${alert.user.lastName} - ${alert.type}`,
          data: alert
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, limit);

      res.json({
        success: true,
        data: activity
      });
    } catch (_error) {
      // console.error('Error getting recent activity:', _error);
      res.status(500).json({
        error: 'Failed to get recent activity'
      });
    }
  }

  /**
   * GET /dashboard/statistics
   * Get employee statistics for specific time period
   */
  static async getEmployeeStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { period, date } = req.query;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      if (!period || !['day', 'week', 'month'].includes(period as string)) {
        res.status(400).json({
          error: 'Valid period required (day, week, month)'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const targetDate = date ? new Date(date as string) : new Date();

      // For EMPLOYEE role, only show their own statistics
      const targetUserId = req.user.role === 'EMPLOYEE' ? req.user.id : undefined;

      const statistics = await DashboardService.getEmployeeStatistics(
        targetCompanyId,
        period as 'day' | 'week' | 'month',
        targetDate,
        targetUserId
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (_error) {
      // console.error('Error getting employee statistics:', _error);
      res.status(500).json({
        error: 'Failed to get employee statistics'
      });
    }
  }

  /**
   * GET /dashboard/day-activities
   * Get detailed day activities
   */
  static async getDayActivities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { date, userId } = req.query;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          error: 'Date parameter required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const targetDate = new Date(date as string);

      // For EMPLOYEE role, only show their own activities
      let targetUserId = userId as string | undefined;
      if (req.user.role === 'EMPLOYEE') {
        targetUserId = req.user.id;
      }

      const activities = await DashboardService.getDayActivities(
        targetCompanyId,
        targetDate,
        targetUserId
      );

      res.json({
        success: true,
        data: activities
      });
    } catch (_error) {
      // console.error('Error getting day activities:', _error);
      res.status(500).json({
        error: 'Failed to get day activities'
      });
    }
  }

  /**
   * GET /dashboard/debug-calculations
   * Debug endpoint to check time calculations
   */
  static async debugCalculations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { userId, date } = req.query;

      if (!companyId) {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetDate = date ? new Date(date as string) : new Date();
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      const whereClause: {
        companyId: string;
        timestamp: { gte: Date; lte: Date };
        userId?: string;
      } = {
        companyId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        }
      };

      if (userId && typeof userId === 'string') {
        whereClause.userId = userId;
      }

      const events = await prisma.attendanceEvent.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { timestamp: 'asc' }
      });

      // Debug calculation step by step
      const debugInfo = {
        date: targetDate.toISOString(),
        totalEvents: events.length,
        events: events.map(e => ({
          type: e.type,
          timestamp: e.timestamp.toISOString(),
          user: `${e.user.firstName} ${e.user.lastName}`,
          notes: e.notes
        })),
        calculations: {}
      };

      res.json({
        success: true,
        data: debugInfo
      });
    } catch (_error) {
      // console.error('Error in debug calculations:', _error);
      res.status(500).json({
        error: 'Failed to debug calculations'
      });
    }
  }

  /**
   * GET /dashboard/charts/weekly
   * Get weekly chart data
   */
  static async getWeeklyChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { startDate } = req.query;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const targetStartDate = startDate ? new Date(startDate as string) : undefined;

      const chartData = await DashboardService.getWeeklyChartData(targetCompanyId, targetStartDate);

      res.json({
        success: true,
        data: chartData
      });
    } catch (_error) {
      // console.error('Error getting weekly chart data:', _error);
      res.status(500).json({
        error: 'Failed to get weekly chart data'
      });
    }
  }

  /**
   * GET /dashboard/charts/monthly
   * Get monthly chart data
   */
  static async getMonthlyChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { year, month } = req.query;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const targetYear = year ? parseInt(year as string) : undefined;
      const targetMonth = month ? parseInt(month as string) : undefined;

      const chartData = await DashboardService.getMonthlyChartData(
        targetCompanyId, 
        targetYear, 
        targetMonth
      );

      res.json({
        success: true,
        data: chartData
      });
    } catch (_error) {
      // console.error('Error getting monthly chart data:', _error);
      res.status(500).json({
        error: 'Failed to get monthly chart data'
      });
    }
  }

  /**
   * GET /dashboard/charts/comparison
   * Get comparison chart data between employees or periods
   */
  static async getComparisonChartData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      const { period, userIds, startDate } = req.query;

      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      if (!period || !['week', 'month'].includes(period as string)) {
        res.status(400).json({
          error: 'Valid period required (week, month)'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const targetUserIds = userIds ? (userIds as string).split(',') : undefined;
      const targetStartDate = startDate ? new Date(startDate as string) : undefined;

      const chartData = await DashboardService.getComparisonChartData(
        targetCompanyId,
        period as 'week' | 'month',
        targetUserIds,
        targetStartDate
      );

      res.json({
        success: true,
        data: chartData
      });
    } catch (_error) {
      // console.error('Error getting comparison chart data:', _error);
      res.status(500).json({
        error: 'Failed to get comparison chart data'
      });
    }
  }
}