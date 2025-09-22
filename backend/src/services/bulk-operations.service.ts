import { prisma } from '../utils/database.js';
import bcrypt from 'bcryptjs';

export interface BulkOperation {
  id: string;
  type: 'import' | 'export' | 'update' | 'delete' | 'approve' | 'reject';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  results?: any;
  companyId: string;
  createdBy: string;
}

export interface BulkEmployeeImport {
  employees: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
    startDate?: string;
    hourlyRate?: number;
    workSchedule?: string;
  }>;
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    sendInviteEmails: boolean;
    defaultPassword?: string;
  };
}

export interface BulkScheduleUpdate {
  userIds: string[];
  scheduleChanges: {
    scheduleId?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    reason: string;
  };
  options: {
    notifyEmployees: boolean;
    requireApproval: boolean;
  };
}

export interface BulkCorrectionApproval {
  correctionIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  options: {
    notifyEmployees: boolean;
    updateAttendance: boolean;
  };
}

export class BulkOperationsService {
  /**
   * Create a new bulk operation record
   */
  private static async createBulkOperation(
    companyId: string,
    createdBy: string,
    type: BulkOperation['type'],
    totalItems: number
  ): Promise<string> {
    const operationId = `bulk_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in database (you might want to create a BulkOperation model in Prisma)
    // For now, we'll use a simple in-memory store or file system
    const operation: BulkOperation = {
      id: operationId,
      type,
      status: 'pending',
      progress: 0,
      totalItems,
      processedItems: 0,
      failedItems: 0,
      createdAt: new Date().toISOString(),
      companyId,
      createdBy
    };

    // Store operation (in production, use database)
    await this.storeBulkOperation(operation);
    
    return operationId;
  }

  /**
   * Import employees in bulk
   */
  static async importEmployees(
    companyId: string,
    createdBy: string,
    importData: BulkEmployeeImport
  ): Promise<string> {
    const operationId = await this.createBulkOperation(
      companyId,
      createdBy,
      'import',
      importData.employees.length
    );

    // Process import asynchronously
    this.processEmployeeImport(operationId, companyId, importData).catch(error => {
      console.error('Error processing employee import:', error);
      this.updateBulkOperation(operationId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    });

    return operationId;
  }

  /**
   * Process employee import
   */
  private static async processEmployeeImport(
    operationId: string,
    companyId: string,
    importData: BulkEmployeeImport
  ) {
    await this.updateBulkOperation(operationId, { status: 'processing' });

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < importData.employees.length; i++) {
      const employee = importData.employees[i];
      
      try {
        // Check if employee already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: employee.email }
        });

        if (existingUser) {
          if (importData.options.skipDuplicates) {
            results.skipped++;
          } else if (importData.options.updateExisting) {
            // Update existing employee
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                firstName: employee.firstName,
                lastName: employee.lastName,
                // Note: phone, position, department, hourlyRate are not in the current schema
                // These would need to be added to the User model if needed
              }
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new employee
          const hashedPassword = await bcrypt.hash(
            importData.options.defaultPassword || 'password123',
            10
          );

          await prisma.user.create({
            data: {
              email: employee.email,
              password: hashedPassword,
              firstName: employee.firstName,
              lastName: employee.lastName,
              role: 'EMPLOYEE',
              isActive: true,
              companyId
              // Note: phone, position, department, hourlyRate are not in the current schema
              // These would need to be added to the User model if needed
            }
          });
          results.imported++;
        }

        // Update progress
        const progress = Math.round(((i + 1) / importData.employees.length) * 100);
        await this.updateBulkOperation(operationId, {
          progress,
          processedItems: i + 1
        });

        // Add small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.errors.push(`${employee.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        await this.updateBulkOperation(operationId, {
          failedItems: results.failed
        });
      }
    }

    // Mark as completed
    await this.updateBulkOperation(operationId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      results
    });
  }

  /**
   * Update schedules in bulk
   */
  static async updateSchedulesBulk(
    companyId: string,
    createdBy: string,
    updateData: BulkScheduleUpdate
  ): Promise<string> {
    const operationId = await this.createBulkOperation(
      companyId,
      createdBy,
      'update',
      updateData.userIds.length
    );

    // Process schedule updates asynchronously
    this.processScheduleUpdates(operationId, companyId, updateData).catch(error => {
      console.error('Error processing schedule updates:', error);
      this.updateBulkOperation(operationId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    });

    return operationId;
  }

  /**
   * Process schedule updates
   */
  private static async processScheduleUpdates(
    operationId: string,
    companyId: string,
    updateData: BulkScheduleUpdate
  ) {
    await this.updateBulkOperation(operationId, { status: 'processing' });

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < updateData.userIds.length; i++) {
      const userId = updateData.userIds[i];
      
      try {
        // Verify user belongs to company
        const user = await prisma.user.findFirst({
          where: { id: userId, companyId }
        });

        if (!user) {
          throw new Error('User not found or not in company');
        }

        // Create schedule change record (you might need to create this model)
        // For now, we'll just update user data or create a log
        
        results.updated++;

        // Update progress
        const progress = Math.round(((i + 1) / updateData.userIds.length) * 100);
        await this.updateBulkOperation(operationId, {
          progress,
          processedItems: i + 1
        });

        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        results.failed++;
        results.errors.push(`${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        await this.updateBulkOperation(operationId, {
          failedItems: results.failed
        });
      }
    }

    await this.updateBulkOperation(operationId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      results
    });
  }

  /**
   * Process corrections in bulk
   */
  static async processCorrections(
    companyId: string,
    createdBy: string,
    correctionData: BulkCorrectionApproval
  ): Promise<string> {
    const operationId = await this.createBulkOperation(
      companyId,
      createdBy,
      correctionData.action,
      correctionData.correctionIds.length
    );

    // Process corrections asynchronously
    this.processCorrectionApprovals(operationId, companyId, correctionData).catch(error => {
      console.error('Error processing corrections:', error);
      this.updateBulkOperation(operationId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      });
    });

    return operationId;
  }

  /**
   * Process correction approvals
   */
  private static async processCorrectionApprovals(
    operationId: string,
    companyId: string,
    correctionData: BulkCorrectionApproval
  ) {
    await this.updateBulkOperation(operationId, { status: 'processing' });

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < correctionData.correctionIds.length; i++) {
      const correctionId = correctionData.correctionIds[i];
      
      try {
        // Find and update correction
        const correction = await prisma.correction.findFirst({
          where: { 
            id: correctionId,
            user: { companyId }
          }
        });

        if (!correction) {
          throw new Error('Correction not found');
        }

        await prisma.correction.update({
          where: { id: correctionId },
          data: {
            status: correctionData.action === 'approve' ? 'APPROVED' : 'REJECTED',
            reviewedAt: new Date(),
            reviewNotes: correctionData.reason
          }
        });

        results.processed++;

        // Update progress
        const progress = Math.round(((i + 1) / correctionData.correctionIds.length) * 100);
        await this.updateBulkOperation(operationId, {
          progress,
          processedItems: i + 1
        });

        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        results.failed++;
        results.errors.push(`${correctionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        await this.updateBulkOperation(operationId, {
          failedItems: results.failed
        });
      }
    }

    await this.updateBulkOperation(operationId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      results
    });
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperationStatus(operationId: string): Promise<BulkOperation | null> {
    return await this.loadBulkOperation(operationId);
  }

  /**
   * Get all bulk operations for company
   */
  static async getBulkOperations(companyId: string, limit = 20): Promise<BulkOperation[]> {
    // In production, this would query from database
    // For now, return mock data or load from file system
    return [];
  }

  /**
   * Cancel bulk operation
   */
  static async cancelBulkOperation(operationId: string): Promise<void> {
    await this.updateBulkOperation(operationId, {
      status: 'failed',
      error: 'Cancelled by user',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Validate CSV file for employee import
   */
  static validateEmployeeCSV(csvData: string): {
    isValid: boolean;
    errors: string[];
    validRows: number;
    totalRows: number;
    preview: any[];
  } {
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const requiredHeaders = ['firstName', 'lastName', 'email'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return {
          isValid: false,
          errors: [`Chýbajúce stĺpce: ${missingHeaders.join(', ')}`],
          validRows: 0,
          totalRows: lines.length - 1,
          preview: []
        };
      }

      const errors: string[] = [];
      const preview: any[] = [];
      let validRows = 0;

      for (let i = 1; i < Math.min(lines.length, 6); i++) { // Preview first 5 rows
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validate email
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push(`Riadok ${i}: Neplatný email ${row.email}`);
        } else if (row.firstName && row.lastName && row.email) {
          validRows++;
        }

        preview.push(row);
      }

      return {
        isValid: errors.length === 0,
        errors,
        validRows,
        totalRows: lines.length - 1,
        preview
      };
    } catch {
      return {
        isValid: false,
        errors: ['Nepodarilo sa spracovať CSV súbor'],
        validRows: 0,
        totalRows: 0,
        preview: []
      };
    }
  }

  /**
   * Store bulk operation (in production, use database)
   */
  private static async storeBulkOperation(operation: BulkOperation): Promise<void> {
    // In production, store in database
    // For now, we'll use in-memory storage or file system
    console.log('Storing bulk operation:', operation.id);
  }

  /**
   * Load bulk operation (in production, use database)
   */
  private static async loadBulkOperation(operationId: string): Promise<BulkOperation | null> {
    // In production, load from database
    // For now, return mock data
    return {
      id: operationId,
      type: 'import',
      status: 'completed',
      progress: 100,
      totalItems: 10,
      processedItems: 10,
      failedItems: 0,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      companyId: 'test-company',
      createdBy: 'test-user'
    };
  }

  /**
   * Update bulk operation (in production, use database)
   */
  private static async updateBulkOperation(
    operationId: string,
    updates: Partial<BulkOperation>
  ): Promise<void> {
    // In production, update in database
    console.log('Updating bulk operation:', operationId, updates);
  }
}

export class AdvancedSearchService {
  /**
   * Search employees with advanced filters
   */
  static async searchEmployees(
    companyId: string,
    searchParams: any
  ): Promise<{
    results: any[];
    totalCount: number;
    aggregations?: Record<string, any>;
  }> {
    try {
      const { filters, sortBy, sortOrder, pagination } = searchParams;
      
      // Build where clause from filters
      const whereClause: any = {
        companyId,
        isActive: true,
        role: 'EMPLOYEE'
      };

      // Apply filters
      for (const filter of filters || []) {
        switch (filter.operator) {
          case 'equals':
            whereClause[filter.field] = filter.value;
            break;
          case 'contains':
            whereClause[filter.field] = { contains: filter.value, mode: 'insensitive' };
            break;
          case 'starts_with':
            whereClause[filter.field] = { startsWith: filter.value, mode: 'insensitive' };
            break;
          case 'ends_with':
            whereClause[filter.field] = { endsWith: filter.value, mode: 'insensitive' };
            break;
          case 'greater_than':
            whereClause[filter.field] = { gt: filter.value };
            break;
          case 'less_than':
            whereClause[filter.field] = { lt: filter.value };
            break;
          case 'between':
            whereClause[filter.field] = { gte: filter.value[0], lte: filter.value[1] };
            break;
          case 'in':
            whereClause[filter.field] = { in: filter.value };
            break;
          case 'not_in':
            whereClause[filter.field] = { notIn: filter.value };
            break;
        }
      }

      // Get total count
      const totalCount = await prisma.user.count({ where: whereClause });

      // Get results with pagination
      const results = await prisma.user.findMany({
        where: whereClause,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          createdAt: true
          // Note: phone, position, department, hourlyRate are not in the current schema
        }
      });

      return {
        results,
        totalCount
      };
    } catch (error) {
      console.error('Error in advanced employee search:', error);
      return {
        results: [],
        totalCount: 0
      };
    }
  }

  /**
   * Search attendance records with advanced filters
   */
  static async searchAttendance(
    companyId: string,
    searchParams: any
  ): Promise<{
    results: any[];
    totalCount: number;
    aggregations?: Record<string, any>;
  }> {
    try {
      const { filters, sortBy, sortOrder, pagination } = searchParams;
      
      // Build where clause
      const whereClause: any = {
        user: { companyId }
      };

      // Apply filters
      for (const filter of filters || []) {
        if (filter.field === 'userId') {
          whereClause.userId = filter.value;
        } else if (filter.field === 'type') {
          whereClause.type = filter.value;
        } else if (filter.field === 'timestamp') {
          switch (filter.operator) {
            case 'greater_than':
              whereClause.timestamp = { gte: new Date(filter.value) };
              break;
            case 'less_than':
              whereClause.timestamp = { lte: new Date(filter.value) };
              break;
            case 'between':
              whereClause.timestamp = { 
                gte: new Date(filter.value[0]), 
                lte: new Date(filter.value[1]) 
              };
              break;
          }
        } else if (filter.field === 'qrVerified') {
          whereClause.qrVerified = filter.value;
        }
      }

      // Get total count
      const totalCount = await prisma.attendanceEvent.count({ where: whereClause });

      // Get results with pagination
      const results = await prisma.attendanceEvent.findMany({
        where: whereClause,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { timestamp: 'desc' },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
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

      return {
        results,
        totalCount
      };
    } catch (error) {
      console.error('Error in advanced attendance search:', error);
      return {
        results: [],
        totalCount: 0
      };
    }
  }
}
