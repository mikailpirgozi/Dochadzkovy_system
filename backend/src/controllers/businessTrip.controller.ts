import type { Response } from 'express';
import { z } from 'zod';
import { BusinessTripService } from '../services/businessTrip.service.js';
import type { AuthenticatedRequest, ApiResponse, PaginatedResponse, BusinessTripWithDetails, CreateBusinessTripRequest, LocationData } from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

// Validation schemas
const createBusinessTripSchema = z.object({
  destination: z.string().min(3, 'Destination must be at least 3 characters').max(100, 'Destination must be less than 100 characters'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500, 'Purpose must be less than 500 characters'),
  estimatedStart: z.string().datetime('Invalid start date format'),
  estimatedEnd: z.string().datetime('Invalid end date format'),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const businessTripQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().transform(date => new Date(date)).optional(),
  endDate: z.string().datetime().transform(date => new Date(date)).optional(),
  sortBy: z.enum(['createdAt', 'estimatedStart', 'approvedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const reviewBusinessTripSchema = z.object({
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const rejectBusinessTripSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000, 'Reason must be less than 1000 characters')
});

const startBusinessTripSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional()
  })
});

const endBusinessTripSchema = z.object({
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional()
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const cancelBusinessTripSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters').max(500, 'Reason must be less than 500 characters')
});

export class BusinessTripController {
  private readonly businessTripService = new BusinessTripService();

  /**
   * Create a new business trip request
   * POST /business-trips
   */
  createBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedData = createBusinessTripSchema.parse(req.body);

    // Additional validation for dates
    const estimatedStart = new Date(validatedData.estimatedStart);
    const estimatedEnd = new Date(validatedData.estimatedEnd);

    if (estimatedEnd <= estimatedStart) {
      throw new CustomError('End date must be after start date', 400);
    }

    // Ensure all required fields are present
    if (!validatedData.destination || !validatedData.purpose || !validatedData.estimatedStart || !validatedData.estimatedEnd) {
      throw new CustomError('Missing required fields', 400);
    }

    const trip = await this.businessTripService.createBusinessTrip(
      user.id,
      user.companyId,
      validatedData as CreateBusinessTripRequest
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip request created successfully'
    };

    res.status(201).json(response);
  };

  /**
   * Get business trips with pagination and filters
   * GET /business-trips
   */
  getBusinessTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedQuery = businessTripQuerySchema.parse(req.query);

    const result = await this.businessTripService.getBusinessTrips(
      user.companyId,
      validatedQuery,
      user.role,
      user.id
    );

    const response: PaginatedResponse<BusinessTripWithDetails> = {
      success: true,
      data: result.trips,
      pagination: {
        page: result.page,
        limit: validatedQuery.limit ?? 10,
        total: result.total,
        totalPages: result.totalPages
      }
    };

    res.json(response);
  };

  /**
   * Get business trip by ID
   * GET /business-trips/:id
   */
  getBusinessTripById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    const trip = await this.businessTripService.getBusinessTripById(
      id,
      user.companyId,
      user.role,
      user.id
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip
    };

    res.json(response);
  };

  /**
   * Approve a business trip request
   * PUT /business-trips/:id/approve
   */
  approveBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    // Only managers and company admins can approve business trips
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to approve business trips', 403);
    }

    const validatedData = reviewBusinessTripSchema.parse(req.body);

    const trip = await this.businessTripService.approveBusinessTrip(
      id,
      user.id,
      user.companyId,
      validatedData.notes
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip approved successfully'
    };

    res.json(response);
  };

  /**
   * Reject a business trip request
   * PUT /business-trips/:id/reject
   */
  rejectBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    // Only managers and company admins can reject business trips
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to reject business trips', 403);
    }

    const validatedData = rejectBusinessTripSchema.parse(req.body);

    const trip = await this.businessTripService.rejectBusinessTrip(
      id,
      user.id,
      user.companyId,
      validatedData.reason
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip rejected successfully'
    };

    res.json(response);
  };

  /**
   * Start a business trip
   * PUT /business-trips/:id/start
   */
  startBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    const validatedData = startBusinessTripSchema.parse(req.body);

    // Ensure location data is complete
    if (validatedData.location?.latitude === undefined || 
        validatedData.location.longitude === undefined) {
      throw new CustomError('Complete location data is required', 400);
    }

    const trip = await this.businessTripService.startBusinessTrip(
      id,
      user.id,
      user.companyId,
      validatedData.location as LocationData
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip started successfully'
    };

    res.json(response);
  };

  /**
   * End a business trip
   * PUT /business-trips/:id/end
   */
  endBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    const validatedData = endBusinessTripSchema.parse(req.body);

    // Ensure location data is complete
    if (validatedData.location?.latitude === undefined || 
        validatedData.location.longitude === undefined) {
      throw new CustomError('Complete location data is required', 400);
    }

    const trip = await this.businessTripService.endBusinessTrip(
      id,
      user.id,
      user.companyId,
      validatedData.location as LocationData,
      validatedData.notes
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip ended successfully'
    };

    res.json(response);
  };

  /**
   * Cancel a business trip
   * PUT /business-trips/:id/cancel
   */
  cancelBusinessTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Business trip ID is required', 400);
    }

    const validatedData = cancelBusinessTripSchema.parse(req.body);

    const trip = await this.businessTripService.cancelBusinessTrip(
      id,
      user.id,
      user.companyId,
      validatedData.reason
    );

    const response: ApiResponse<BusinessTripWithDetails> = {
      success: true,
      data: trip,
      message: 'Business trip cancelled successfully'
    };

    res.json(response);
  };

  /**
   * Get business trip statistics
   * GET /business-trips/stats
   */
  getBusinessTripStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can view stats
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to view business trip statistics', 403);
    }

    const stats = await this.businessTripService.getBusinessTripStats(user.companyId);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats
    };

    res.json(response);
  };

  /**
   * Get user's own business trips (for employees)
   * GET /business-trips/my
   */
  getMyBusinessTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedQuery = businessTripQuerySchema.parse(req.query);

    const result = await this.businessTripService.getBusinessTrips(
      user.companyId,
      { ...validatedQuery, userId: user.id },
      'EMPLOYEE',
      user.id
    );

    const response: PaginatedResponse<BusinessTripWithDetails> = {
      success: true,
      data: result.trips,
      pagination: {
        page: result.page,
        limit: validatedQuery.limit ?? 10,
        total: result.total,
        totalPages: result.totalPages
      }
    };

    res.json(response);
  };

  /**
   * Get active business trips for current user
   * GET /business-trips/active
   */
  getActiveBusinessTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    const result = await this.businessTripService.getBusinessTrips(
      user.companyId,
      {
        userId: user.id,
        status: 'IN_PROGRESS',
        limit: 10
      },
      'EMPLOYEE',
      user.id
    );

    const response: ApiResponse<BusinessTripWithDetails[]> = {
      success: true,
      data: result.trips
    };

    res.json(response);
  };
}
