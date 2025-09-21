import { prisma } from '../utils/database.js';
import { PushService } from './push.service.js';
import { EmailService } from './email.service.js';
import type {
  CreateBusinessTripRequest,
  BusinessTripWithDetails,
  PaginationOptions,
  FilterOptions,
  BusinessTripStatus,
  LocationData
} from '../types/index.js';
import type { Prisma } from '@prisma/client';
import { CustomError } from '../middleware/errorHandler.js';

export class BusinessTripService {
  // Services will be used in future implementations
  // private pushService = new PushService();
  // private emailService = new EmailService();

  /**
   * Create a new business trip request
   */
  async createBusinessTrip(
    userId: string,
    companyId: string,
    data: CreateBusinessTripRequest
  ): Promise<BusinessTripWithDetails> {
    // Validate dates
    const estimatedStart = new Date(data.estimatedStart);
    const estimatedEnd = new Date(data.estimatedEnd);
    const now = new Date();

    if (estimatedStart < now) {
      throw new CustomError('Start date cannot be in the past', 400);
    }

    if (estimatedEnd <= estimatedStart) {
      throw new CustomError('End date must be after start date', 400);
    }

    // Check for overlapping trips
    const overlappingTrip = await prisma.businessTrip.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] },
        OR: [
          {
            estimatedStart: { lte: estimatedEnd },
            estimatedEnd: { gte: estimatedStart }
          }
        ]
      }
    });

    if (overlappingTrip) {
      throw new CustomError('You already have a business trip scheduled for this period', 400);
    }

    // Create the business trip
    const trip = await prisma.businessTrip.create({
      data: {
        userId,
        companyId,
        destination: data.destination.trim(),
        purpose: data.purpose.trim(),
        estimatedStart,
        estimatedEnd,
        notes: data.notes?.trim() || null,
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Notify managers about the new business trip request
    await this.notifyManagersOfTripRequest(companyId, trip);

    return trip as BusinessTripWithDetails;
  }

  /**
   * Get business trips with pagination and filters
   */
  async getBusinessTrips(
    companyId: string,
    options: PaginationOptions & FilterOptions,
    userRole: string,
    userId?: string
  ): Promise<{
    trips: BusinessTripWithDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 10, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.BusinessTripWhereInput = {
      companyId
    };

    // Employees can only see their own trips
    if (userRole === 'EMPLOYEE' && userId) {
      where.userId = userId;
    }

    // Apply filters
    if (options.status) {
      where.status = options.status as BusinessTripStatus;
    }

    if (options.startDate || options.endDate) {
      where.estimatedStart = {};
      if (options.startDate) {
        where.estimatedStart.gte = options.startDate;
      }
      if (options.endDate) {
        where.estimatedStart.lte = options.endDate;
      }
    }

    if (options.userId && userRole !== 'EMPLOYEE') {
      where.userId = options.userId;
    }

    const [trips, total] = await Promise.all([
      prisma.businessTrip.findMany({
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
          approver: {
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
      prisma.businessTrip.count({ where })
    ]);

    return {
      trips: trips as BusinessTripWithDetails[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get business trip by ID
   */
  async getBusinessTripById(
    tripId: string,
    companyId: string,
    userRole: string,
    userId?: string
  ): Promise<BusinessTripWithDetails> {
    const where: Prisma.BusinessTripWhereInput = {
      id: tripId,
      companyId
    };

    // Employees can only see their own trips
    if (userRole === 'EMPLOYEE' && userId) {
      where.userId = userId;
    }

    const trip = await prisma.businessTrip.findFirst({
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!trip) {
      throw new CustomError('Business trip not found', 404);
    }

    return trip as BusinessTripWithDetails;
  }

  /**
   * Approve a business trip request
   */
  async approveBusinessTrip(
    tripId: string,
    approverId: string,
    companyId: string,
    notes?: string
  ): Promise<BusinessTripWithDetails> {
    const trip = await this.getBusinessTripById(tripId, companyId, 'MANAGER');

    if (trip.status !== 'PENDING') {
      throw new CustomError('Business trip is not in pending status', 400);
    }

    // Check if trip is still in the future
    if (new Date(trip.estimatedStart) < new Date()) {
      throw new CustomError('Cannot approve past business trips', 400);
    }

    const updatedTrip = await prisma.businessTrip.update({
      where: { id: tripId },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: notes?.trim() || trip.notes
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Notify employee about approval
    await this.notifyEmployeeOfTripDecision(
      updatedTrip.user.id,
      updatedTrip,
      'APPROVED',
      notes
    );

    return updatedTrip as BusinessTripWithDetails;
  }

  /**
   * Reject a business trip request
   */
  async rejectBusinessTrip(
    tripId: string,
    approverId: string,
    companyId: string,
    reason: string
  ): Promise<BusinessTripWithDetails> {
    const trip = await this.getBusinessTripById(tripId, companyId, 'MANAGER');

    if (trip.status !== 'PENDING') {
      throw new CustomError('Business trip is not in pending status', 400);
    }

    const updatedTrip = await prisma.businessTrip.update({
      where: { id: tripId },
      data: {
        status: 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        notes: reason.trim()
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
        approver: {
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
    await this.notifyEmployeeOfTripDecision(
      updatedTrip.user.id,
      updatedTrip,
      'REJECTED',
      reason
    );

    return updatedTrip as BusinessTripWithDetails;
  }

  /**
   * Start a business trip
   */
  async startBusinessTrip(
    tripId: string,
    userId: string,
    companyId: string,
    location: LocationData
  ): Promise<BusinessTripWithDetails> {
    const trip = await prisma.businessTrip.findFirst({
      where: {
        id: tripId,
        userId,
        companyId,
        status: 'APPROVED'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!trip) {
      throw new CustomError('Business trip not found or not approved', 404);
    }

    // Check if trip can be started (within reasonable time window)
    const now = new Date();
    const estimatedStart = new Date(trip.estimatedStart);
    const oneDayBefore = new Date(estimatedStart.getTime() - 24 * 60 * 60 * 1000);
    const oneDayAfter = new Date(estimatedStart.getTime() + 24 * 60 * 60 * 1000);

    if (now < oneDayBefore || now > oneDayAfter) {
      throw new CustomError('Business trip can only be started within 24 hours of estimated start time', 400);
    }

    // Start transaction to update trip and create attendance event
    const result = await prisma.$transaction(async (tx) => {
      // Update trip status
      const updatedTrip = await tx.businessTrip.update({
        where: { id: tripId },
        data: {
          status: 'IN_PROGRESS',
          actualStart: now
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Create business trip start attendance event
      await tx.attendanceEvent.create({
        data: {
          userId,
          companyId,
          type: 'BUSINESS_TRIP_START',
          timestamp: now,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          notes: `Služobná cesta: ${trip.destination} - ${trip.purpose}`,
          qrVerified: false
        }
      });

      return updatedTrip;
    });

    return result as BusinessTripWithDetails;
  }

  /**
   * End a business trip
   */
  async endBusinessTrip(
    tripId: string,
    userId: string,
    companyId: string,
    location: LocationData,
    notes?: string
  ): Promise<BusinessTripWithDetails> {
    const trip = await prisma.businessTrip.findFirst({
      where: {
        id: tripId,
        userId,
        companyId,
        status: 'IN_PROGRESS'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!trip) {
      throw new CustomError('Business trip not found or not in progress', 404);
    }

    const now = new Date();

    // End transaction to update trip and create attendance event
    const result = await prisma.$transaction(async (tx) => {
      // Update trip status
      const updatedTrip = await tx.businessTrip.update({
        where: { id: tripId },
        data: {
          status: 'COMPLETED',
          actualEnd: now,
          notes: notes?.trim() || trip.notes
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
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // Create business trip end attendance event
      await tx.attendanceEvent.create({
        data: {
          userId,
          companyId,
          type: 'BUSINESS_TRIP_END',
          timestamp: now,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          },
          notes: notes?.trim() || `Koniec služobnej cesty: ${trip.destination}`,
          qrVerified: false
        }
      });

      return updatedTrip;
    });

    return result as BusinessTripWithDetails;
  }

  /**
   * Cancel a business trip (only by employee for pending trips)
   */
  async cancelBusinessTrip(
    tripId: string,
    userId: string,
    companyId: string,
    reason: string
  ): Promise<BusinessTripWithDetails> {
    const trip = await prisma.businessTrip.findFirst({
      where: {
        id: tripId,
        userId,
        companyId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!trip) {
      throw new CustomError('Business trip not found or cannot be cancelled', 404);
    }

    const updatedTrip = await prisma.businessTrip.update({
      where: { id: tripId },
      data: {
        status: 'CANCELLED',
        notes: `${trip.notes || ''}\n\nZrušené používateľom: ${reason.trim()}`.trim()
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
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Notify managers if trip was approved
    if (trip.status === 'APPROVED') {
      await this.notifyManagersOfTripCancellation(companyId, updatedTrip, reason);
    }

    return updatedTrip as BusinessTripWithDetails;
  }

  /**
   * Get business trip statistics
   */
  async getBusinessTripStats(companyId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    inProgress: number;
    completed: number;
    rejected: number;
    cancelled: number;
    thisMonth: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const where = { companyId };

    const [total, pending, approved, inProgress, completed, rejected, cancelled, thisMonth] = await Promise.all([
      prisma.businessTrip.count({ where }),
      prisma.businessTrip.count({ where: { ...where, status: 'PENDING' } }),
      prisma.businessTrip.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.businessTrip.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.businessTrip.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.businessTrip.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.businessTrip.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.businessTrip.count({
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
      inProgress,
      completed,
      rejected,
      cancelled,
      thisMonth
    };
  }

  /**
   * Notify managers about new business trip request
   */
  private async notifyManagersOfTripRequest(
    companyId: string,
    trip: BusinessTripWithDetails
  ): Promise<void> {
    try {
      // Get managers and company admins
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
          isActive: true
        },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            pushToken: true,
            settings: true
          }
      });

      if (managers.length === 0) return;

      const pushTokens = managers
        .filter(m => m.pushToken && this.shouldSendPushNotification(m.settings, 'businessTrips'))
        .map(m => m.pushToken!);

      const emailRecipients = managers
        .filter(m => m.email && this.shouldSendEmailNotification(m.settings, 'businessTrips'))
        .map(m => m.email);

      // Send push notifications
      if (pushTokens.length > 0) {
        await PushService.sendToTokens(pushTokens, {
          title: 'Nová služobná cesta',
          body: `${trip.user.firstName} ${trip.user.lastName} požiadal o služobnú cestu do ${trip.destination}`,
          data: {
            type: 'business_trip_approved',
            businessTripId: trip.id,
            userId: trip.user.id
          }
        });
      }

      // Send email notifications
      if (emailRecipients.length > 0) {
        for (const email of emailRecipients) {
          await EmailService.prototype.sendBusinessTripRequestEmail(email, {
            employeeName: `${trip.user.firstName} ${trip.user.lastName}`,
            employeeEmail: trip.user.email,
            destination: trip.destination,
            purpose: trip.purpose,
            estimatedStart: trip.estimatedStart,
            estimatedEnd: trip.estimatedEnd,
            notes: trip.notes || 'No notes provided',
            tripId: trip.id,
            createdAt: trip.createdAt
          });
        }
      }
    } catch (error) {
      console.error('Failed to notify managers of business trip request:', error);
    }
  }

  /**
   * Notify employee about business trip decision
   */
  private async notifyEmployeeOfTripDecision(
    userId: string,
    trip: BusinessTripWithDetails,
    decision: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pushToken: true,
          email: true,
          settings: true,
          firstName: true,
          lastName: true
        }
      });

      if (!user) return;

      const isApproved = decision === 'APPROVED';
      const title = isApproved ? 'Služobná cesta schválená' : 'Služobná cesta zamietnutá';
      const message = isApproved
        ? `Vaša služobná cesta do ${trip.destination} bola schválená`
        : `Vaša služobná cesta do ${trip.destination} bola zamietnutá`;

      // Send push notification
      if (user.pushToken && this.shouldSendPushNotification(user.settings, 'businessTrips')) {
        await PushService.sendToTokens([user.pushToken], {
          title,
          body: message,
          data: {
            type: 'business_trip_approved',
            businessTripId: trip.id,
            userId: trip.user.id
          }
        });
      }

      // Send email notification
      if (user.email && this.shouldSendEmailNotification(user.settings, 'businessTrips')) {
        await EmailService.prototype.sendBusinessTripDecisionEmail(user.email, {
          employeeName: `${user.firstName} ${user.lastName}`,
          decision,
          destination: trip.destination,
          purpose: trip.purpose,
          estimatedStart: trip.estimatedStart,
          estimatedEnd: trip.estimatedEnd,
          notes: trip.notes || 'No notes provided',
          ...(notes && { reviewNotes: notes }),
          reviewedAt: trip.approvedAt || new Date(),
          reviewerName: trip.approver
            ? `${trip.approver.firstName} ${trip.approver.lastName}`
            : 'System'
        });
      }
    } catch (error) {
      console.error('Failed to notify employee of business trip decision:', error);
    }
  }

  /**
   * Notify managers about business trip cancellation
   */
  private async notifyManagersOfTripCancellation(
    companyId: string,
    trip: BusinessTripWithDetails,
    _reason: string
  ): Promise<void> {
    try {
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
          isActive: true,
          pushToken: { not: null }
        },
        select: {
          pushToken: true,
          settings: true
        }
      });

      const pushTokens = managers
        .filter(m => this.shouldSendPushNotification(m.settings, 'businessTrips'))
        .map(m => m.pushToken!);

      if (pushTokens.length > 0) {
        await PushService.sendToTokens(pushTokens, {
          title: 'Služobná cesta zrušená',
          body: `${trip.user.firstName} ${trip.user.lastName} zrušil služobnú cestu do ${trip.destination}`,
          data: {
            type: 'business_trip_approved',
            businessTripId: trip.id,
            userId: trip.user.id
          }
        });
      }
    } catch (error) {
      console.error('Failed to notify managers of trip cancellation:', error);
    }
  }

  /**
   * Check if push notification should be sent based on user preferences
   */
  private shouldSendPushNotification(settings: unknown, type: string): boolean {
    if (!settings || typeof settings !== 'object') return true;
    const settingsObj = settings as Record<string, any>;
    const notifications = settingsObj.notifications || {};
    const pushSettings = notifications.push || {};
    return pushSettings[type] !== false && pushSettings.enabled !== false;
  }

  /**
   * Check if email notification should be sent based on user preferences
   */
  private shouldSendEmailNotification(settings: unknown, type: string): boolean {
    if (!settings || typeof settings !== 'object') return true;
    const settingsObj = settings as Record<string, any>;
    const notifications = settingsObj.notifications || {};
    const emailSettings = notifications.email || {};
    return emailSettings[type] !== false && emailSettings.enabled !== false;
  }
}
