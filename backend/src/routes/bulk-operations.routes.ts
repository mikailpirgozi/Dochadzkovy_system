import { Router } from 'express';
import { BulkOperationsController } from '../controllers/bulk-operations.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * @route POST /api/bulk/import-employees
 * @desc Import employees in bulk from CSV data
 * @access Private (Admin only)
 */
router.post(
  '/import-employees',
  requireRole(['COMPANY_ADMIN']),
  BulkOperationsController.importEmployees
);

/**
 * @route POST /api/bulk/update-schedules
 * @desc Update employee schedules in bulk
 * @access Private (Admin, Manager)
 */
router.post(
  '/update-schedules',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.updateSchedules
);

/**
 * @route POST /api/bulk/process-corrections
 * @desc Process attendance corrections in bulk (approve/reject)
 * @access Private (Admin, Manager)
 */
router.post(
  '/process-corrections',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.processCorrections
);

/**
 * @route GET /api/bulk/operations
 * @desc Get all bulk operations for the company
 * @access Private (Admin, Manager)
 * @query limit - number of operations to return (default: 20)
 */
router.get(
  '/operations',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.getBulkOperations
);

/**
 * @route GET /api/bulk/operations/:operationId
 * @desc Get status of a specific bulk operation
 * @access Private (Admin, Manager)
 */
router.get(
  '/operations/:operationId',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.getOperationStatus
);

/**
 * @route POST /api/bulk/operations/:operationId/cancel
 * @desc Cancel a bulk operation
 * @access Private (Admin, Manager)
 */
router.post(
  '/operations/:operationId/cancel',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.cancelOperation
);

/**
 * @route POST /api/bulk/validate-csv
 * @desc Validate CSV file for employee import
 * @access Private (Admin)
 */
router.post(
  '/validate-csv',
  requireRole(['COMPANY_ADMIN']),
  BulkOperationsController.validateCSV
);

/**
 * @route POST /api/bulk/search/employees
 * @desc Advanced search for employees
 * @access Private (Admin, Manager)
 */
router.post(
  '/search/employees',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.searchEmployees
);

/**
 * @route POST /api/bulk/search/attendance
 * @desc Advanced search for attendance records
 * @access Private (Admin, Manager)
 */
router.post(
  '/search/attendance',
  requireRole(['COMPANY_ADMIN', 'MANAGER']),
  BulkOperationsController.searchAttendance
);

export default router;
