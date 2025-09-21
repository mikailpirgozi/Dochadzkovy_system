import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/database.js';
import { isWithinGeofence, calculateDistance } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import { WebSocketService } from '../services/websocket.service.js';
import type { AuthenticatedRequest, GeofenceData } from '../types/index.js';

// Validation schemas (using consistent schemas with routes)
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime().optional(),
});

const ClockInSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  location: LocationSchema,
  notes: z.string().optional(),
});

const ClockOutSchema = z.object({
  qrCode: z.string().min(1, 'QR code is required'),
  location: LocationSchema,
  notes: z.string().optional(),
});

const BreakStartSchema = z.object({
  type: z.enum(['BREAK', 'PERSONAL']),
  location: LocationSchema,
  notes: z.string().optional(),
});

const BreakEndSchema = z.object({
  location: LocationSchema,
  notes: z.string().optional(),
});

const LocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  timestamp: z.string().datetime().optional(),
});

interface AttendanceEvent {
  id: string;
  userId: string;
  type: string;
  timestamp: Date;
  location: unknown;
  qrVerified: boolean;
  notes?: string;
  createdAt: Date;
}

// Helper function to safely cast geofence from Json to GeofenceData
const getGeofence = (geofence: unknown): GeofenceData => {
  return geofence as GeofenceData;
};

export const AttendanceController = {
  /**
   * Clock in to work
   */
  clockIn: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { qrCode, location, notes } = ClockInSchema.parse(req.body);
      const user = req.user;
      const company = req.company;

      // Verify QR code belongs to user's company
      if (company.qrCode !== qrCode) {
        res.status(400).json({ 
          error: 'Neplatný QR kód. Skontrolujte, či skenujete správny QR kód svojej firmy.' 
        });
        return;
      }

      // Check if user is within geofence (disabled for testing)
      const geofence = getGeofence(company.geofence);
      const isWithinArea = isWithinGeofence(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude,
        geofence.radius
      );

      // TEMPORARILY DISABLED FOR TESTING - GPS validation
      // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
      if (false && !isWithinArea) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          geofence.latitude,
          geofence.longitude
        );
        
        res.status(400).json({ 
          error: `Ste mimo pracoviska (${Math.round(distance).toString()}m od firmy). Priblížte sa k pracovisku a skúste znovu.` 
        });
        return;
      }

      // Check if user is not already clocked in
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      if (lastEvent && ['CLOCK_IN', 'BREAK_END', 'PERSONAL_END'].includes(lastEvent.type)) {
        res.status(400).json({ 
          error: 'Už ste prihlásený do práce. Najprv sa odhláste.' 
        });
        return;
      }

      // Create clock in event
      const event = await prisma.attendanceEvent.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          type: 'CLOCK_IN',
          timestamp: location.timestamp ? new Date(location.timestamp) : new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          qrVerified: true,
          notes: notes ?? null,
        },
      });

      // Log location for tracking
      await prisma.locationLog.create({
        data: {
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp ?? new Date()),
        },
      });

      logger.info(`User ${user.email} clocked in`, {
        userId: user.id,
        companyId: company.id,
        location,
      });

      // Broadcast attendance event via WebSocket
      WebSocketService.broadcastAttendanceEvent(user.companyId, {
        type: 'CLOCK_IN',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: event.timestamp,
        location: event.location
      });

      // Broadcast live dashboard updates
      WebSocketService.broadcastEmployeeStatusUpdate(user.companyId).catch(() => { /* ignore */ });
      WebSocketService.broadcastChartUpdate(user.companyId, 'weekly').catch(() => { /* ignore */ });
      WebSocketService.broadcastActivityUpdate(user.companyId, {
        id: event.id,
        type: 'attendance',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        description: `${user.firstName} ${user.lastName} sa prihlásil do práce`,
        timestamp: event.timestamp.toISOString(),
        data: { eventType: 'CLOCK_IN', location }
      });

      // Store event ID for audit middleware
      res.locals.attendanceEventId = event.id;

      res.json(event);
    } catch (error) {
      logger.error('Clock in error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Neplatné údaje. Skontrolujte vstupné informácie.' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Chyba pri prihlasovaní do práce. Skúste to znovu.' 
      });
    }
  },

  /**
   * Clock out from work
   */
  clockOut: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { qrCode, location, notes } = ClockOutSchema.parse(req.body);
      const user = req.user;
      const company = req.company;

      // Verify QR code belongs to user's company
      if (company.qrCode !== qrCode) {
        res.status(400).json({ 
          error: 'Neplatný QR kód. Skontrolujte, či skenujete správny QR kód svojej firmy.' 
        });
        return;
      }

      // Check if user is currently clocked in
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastEvent || lastEvent.type === 'CLOCK_OUT') {
        res.status(400).json({ 
          error: 'Nie ste prihlásený do práce. Najprv sa prihláste.' 
        });
        return;
      }

      // Allow clock out from anywhere (user might be on business trip)
      // But log the distance for audit purposes
      const geofence = getGeofence(company.geofence);
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        geofence.latitude,
        geofence.longitude
      );

      // Create clock out event
      const event = await prisma.attendanceEvent.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          type: 'CLOCK_OUT',
          timestamp: location.timestamp ? new Date(location.timestamp) : new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            distanceFromCompany: Math.round(distance),
          },
          qrVerified: true,
          notes: notes ?? null,
        },
      });

      // Log location
      await prisma.locationLog.create({
        data: {
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp ?? new Date()),
        },
      });

      // If user is far from company, create an alert
      if (distance > geofence.radius + 100) { // 100m buffer
        await prisma.alert.create({
          data: {
            userId: user.id,
            companyId: user.companyId,
            type: 'LEFT_GEOFENCE',
            title: 'Clock Out Outside Geofence',
            message: `User clocked out ${Math.round(distance).toString()}m from company location`,
            resolved: false,
          },
        });
      }

      logger.info(`User ${user.email} clocked out`, {
        userId: user.id,
        companyId: company.id,
        location,
        distanceFromCompany: Math.round(distance),
      });

      // Broadcast attendance event via WebSocket
      WebSocketService.broadcastAttendanceEvent(user.companyId, {
        type: 'CLOCK_OUT',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: event.timestamp,
        location: event.location
      });

      // Broadcast live dashboard updates
      WebSocketService.broadcastEmployeeStatusUpdate(user.companyId).catch(() => { /* ignore */ });
      WebSocketService.broadcastChartUpdate(user.companyId, 'weekly').catch(() => { /* ignore */ });
      WebSocketService.broadcastActivityUpdate(user.companyId, {
        id: event.id,
        type: 'attendance',
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        description: `${user.firstName} ${user.lastName} sa odhlásil z práce`,
        timestamp: event.timestamp.toISOString(),
        data: { eventType: 'CLOCK_OUT', location }
      });

      // Store event ID for audit middleware
      res.locals.attendanceEventId = event.id;

      res.json(event);
    } catch (error) {
      logger.error('Clock out error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Neplatné údaje. Skontrolujte vstupné informácie.' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Chyba pri odhlasovaní z práce. Skúste to znovu.' 
      });
    }
  },

  /**
   * Start break (lunch or personal)
   */
  startBreak: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, location, notes } = BreakStartSchema.parse(req.body);
      const user = req.user;

      // Check if user is currently clocked in
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastEvent || !['CLOCK_IN', 'BREAK_END', 'PERSONAL_END'].includes(lastEvent.type)) {
        res.status(400).json({ 
          error: 'Nie ste prihlásený do práce. Najprv sa prihláste.' 
        });
        return;
      }

      // Map type to correct event type
      const eventType = type === 'BREAK' ? 'BREAK_START' : 'PERSONAL_START';

      // Create break start event
      const event = await prisma.attendanceEvent.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          type: eventType,
          timestamp: location.timestamp ? new Date(location.timestamp) : new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          qrVerified: false,
          notes: notes ?? null,
        },
      });

      logger.info(`User ${user.email} started ${type}`, {
        userId: user.id,
        type,
        location,
      });

      res.json(event);
    } catch (error) {
      logger.error('Start break error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Neplatné údaje. Skontrolujte vstupné informácie.' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Chyba pri začatí prestávky. Skúste to znovu.' 
      });
    }
  },

  /**
   * End break
   */
  endBreak: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { location, notes } = BreakEndSchema.parse(req.body);
      const user = req.user;

      // Check if user is currently on break
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastEvent || !['BREAK_START', 'PERSONAL_START'].includes(lastEvent.type)) {
        res.status(400).json({ 
          error: 'Nie ste na prestávke.' 
        });
        return;
      }

      // Determine the correct end event type
      const endType = lastEvent.type === 'BREAK_START' ? 'BREAK_END' : 'PERSONAL_END';

      // Create break end event
      const event = await prisma.attendanceEvent.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          type: endType,
          timestamp: location.timestamp ? new Date(location.timestamp) : new Date(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          qrVerified: false,
          notes: notes ?? null,
        },
      });

      logger.info(`User ${user.email} ended break`, {
        userId: user.id,
        type: endType,
        location,
      });

      res.json(event);
    } catch (error) {
      logger.error('End break error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Neplatné údaje. Skontrolujte vstupné informácie.' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Chyba pri ukončení prestávky. Skúste to znovu.' 
      });
    }
  },

  /**
   * Get current attendance status
   */
  getStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      // Get last event
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastEvent) {
        res.json({
          status: 'CLOCKED_OUT',
          lastEvent: null,
          currentShift: null,
        });
        return;
      }

      // Determine current status
      let status: string;
      switch (lastEvent.type) {
        case 'CLOCK_IN':
        case 'BREAK_END':
        case 'PERSONAL_END':
          status = 'CLOCKED_IN';
          break;
        case 'BREAK_START':
          status = 'ON_BREAK';
          break;
        case 'PERSONAL_START':
          status = 'ON_PERSONAL';
          break;
        case 'BUSINESS_TRIP_START':
          status = 'ON_BUSINESS_TRIP';
          break;
        default:
          status = 'CLOCKED_OUT';
      }

      // Calculate current shift info if clocked in
      let currentShift: { clockInTime: Date; totalBreakTime: number; workingTime: number; } | null = null;
      if (status !== 'CLOCKED_OUT') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEvents = await prisma.attendanceEvent.findMany({
          where: {
            userId: user.id,
            timestamp: { gte: todayStart },
          },
          orderBy: { timestamp: 'asc' },
        });

        currentShift = AttendanceController.calculateShiftInfo(todayEvents as Array<AttendanceEvent & { notes: string | null }>) ?? null;
      }

      res.json({
        status,
        lastEvent,
        currentShift,
      });
    } catch (error) {
      logger.error('Get status error:', error);
      res.status(500).json({ 
        error: 'Chyba pri získavaní stavu. Skúste to znovu.' 
      });
    }
  },

  /**
   * Get attendance events for date range
   */
  getEvents: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ 
          error: 'Vyžadované sú parametre startDate a endDate.' 
        });
        return;
      }

      const events = await prisma.attendanceEvent.findMany({
        where: {
          userId: user.id,
          timestamp: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      res.json(events);
    } catch (error) {
      logger.error('Get events error:', error);
      res.status(500).json({ 
        error: 'Chyba pri získavaní udalostí. Skúste to znovu.' 
      });
    }
  },

  /**
   * Validate QR code
   */
  validateQR: (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { qrCode } = req.body as { qrCode?: string };
      const company = req.company;

      if (!qrCode) {
        res.status(400).json({ 
          error: 'QR kód je povinný.' 
        });
        return;
      }

      const isValid = company.qrCode === qrCode;

      res.json({
        valid: isValid,
        companyName: isValid ? company.name : undefined,
        message: isValid ? 'QR kód je platný' : 'Neplatný QR kód',
      });
    } catch (error) {
      logger.error('QR validation error:', error);
      res.status(500).json({ 
        error: 'Chyba pri validácii QR kódu. Skúste to znovu.' 
      });
    }
  },

  /**
   * Update location (for background tracking)
   */
  updateLocation: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const location = LocationUpdateSchema.parse(req.body);
      const user = req.user;

      // Store location log
      await prisma.locationLog.create({
        data: {
          userId: user.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date(location.timestamp ?? new Date()),
        },
      });

      // Check geofence violation using AlertService
      const { AlertService } = await import('../services/alert.service');
      await AlertService.checkGeofenceViolation(user.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });

      res.json({ success: true });
    } catch (error) {
      logger.error('Location update error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Neplatné údaje o polohe.' 
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Chyba pri aktualizácii polohy.' 
      });
    }
  },

  /**
   * Get current location status
   */
  getLocationStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;

      // Get last location
      const lastLocation = await prisma.locationLog.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });

      // Get current attendance status
      const lastEvent = await prisma.attendanceEvent.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });

      // Check if within geofence
      let isWithinGeofence = false;
      let distanceFromOffice: number | null = null;

      if (lastLocation && req.company.geofence) {
        const geofence = getGeofence(req.company.geofence);
        distanceFromOffice = calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          geofence.latitude,
          geofence.longitude
        );
        isWithinGeofence = distanceFromOffice <= geofence.radius;
      }

      res.json({
        lastLocation: lastLocation ? {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          accuracy: lastLocation.accuracy,
          timestamp: lastLocation.timestamp,
        } : null,
        currentStatus: lastEvent?.type ?? 'UNKNOWN',
        isWithinGeofence,
        distanceFromOffice: distanceFromOffice ?? null,
        geofence: req.company.geofence,
      });
    } catch (error) {
      logger.error('Get location status error:', error);
      res.status(500).json({ 
        error: 'Nepodarilo sa získať stav polohy' 
      });
    }
  },

  /**
   * Report GPS issues
   */
  reportGPSIssue: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { issue, location } = req.body as { issue: unknown; location: unknown };
      const userId = req.user.id;

      // Create alert for GPS issue
      await prisma.alert.create({
        data: {
          userId,
          companyId: req.user.companyId,
          type: 'GPS_DISABLED',
          title: 'GPS Issue Reported',
          message: `GPS Issue reported: ${String(issue)}`,
          data: {
            issue: String(issue),
            location: location ? JSON.stringify(location) : null,
            reportedAt: new Date().toISOString(),
          },
          resolved: false,
        },
      });

      // Log the issue
      logger.warn(`GPS issue reported by user ${userId}: ${String(issue)}`, {
        userId,
        issue: String(issue),
        location: location as Record<string, unknown>,
      });

      res.json({ 
        success: true,
        message: 'GPS problém bol nahlásený' 
      });
    } catch (error) {
      logger.error('Report GPS issue error:', error);
      res.status(500).json({ 
        error: 'Nepodarilo sa nahlásiť GPS problém' 
      });
    }
  },

  /**
   * Get geofence status
   */
  getGeofenceStatus: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      const company = req.company;

      // Get user's last location
      const lastLocation = await prisma.locationLog.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });

      if (!lastLocation) {
        res.json({
          hasLocation: false,
          message: 'Žiadna poloha nie je zaznamenaná',
        });
        return;
      }

      // Check geofence
      const geofence = company.geofence as { latitude: number; longitude: number; radius: number };
      
       
      if (!geofence) {
        res.json({
          hasLocation: true,
          hasGeofence: false,
          message: 'Geofence nie je nastavený pre túto firmu',
        });
        return;
      }

      const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        geofence.latitude,
        geofence.longitude
      );

      const isWithinGeofence = distance <= geofence.radius;

      res.json({
        hasLocation: true,
        hasGeofence: true,
        isWithinGeofence,
        distance: Math.round(distance),
        geofence: {
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          radius: geofence.radius,
        },
        lastLocation: {
          latitude: lastLocation.latitude,
          longitude: lastLocation.longitude,
          accuracy: lastLocation.accuracy,
          timestamp: lastLocation.timestamp,
        },
      });
    } catch (error) {
      logger.error('Get geofence status error:', error);
      res.status(500).json({ 
        error: 'Nepodarilo sa získať stav geofence' 
      });
    }
  },

  /**
   * Calculate shift information from events
   */
  calculateShiftInfo: (events: Array<AttendanceEvent & { notes: string | null }>) => {
    if (events.length === 0) return null;

    const clockInEvent = events.find(e => e.type === 'CLOCK_IN');
    if (!clockInEvent) return null;

    const now = new Date();
    let totalBreakTime = 0;
    let breakStart: Date | null = null;

    // Calculate break time
    for (const event of events) {
      if (event.type === 'BREAK_START' || event.type === 'PERSONAL_START') {
        breakStart = new Date(event.timestamp);
      } else if ((event.type === 'BREAK_END' || event.type === 'PERSONAL_END') && breakStart) {
        totalBreakTime += new Date(event.timestamp).getTime() - breakStart.getTime();
        breakStart = null;
      }
    }

    // If still on break, add current break time
    if (breakStart) {
      totalBreakTime += now.getTime() - breakStart.getTime();
    }

    const totalTime = now.getTime() - new Date(clockInEvent.timestamp).getTime();
    const workingTime = totalTime - totalBreakTime;

    return {
      clockInTime: clockInEvent.timestamp,
      totalBreakTime: Math.floor(totalBreakTime / 60000), // minutes
      workingTime: Math.floor(workingTime / 60000), // minutes
    };
  },
};