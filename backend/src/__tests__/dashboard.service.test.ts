import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DashboardService } from '../services/dashboard.service.js';
import { prisma } from '../utils/database.js';

// Mock dependencies
vi.mock('../utils/database.js', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    attendanceEvent: {
      findMany: vi.fn(),
    },
    alert: {
      count: vi.fn(),
    },
    locationLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('DashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock current date to ensure consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    const mockEmployees = [
      {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        attendanceEvents: [
          {
            type: 'CLOCK_IN',
            timestamp: new Date('2024-01-15T08:00:00.000Z'),
          },
        ],
      },
      {
        id: 'user2',
        firstName: 'Jane',
        lastName: 'Smith',
        attendanceEvents: [
          {
            type: 'CLOCK_IN',
            timestamp: new Date('2024-01-15T08:30:00.000Z'),
          },
          {
            type: 'BREAK_START',
            timestamp: new Date('2024-01-15T09:00:00.000Z'),
          },
        ],
      },
      {
        id: 'user3',
        firstName: 'Bob',
        lastName: 'Johnson',
        attendanceEvents: [
          {
            type: 'CLOCK_IN',
            timestamp: new Date('2024-01-15T08:00:00.000Z'),
          },
          {
            type: 'CLOCK_OUT',
            timestamp: new Date('2024-01-15T09:30:00.000Z'),
          },
        ],
      },
    ];

    it('should return correct dashboard statistics', async () => {
      (prisma.user.findMany as any).mockResolvedValue(mockEmployees);
      (prisma.user.count as any).mockResolvedValue(3);
      (prisma.alert.count as any).mockResolvedValue(2);

      const result = await DashboardService.getDashboardStats('company1');

      expect(result).toEqual({
        employeesAtWork: 1, // user1 is clocked in
        employeesOnBreak: 1, // user2 is on break
        employeesOffWork: 1, // user3 is clocked out
        totalEmployees: 3,
        totalHoursToday: 1.5, // user3 worked 1.5 hours
        activeAlerts: 2,
        averageWorkingHours: 0.5, // 1.5 hours / 3 employees
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company1',
          isActive: true,
          role: 'EMPLOYEE',
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: expect.any(Date),
              },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
      });
    });

    it('should handle employees with no events today', async () => {
      const employeesWithNoEvents = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          attendanceEvents: [],
        },
      ];

      (prisma.user.findMany as any).mockResolvedValue(employeesWithNoEvents);
      (prisma.user.count as any).mockResolvedValue(1);
      (prisma.alert.count as any).mockResolvedValue(0);

      const result = await DashboardService.getDashboardStats('company1');

      expect(result).toEqual({
        employeesAtWork: 0,
        employeesOnBreak: 0,
        employeesOffWork: 1,
        totalEmployees: 1,
        totalHoursToday: 0,
        activeAlerts: 0,
        averageWorkingHours: 0,
      });
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(DashboardService.getDashboardStats('company1'))
        .rejects.toThrow('Database error');
    });
  });

  describe('getEmployeeStatuses', () => {
    const mockEmployees = [
      {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        attendanceEvents: [
          {
            type: 'CLOCK_IN',
            timestamp: new Date('2024-01-15T08:00:00.000Z'),
          },
        ],
      },
    ];

    const mockLocationLogs = [
      {
        userId: 'user1',
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
        timestamp: new Date('2024-01-15T09:30:00.000Z'),
      },
    ];

    it('should return employee statuses with locations', async () => {
      (prisma.user.findMany as any).mockResolvedValue(mockEmployees);
      (prisma.locationLog.findMany as any).mockResolvedValue(mockLocationLogs);

      const result = await DashboardService.getEmployeeStatuses('company1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'CLOCKED_IN',
        lastEvent: {
          type: 'CLOCK_IN',
          timestamp: new Date('2024-01-15T08:00:00.000Z'),
        },
        lastLocation: {
          latitude: 48.1486,
          longitude: 17.1077,
          accuracy: 10,
          timestamp: new Date('2024-01-15T09:30:00.000Z'),
        },
        hoursToday: 2, // 2 hours since clock in
      });
    });

    it('should handle employees without location data', async () => {
      (prisma.user.findMany as any).mockResolvedValue(mockEmployees);
      (prisma.locationLog.findMany as any).mockResolvedValue([]);

      const result = await DashboardService.getEmployeeStatuses('company1');

      expect(result[0].lastLocation).toBeNull();
    });
  });

  describe('getCompanyAnalytics', () => {
    const mockAttendanceEvents = [
      {
        userId: 'user1',
        type: 'CLOCK_IN',
        timestamp: new Date('2024-01-15T08:00:00.000Z'),
        user: { firstName: 'John', lastName: 'Doe' },
      },
      {
        userId: 'user1',
        type: 'CLOCK_OUT',
        timestamp: new Date('2024-01-15T17:00:00.000Z'),
        user: { firstName: 'John', lastName: 'Doe' },
      },
      {
        userId: 'user2',
        type: 'CLOCK_IN',
        timestamp: new Date('2024-01-15T09:00:00.000Z'),
        user: { firstName: 'Jane', lastName: 'Smith' },
      },
      {
        userId: 'user2',
        type: 'CLOCK_OUT',
        timestamp: new Date('2024-01-15T18:00:00.000Z'),
        user: { firstName: 'Jane', lastName: 'Smith' },
      },
    ];

    it('should return analytics for date range', async () => {
      (prisma.attendanceEvent.findMany as any).mockResolvedValue(mockAttendanceEvents);

      const startDate = new Date('2024-01-15T00:00:00.000Z');
      const endDate = new Date('2024-01-15T23:59:59.999Z');

      const result = await DashboardService.getCompanyAnalytics(
        'company1',
        { from: startDate, to: endDate }
      );

      expect(result).toEqual({
        totalEmployees: 2,
        totalWorkingHours: 18, // 9 hours for user1 + 9 hours for user2
        averageHoursPerEmployee: 9,
        totalWorkingDays: 2,
        punctualityScore: expect.any(Number),
        attendanceRate: expect.any(Number),
        topPerformers: expect.any(Array),
        dailyBreakdown: expect.any(Array),
      });

      expect(prisma.attendanceEvent.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company1',
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: 'asc' },
      });
    });

    it('should handle empty date range', async () => {
      (prisma.attendanceEvent.findMany as any).mockResolvedValue([]);

      const result = await DashboardService.getCompanyAnalytics(
        'company1',
        { from: new Date('2024-01-15T00:00:00.000Z'), to: new Date('2024-01-15T23:59:59.999Z') }
      );

      expect(result).toEqual({
        totalEmployees: 0,
        totalWorkingHours: 0,
        averageHoursPerEmployee: 0,
        totalWorkingDays: 0,
        punctualityScore: 0,
        attendanceRate: 0,
        topPerformers: [],
        dailyBreakdown: [],
      });
    });
  });

  describe('getLiveEmployeeLocations', () => {
    const mockLocationLogs = [
      {
        userId: 'user1',
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
        timestamp: new Date('2024-01-15T09:30:00.000Z'),
        user: {
          firstName: 'John',
          lastName: 'Doe',
          attendanceEvents: [
            {
              type: 'CLOCK_IN',
              timestamp: new Date('2024-01-15T08:00:00.000Z'),
            },
          ],
        },
      },
    ];

    it('should return live employee locations', async () => {
      (prisma.locationLog.findMany as any).mockResolvedValue(mockLocationLogs);

      const result = await DashboardService.getLiveEmployeeLocations('company1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
        timestamp: new Date('2024-01-15T09:30:00.000Z'),
        status: 'CLOCKED_IN',
      });
    });

    it('should only return locations from last 15 minutes', async () => {
      await DashboardService.getLiveEmployeeLocations('company1');

      expect(prisma.locationLog.findMany).toHaveBeenCalledWith({
        where: {
          user: { companyId: 'company1' },
          timestamp: {
            gte: expect.any(Date), // Should be 15 minutes ago
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              attendanceEvents: {
                where: {
                  timestamp: {
                    gte: expect.any(Date),
                  },
                },
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        distinct: ['userId'],
      });
    });
  });
});
