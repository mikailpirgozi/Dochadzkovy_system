import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CorrectionService } from '../services/correction.service.js';
import { prisma } from '../utils/database.js';
import { PushService } from '../services/push.service.js';
import { EmailService } from '../services/email.service.js';
import type { CreateCorrectionRequest } from '../types/index.js';

// Mock dependencies
vi.mock('../utils/database.js', () => ({
  prisma: {
    attendanceEvent: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    correction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../services/push.service.js', () => ({
  PushService: vi.fn(() => ({
    sendNotification: vi.fn(),
  })),
}));

vi.mock('../services/email.service.js', () => ({
  EmailService: vi.fn(() => ({
    sendCorrectionRequestEmail: vi.fn(),
    sendCorrectionStatusEmail: vi.fn(),
  })),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('CorrectionService', () => {
  let correctionService: CorrectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    correctionService = new CorrectionService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCorrection', () => {
    const mockCorrectionRequest: CreateCorrectionRequest = {
      originalEventId: 'event1',
      requestedChange: {
        timestamp: '2024-01-15T09:00:00.000Z',
        notes: 'Corrected time',
      },
      reason: 'Forgot to clock in on time',
    };

    const mockOriginalEvent = {
      id: 'event1',
      userId: 'user1',
      type: 'CLOCK_IN',
      timestamp: new Date('2024-01-15T08:30:00.000Z'),
      location: { latitude: 48.1486, longitude: 17.1077, accuracy: 10 },
      qrVerified: true,
      notes: 'Original notes',
      companyId: 'company1',
    };

    const mockUser = {
      id: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      companyId: 'company1',
    };

    it('should create correction request successfully', async () => {
      const mockCorrection = {
        id: 'correction1',
        userId: 'user1',
        originalEventId: 'event1',
        requestedChange: mockCorrectionRequest.requestedChange,
        reason: mockCorrectionRequest.reason,
        status: 'PENDING',
        createdAt: new Date(),
        user: mockUser,
        originalEvent: mockOriginalEvent,
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockOriginalEvent);
      (prisma.correction.create as any).mockResolvedValue(mockCorrection);

      const result = await correctionService.createCorrection(
        'user1',
        'company1',
        mockCorrectionRequest
      );

      expect(result).toEqual(mockCorrection);
      expect(prisma.correction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          originalEventId: mockCorrectionRequest.originalEventId,
          requestedChange: mockCorrectionRequest.requestedChange,
          reason: mockCorrectionRequest.reason,
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
          originalEvent: true,
        },
      });
    });

    it('should throw error if original event not found', async () => {
      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(null);

      await expect(
        correctionService.createCorrection('user1', 'company1', mockCorrectionRequest)
      ).rejects.toThrow('Original attendance event not found or access denied');
    });

    it('should throw error if event belongs to different company', async () => {
      const eventFromDifferentCompany = {
        ...mockOriginalEvent,
        companyId: 'different-company',
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(eventFromDifferentCompany);

      await expect(
        correctionService.createCorrection('user1', 'company1', mockCorrectionRequest)
      ).rejects.toThrow('Original attendance event not found or access denied');
    });

    it('should throw error for invalid timestamp format', async () => {
      const invalidRequest = {
        ...mockCorrectionRequest,
        requestedChange: {
          ...mockCorrectionRequest.requestedChange,
          timestamp: 'invalid-date',
        },
      };

      (prisma.attendanceEvent.findFirst as any).mockResolvedValue(mockOriginalEvent);

      await expect(
        correctionService.createCorrection('user1', 'company1', invalidRequest)
      ).rejects.toThrow('Invalid timestamp format in requested change');
    });
  });

  describe('getCorrections', () => {
    it('should return corrections for company with pagination', async () => {
      const mockCorrections = [
        {
          id: 'correction1',
          status: 'PENDING',
          reason: 'Test reason',
          createdAt: new Date(),
          user: { firstName: 'John', lastName: 'Doe' },
          originalEvent: { type: 'CLOCK_IN' },
        },
      ];

      (prisma.correction.findMany as any).mockResolvedValue(mockCorrections);
      (prisma.correction.count as any).mockResolvedValue(1);

      const result = await correctionService.getCorrections('company1', {
        page: 1,
        limit: 10,
      }, 'ADMIN');

      expect(result.corrections).toEqual(mockCorrections);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(prisma.correction.findMany).toHaveBeenCalledWith({
        where: {
          user: { companyId: 'company1' },
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
          originalEvent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });

    it('should filter corrections by status', async () => {
      await correctionService.getCorrections('company1', {
        status: 'APPROVED',
        page: 1,
        limit: 10,
      }, 'ADMIN');

      expect(prisma.correction.findMany).toHaveBeenCalledWith({
        where: {
          user: { companyId: 'company1' },
          status: 'APPROVED',
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });

  describe('approveCorrection', () => {
    const mockCorrection = {
      id: 'correction1',
      userId: 'user1',
      originalEventId: 'event1',
      requestedChange: {
        timestamp: '2024-01-15T09:00:00.000Z',
        notes: 'Corrected notes',
      },
      status: 'PENDING',
      user: { companyId: 'company1', firstName: 'John', lastName: 'Doe' },
      originalEvent: {
        id: 'event1',
        type: 'CLOCK_IN',
        timestamp: new Date('2024-01-15T08:30:00.000Z'),
      },
    };

    it('should approve correction and apply changes', async () => {
      (prisma.correction.findUnique as any).mockResolvedValue(mockCorrection);
      (prisma.correction.update as any).mockResolvedValue({
        ...mockCorrection,
        status: 'APPROVED',
        reviewedBy: 'admin1',
        reviewedAt: new Date(),
      });
      (prisma.attendanceEvent.update as any).mockResolvedValue({});

      const result = await correctionService.approveCorrection(
        'correction1',
        'admin1',
        'company1',
        'Approved by admin'
      );

      expect(result.status).toBe('APPROVED');
      expect(prisma.attendanceEvent.update).toHaveBeenCalledWith({
        where: { id: 'event1' },
        data: {
          timestamp: new Date('2024-01-15T09:00:00.000Z'),
          notes: 'Corrected notes',
          correctionApplied: true,
          correctionId: 'correction1',
          correctionAppliedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if correction not found', async () => {
      (prisma.correction.findUnique as any).mockResolvedValue(null);

      await expect(
        correctionService.approveCorrection('nonexistent', 'admin1', 'company1')
      ).rejects.toThrow('Correction not found or access denied');
    });

    it('should throw error if correction already processed', async () => {
      const processedCorrection = {
        ...mockCorrection,
        status: 'APPROVED',
      };

      (prisma.correction.findUnique as any).mockResolvedValue(processedCorrection);

      await expect(
        correctionService.approveCorrection('correction1', 'admin1', 'company1')
      ).rejects.toThrow('Correction has already been processed');
    });
  });

  describe('rejectCorrection', () => {
    const mockCorrection = {
      id: 'correction1',
      status: 'PENDING',
      user: { companyId: 'company1', firstName: 'John', lastName: 'Doe' },
    };

    it('should reject correction successfully', async () => {
      (prisma.correction.findUnique as any).mockResolvedValue(mockCorrection);
      (prisma.correction.update as any).mockResolvedValue({
        ...mockCorrection,
        status: 'REJECTED',
        reviewedBy: 'admin1',
        reviewedAt: new Date(),
        reviewNotes: 'Insufficient evidence',
      });

      const result = await correctionService.rejectCorrection(
        'correction1',
        'admin1',
        'company1',
        'Insufficient evidence'
      );

      expect(result.status).toBe('REJECTED');
      expect(prisma.correction.update).toHaveBeenCalledWith({
        where: { id: 'correction1' },
        data: {
          status: 'REJECTED',
          reviewedBy: 'admin1',
          reviewedAt: expect.any(Date),
          reviewNotes: 'Insufficient evidence',
        },
        include: expect.any(Object),
      });
    });
  });

  describe('getUserCorrections', () => {
    it('should return corrections for specific user', async () => {
      const mockCorrections = [
        {
          id: 'correction1',
          status: 'PENDING',
          reason: 'Test reason',
          createdAt: new Date(),
        },
      ];

      (prisma.correction.findMany as any).mockResolvedValue(mockCorrections);
      (prisma.correction.count as any).mockResolvedValue(1);

      const result = await correctionService.getCorrections('company1', {
        page: 1,
        limit: 10,
      }, 'EMPLOYEE', 'user1');

      expect(result.corrections).toEqual(mockCorrections);
      expect(result.total).toBe(1);
      expect(prisma.correction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: { originalEvent: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      });
    });
  });
});
