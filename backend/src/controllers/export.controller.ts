import type { Response } from 'express';
import { z } from 'zod';
import { ExportService } from '../services/export.service.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

// Validation schemas
const exportAttendanceSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  startDate: z.string().datetime().transform(date => new Date(date)).optional(),
  endDate: z.string().datetime().transform(date => new Date(date)).optional(),
  userId: z.string().optional(),
  includeBreaks: z.boolean().default(true),
  includePersonal: z.boolean().default(true),
  includeBusinessTrips: z.boolean().default(true),
  includeCorrections: z.boolean().default(false),
  groupBy: z.enum(['user', 'date', 'none']).default('none'),
  columns: z.array(z.string()).optional()
});

const exportBusinessTripsSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  startDate: z.string().datetime().transform(date => new Date(date)).optional(),
  endDate: z.string().datetime().transform(date => new Date(date)).optional(),
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

type ExportOptions = z.infer<typeof exportAttendanceSchema>;

const exportCorrectionsSchema = z.object({
  format: z.enum(['csv', 'excel']).default('csv'),
  startDate: z.string().datetime().transform(date => new Date(date)).optional(),
  endDate: z.string().datetime().transform(date => new Date(date)).optional(),
  userId: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional()
});

export class ExportController {
  private readonly exportService = new ExportService();

  /**
   * Export attendance data
   * GET /export/attendance
   */
  exportAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can export data
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to export attendance data', 403);
    }

    const validatedQuery = exportAttendanceSchema.parse(req.query);

    // Validate date range
    if (validatedQuery.startDate && validatedQuery.endDate) {
      if (validatedQuery.startDate > validatedQuery.endDate) {
        throw new CustomError('Start date must be before end date', 400);
      }

      // Limit export to maximum 1 year of data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (validatedQuery.startDate < oneYearAgo) {
        throw new CustomError('Cannot export data older than 1 year', 400);
      }
    }

    // If no date range specified, default to current month
    if (!validatedQuery.startDate && !validatedQuery.endDate) {
      const now = new Date();
      validatedQuery.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      validatedQuery.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const exportData = await this.exportService.exportAttendanceData(
      user.companyId,
      validatedQuery
    );

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Length', exportData.buffer.length);

    res.send(exportData.buffer);
  };

  /**
   * Export business trips data
   * GET /export/business-trips
   */
  exportBusinessTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can export data
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to export business trips data', 403);
    }

    const validatedQuery = exportBusinessTripsSchema.parse(req.query);

    // Validate date range
    if (validatedQuery.startDate && validatedQuery.endDate) {
      if (validatedQuery.startDate > validatedQuery.endDate) {
        throw new CustomError('Start date must be before end date', 400);
      }
    }

    // If no date range specified, default to current year
    if (!validatedQuery.startDate && !validatedQuery.endDate) {
      const now = new Date();
      validatedQuery.startDate = new Date(now.getFullYear(), 0, 1);
      validatedQuery.endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const exportData = await this.exportService.exportBusinessTripsData(
      user.companyId,
      validatedQuery
    );

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Length', exportData.buffer.length);

    res.send(exportData.buffer);
  };

  /**
   * Export corrections data
   * GET /export/corrections
   */
  exportCorrections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can export data
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to export corrections data', 403);
    }

    const validatedQuery = exportCorrectionsSchema.parse(req.query);

    // Validate date range
    if (validatedQuery.startDate && validatedQuery.endDate) {
      if (validatedQuery.startDate > validatedQuery.endDate) {
        throw new CustomError('Start date must be before end date', 400);
      }
    }

    // If no date range specified, default to current year
    if (!validatedQuery.startDate && !validatedQuery.endDate) {
      const now = new Date();
      validatedQuery.startDate = new Date(now.getFullYear(), 0, 1);
      validatedQuery.endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const exportData = await this.exportService.exportCorrectionsData(
      user.companyId,
      validatedQuery
    );

    // Set response headers for file download
    res.setHeader('Content-Type', exportData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.setHeader('Content-Length', exportData.buffer.length);

    res.send(exportData.buffer);
  };

  /**
   * Get export options and available columns
   * GET /export/options
   */
  getExportOptions = (req: AuthenticatedRequest, res: Response): void => {
    const user = req.user;

    // Only managers and company admins can view export options
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to view export options', 403);
    }

    const options = {
      formats: ['csv', 'excel'],
      groupByOptions: ['none', 'user', 'date'],
      availableColumns: [
        'ID',
        'Zamestnanec',
        'Email',
        'Typ udalosti',
        'Dátum a čas',
        'Dátum',
        'Čas',
        'QR overené',
        'Poznámky',
        'Korekcia aplikovaná',
        'Vytvorené'
      ],
      businessTripStatuses: [
        'PENDING',
        'APPROVED',
        'REJECTED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
      ],
      correctionStatuses: [
        'PENDING',
        'APPROVED',
        'REJECTED'
      ],
      maxDateRange: {
        description: 'Maximum 1 year of data can be exported',
        maxDays: 365
      },
      defaultDateRanges: {
        attendance: 'Current month',
        businessTrips: 'Current year',
        corrections: 'Current year'
      }
    };

    const response: ApiResponse<typeof options> = {
      success: true,
      data: options
    };

    res.json(response);
  };

  /**
   * Preview export data (first 10 rows)
   * GET /export/preview
   */
  previewExport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can preview export data
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to preview export data', 403);
    }

    const { type = 'attendance' } = req.query;

    let previewData: unknown[];
    let validatedQuery: unknown;

    if (type === 'attendance') {
      validatedQuery = exportAttendanceSchema.parse({ ...req.query, format: 'csv' });
      
      // Get small sample of data for preview
      const exportData = await this.exportService.exportAttendanceData(
        user.companyId,
        validatedQuery as ExportOptions
      );

      // Convert buffer to string and parse first few rows
      const csvContent = exportData.buffer.toString('utf8');
      const rows = csvContent.split('\n').slice(0, 11); // Header + 10 data rows
      const headers = rows[0]?.split(',') ?? [];
      
      previewData = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] ?? '';
        });
        return obj;
      }).filter(row => Object.values(row).some(val => val)); // Remove empty rows

    } else if (type === 'business-trips') {
      const validatedQuery = exportBusinessTripsSchema.parse({ ...req.query, format: 'csv' });
      
      const exportData = await this.exportService.exportBusinessTripsData(
        user.companyId,
        validatedQuery
      );

      const csvContent = exportData.buffer.toString('utf8');
      const rows = csvContent.split('\n').slice(0, 11);
      const headers = rows[0]?.split(',') ?? [];
      
      previewData = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] ?? '';
        });
        return obj;
      }).filter(row => Object.values(row).some(val => val));

    } else if (type === 'corrections') {
      const validatedQuery = exportCorrectionsSchema.parse({ ...req.query, format: 'csv' });
      
      const exportData = await this.exportService.exportCorrectionsData(
        user.companyId,
        validatedQuery
      );

      const csvContent = exportData.buffer.toString('utf8');
      const rows = csvContent.split('\n').slice(0, 11);
      const headers = rows[0]?.split(',') ?? [];
      
      previewData = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] ?? '';
        });
        return obj;
      }).filter(row => Object.values(row).some(val => val));

    } else {
      throw new CustomError('Invalid export type. Must be: attendance, business-trips, or corrections', 400);
    }

    const response: ApiResponse<{
      type: string;
      totalRows: number;
      previewRows: unknown[];
      appliedFilters: unknown;
    }> = {
      success: true,
      data: {
        type: type as string,
        totalRows: previewData.length,
        previewRows: previewData.slice(0, 10),
        appliedFilters: validatedQuery
      }
    };

    res.json(response);
  };
}
