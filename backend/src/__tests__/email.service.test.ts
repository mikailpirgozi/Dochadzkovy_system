import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EmailService } from '../services/email.service.js';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

  describe('EmailService', () => {
  let mockTransporter: {
    sendMail: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockTransporter = {
      sendMail: vi.fn(),
      verify: vi.fn(),
    };
    
    (nodemailer.createTransport as any).mockReturnValue(mockTransporter);
    EmailService.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendGeofenceViolationEmail', () => {
    const mockAlertData = {
      employeeName: 'John Doe',
      timestamp: '2024-01-15T10:00:00.000Z',
      description: 'Employee left work area without clocking out',
      location: '48.1486, 17.1077 (150m from office)',
      companyName: 'Test Company',
    };

    it('should send geofence violation email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendGeofenceViolationEmail(
        'admin@company.com',
        'John Doe',
        'Outside work area',
        'Work Location',
        '2024-01-15T10:30:00Z'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'admin@company.com',
        subject: '🚨 URGENT: Employee Left Work Area - John Doe',
        html: expect.stringContaining('John Doe'),
      });
    });

    it('should handle email sending errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        EmailService.sendGeofenceViolationEmail(
          'admin@company.com',
          'John Doe',
          'Outside work area',
          'Work Location',
          '2024-01-15T10:30:00Z'
        )
      ).resolves.toBe(false);
    });
  });

  describe('sendCorrectionRequestEmail', () => {
    const mockCorrectionData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      originalEventType: 'CLOCK_IN',
      originalTimestamp: new Date('2024-01-15T08:00:00.000Z'),
      requestedChanges: 'Change time from 08:00 to 08:30',
      reason: 'Forgot to clock in on time',
      companyName: 'Test Company',
      correctionId: 'corr-123',
      submittedAt: new Date('2024-01-15T09:00:00.000Z'),
    };

    it('should send correction request email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendCorrectionRequestEmail(
        'admin@company.com',
        'John Doe',
        'Clock In',
        'Wrong time recorded',
        '2024-01-15T10:30:00Z'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'admin@company.com',
        subject: '📝 Time Correction Request - John Doe',
        html: expect.stringContaining('John Doe'),
      });
    });
  });

  describe('sendCorrectionStatusEmail', () => {
    const mockApprovalData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      originalEventType: 'CLOCK_IN',
      originalTimestamp: new Date('2024-01-15T08:00:00.000Z'),
      requestedChanges: 'Change time from 08:00 to 08:30',
      reason: 'Forgot to clock in on time',
      reviewNotes: 'Approved by manager',
      decision: 'APPROVED' as const,
      reviewedAt: new Date('2024-01-15T10:00:00.000Z'),
      reviewerName: 'Manager Smith',
    };

    const mockRejectionData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      originalEventType: 'CLOCK_IN',
      originalTimestamp: new Date('2024-01-15T08:00:00.000Z'),
      requestedChanges: 'Change time from 08:00 to 08:30',
      reason: 'Forgot to clock in on time',
      reviewNotes: 'Insufficient documentation',
      decision: 'REJECTED' as const,
      reviewedAt: new Date('2024-01-15T10:00:00.000Z'),
      reviewerName: 'Manager Smith',
    };

    it('should send correction approval email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendCorrectionStatusEmail(
        'john@company.com',
        mockApprovalData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'john@company.com',
        subject: '✅ Korekcia schválená - John Doe',
        html: expect.stringContaining('schválená'),
      });
    });

    it('should send correction rejection email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendCorrectionStatusEmail(
        'john@company.com',
        mockRejectionData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'john@company.com',
        subject: '❌ Korekcia zamietnutá - John Doe',
        html: expect.stringContaining('zamietnutá'),
      });
    });
  });

  describe('sendBusinessTripRequestEmail', () => {
    const mockTripData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      destination: 'Bratislava',
      purpose: 'Client meeting',
      estimatedStart: new Date('2024-01-20T09:00:00.000Z'),
      estimatedEnd: new Date('2024-01-20T17:00:00.000Z'),
      notes: 'Important client presentation',
      companyName: 'Test Company',
      tripId: 'trip-123',
      submittedAt: new Date('2024-01-18T10:00:00.000Z'),
    };

    it('should send business trip request email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendBusinessTripRequestEmail(
        'admin@company.com',
        'John Doe',
        'Bratislava',
        'Client meeting',
        '2024-01-15T10:30:00Z',
        '2024-01-15T10:30:00Z'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'admin@company.com',
        subject: '✈️ Služobná cesta - John Doe',
        html: expect.stringContaining('Bratislava'),
      });
    });
  });

  describe('sendBusinessTripStatusEmail', () => {
    const mockApprovalData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      destination: 'Bratislava',
      purpose: 'Client meeting',
      estimatedStart: new Date('2024-01-20T09:00:00.000Z'),
      estimatedEnd: new Date('2024-01-20T17:00:00.000Z'),
      notes: 'Important client presentation',
      tripId: 'trip-123',
      createdAt: new Date('2024-01-18T10:00:00.000Z'),
      decision: 'APPROVED' as const,
      reviewNotes: 'Approved by manager',
      reviewedAt: new Date('2024-01-19T10:00:00.000Z'),
      reviewerName: 'Manager Smith',
    };

    const mockRejectionData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      destination: 'Bratislava',
      purpose: 'Client meeting',
      estimatedStart: new Date('2024-01-20T09:00:00.000Z'),
      estimatedEnd: new Date('2024-01-20T17:00:00.000Z'),
      notes: 'Important client presentation',
      tripId: 'trip-123',
      createdAt: new Date('2024-01-18T10:00:00.000Z'),
      decision: 'REJECTED' as const,
      reviewNotes: 'Budget constraints',
      reviewedAt: new Date('2024-01-19T10:00:00.000Z'),
      reviewerName: 'Manager Smith',
    };

    it('should send business trip approval email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendBusinessTripStatusEmail(
        'john@company.com',
        mockApprovalData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'john@company.com',
        subject: '✅ Služobná cesta schválená - John Doe',
        html: expect.stringContaining('schválená'),
      });
    });

    it('should send business trip rejection email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendBusinessTripStatusEmail(
        'john@company.com',
        mockRejectionData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'john@company.com',
        subject: '❌ Služobná cesta zamietnutá - John Doe',
        html: expect.stringContaining('zamietnutá'),
      });
    });
  });

  describe('sendMissingClockOutEmail', () => {
    const mockMissingClockOutData = {
      employeeName: 'John Doe',
      employeeEmail: 'john@company.com',
      clockInTime: new Date('2024-01-15T08:00:00.000Z'),
      hoursWorked: 12,
      companyName: 'Test Company',
      lastActivityTime: new Date('2024-01-15T18:00:00.000Z'),
      location: 'Office Building',
    };

    it('should send missing clock out email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendMissingClockOutEmail(
        'admin@company.com',
        'John Doe',
        '2024-01-15T18:00:00.000Z',
        'Office Building'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'admin@company.com',
        subject: '⚠️ Chýba odchod - John Doe',
        html: expect.stringContaining('12 hodín'),
      });
    });
  });

  describe('sendLongBreakEmail', () => {
    const mockLongBreakData = {
      employeeName: 'John Doe',
      breakDuration: 90, // minutes
      startTime: new Date('2024-01-15T12:00:00.000Z'),
      location: 'Office Building',
      companyName: 'Test Company',
    };

    it('should send long break email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendLongBreakEmail(
        'admin@company.com',
        mockLongBreakData
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'admin@company.com',
        subject: '⚠️ Dlhá prestávka - John Doe',
        html: expect.stringContaining('90 minút'),
      });
    });
  });

  describe('verifyConnection', () => {
    it('should verify email connection successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await EmailService.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await EmailService.verifyConnection();

      expect(result).toBe(false);
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      await EmailService.sendTestEmail('test@company.com');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to: 'test@company.com',
        subject: '📧 Test Email - Dochádzka Pro',
        html: expect.stringContaining('Test email'),
      });
    });
  });
});
