import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../types/index.js';
import { OvertimeService } from '../services/overtime.service.js';
import { SchedulerService } from '../services/scheduler.service.js';

// Validation schemas
const GetOvertimeStatisticsSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

 
export class OvertimeController {
  /**
   * Calculate current working time from events (copied from OvertimeService)
   */
  private static calculateCurrentWorkingTime(events: Array<{ type: string; timestamp: Date }>): number {
    let totalWorkingTime = 0;
    let workStartTime: Date | null = null;
    let isWorking = false;

    for (const event of events) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
          if (!isWorking) {
            workStartTime = eventTime;
            isWorking = true;
          }
          break;

        case 'CLOCK_OUT':
          if (isWorking && workStartTime) {
            totalWorkingTime += eventTime.getTime() - workStartTime.getTime();
            isWorking = false;
            workStartTime = null;
          }
          break;

        case 'BREAK_START':
        case 'PERSONAL_START':
          if (isWorking && workStartTime) {
            totalWorkingTime += eventTime.getTime() - workStartTime.getTime();
            isWorking = false;
            workStartTime = null;
          }
          break;

        case 'BREAK_END':
        case 'PERSONAL_END':
          if (!isWorking) {
            workStartTime = eventTime;
            isWorking = true;
          }
          break;
      }
    }

    // If still working, add time until now
    if (workStartTime && isWorking) {
      const now = new Date();
      totalWorkingTime += now.getTime() - workStartTime.getTime();
    }

    return totalWorkingTime;
  }
  /**
   * GET /overtime/statistics
   * Get overtime statistics for company
   */
  static async getOvertimeStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const validatedQuery = GetOvertimeStatisticsSchema.parse(req.query);

      const dateRange = validatedQuery.startDate && validatedQuery.endDate 
        ? { from: validatedQuery.startDate, to: validatedQuery.endDate }
        : undefined;
      
      const statistics = await OvertimeService.getOvertimeStats(targetCompanyId, dateRange);

      res.json({
        success: true,
        data: statistics
      });
    } catch (_error) {
      // console.error('Error getting overtime statistics:', _error);
      
      if (_error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: _error.errors
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to get overtime statistics'
      });
    }
  }

  /**
   * POST /overtime/check-now
   * Manually trigger overtime check (admin only)
   */
  static async checkOvertimeNow(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only company admins and super admins can trigger manual checks
      if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        res.status(403).json({
          error: 'Insufficient permissions to trigger overtime check'
        });
        return;
      }

      await SchedulerService.runOvertimeCheckNow();

      res.json({
        success: true,
        message: 'Overtime check completed successfully'
      });
    } catch (_error) {
      // console.error('Error running manual overtime check:', _error);
      res.status(500).json({
        error: 'Failed to run overtime check'
      });
    }
  }

  /**
   * GET /overtime/jobs-status
   * Get status of scheduled jobs (admin only)
   */
  static getJobsStatus(req: AuthenticatedRequest, res: Response): void {
    try {
      // Only company admins and super admins can view job status
      if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        res.status(403).json({
          error: 'Insufficient permissions to view job status'
        });
        return;
      }

      const jobsStatus = SchedulerService.getJobsStatus();

      res.json({
        success: true,
        data: {
          jobs: jobsStatus,
          totalJobs: jobsStatus.length,
          runningJobs: jobsStatus.filter(job => job.running).length
        }
      });
    } catch (_error) {
      // console.error('Error getting jobs status:', _error);
      res.status(500).json({
        error: 'Failed to get jobs status'
      });
    }
  }

  /**
   * POST /overtime/jobs/:jobName/start
   * Start a specific scheduled job (admin only)
   */
  static startJob(req: AuthenticatedRequest, res: Response): void {
    try {
      // Only super admins can control jobs
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          error: 'Insufficient permissions to control scheduled jobs'
        });
        return;
      }

      const { jobName } = req.params;
      const success = SchedulerService.startJob(jobName);

      if (success) {
        res.json({
          success: true,
          message: `Job '${jobName}' started successfully`
        });
      } else {
        res.status(404).json({
          error: `Job '${jobName}' not found`
        });
      }
    } catch (_error) {
      // console.error('Error starting job:', error);
      res.status(500).json({
        error: 'Failed to start job'
      });
    }
  }

  /**
   * POST /overtime/jobs/:jobName/stop
   * Stop a specific scheduled job (admin only)
   */
  static stopJob(req: AuthenticatedRequest, res: Response): void {
    try {
      // Only super admins can control jobs
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({
          error: 'Insufficient permissions to control scheduled jobs'
        });
        return;
      }

      const { jobName } = req.params;
      const success = SchedulerService.stopJob(jobName);

      if (success) {
        res.json({
          success: true,
          message: `Job '${jobName}' stopped successfully`
        });
      } else {
        res.status(404).json({
          error: `Job '${jobName}' not found`
        });
      }
    } catch (_error) {
      // console.error('Error stopping job:', error);
      res.status(500).json({
        error: 'Failed to stop job'
      });
    }
  }

  /**
   * GET /overtime/current-working
   * Get currently working employees with their working time
   */
  static async getCurrentlyWorking(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      // Import prisma dynamically to avoid circular imports
      const { prisma } = await import('../utils/database.js');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const users = await prisma.user.findMany({
        where: {
          companyId: targetCompanyId,
          isActive: true,
          role: 'EMPLOYEE',
          attendanceEvents: {
            some: {
              type: 'CLOCK_IN',
              timestamp: {
                gte: today,
                lt: tomorrow
              }
            }
          }
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: today,
                lt: tomorrow
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const currentlyWorking: Array<{
        id: string;
        name: string;
        email: string;
        workingHours: number;
        workingTime: number;
        clockInTime?: Date;
        lastEventType: string;
        lastEventTime: Date;
        isOvertime: boolean;
        overtimeHours: number;
      }> = [];
      
      for (const user of users) {
        // Check if user is currently working
        const lastEvent = user.attendanceEvents[user.attendanceEvents.length - 1];
        const isWorking = lastEvent ? ['CLOCK_IN', 'BREAK_END', 'PERSONAL_END', 'BUSINESS_TRIP_START'].includes(lastEvent.type) : false;
        
        if (isWorking) {
          // Calculate working time using the same method as OvertimeService
          const workingTime = this.calculateCurrentWorkingTime(user.attendanceEvents);
          const workingHours = workingTime / (60 * 60 * 1000);
          
          currentlyWorking.push({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            workingHours: Math.round(workingHours * 10) / 10,
            workingTime: Math.floor(workingTime / (60 * 1000)), // in minutes
            clockInTime: user.attendanceEvents.find(e => e.type === 'CLOCK_IN')?.timestamp,
            lastEventType: lastEvent.type,
            lastEventTime: lastEvent.timestamp,
            isOvertime: workingHours > 8,
            overtimeHours: Math.max(0, Math.round((workingHours - 8) * 10) / 10)
          });
        }
      }

      // Sort by working time (longest first)
      currentlyWorking.sort((a, b) => b.workingTime - a.workingTime);

      res.json({
        success: true,
        data: {
          currentlyWorking,
          totalWorking: currentlyWorking.length,
          totalOvertime: currentlyWorking.filter(u => u.isOvertime).length,
          totalOvertimeHours: currentlyWorking
            .filter(u => u.isOvertime)
            .reduce((sum, u) => sum + u.overtimeHours, 0)
        }
      });
    } catch (_error) {
      // console.error('Error getting currently working employees:', error);
      res.status(500).json({
        error: 'Failed to get currently working employees'
      });
    }
  }

  /**
   * GET /overtime/current-status
   * Get current overtime status for all employees
   */
  static async getCurrentOvertimeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user.companyId;
      
      if (!companyId && req.user.role !== 'SUPER_ADMIN') {
        res.status(400).json({
          error: 'Company ID required'
        });
        return;
      }

      const targetCompanyId = req.user.role === 'SUPER_ADMIN' 
        ? req.query.companyId as string 
        : companyId;

      const status = await OvertimeService.getCurrentOvertimeStatus(targetCompanyId);

      res.json({
        success: true,
        data: status
      });
    } catch (_error) {
      // console.error('Error getting current overtime status:', error);
      res.status(500).json({
        error: 'Failed to get current overtime status'
      });
    }
  }
}
