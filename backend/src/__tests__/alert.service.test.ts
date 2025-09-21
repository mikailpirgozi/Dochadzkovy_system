import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AlertService, GeofenceViolation } from '../services/alert.service.js';
import { prisma } from '../utils/database.js';
import { PushService } from '../services/push.service.js';
import { EmailService } from '../services/email.service.js';
import { NotificationPreferencesService } from '../services/notificationPreferences.service.js';

// Mock dependencies
vi.mock('../utils/database.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    alert: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    attendanceEvent: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../services/push.service.js', () => ({
  PushService: {
    sendNotification: vi.fn(),
  },
}));

vi.mock('../services/email.service.js', () => ({
  EmailService: {
    sendAlertEmail: vi.fn(),
  },
}));

vi.mock('../services/notificationPreferences.service.js', () => ({
  NotificationPreferencesService: {
    getUserPreferences: vi.fn(),
  },
}));

vi.mock('../utils/helpers.js', () => ({
  calculateDistance: vi.fn(),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('AlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processGeofenceViolation', () => {
    const mockViolation: GeofenceViolation = {
      userId: 'user1',
      location: { latitude: 48.1486, longitude: 17.1077, accuracy: 10 },
      distance: 150,
      timestamp: Date.now(),
      violationType: 'LEFT_GEOFENCE',
    };

    const mockUser = {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      companyId: 'company1',
      company: {
        id: 'company1',
        name: 'Test Company',
        geofence: { latitude: 48.1486, longitude: 17.1077, radius: 100 },
      },
      attendanceEvents: [{
        type: 'CLOCK_IN',
        timestamp: new Date(),
      }],
    };

    it('should process geofence violation successfully', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.alert.findFirst as any).mockResolvedValue(null); // No existing alert
      (prisma.alert.create as any).mockResolvedValue({ id: 'alert1' });
      (NotificationPreferencesService.getUserPreferences as any).mockResolvedValue({
        push: { geofence: true },
        email: { geofence: true },
      });

      await AlertService.processGeofenceViolation(mockViolation);

      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          userId: mockViolation.userId,
          type: 'LEFT_GEOFENCE',
          title: 'Opustenie pracoviska',
          message: expect.stringContaining('opustil pracovisko'),
          data: expect.objectContaining({
            distance: mockViolation.distance,
            location: mockViolation.location,
          }),
          resolved: false,
        },
      });

      expect(PushService.sendToUsers).toHaveBeenCalled();
    });

    it('should not create duplicate alert within cooldown period', async () => {
      const existingAlert = {
        id: 'existing-alert',
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        resolved: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.alert.findFirst as any).mockResolvedValue(existingAlert);

      await AlertService.processGeofenceViolation(mockViolation);

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(AlertService.processGeofenceViolation(mockViolation))
        .resolves.not.toThrow();

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });

    it('should handle user not clocked in', async () => {
      const userNotClockedIn = {
        ...mockUser,
        attendanceEvents: [{
          type: 'CLOCK_OUT',
          timestamp: new Date(),
        }],
      };

      (prisma.user.findUnique as any).mockResolvedValue(userNotClockedIn);

      await AlertService.processGeofenceViolation(mockViolation);

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });
  });

  describe('checkLongBreakViolation', () => {
    it('should detect long breaks and create alerts', async () => {
      const mockUsers = [{
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        attendanceEvents: [{
          type: 'BREAK_START',
          timestamp: new Date(Date.now() - 70 * 60 * 1000), // 70 minutes ago
        }],
      }];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      (prisma.alert.findFirst as any).mockResolvedValue(null);
      (prisma.alert.create as any).mockResolvedValue({ id: 'alert1' });

      await AlertService.checkLongBreakViolation('user1');

      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'LONG_BREAK',
          title: 'Dlhá prestávka',
          message: expect.stringContaining('prestávka trvá už'),
          resolved: false,
        },
      });
    });

    it('should not create alert for normal break duration', async () => {
      const mockUsers = [{
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        attendanceEvents: [{
          type: 'BREAK_START',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        }],
      }];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      await AlertService.checkLongBreakViolation('user1');

      expect(prisma.alert.create).not.toHaveBeenCalled();
    });
  });

  describe('checkMissingClockOuts', () => {
    it('should detect missing clock outs and create alerts', async () => {
      const mockUsers = [{
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        attendanceEvents: [{
          type: 'CLOCK_IN',
          timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000), // 15 hours ago
        }],
      }];

      (prisma.user.findMany as any).mockResolvedValue(mockUsers);
      (prisma.alert.findFirst as any).mockResolvedValue(null);
      (prisma.alert.create as any).mockResolvedValue({ id: 'alert1' });

      await AlertService.checkMissingClockOut();

      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'MISSING_CLOCK_OUT',
          title: 'Chýba odpipnutie',
          message: expect.stringContaining('nezabudol sa odpipnúť'),
          resolved: false,
        },
      });
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts for company', async () => {
      const mockAlerts = [
        {
          id: 'alert1',
          type: 'LEFT_GEOFENCE',
          title: 'Geofence Alert',
          message: 'User left work area',
          resolved: false,
          createdAt: new Date(),
          user: { firstName: 'John', lastName: 'Doe' },
        },
      ];

      (prisma.alert.findMany as any).mockResolvedValue(mockAlerts);
      (prisma.alert.count as any).mockResolvedValue(1);

      const result = await AlertService.getActiveAlerts('company1');

      expect(result).toEqual(mockAlerts);
      expect(mockAlerts.length).toBe(1);
      expect(prisma.alert.findMany).toHaveBeenCalledWith({
        where: {
          resolved: false,
          user: { companyId: 'company1' },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      const mockAlert = {
        id: 'alert1',
        resolved: false,
        user: { companyId: 'company1' },
      };

      (prisma.alert.findUnique as any).mockResolvedValue(mockAlert);
      (prisma.alert.update as any).mockResolvedValue({
        ...mockAlert,
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: 'admin1',
      });

      const result = await AlertService.resolveAlert('alert1', 'admin1');

      expect(result).toBeDefined();
      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert1' },
        data: {
          resolved: true,
          resolvedAt: expect.any(Date),
          resolvedBy: 'admin1',
        },
      });
    });

    it('should throw error if alert not found', async () => {
      (prisma.alert.findUnique as any).mockResolvedValue(null);

      await expect(AlertService.resolveAlert('nonexistent', 'admin1'))
        .rejects.toThrow('Alert not found');
    });

    it('should throw error if alert belongs to different company', async () => {
      const mockAlert = {
        id: 'alert1',
        resolved: false,
        user: { companyId: 'different-company' },
      };

      (prisma.alert.findUnique as any).mockResolvedValue(mockAlert);

      await expect(AlertService.resolveAlert('alert1', 'admin1'))
        .rejects.toThrow('Alert not found or access denied');
    });
  });
});
