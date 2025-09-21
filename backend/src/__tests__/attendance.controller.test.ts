import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Response } from 'express';
import { AttendanceController } from '../controllers/attendance.controller.js';
import { prisma } from '../utils/database.js';
import { isWithinGeofence, calculateDistance } from '../utils/helpers.js';
import type { AuthenticatedRequest } from '../types/index.js';

// Mock Prisma
vi.mock('../utils/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    company: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock helpers
vi.mock('../utils/helpers.js', () => ({
  isWithinGeofence: vi.fn(),
  calculateDistance: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AttendanceController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      body: {},
      user: {
        id: 'user1', 
        companyId: 'company1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'EMPLOYEE',
        password: 'hashed-password',
        isActive: true,
        settings: {},
        pushToken: null,
        pushTokenPlatform: null,
        pushTokenUpdatedAt: null,
        notificationSettings: {},
        deviceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      company: {
        id: 'company1',
        name: 'Test Company',
        slug: 'test-company',
        qrCode: 'valid-qr-code',
        settings: {},
        geofence: {
          latitude: 48.1486,
          longitude: 17.1077,
          radius: 100,
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('clockIn', () => {
    it('should successfully clock in with valid QR code and location', async () => {
      const mockEvent = {
        id: 'event1',
        userId: 'user1',
        type: 'CLOCK_IN',
        timestamp: new Date(),
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
        },
        qrVerified: true,
      };

      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(null);
      (isWithinGeofence as any).mockReturnValue(true);
      (prisma.attendanceEvent.create as any).mockResolvedValue(mockEvent);

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.attendanceEvent.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { timestamp: 'desc' },
      });

      expect(isWithinGeofence).toHaveBeenCalledWith(
        48.1486,
        17.1077,
        48.1486,
        17.1077,
        100
      );

      expect(prisma.attendanceEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'CLOCK_IN',
          timestamp: expect.any(Date),
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
          qrVerified: true,
          notes: undefined,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
      });
    });

    it('should reject clock in with invalid QR code', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
        company: {
          qrCode: 'valid-qr-code',
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100,
          },
        },
      };

      mockReq.body = {
        qrCode: 'invalid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Neplatný QR kód',
      });
    });

    it('should reject clock in outside geofence', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
        company: {
          qrCode: 'valid-qr-code',
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100,
          },
        },
      };

      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.2000, // Far from geofence
          longitude: 17.2000,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (isWithinGeofence as any).mockReturnValue(false);
      (calculateDistance as any).mockReturnValue(500);

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Ste príliš ďaleko od pracoviska (500m). Maximálna vzdialenosť je 100m.',
      });
    });

    it('should reject clock in when already clocked in', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
        company: {
          qrCode: 'valid-qr-code',
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100,
          },
        },
      };

      const mockLastEvent = {
        id: 'event1',
        type: 'CLOCK_IN',
        timestamp: new Date(),
      };

      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockLastEvent);

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Už ste prihlásený do práce. Najprv sa odhláste.',
      });
    });
  });

  describe('clockOut', () => {
    it('should successfully clock out', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
        company: {
          qrCode: 'valid-qr-code',
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100,
          },
        },
      };

      const mockLastEvent = {
        id: 'event1',
        type: 'CLOCK_IN',
        timestamp: new Date(),
      };

      const mockEvent = {
        id: 'event2',
        userId: 'user1',
        type: 'CLOCK_OUT',
        timestamp: new Date(),
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
        },
        qrVerified: true,
      };

      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockLastEvent);
      (isWithinGeofence as any).mockReturnValue(true);
      (prisma.attendanceEvent.create as any).mockResolvedValue(mockEvent);

      await AttendanceController.clockOut(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.attendanceEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'CLOCK_OUT',
          timestamp: expect.any(Date),
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
          qrVerified: true,
          notes: undefined,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
      });
    });

    it('should reject clock out when not clocked in', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
        company: {
          qrCode: 'valid-qr-code',
          geofence: {
            latitude: 48.1486,
            longitude: 17.1077,
            radius: 100,
          },
        },
      };

      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(null);

      await AttendanceController.clockOut(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Nie ste prihlásený do práce.',
      });
    });
  });

  describe('getStatus', () => {
    it('should return current attendance status', async () => {
      const mockLastEvent = {
        id: 'event1',
        type: 'CLOCK_IN',
        timestamp: new Date(),
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
        },
        qrVerified: true,
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockLastEvent);

      await AttendanceController.getStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.attendanceEvent.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        orderBy: { timestamp: 'desc' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'CLOCKED_IN',
        lastEvent: mockLastEvent,
      });
    });

    it('should return CLOCKED_OUT when no events', async () => {
      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(null);

      await AttendanceController.getStatus(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'CLOCKED_OUT',
        lastEvent: null,
        currentShift: null,
      });
    });
  });

  describe('startBreak', () => {
    it('should successfully start break', async () => {
      const mockLastEvent = {
        id: 'event1',
        type: 'CLOCK_IN',
        timestamp: new Date(),
      };

      const mockBreakEvent = {
        id: 'event2',
        userId: 'user1',
        companyId: 'company1',
        type: 'BREAK_START',
        timestamp: new Date(),
        qrVerified: false,
      };

      mockReq.body = {
        type: 'BREAK_START',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockLastEvent);
      (prisma.attendanceEvent.create as any).mockResolvedValue(mockBreakEvent);

      await AttendanceController.startBreak(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(prisma.attendanceEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'BREAK_START',
          timestamp: expect.any(Date),
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
          qrVerified: false,
          notes: undefined,
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBreakEvent,
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Chyba pri prihlasovaní do práce. Skúste to znovu.',
      });
    });

    it('should handle missing user gracefully', async () => {
      mockReq.body = {
        qrCode: 'valid-qr-code',
        location: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: Date.now(),
        },
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await AttendanceController.clockIn(mockReq as AuthenticatedRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Chyba pri prihlasovaní do práce. Skúste to znovu.',
      });
    });
  });
});