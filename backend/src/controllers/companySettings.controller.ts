import type { Response } from 'express';
import { z } from 'zod';
import { CompanySettingsService } from '../services/companySettings.service.js';
import type { AuthenticatedRequest, ApiResponse, CompanySettings } from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

// Validation schemas
const workingHoursSchema = z.object({
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)')
});

const breakSettingsSchema = z.object({
  maxBreakDuration: z.number().min(15, 'Break duration must be at least 15 minutes').max(240, 'Break duration must be at most 240 minutes'),
  requireBreakApproval: z.boolean()
});

const geofenceSettingsSchema = z.object({
  alertAfterMinutes: z.number().min(1, 'Alert time must be at least 1 minute').max(60, 'Alert time must be at most 60 minutes'),
  strictMode: z.boolean()
});

const notificationSettingsSchema = z.object({
  emailAlerts: z.boolean(),
  pushNotifications: z.boolean()
});

const updateCompanySettingsSchema = z.object({
  workingHours: workingHoursSchema.optional(),
  breakSettings: breakSettingsSchema.optional(),
  geofenceSettings: geofenceSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one setting must be provided' }
);

export class CompanySettingsController {
  private readonly companySettingsService = new CompanySettingsService();

  /**
   * Get company settings
   * GET /companies/settings
   */
  getCompanySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only company admins can view settings
    if (!['COMPANY_ADMIN'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to view company settings', 403);
    }

    const settings = await this.companySettingsService.getCompanySettings(user.companyId);

    const response: ApiResponse<CompanySettings> = {
      success: true,
      data: settings
    };

    res.json(response);
  };

  /**
   * Update company settings
   * PUT /companies/settings
   */
  updateCompanySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only company admins can update settings
    if (!['COMPANY_ADMIN'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to update company settings', 403);
    }

    const validatedData = updateCompanySettingsSchema.parse(req.body);

    // Additional validation for working hours
    if (validatedData.workingHours) {
      const { start, end } = validatedData.workingHours;
      if (start >= end) {
        throw new CustomError('Start time must be before end time', 400);
      }
    }

    const settings = await this.companySettingsService.updateCompanySettings(
      user.companyId,
      validatedData as Partial<CompanySettings>
    );

    const response: ApiResponse<CompanySettings> = {
      success: true,
      data: settings,
      message: 'Company settings updated successfully'
    };

    res.json(response);
  };

  /**
   * Reset company settings to defaults
   * POST /companies/settings/reset
   */
  resetCompanySettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only company admins can reset settings
    if (!['COMPANY_ADMIN'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to reset company settings', 403);
    }

    const settings = await this.companySettingsService.resetCompanySettings(user.companyId);

    const response: ApiResponse<CompanySettings> = {
      success: true,
      data: settings,
      message: 'Company settings reset to defaults successfully'
    };

    res.json(response);
  };

  /**
   * Get working hours for a specific date
   * GET /companies/settings/working-hours
   */
  getWorkingHours = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { date } = req.query;

    const targetDate: Date = date ? new Date(date as string) : new Date();

    if (isNaN(targetDate.getTime())) {
      throw new CustomError('Invalid date format', 400);
    }

    const workingHours = await this.companySettingsService.getWorkingHoursForDay(
      user.companyId,
      targetDate
    );

    const response: ApiResponse<{ start: string; end: string; date: string }> = {
      success: true,
      data: {
        start: workingHours.start,
        end: workingHours.end,
        date: targetDate.toISOString().split('T')[0] ?? ''
      }
    };

    res.json(response);
  };

  /**
   * Check if current time is within working hours
   * GET /companies/settings/is-working-time
   */
  isWorkingTime = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { time } = req.query;

    const targetTime = time ? new Date(time as string) : new Date();

    if (isNaN(targetTime.getTime())) {
      throw new CustomError('Invalid time format', 400);
    }

    const isWithinWorkingHours = await this.companySettingsService.isWithinWorkingHours(
      user.companyId,
      targetTime
    );

    const response: ApiResponse<{ isWorkingTime: boolean; time: string }> = {
      success: true,
      data: {
        isWorkingTime: isWithinWorkingHours,
        time: targetTime.toISOString()
      }
    };

    res.json(response);
  };

  /**
   * Calculate expected working hours for a date
   * GET /companies/settings/expected-hours
   */
  getExpectedWorkingHours = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { date } = req.query;

    const targetDate: Date = date ? new Date(date as string) : new Date();

    if (isNaN(targetDate.getTime())) {
      throw new CustomError('Invalid date format', 400);
    }

    const expectedHours = await this.companySettingsService.calculateExpectedWorkingHours(
      user.companyId,
      targetDate
    );

    const response: ApiResponse<{ expectedHours: number; date: string }> = {
      success: true,
      data: {
        expectedHours,
        date: targetDate.toISOString().split('T')[0] ?? ''
      }
    };

    res.json(response);
  };
}
