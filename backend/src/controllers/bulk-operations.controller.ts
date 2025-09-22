import { Request, Response } from 'express';
import { BulkOperationsService, AdvancedSearchService } from '../services/bulk-operations.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { z } from 'zod';

// Validation schemas
const BulkEmployeeImportSchema = z.object({
  employees: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    position: z.string().optional(),
    department: z.string().optional(),
    startDate: z.string().optional(),
    hourlyRate: z.number().positive().optional(),
    workSchedule: z.string().optional()
  })),
  options: z.object({
    skipDuplicates: z.boolean(),
    updateExisting: z.boolean(),
    sendInviteEmails: z.boolean(),
    defaultPassword: z.string().optional()
  })
});

const BulkScheduleUpdateSchema = z.object({
  userIds: z.array(z.string()),
  scheduleChanges: z.object({
    scheduleId: z.string().optional(),
    effectiveFrom: z.string(),
    effectiveTo: z.string().optional(),
    reason: z.string()
  }),
  options: z.object({
    notifyEmployees: z.boolean(),
    requireApproval: z.boolean()
  })
});

const BulkCorrectionApprovalSchema = z.object({
  correctionIds: z.array(z.string()),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  options: z.object({
    notifyEmployees: z.boolean(),
    updateAttendance: z.boolean()
  })
});

const AdvancedSearchSchema = z.object({
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'between', 'in', 'not_in']),
    value: z.any(),
    logicalOperator: z.enum(['AND', 'OR']).optional()
  })),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  pagination: z.object({
    page: z.number().positive(),
    pageSize: z.number().positive().max(100)
  }),
  groupBy: z.string().optional(),
  aggregations: z.array(z.object({
    field: z.string(),
    function: z.enum(['sum', 'avg', 'count', 'min', 'max'])
  })).optional()
});

export class BulkOperationsController {
  /**
   * Import employees in bulk
   */
  static async importEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id;
      
      if (!companyId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID and User ID are required'
        });
      }

      const validatedData = BulkEmployeeImportSchema.parse(req.body) as any;

      const operationId = await BulkOperationsService.importEmployees(
        companyId,
        userId,
        validatedData
      );

      res.json({
        success: true,
        data: { operationId }
      });
    } catch (error) {
      console.error('Error importing employees:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to import employees'
      });
    }
  }

  /**
   * Update schedules in bulk
   */
  static async updateSchedules(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id;
      
      if (!companyId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID and User ID are required'
        });
      }

      const validatedData = BulkScheduleUpdateSchema.parse(req.body) as any;

      const operationId = await BulkOperationsService.updateSchedulesBulk(
        companyId,
        userId,
        validatedData
      );

      res.json({
        success: true,
        data: { operationId }
      });
    } catch (error) {
      console.error('Error updating schedules:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update schedules'
      });
    }
  }

  /**
   * Process corrections in bulk
   */
  static async processCorrections(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const userId = req.user?.id;
      
      if (!companyId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID and User ID are required'
        });
      }

      const validatedData = BulkCorrectionApprovalSchema.parse(req.body) as any;

      const operationId = await BulkOperationsService.processCorrections(
        companyId,
        userId,
        validatedData
      );

      res.json({
        success: true,
        data: { operationId }
      });
    } catch (error) {
      console.error('Error processing corrections:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process corrections'
      });
    }
  }

  /**
   * Get bulk operation status
   */
  static async getOperationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { operationId } = req.params;
      
      if (!operationId) {
        return res.status(400).json({
          success: false,
          error: 'Operation ID is required'
        });
      }

      const operation = await BulkOperationsService.getBulkOperationStatus(operationId);

      if (!operation) {
        return res.status(404).json({
          success: false,
          error: 'Operation not found'
        });
      }

      res.json({
        success: true,
        data: operation
      });
    } catch (error) {
      console.error('Error getting operation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get operation status'
      });
    }
  }

  /**
   * Get all bulk operations
   */
  static async getBulkOperations(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      const { limit } = req.query;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      const operations = await BulkOperationsService.getBulkOperations(
        companyId,
        limit ? parseInt(limit as string) : 20
      );

      res.json({
        success: true,
        data: operations
      });
    } catch (error) {
      console.error('Error getting bulk operations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get bulk operations'
      });
    }
  }

  /**
   * Cancel bulk operation
   */
  static async cancelOperation(req: AuthenticatedRequest, res: Response) {
    try {
      const { operationId } = req.params;
      
      if (!operationId) {
        return res.status(400).json({
          success: false,
          error: 'Operation ID is required'
        });
      }

      await BulkOperationsService.cancelBulkOperation(operationId);

      res.json({
        success: true,
        message: 'Operation cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling operation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel operation'
      });
    }
  }

  /**
   * Validate CSV file
   */
  static async validateCSV(req: Request, res: Response) {
    try {
      const { csvData } = req.body;
      
      if (!csvData) {
        return res.status(400).json({
          success: false,
          error: 'CSV data is required'
        });
      }

      const validation = BulkOperationsService.validateEmployeeCSV(csvData);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate CSV'
      });
    }
  }

  /**
   * Advanced search for employees
   */
  static async searchEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      const validatedData = AdvancedSearchSchema.parse(req.body) as any;

      const results = await AdvancedSearchService.searchEmployees(companyId, validatedData);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error in advanced employee search:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to search employees'
      });
    }
  }

  /**
   * Advanced search for attendance
   */
  static async searchAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Company ID is required'
        });
      }

      const validatedData = AdvancedSearchSchema.parse(req.body) as any;

      const results = await AdvancedSearchService.searchAttendance(companyId, validatedData);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error in advanced attendance search:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to search attendance'
      });
    }
  }
}
