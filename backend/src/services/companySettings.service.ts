import { prisma } from '../utils/database.js';
import type { CompanySettings } from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

export class CompanySettingsService {
  /**
   * Get company settings
   */
  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    console.log(`[CompanySettingsService] Looking for company with ID: ${companyId}`);
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, settings: true }
    });

    console.log(`[CompanySettingsService] Found company:`, company);

    if (!company) {
      console.log(`[CompanySettingsService] Company not found with ID: ${companyId}`);
      throw new CustomError('Company not found', 404);
    }

    // Return default settings if none exist
    const defaultSettings: CompanySettings = {
      workingHours: {
        start: '08:00',
        end: '17:00'
      },
      breakSettings: {
        maxBreakDuration: 60, // minutes
        requireBreakApproval: false
      },
      geofenceSettings: {
        alertAfterMinutes: 5,
        strictMode: false
      },
      notifications: {
        emailAlerts: true,
        pushNotifications: true
      }
    };

    if (!company.settings || typeof company.settings !== 'object') {
      // Save default settings to database
      await prisma.company.update({
        where: { id: companyId },
        data: { settings: defaultSettings as any }
      });
      return defaultSettings;
    }

    // Merge with defaults to ensure all properties exist
    const mergedSettings: CompanySettings = {
      workingHours: {
        start: (company.settings as any).workingHours?.start || defaultSettings.workingHours.start,
        end: (company.settings as any).workingHours?.end || defaultSettings.workingHours.end
      },
      breakSettings: {
        maxBreakDuration: (company.settings as any).breakSettings?.maxBreakDuration || defaultSettings.breakSettings.maxBreakDuration,
        requireBreakApproval: (company.settings as any).breakSettings?.requireBreakApproval ?? defaultSettings.breakSettings.requireBreakApproval
      },
      geofenceSettings: {
        alertAfterMinutes: (company.settings as any).geofenceSettings?.alertAfterMinutes || defaultSettings.geofenceSettings.alertAfterMinutes,
        strictMode: (company.settings as any).geofenceSettings?.strictMode ?? defaultSettings.geofenceSettings.strictMode
      },
      notifications: {
        emailAlerts: (company.settings as any).notifications?.emailAlerts ?? defaultSettings.notifications.emailAlerts,
        pushNotifications: (company.settings as any).notifications?.pushNotifications ?? defaultSettings.notifications.pushNotifications
      }
    };

    // If settings were incomplete, update them in database
    const currentSettingsString = JSON.stringify(company.settings);
    const mergedSettingsString = JSON.stringify(mergedSettings);
    
    if (currentSettingsString !== mergedSettingsString) {
      await prisma.company.update({
        where: { id: companyId },
        data: { settings: mergedSettings as any }
      });
    }

    return mergedSettings;
  }

  /**
   * Update company settings
   */
  async updateCompanySettings(
    companyId: string,
    settings: Partial<CompanySettings>
  ): Promise<CompanySettings> {
    // Get current settings
    const currentSettings = await this.getCompanySettings(companyId);

    // Merge with new settings
    const updatedSettings: CompanySettings = {
      workingHours: {
        start: settings.workingHours?.start || currentSettings.workingHours.start,
        end: settings.workingHours?.end || currentSettings.workingHours.end
      },
      breakSettings: {
        maxBreakDuration: settings.breakSettings?.maxBreakDuration || currentSettings.breakSettings.maxBreakDuration,
        requireBreakApproval: settings.breakSettings?.requireBreakApproval ?? currentSettings.breakSettings.requireBreakApproval
      },
      geofenceSettings: {
        alertAfterMinutes: settings.geofenceSettings?.alertAfterMinutes || currentSettings.geofenceSettings.alertAfterMinutes,
        strictMode: settings.geofenceSettings?.strictMode ?? currentSettings.geofenceSettings.strictMode
      },
      notifications: {
        emailAlerts: settings.notifications?.emailAlerts ?? currentSettings.notifications.emailAlerts,
        pushNotifications: settings.notifications?.pushNotifications ?? currentSettings.notifications.pushNotifications
      }
    };

    // Validate working hours
    if (updatedSettings.workingHours.start >= updatedSettings.workingHours.end) {
      throw new CustomError('Start time must be before end time', 400);
    }

    // Validate break duration
    if (updatedSettings.breakSettings.maxBreakDuration < 15 || updatedSettings.breakSettings.maxBreakDuration > 240) {
      throw new CustomError('Break duration must be between 15 and 240 minutes', 400);
    }

    // Validate alert time
    if (updatedSettings.geofenceSettings.alertAfterMinutes < 1 || updatedSettings.geofenceSettings.alertAfterMinutes > 60) {
      throw new CustomError('Alert time must be between 1 and 60 minutes', 400);
    }

    // Update in database
    await prisma.company.update({
      where: { id: companyId },
      data: { settings: updatedSettings as any }
    });

    return updatedSettings;
  }

  /**
   * Reset company settings to defaults
   */
  async resetCompanySettings(companyId: string): Promise<CompanySettings> {
    const defaultSettings: CompanySettings = {
      workingHours: {
        start: '08:00',
        end: '17:00'
      },
      breakSettings: {
        maxBreakDuration: 60,
        requireBreakApproval: false
      },
      geofenceSettings: {
        alertAfterMinutes: 5,
        strictMode: false
      },
      notifications: {
        emailAlerts: true,
        pushNotifications: true
      }
    };

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: defaultSettings as any }
    });

    return defaultSettings;
  }

  /**
   * Get working hours for a specific day
   */
  async getWorkingHoursForDay(companyId: string, _date: Date): Promise<{ start: string; end: string }> {
    const settings = await this.getCompanySettings(companyId);
    
    // For now, return the same working hours for all days
    // In the future, this could be extended to support different hours for different days
    return settings.workingHours;
  }

  /**
   * Check if time is within working hours
   */
  async isWithinWorkingHours(companyId: string, time: Date): Promise<boolean> {
    const workingHours = await this.getWorkingHoursForDay(companyId, time);
    
    const timeString = time.toTimeString().slice(0, 5); // HH:mm format
    
    return timeString >= workingHours.start && timeString <= workingHours.end;
  }

  /**
   * Calculate expected working hours for a day
   */
  async calculateExpectedWorkingHours(companyId: string, date: Date): Promise<number> {
    const workingHours = await this.getWorkingHoursForDay(companyId, date);
    const settings = await this.getCompanySettings(companyId);
    
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    
    const startMinutes = (startHour || 0) * 60 + (startMinute || 0);
    const endMinutes = (endHour || 0) * 60 + (endMinute || 0);
    
    const totalMinutes = endMinutes - startMinutes;
    const breakMinutes = settings.breakSettings.maxBreakDuration;
    
    // Subtract break time from total working time
    const workingMinutes = totalMinutes - breakMinutes;
    
    return workingMinutes / 60; // Return hours
  }
}
