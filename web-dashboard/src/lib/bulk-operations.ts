
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

export interface AdvancedFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AdvancedSearch {
  filters: AdvancedFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pagination: {
    page: number;
    pageSize: number;
  };
  groupBy?: string;
  aggregations?: Array<{
    field: string;
    function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
}

export class BulkOperationsService {
  /**
   * Import employees in bulk
   */
  static async importEmployees(importData: BulkEmployeeImport): Promise<BulkOperation> {
    try {
      // In a real implementation, this would call the backend API
      // For now, we'll simulate the operation
      
      const operationId = `bulk_import_${Date.now()}`;
      
      // Simulate API call
      const response = await fetch('/api/bulk/import-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      return {
        id: operationId,
        type: 'import',
        status: 'processing',
        progress: 0,
        totalItems: importData.employees.length,
        processedItems: 0,
        failedItems: 0,
        createdAt: new Date().toISOString(),
        results: result
      };
    } catch (error) {
      console.error('Error importing employees:', error);
      throw new Error('Nepodarilo sa importovať zamestnancov');
    }
  }

  /**
   * Update schedules in bulk
   */
  static async updateSchedulesBulk(updateData: BulkScheduleUpdate): Promise<BulkOperation> {
    try {
      const operationId = `bulk_schedule_${Date.now()}`;
      
      // Simulate API call
      const response = await fetch('/api/bulk/update-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('Schedule update failed');
      }

      const result = await response.json();
      
      return {
        id: operationId,
        type: 'update',
        status: 'processing',
        progress: 0,
        totalItems: updateData.userIds.length,
        processedItems: 0,
        failedItems: 0,
        createdAt: new Date().toISOString(),
        results: result
      };
    } catch (error) {
      console.error('Error updating schedules:', error);
      throw new Error('Nepodarilo sa aktualizovať rozvrhy');
    }
  }

  /**
   * Process corrections in bulk
   */
  static async processCorrections(correctionData: BulkCorrectionApproval): Promise<BulkOperation> {
    try {
      const operationId = `bulk_corrections_${Date.now()}`;
      
      // Simulate API call
      const response = await fetch('/api/bulk/process-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correctionData)
      });

      if (!response.ok) {
        throw new Error('Correction processing failed');
      }

      const result = await response.json();
      
      return {
        id: operationId,
        type: correctionData.action === 'approve' ? 'approve' : 'reject',
        status: 'processing',
        progress: 0,
        totalItems: correctionData.correctionIds.length,
        processedItems: 0,
        failedItems: 0,
        createdAt: new Date().toISOString(),
        results: result
      };
    } catch (error) {
      console.error('Error processing corrections:', error);
      throw new Error('Nepodarilo sa spracovať opravy');
    }
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperationStatus(operationId: string): Promise<BulkOperation> {
    try {
      const response = await fetch(`/api/bulk/operations/${operationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get operation status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting operation status:', error);
      throw new Error('Nepodarilo sa získať stav operácie');
    }
  }

  /**
   * Get all bulk operations for company
   */
  static async getBulkOperations(limit = 20): Promise<BulkOperation[]> {
    try {
      const response = await fetch(`/api/bulk/operations?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to get bulk operations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting bulk operations:', error);
      return [];
    }
  }

  /**
   * Cancel bulk operation
   */
  static async cancelBulkOperation(operationId: string): Promise<void> {
    try {
      const response = await fetch(`/api/bulk/operations/${operationId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel operation');
      }
    } catch (error) {
      console.error('Error canceling operation:', error);
      throw new Error('Nepodarilo sa zrušiť operáciu');
    }
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
}

export class AdvancedSearchService {
  /**
   * Search employees with advanced filters
   */
  static async searchEmployees(searchParams: AdvancedSearch): Promise<{
    results: any[];
    totalCount: number;
    aggregations?: Record<string, any>;
  }> {
    try {
      const response = await fetch('/api/employees/advanced-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in advanced search:', error);
      return {
        results: [],
        totalCount: 0
      };
    }
  }

  /**
   * Search attendance records with advanced filters
   */
  static async searchAttendance(searchParams: AdvancedSearch): Promise<{
    results: any[];
    totalCount: number;
    aggregations?: Record<string, any>;
  }> {
    try {
      const response = await fetch('/api/attendance/advanced-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in attendance search:', error);
      return {
        results: [],
        totalCount: 0
      };
    }
  }

  /**
   * Get available filter fields and their types
   */
  static getAvailableFilters(entityType: 'employees' | 'attendance'): Array<{
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    options?: Array<{ value: string; label: string }>;
  }> {
    if (entityType === 'employees') {
      return [
        { field: 'firstName', label: 'Meno', type: 'string' },
        { field: 'lastName', label: 'Priezvisko', type: 'string' },
        { field: 'email', label: 'Email', type: 'string' },
        { field: 'position', label: 'Pozícia', type: 'string' },
        { field: 'department', label: 'Oddelenie', type: 'select', options: [
          { value: 'IT', label: 'IT' },
          { value: 'HR', label: 'HR' },
          { value: 'Finance', label: 'Financie' },
          { value: 'Marketing', label: 'Marketing' }
        ]},
        { field: 'isActive', label: 'Aktívny', type: 'boolean' },
        { field: 'createdAt', label: 'Dátum vytvorenia', type: 'date' },
        { field: 'hourlyRate', label: 'Hodinová sadzba', type: 'number' },
      ];
    } else {
      return [
        { field: 'userId', label: 'Zamestnanec', type: 'select' },
        { field: 'type', label: 'Typ udalosti', type: 'select', options: [
          { value: 'CLOCK_IN', label: 'Príchod' },
          { value: 'CLOCK_OUT', label: 'Odchod' },
          { value: 'BREAK_START', label: 'Začiatok prestávky' },
          { value: 'BREAK_END', label: 'Koniec prestávky' }
        ]},
        { field: 'timestamp', label: 'Dátum a čas', type: 'date' },
        { field: 'location.latitude', label: 'Zemepisná šírka', type: 'number' },
        { field: 'location.longitude', label: 'Zemepisná dĺžka', type: 'number' },
        { field: 'qrVerified', label: 'QR overené', type: 'boolean' },
      ];
    }
  }
}
