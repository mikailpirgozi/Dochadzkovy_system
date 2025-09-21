import type { Response } from 'express';
import { z } from 'zod';
import { CorrectionService } from '../services/correction.service.js';
import type { AuthenticatedRequest, ApiResponse, PaginatedResponse, CorrectionWithDetails, CreateCorrectionRequest } from '../types/index.js';
import { CustomError } from '../middleware/errorHandler.js';

// Validation schemas
const createCorrectionSchema = z.object({
  originalEventId: z.string().min(1, 'Original event ID is required'),
  requestedChange: z.object({
    timestamp: z.string().datetime().optional(),
    type: z.enum(['CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'PERSONAL_START', 'PERSONAL_END']).optional(),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
    location: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).optional()
    }).optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one change must be requested' }
  ),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must be less than 1000 characters')
});

const correctionQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().transform(date => new Date(date)).optional(),
  endDate: z.string().datetime().transform(date => new Date(date)).optional(),
  sortBy: z.enum(['createdAt', 'reviewedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const reviewCorrectionSchema = z.object({
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

const rejectCorrectionSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000, 'Reason must be less than 1000 characters')
});

export class CorrectionController {
  private readonly correctionService = new CorrectionService();

  /**
   * Create a new correction request
   * POST /corrections
   */
  createCorrection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedData = createCorrectionSchema.parse(req.body);

    // Ensure all required fields are present
    if (!validatedData.originalEventId || !validatedData.requestedChange || !validatedData.reason) {
      throw new CustomError('Missing required fields', 400);
    }

    const correction = await this.correctionService.createCorrection(
      user.id,
      user.companyId,
      validatedData as CreateCorrectionRequest
    );

    const response: ApiResponse<CorrectionWithDetails> = {
      success: true,
      data: correction,
      message: 'Correction request created successfully'
    };

    res.status(201).json(response);
  };

  /**
   * Get corrections with pagination and filters
   * GET /corrections
   */
  getCorrections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedQuery = correctionQuerySchema.parse(req.query);

    const result = await this.correctionService.getCorrections(
      user.companyId,
      validatedQuery,
      user.role,
      user.id
    );

    const response: PaginatedResponse<CorrectionWithDetails> = {
      success: true,
      data: result.corrections,
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
   * Get correction by ID
   * GET /corrections/:id
   */
  getCorrectionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Correction ID is required', 400);
    }

    const correction = await this.correctionService.getCorrectionById(
      id,
      user.companyId,
      user.role,
      user.id
    );

    const response: ApiResponse<CorrectionWithDetails> = {
      success: true,
      data: correction
    };

    res.json(response);
  };

  /**
   * Approve a correction request
   * PUT /corrections/:id/approve
   */
  approveCorrection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Correction ID is required', 400);
    }

    // Only managers and company admins can approve corrections
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to approve corrections', 403);
    }

    const validatedData = reviewCorrectionSchema.parse(req.body);

    const correction = await this.correctionService.approveCorrection(
      id,
      user.id,
      user.companyId,
      validatedData.notes
    );

    const response: ApiResponse<CorrectionWithDetails> = {
      success: true,
      data: correction,
      message: 'Correction approved successfully'
    };

    res.json(response);
  };

  /**
   * Reject a correction request
   * PUT /corrections/:id/reject
   */
  rejectCorrection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Correction ID is required', 400);
    }

    // Only managers and company admins can reject corrections
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to reject corrections', 403);
    }

    const validatedData = rejectCorrectionSchema.parse(req.body);

    const correction = await this.correctionService.rejectCorrection(
      id,
      user.id,
      user.companyId,
      validatedData.reason
    );

    const response: ApiResponse<CorrectionWithDetails> = {
      success: true,
      data: correction,
      message: 'Correction rejected successfully'
    };

    res.json(response);
  };

  /**
   * Get correction statistics
   * GET /corrections/stats
   */
  getCorrectionStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;

    // Only managers and company admins can view stats
    if (!['COMPANY_ADMIN', 'MANAGER'].includes(user.role)) {
      throw new CustomError('Insufficient permissions to view correction statistics', 403);
    }

    const stats = await this.correctionService.getCorrectionStats(user.companyId);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats
    };

    res.json(response);
  };

  /**
   * Get user's own corrections (for employees)
   * GET /corrections/my
   */
  getMyCorrections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const validatedQuery = correctionQuerySchema.parse(req.query);

    const result = await this.correctionService.getCorrections(
      user.companyId,
      { ...validatedQuery, userId: user.id },
      'EMPLOYEE',
      user.id
    );

    const response: PaginatedResponse<CorrectionWithDetails> = {
      success: true,
      data: result.corrections,
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
   * Cancel a pending correction request (employee can cancel their own)
   * DELETE /corrections/:id
   */
  cancelCorrection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user;
    const { id } = req.params;

    if (!id) {
      throw new CustomError('Correction ID is required', 400);
    }

    // Get the correction to verify ownership and status
    const correction = await this.correctionService.getCorrectionById(
      id,
      user.companyId,
      user.role,
      user.id
    );

    // Only the owner can cancel their correction
    if (correction.userId !== user.id) {
      throw new CustomError('You can only cancel your own corrections', 403);
    }

    // Only pending corrections can be cancelled
    if (correction.status !== 'PENDING') {
      throw new CustomError('Only pending corrections can be cancelled', 400);
    }

    // Update correction status to cancelled (we'll add this status)
    await this.correctionService.rejectCorrection(
      id,
      user.id,
      user.companyId,
      'Cancelled by employee'
    );

    const response: ApiResponse<null> = {
      success: true,
      message: 'Correction request cancelled successfully'
    };

    res.json(response);
  };
}
