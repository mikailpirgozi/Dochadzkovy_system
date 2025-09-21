import { prisma } from '../utils/database.js';
import { PushService } from './push.service.js';
import { EmailService } from './email.service.js';
import type {
  CreateCorrectionRequest,
  CorrectionWithDetails,
  PaginationOptions,
  FilterOptions,
  CorrectionStatus
} from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

export class CorrectionService {
  private readonly emailService = new EmailService();

  /**
   * Create a new correction request
   */
  async createCorrection(
    userId: string,
    companyId: string,
    data: CreateCorrectionRequest
  ): Promise<CorrectionWithDetails> {
    // Validate the original event exists and belongs to the user
    const originalEvent = await prisma.attendanceEvent.findFirst({
      where: {
        id: data.originalEventId,
        userId,
        user: {
          companyId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyId: true
          }
        }
      }
    });

    if (!originalEvent) {
      throw new CustomError('Attendance event not found or not accessible', 404);
    }

    // Check if there's already a pending correction for this event
    const existingCorrection = await prisma.correction.findFirst({
      where: {
        originalEventId: data.originalEventId,
        status: 'PENDING'
      }
    });

    if (existingCorrection) {
      throw new CustomError('There is already a pending correction for this event', 400);
    }

    // Validate requested changes
    this.validateRequestedChange(data.requestedChange, originalEvent.type);

    // Create the correction request
    const correction = await prisma.correction.create({
      data: {
        userId,
        companyId: originalEvent.companyId,
        originalEventId: data.originalEventId,
        requestedChange: data.requestedChange as any,
        reason: data.reason.trim(),
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        originalEvent: true
      }
    });

    // Notify managers about the new correction request
    await this.notifyManagersOfCorrectionRequest(companyId, correction as CorrectionWithDetails);

    return correction as CorrectionWithDetails;
  }

  /**
   * Get corrections with pagination and filters
   */
  async getCorrections(
    companyId: string,
    options: PaginationOptions & FilterOptions,
    userRole: string,
    userId?: string
  ): Promise<{
    corrections: CorrectionWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 10, 50);
    const skip = (page - 1) * limit;

    const where: any = {
      user: {
        companyId
      }
    };

    // Employees can only see their own corrections
    if (userRole === 'EMPLOYEE') {
      where.userId = userId;
    }

    // Apply filters
    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    if (options.userId && userRole !== 'EMPLOYEE') {
      where.userId = options.userId;
    }

    const [corrections, total] = await Promise.all([
      prisma.correction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          originalEvent: true,
          reviewedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: options.sortOrder === 'asc' ? 'asc' : 'desc'
        },
        skip,
        take: limit
      }),
      prisma.correction.count({ where })
    ]);

    return {
      corrections: corrections as CorrectionWithDetails[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get correction by ID
   */
  async getCorrectionById(
    correctionId: string,
    companyId: string,
    userRole: string,
    userId?: string
  ): Promise<CorrectionWithDetails> {
    const where: {
      id: string;
      user: {
        companyId: string;
      };
      userId?: string;
    } = {
      id: correctionId,
      user: {
        companyId
      }
    };

    // Employees can only see their own corrections
    if (userRole === 'EMPLOYEE') {
      where.userId = userId;
    }

    const correction = await prisma.correction.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        originalEvent: true,
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!correction) {
      throw new CustomError('Correction not found', 404);
    }

    return correction as CorrectionWithDetails;
  }

  /**
   * Approve a correction request
   */
  async approveCorrection(
    correctionId: string,
    reviewerId: string,
    companyId: string,
    notes?: string
  ): Promise<CorrectionWithDetails> {
    const correction = await this.getCorrectionById(correctionId, companyId, 'MANAGER');

    if (correction.status !== 'PENDING') {
      throw new CustomError('Correction is not in pending status', 400);
    }

    // Start transaction to update both correction and attendance event
    const result = await prisma.$transaction(async (tx) => {
      // Update the correction
      const updatedCorrection = await tx.correction.update({
        where: { id: correctionId },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: notes?.trim()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          originalEvent: true,
          reviewedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Apply the requested changes to the original event
      const requestedChange = correction.requestedChange as Record<string, unknown>;
      const updateData: Record<string, unknown> = {};

      if (requestedChange.timestamp && typeof requestedChange.timestamp === 'string') {
        updateData.timestamp = new Date(requestedChange.timestamp);
      }

      if (requestedChange.type) {
        updateData.type = requestedChange.type;
      }

      if (requestedChange.notes) {
        updateData.notes = requestedChange.notes;
      }

      if (requestedChange.location) {
        updateData.location = requestedChange.location;
      }

      // Add correction metadata
      updateData.correctionApplied = true;
      updateData.correctionId = correctionId;
      updateData.correctionAppliedAt = new Date();

      // Update the original attendance event
      await tx.attendanceEvent.update({
        where: { id: correction.originalEventId },
        data: updateData
      });

      return updatedCorrection;
    });

    // Notify employee about approval
    await this.notifyEmployeeOfCorrectionDecision(
      result.user.id,
      result as CorrectionWithDetails,
      'APPROVED',
      notes
    );

    return result as CorrectionWithDetails;
  }

  /**
   * Reject a correction request
   */
  async rejectCorrection(
    correctionId: string,
    reviewerId: string,
    companyId: string,
    reason: string
  ): Promise<CorrectionWithDetails> {
    const correction = await this.getCorrectionById(correctionId, companyId, 'MANAGER');

    if (correction.status !== 'PENDING') {
      throw new CustomError('Correction is not in pending status', 400);
    }

    const updatedCorrection = await prisma.correction.update({
      where: { id: correctionId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: reason.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        originalEvent: true,
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Notify employee about rejection
    await this.notifyEmployeeOfCorrectionDecision(
      updatedCorrection.user.id,
      updatedCorrection as CorrectionWithDetails,
      'REJECTED',
      reason
    );

    return updatedCorrection as CorrectionWithDetails;
  }

  /**
   * Get correction statistics for dashboard
   */
  async getCorrectionStats(companyId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    thisMonth: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const where = {
      user: {
        companyId
      }
    };

    const [total, pending, approved, rejected, thisMonth] = await Promise.all([
      prisma.correction.count({ where }),
      prisma.correction.count({ where: { ...where, status: 'PENDING' } }),
      prisma.correction.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.correction.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.correction.count({
        where: {
          ...where,
          createdAt: {
            gte: startOfMonth
          }
        }
      })
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      thisMonth
    };
  }

  /**
   * Validate requested changes
   */
  private validateRequestedChange(requestedChange: Record<string, unknown>, _originalEventType: string): void {
    const validFields = ['timestamp', 'type', 'notes', 'location'];
    const providedFields = Object.keys(requestedChange);

    // Check if at least one valid field is provided
    const hasValidField = providedFields.some(field => validFields.includes(field));
    if (!hasValidField) {
      throw new CustomError('At least one valid change must be requested', 400);
    }

    // Validate timestamp if provided
    if (requestedChange.timestamp && typeof requestedChange.timestamp === 'string') {
      const timestamp = new Date(requestedChange.timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new CustomError('Invalid timestamp format', 400);
      }

      // Check if timestamp is not in the future
      if (timestamp > new Date()) {
        throw new CustomError('Timestamp cannot be in the future', 400);
      }

      // Check if timestamp is not too old (more than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (timestamp < thirtyDaysAgo) {
        throw new CustomError('Cannot correct events older than 30 days', 400);
      }
    }

    // Validate event type if provided
    if (requestedChange.type && typeof requestedChange.type === 'string') {
      const validTypes = ['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'PERSONAL_START', 'PERSONAL_END'];
      if (!validTypes.includes(requestedChange.type)) {
        throw new CustomError('Invalid event type', 400);
      }
    }

    // Validate location if provided
    if (requestedChange.location && typeof requestedChange.location === 'object') {
      const location = requestedChange.location as Record<string, unknown>;
      const { latitude, longitude, accuracy } = location;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new CustomError('Invalid location coordinates', 400);
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new CustomError('Location coordinates out of range', 400);
      }
      if (accuracy && (typeof accuracy !== 'number' || accuracy < 0)) {
        throw new CustomError('Invalid location accuracy', 400);
      }
    }
  }

  /**
   * Notify managers about new correction request
   */
  private async notifyManagersOfCorrectionRequest(
    companyId: string,
    correction: CorrectionWithDetails
  ): Promise<void> {
    try {
      // Get managers and company admins
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
          isActive: true,
          OR: [
            { pushToken: { not: null } },
            { email: { not: '' } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          pushToken: true,
          notificationSettings: true
        }
      });

      if (managers.length === 0) return;

      const pushTokens = managers
        .filter(m => m.pushToken && this.shouldSendPushNotification(m.notificationSettings as Record<string, unknown>, 'corrections'))
        .map(m => m.pushToken)
        .filter((token): token is string => token !== null);

      const emailRecipients = managers
        .filter(m => m.email && this.shouldSendEmailNotification(m.notificationSettings as Record<string, unknown>, 'corrections'))
        .map(m => m.email);

      // Send push notifications
      if (pushTokens.length > 0) {
        await PushService.sendToUsers(
          pushTokens,
          {
            title: 'Nová korekcia',
            body: `${correction.user.firstName} ${correction.user.lastName} požiadal o korekciu času`,
            data: {
              type: 'correction_approved',
              correctionId: correction.id,
              userId: correction.user.id
            }
          }
        );
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        const originalEvent = correction.originalEvent;
        const requestedChange = correction.requestedChange as Record<string, unknown>;

        for (const email of emailRecipients) {
          await this.emailService.sendCorrectionRequestEmail(email, {
            employeeName: `${correction.user.firstName} ${correction.user.lastName}`,
            employeeEmail: correction.user.email,
            originalEventType: originalEvent?.type ?? 'Unknown',
            originalTimestamp: originalEvent?.timestamp ?? new Date(),
            requestedChanges: this.formatRequestedChanges(requestedChange),
            reason: correction.reason,
            correctionId: correction.id,
            createdAt: correction.createdAt
          });
        }
      }
    } catch (error) {
      console.error('Failed to notify managers of correction request:', error);
    }
  }

  /**
   * Notify employee about correction decision
   */
  private async notifyEmployeeOfCorrectionDecision(
    userId: string,
    correction: CorrectionWithDetails,
    decision: CorrectionStatus,
    notes?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pushToken: true,
          email: true,
          notificationSettings: true,
          firstName: true,
          lastName: true
        }
      });

      if (!user) return;

      const isApproved = decision === 'APPROVED';
      const title = isApproved ? 'Korekcia schválená' : 'Korekcia zamietnutá';
      const message = isApproved
        ? 'Vaša požiadavka na korekciu času bola schválená'
        : 'Vaša požiadavka na korekciu času bola zamietnutá';

      // Send push notification
      if (user.pushToken && this.shouldSendPushNotification(user.notificationSettings as Record<string, unknown>, 'corrections')) {
        await PushService.sendToUsers(
          [user.pushToken],
          {
            title,
            body: message,
            data: {
              type: 'correction_approved',
              correctionId: correction.id,
              status: decision as string,
              notes: notes ?? ''
            }
          } as any
        );
      }

      // Send email notification
      if (user.email && this.shouldSendEmailNotification(user.notificationSettings as Record<string, unknown>, 'corrections')) {
        await this.emailService.sendCorrectionDecisionEmail(user.email, {
          employeeName: `${user.firstName} ${user.lastName}`,
          decision: decision as 'APPROVED' | 'REJECTED',
          originalEventType: correction.originalEvent?.type ?? 'Unknown',
          originalTimestamp: correction.originalEvent?.timestamp ?? new Date(),
          requestedChanges: this.formatRequestedChanges(correction.requestedChange as Record<string, unknown>),
          reason: correction.reason,
          reviewNotes: notes,
          reviewedAt: correction.reviewedAt ?? new Date(),
          reviewerName: correction.reviewedByUser
            ? `${correction.reviewedByUser.firstName} ${correction.reviewedByUser.lastName}`
            : 'System'
        });
      }
    } catch (error) {
      console.error('Failed to notify employee of correction decision:', error);
    }
  }

  /**
   * Check if push notification should be sent based on user preferences
   */
  private shouldSendPushNotification(settings: Record<string, unknown>, type: string): boolean {
    if (typeof settings !== 'object') return true;
    const notifications = settings.notifications as Record<string, unknown> ?? {};
    const pushSettings = notifications.push as Record<string, unknown> ?? {};
    return pushSettings[type] !== false && pushSettings.enabled !== false;
  }

  /**
   * Check if email notification should be sent based on user preferences
   */
  private shouldSendEmailNotification(settings: Record<string, unknown>, type: string): boolean {
    if (typeof settings !== 'object') return true;
    const notifications = settings.notifications as Record<string, unknown> ?? {};
    const emailSettings = notifications.email as Record<string, unknown> ?? {};
    return emailSettings[type] !== false && emailSettings.enabled !== false;
  }

  /**
   * Format requested changes for display
   */
  private formatRequestedChanges(requestedChange: Record<string, unknown>): string {
    const changes: string[] = [];

    if (requestedChange.timestamp && typeof requestedChange.timestamp === 'string') {
      changes.push(`Čas: ${new Date(requestedChange.timestamp).toLocaleString('sk-SK')}`);
    }

    if (requestedChange.type && typeof requestedChange.type === 'string') {
      changes.push(`Typ: ${this.translateEventType(requestedChange.type)}`);
    }

    if (requestedChange.notes && typeof requestedChange.notes === 'string') {
      changes.push(`Poznámky: ${requestedChange.notes}`);
    }

    if (requestedChange.location && typeof requestedChange.location === 'object') {
      const location = requestedChange.location as Record<string, unknown>;
      if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        changes.push(`Poloha: ${String(location.latitude)}, ${String(location.longitude)}`);
      }
    }

    return changes.join('; ');
  }

  /**
   * Translate event type to Slovak
   */
  private translateEventType(type: string): string {
    const translations: Record<string, string> = {
      'CLOCK_IN': 'Príchod',
      'CLOCK_OUT': 'Odchod',
      'BREAK_START': 'Začiatok prestávky',
      'BREAK_END': 'Koniec prestávky',
      'PERSONAL_START': 'Začiatok súkromných vecí',
      'PERSONAL_END': 'Koniec súkromných vecí',
      'BUSINESS_TRIP_START': 'Začiatok služobnej cesty',
      'BUSINESS_TRIP_END': 'Koniec služobnej cesty'
    };
    return translations[type] ?? type;
  }
}
