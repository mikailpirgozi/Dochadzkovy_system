import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { ReportService } from '../services/report.service.js';
import { prisma } from '../utils/database.js';
import { z } from 'zod';

// Validation schemas (unused but kept for future use)
// const DateRangeSchema = z.object({
//   from: z.string().datetime(),
//   to: z.string().datetime(),
// });

const ReportQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  format: z.enum(['json', 'csv', 'excel']).optional().default('json'),
});

 
export class ReportController {
  /**
   * GET /reports/attendance
   * Get attendance report for date range
   */
  static async getAttendanceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = req.user.companyId;

     
     
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

    // Parse and validate query parameters
    const { from, to } = ReportQuerySchema.parse(req.query);
    
    const dateRange = {
      from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30)),
      to: to ? new Date(to) : new Date(),
    };

    // Validate date range
    if (dateRange.from > dateRange.to) {
      res.status(400).json({
        error: 'Start date must be before end date'
      });
      return;
    }

    const report = await ReportService.generateAttendanceReport(
       
       
      req.user?.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId,
      dateRange
    );

    res.json({
      success: true,
      data: report
    });
  }

  /**
   * GET /reports/export/csv
   * Export attendance report as CSV
   */
  static async exportCSV(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = req.user.companyId;

     
     
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

      // Parse query parameters
      const { from, to } = ReportQuerySchema.parse(req.query);
      
      const dateRange = {
        from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: to ? new Date(to) : new Date(),
      };

    const csvData = await ReportService.exportToCSV(
       
      req.user?.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId,
      dateRange
    );

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${dateRange.from.toISOString().split('T')[0] ?? ''}-${dateRange.to.toISOString().split('T')[0] ?? ''}.csv"`);
    
    // Add BOM for proper UTF-8 encoding in Excel
    res.send(`\uFEFF${  csvData}`);
  }

  /**
   * GET /reports/export/excel
   * Export attendance report as Excel
   */
  static async exportExcel(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = req.user.companyId;

     
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

      // Parse query parameters
      const { from, to } = ReportQuerySchema.parse(req.query);
      
      const dateRange = {
        from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: to ? new Date(to) : new Date(),
      };

    const excelBuffer = await ReportService.exportToExcel(
       
      req.user?.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId,
      dateRange
    );

    // Set Excel headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${dateRange.from.toISOString().split('T')[0] ?? ''}-${dateRange.to.toISOString().split('T')[0] ?? ''}.xlsx"`);
    
    res.send(excelBuffer);
  }

  /**
   * GET /reports/summary
   * Get attendance summary for dashboard widgets
   */
  static async getAttendanceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const companyId = req.user.companyId;

     
     
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

      // Parse query parameters
      const { from, to } = ReportQuerySchema.parse(req.query);
      
      const dateRange = {
        from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: to ? new Date(to) : new Date(),
      };

    const summary = await ReportService.getAttendanceSummary(
       
      req.user?.role === 'SUPER_ADMIN' ? req.query.companyId as string : companyId,
      dateRange
    );

    res.json({
      success: true,
      data: summary
    });
  }

  /**
   * GET /reports/employee/:employeeId
   * Get detailed report for specific employee
   */
  static async getEmployeeReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { employeeId } = req.params;
    const companyId = req.user.companyId;

     
    if (!companyId && req.user.role !== 'SUPER_ADMIN') {
      res.status(400).json({
        error: 'Company ID required'
      });
      return;
    }

    // Verify employee belongs to company
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: { company: true }
    });

    if (!employee) {
      res.status(404).json({
        error: 'Employee not found'
      });
      return;
    }

     
    if (req.user?.role !== 'SUPER_ADMIN' && employee.companyId !== companyId) {
      res.status(403).json({
        error: 'Access denied to this employee'
      });
      return;
    }

      // Parse query parameters
      const { from, to } = ReportQuerySchema.parse(req.query);
      
      const dateRange = {
        from: from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30)),
        to: to ? new Date(to) : new Date(),
      };

      // Get detailed employee data
      const employeeWithEvents = await prisma.user.findUnique({
        where: { id: employeeId },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: dateRange.from,
                lte: dateRange.to,
              }
            },
            orderBy: { timestamp: 'asc' }
          },
          locationLogs: {
            where: {
              timestamp: {
                gte: dateRange.from,
                lte: dateRange.to,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

    if (!employeeWithEvents) {
      res.status(404).json({
        error: 'Employee not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        employee: {
          id: employeeWithEvents.id,
          name: `${employeeWithEvents.firstName} ${employeeWithEvents.lastName}`,
          email: employeeWithEvents.email,
          role: employeeWithEvents.role
        },
        events: employeeWithEvents.attendanceEvents,
        locations: employeeWithEvents.locationLogs,
        dateRange
      }
    });
  }
}
