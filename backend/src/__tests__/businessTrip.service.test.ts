import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BusinessTripService } from '../services/businessTrip.service.js';
import { prisma } from '../utils/database.js';

// Mock Prisma
vi.mock('../utils/database.js', () => ({
  prisma: {
    businessTrip: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    attendanceEvent: {
      create: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock email service
vi.mock('../services/email.service.js', () => ({
  EmailService: {
    prototype: {
      sendBusinessTripRequestEmail: vi.fn(),
      sendBusinessTripDecisionEmail: vi.fn(),
    },
  },
}));

describe('BusinessTripService', () => {
  let businessTripService: BusinessTripService;

  beforeEach(() => {
    businessTripService = new BusinessTripService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createBusinessTrip', () => {
    it('should successfully create a business trip request', async () => {
      const mockUser = {
        id: 'user1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        companyId: 'company1',
      };

      const mockTrip = {
        id: 'trip1',
        userId: 'user1',
        companyId: 'company1',
        destination: 'Prague',
        purpose: 'Client meeting',
        estimatedStart: new Date('2024-01-15T09:00:00Z'),
        estimatedEnd: new Date('2024-01-15T17:00:00Z'),
        status: 'PENDING',
        notes: 'Important client meeting',
        user: mockUser,
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureEndDate = new Date(futureDate);
      futureEndDate.setHours(futureEndDate.getHours() + 8);

      const tripData = {
        destination: 'Prague',
        purpose: 'Client meeting',
        estimatedStart: futureDate.toISOString(),
        estimatedEnd: futureEndDate.toISOString(),
        notes: 'Important client meeting',
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.businessTrip.create as any).mockResolvedValue(mockTrip);

      const result = await businessTripService.createBusinessTrip('user1', 'company1', tripData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyId: true,
        },
      });

      expect(prisma.businessTrip.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          companyId: 'company1',
          destination: 'Prague',
          purpose: 'Client meeting',
          estimatedStart: new Date('2024-01-15T09:00:00Z'),
          estimatedEnd: new Date('2024-01-15T17:00:00Z'),
          status: 'PENDING',
          notes: 'Important client meeting',
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
      });

      expect(result).toEqual(mockTrip);
    });

    it('should throw error if user not found', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureEndDate = new Date(futureDate);
      futureEndDate.setHours(futureEndDate.getHours() + 8);

      const tripData = {
        destination: 'Prague',
        purpose: 'Client meeting',
        estimatedStart: futureDate.toISOString(),
        estimatedEnd: futureEndDate.toISOString(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        businessTripService.createBusinessTrip('invalid-user', 'company1', tripData)
      ).rejects.toThrow('User not found');
    });

    it('should validate date range', async () => {
      const mockUser = {
        id: 'user1',
        companyId: 'company1',
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const pastDate = new Date(futureDate);
      pastDate.setHours(pastDate.getHours() - 8);

      const tripData = {
        destination: 'Prague',
        purpose: 'Client meeting',
        estimatedStart: futureDate.toISOString(), // End before start
        estimatedEnd: pastDate.toISOString(),
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        businessTripService.createBusinessTrip('user1', 'company1', tripData)
      ).rejects.toThrow('End date must be after start date');
    });
  });

  describe('getBusinessTrips', () => {
    it('should return paginated business trips', async () => {
      const mockTrips = [
        {
          id: 'trip1',
          destination: 'Prague',
          status: 'PENDING',
          user: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
        {
          id: 'trip2',
          destination: 'Vienna',
          status: 'APPROVED',
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        },
      ];

      const filters = {
        page: 1,
        limit: 10,
        status: 'PENDING' as const,
      };

      (prisma.businessTrip.findMany as any).mockResolvedValue(mockTrips);
      (prisma.businessTrip.count as any).mockResolvedValue(2);

      const result = await businessTripService.getBusinessTrips('company1', filters, 'COMPANY_ADMIN');

      expect(prisma.businessTrip.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company1',
          status: 'PENDING',
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      });

      expect(result.trips).toEqual(mockTrips);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by date range', async () => {
      const filters = {
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      };

      (prisma.businessTrip.findMany as any).mockResolvedValue([]);
      (prisma.businessTrip.count as any).mockResolvedValue(0);

      await businessTripService.getBusinessTrips('company1', filters, 'COMPANY_ADMIN');

      expect(prisma.businessTrip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'company1',
            estimatedStart: {
              gte: new Date('2024-01-01T00:00:00Z'),
              lte: new Date('2024-01-31T23:59:59Z'),
            },
          },
        })
      );
    });
  });

  describe('approveBusinessTrip', () => {
    it('should successfully approve business trip', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureEndDate = new Date(futureDate);
      futureEndDate.setHours(futureEndDate.getHours() + 8);

      const mockTrip = {
        id: 'trip1',
        userId: 'user1',
        companyId: 'company1',
        status: 'PENDING',
        estimatedStart: futureDate,
        estimatedEnd: futureEndDate,
        destination: 'Prague',
        purpose: 'Client meeting',
      };

      const mockApprovedTrip = {
        ...mockTrip,
        status: 'APPROVED',
        approvedBy: 'manager1',
        approvedAt: new Date(),
      };

      (prisma.businessTrip.findFirst as any).mockResolvedValue(mockTrip);
      (prisma.businessTrip.update as any).mockResolvedValue(mockApprovedTrip);
      (prisma.attendanceEvent.create as any).mockResolvedValue({});

      const result = await businessTripService.approveBusinessTrip('trip1', 'manager1', 'company1');

      expect(prisma.businessTrip.findFirst).toHaveBeenCalledWith({
        where: { id: 'trip1' },
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
      });

      expect(prisma.businessTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip1' },
        data: {
          status: 'APPROVED',
          approvedBy: 'manager1',
          approvedAt: expect.any(Date),
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(mockApprovedTrip);
    });

    it('should throw error if trip not found', async () => {
      (prisma.businessTrip.findFirst as any).mockResolvedValue(null);

      await expect(
        businessTripService.approveBusinessTrip('invalid-trip', 'manager1', 'company1')
      ).rejects.toThrow('Business trip not found');
    });

    it('should throw error if trip already processed', async () => {
      const mockTrip = {
        id: 'trip1',
        status: 'APPROVED', // Already processed
      };

      (prisma.businessTrip.findFirst as any).mockResolvedValue(mockTrip);

      await expect(
        businessTripService.approveBusinessTrip('trip1', 'manager1', 'company1')
      ).rejects.toThrow('Business trip has already been processed');
    });
  });

  describe('rejectBusinessTrip', () => {
    it('should successfully reject business trip', async () => {
      const mockTrip = {
        id: 'trip1',
        userId: 'user1',
        companyId: 'company1',
        status: 'PENDING',
      };

      const mockRejectedTrip = {
        ...mockTrip,
        status: 'REJECTED',
        rejectedBy: 'manager1',
        rejectedAt: new Date(),
        rejectionReason: 'Not approved',
      };

      (prisma.businessTrip.findFirst as any).mockResolvedValue(mockTrip);
      (prisma.businessTrip.update as any).mockResolvedValue(mockRejectedTrip);

      const result = await businessTripService.rejectBusinessTrip('trip1', 'manager1', 'company1', 'Not approved');

      expect(prisma.businessTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip1' },
        data: {
          status: 'REJECTED',
          rejectedBy: 'manager1',
          rejectedAt: expect.any(Date),
          rejectionReason: 'Not approved',
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(mockRejectedTrip);
    });
  });

  describe('startBusinessTrip', () => {
    it('should successfully start approved business trip', async () => {
      const mockTrip = {
        id: 'trip1',
        userId: 'user1',
        companyId: 'company1',
        status: 'APPROVED',
        destination: 'Prague',
        purpose: 'Client meeting',
      };

      const location = {
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
      };

      (prisma.businessTrip.findFirst as any).mockResolvedValue(mockTrip);
      (prisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          businessTrip: {
            update: vi.fn().mockResolvedValue({
              ...mockTrip,
              status: 'IN_PROGRESS',
              actualStart: new Date(),
            }),
          },
          attendanceEvent: {
            create: vi.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const result = await businessTripService.startBusinessTrip('user1', 'trip1', 'company1', location);

      expect(prisma.businessTrip.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'trip1',
          userId: 'user1',
          status: 'APPROVED',
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
      });

      expect(prisma.attendanceEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          type: 'BUSINESS_TRIP_START',
          timestamp: expect.any(Date),
          location: {
            latitude: 48.1486,
            longitude: 17.1077,
            accuracy: 10,
          },
          notes: 'Začiatok služobnej cesty: Prague',
        },
      });

      expect(result).toBeDefined();
    });

    it('should throw error if trip not approved', async () => {
      const mockTrip = {
        id: 'trip1',
        status: 'PENDING', // Not approved
      };

      const location = {
        latitude: 48.1486,
        longitude: 17.1077,
        accuracy: 10,
      };

      (prisma.businessTrip.findFirst as any).mockResolvedValue(mockTrip);

      await expect(
        businessTripService.startBusinessTrip('user1', 'trip1', 'company1', location)
      ).rejects.toThrow('Business trip is not approved');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureEndDate = new Date(futureDate);
      futureEndDate.setHours(futureEndDate.getHours() + 8);

      const tripData = {
        destination: 'Prague',
        purpose: 'Client meeting',
        estimatedStart: futureDate.toISOString(),
        estimatedEnd: futureEndDate.toISOString(),
      };

      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database error'));

      await expect(
        businessTripService.createBusinessTrip('user1', 'company1', tripData)
      ).rejects.toThrow('Database error');
    });
  });
});