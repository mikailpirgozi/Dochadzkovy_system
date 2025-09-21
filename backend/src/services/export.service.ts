import * as XLSX from 'xlsx';
import { prisma } from '../utils/database.js';
import type { 
  AttendanceEventWithUser, 
  FilterOptions,
  CorrectionStatus,
  ExportOptions,
  ExportOptionsInput
} from '../types/index.js';
import type { BusinessTripStatus, EventType } from '@prisma/client';

// Extended types for export with relations
interface BusinessTripWithUser {
  id: string;
  userId: string;
  destination: string;
  purpose: string;
  estimatedStart: Date;
  estimatedEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: BusinessTripStatus;
  approvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  approver: {
    firstName: string;
    lastName: string;
  } | null;
};

interface CorrectionWithUser {
  id: string;
  userId: string;
  originalEventId: string | null;
  requestedChange: Record<string, unknown>;
  reason: string;
  status: CorrectionStatus;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  originalEvent: {
    type: string;
    timestamp: Date;
  } | null;
  reviewedByUser: {
    firstName: string;
    lastName: string;
  } | null;
};
import { CustomError } from '../middleware/errorHandler.js';

export interface ExportData {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export class ExportService {
  /**
   * Export attendance data with advanced options
   */
  async exportAttendanceData(
    companyId: string,
    options: ExportOptionsInput
  ): Promise<ExportData> {
    // Get attendance data based on filters
    const attendanceData = await this.getAttendanceDataForExport(companyId, options);

    // Transform data based on grouping and column selection
    const transformedData = this.transformDataForExport(attendanceData, options);

    // Generate export file
    const format = options.format || 'csv';
    if (format === 'excel') {
      return this.generateExcelExport(transformedData, { ...options, format });
    } else {
      return this.generateCSVExport(transformedData, { ...options, format });
    }
  }

  /**
   * Export business trips data
   */
  async exportBusinessTripsData(
    companyId: string,
    options: Omit<ExportOptionsInput, 'includeBreaks' | 'includePersonal'>
  ): Promise<ExportData> {
    const where: {
      companyId: string;
      estimatedStart?: {
        gte?: Date;
        lte?: Date;
      };
      status?: BusinessTripStatus | { in: BusinessTripStatus[] };
      userId?: string;
    } = {
      companyId
    };

    // Apply filters
    if (options.startDate || options.endDate) {
      where.estimatedStart = {};
      if (options.startDate) {
        where.estimatedStart.gte = options.startDate;
      }
      if (options.endDate) {
        where.estimatedStart.lte = options.endDate;
      }
    }

    if (options.status) {
      where.status = options.status as BusinessTripStatus;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    const businessTrips = await prisma.businessTrip.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approver: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform business trips data
    const transformedData = (businessTrips as BusinessTripWithUser[]).map(trip => ({
      'ID': trip.id,
      'Zamestnanec': `${trip.user.firstName} ${trip.user.lastName}`,
      'Email': trip.user.email,
      'Destinácia': trip.destination,
      'Účel': trip.purpose,
      'Plánovaný začiatok': trip.estimatedStart.toLocaleString('sk-SK'),
      'Plánovaný koniec': trip.estimatedEnd.toLocaleString('sk-SK'),
      'Skutočný začiatok': trip.actualStart?.toLocaleString('sk-SK') ?? 'N/A',
      'Skutočný koniec': trip.actualEnd?.toLocaleString('sk-SK') ?? 'N/A',
      'Stav': this.translateBusinessTripStatus(trip.status),
      'Schválil': trip.approver ? `${trip.approver.firstName} ${trip.approver.lastName}` : 'N/A',
      'Dátum schválenia': trip.approvedAt?.toLocaleString('sk-SK') ?? 'N/A',
      'Poznámky': trip.notes ?? '',
      'Vytvorené': trip.createdAt.toLocaleString('sk-SK')
    }));

    // Generate export file
    const format = options.format || 'csv';
    if (format === 'excel') {
      return this.generateExcelExport(transformedData, { 
        ...options, 
        format,
        filename: 'business-trips' 
      });
    } else {
      return this.generateCSVExport(transformedData, { 
        ...options, 
        format,
        filename: 'business-trips' 
      });
    }
  }

  /**
   * Export corrections data
   */
  async exportCorrectionsData(
    companyId: string,
    options: Omit<ExportOptionsInput, 'includeBreaks' | 'includePersonal' | 'includeBusinessTrips'>
  ): Promise<ExportData> {
    const where: {
      user: {
        companyId: string;
      };
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
      status?: CorrectionStatus | { in: CorrectionStatus[] };
      userId?: string;
    } = {
      user: {
        companyId
      }
    };

    // Apply filters
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    if (options.status) {
      where.status = options.status as CorrectionStatus;
    }

    if (options.userId) {
      where.userId = options.userId;
    }

    const corrections = await prisma.correction.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        originalEvent: {
          select: {
            type: true,
            timestamp: true,
            notes: true
          }
        },
        reviewedByUser: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform corrections data
    const transformedData = (corrections as CorrectionWithUser[]).map(correction => ({
      'ID': correction.id,
      'Zamestnanec': `${correction.user.firstName} ${correction.user.lastName}`,
      'Email': correction.user.email,
      'Pôvodný typ': this.translateEventType(correction.originalEvent?.type ?? ''),
      'Pôvodný čas': correction.originalEvent?.timestamp.toLocaleString('sk-SK') ?? 'N/A',
      'Požadované zmeny': this.formatRequestedChanges(correction.requestedChange),
      'Dôvod': correction.reason,
      'Stav': this.translateCorrectionStatus(correction.status),
      'Posúdil': correction.reviewedByUser 
        ? `${correction.reviewedByUser.firstName} ${correction.reviewedByUser.lastName}` 
        : 'N/A',
      'Dátum posúdenia': correction.reviewedAt?.toLocaleString('sk-SK') ?? 'N/A',
      'Poznámky k posúdeniu': correction.reviewNotes ?? '',
      'Vytvorené': correction.createdAt.toLocaleString('sk-SK')
    }));

    // Generate export file
    const format = options.format || 'csv';
    if (format === 'excel') {
      return this.generateExcelExport(transformedData, { 
        ...options, 
        format,
        filename: 'corrections' 
      });
    } else {
      return this.generateCSVExport(transformedData, { 
        ...options, 
        format,
        filename: 'corrections' 
      });
    }
  }

  /**
   * Get attendance data for export with filters
   */
  private async getAttendanceDataForExport(
    companyId: string,
    options: ExportOptionsInput
  ): Promise<AttendanceEventWithUser[]> {
    const where: {
      companyId: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
      };
      type?: {
        in: EventType[];
      };
      userId?: {
        in: string[];
      };
    } = {
      companyId
    };

    // Apply date filters
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp.gte = options.startDate;
      }
      if (options.endDate) {
        where.timestamp.lte = options.endDate;
      }
    }

    // Apply event type filters
    const eventTypes: EventType[] = [];
    if (options.includeBreaks !== false) {
      eventTypes.push('BREAK_START', 'BREAK_END');
    }
    if (options.includePersonal !== false) {
      eventTypes.push('PERSONAL_START', 'PERSONAL_END');
    }
    if (options.includeBusinessTrips !== false) {
      eventTypes.push('BUSINESS_TRIP_START', 'BUSINESS_TRIP_END');
    }
    // Always include main events
    eventTypes.push('CLOCK_IN', 'CLOCK_OUT');

    if (eventTypes.length > 0) {
      where.type = { in: eventTypes };
    }

    if (options.userId) {
      where.userId = { in: [options.userId] };
    }

    const events = await prisma.attendanceEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { timestamp: 'asc' }
      ]
    });

    return events as AttendanceEventWithUser[];
  }

  /**
   * Transform data based on grouping and column selection
   */
  private transformDataForExport(
    data: AttendanceEventWithUser[],
    options: ExportOptionsInput
  ): Array<Record<string, string>> {
    let transformedData: Array<Record<string, string>> = data.map(event => ({
      'ID': event.id,
      'Zamestnanec': `${event.user.firstName} ${event.user.lastName}`,
      'Email': event.user.email,
      'Typ udalosti': this.translateEventType(event.type),
      'Dátum a čas': event.timestamp.toLocaleString('sk-SK'),
      'Dátum': event.timestamp.toLocaleDateString('sk-SK'),
      'Čas': event.timestamp.toLocaleTimeString('sk-SK'),
      'QR overené': event.qrVerified ? 'Áno' : 'Nie',
      'Poznámky': event.notes ?? '',
      'Korekcia aplikovaná': event.correctionApplied ? 'Áno' : 'Nie',
      'Vytvorené': event.createdAt.toLocaleString('sk-SK')
    }));

    // Apply column selection if specified
    if (options.columns && options.columns.length > 0) {
      transformedData = transformedData.map(row => {
        const filteredRow: Record<string, string> = {};
        options.columns?.forEach(column => {
          if (Object.prototype.hasOwnProperty.call(row, column)) {
            const value = row[column];
            if (typeof value === 'string') {
              filteredRow[column] = value;
            }
          }
        });
        return filteredRow;
      });
    }

    // Apply grouping if specified
    if (options.groupBy === 'user') {
      return this.groupDataByUser(transformedData);
    } else if (options.groupBy === 'date') {
      return this.groupDataByDate(transformedData);
    }

    return transformedData;
  }

  /**
   * Group data by user
   */
  private groupDataByUser(data: Array<Record<string, string>>): Array<Record<string, string>> {
    const grouped = data.reduce<Record<string, Array<Record<string, string>>>>((acc, row) => {
      const userKey = row.Zamestnanec;
      if (userKey && !acc[userKey]) {
        acc[userKey] = [];
      }
      if (userKey) {
        const userArray = acc[userKey];
        if (userArray) {
          userArray.push(row);
        }
      }
      return acc;
    }, {});

    // Flatten grouped data with user headers
    const result: Array<Record<string, string>> = [];
    Object.entries(grouped).forEach(([user, events]) => {
      result.push({
        'Zamestnanec': `=== ${user} ===`,
        'Počet udalostí': (events).length.toString(),
        'Typ udalosti': '',
        'Dátum a čas': '',
        'Poznámky': ''
      });
      result.push(...(events));
      result.push({}); // Empty row as separator
    });

    return result;
  }

  /**
   * Group data by date
   */
  private groupDataByDate(data: Array<Record<string, string>>): Array<Record<string, string>> {
    const grouped = data.reduce<Record<string, Array<Record<string, string>>>>((acc, row) => {
      const dateKey = row['Dátum'];
      if (dateKey && !acc[dateKey]) {
        acc[dateKey] = [];
      }
      if (dateKey) {
        const dateArray = acc[dateKey];
        if (dateArray) {
          dateArray.push(row);
        }
      }
      return acc;
    }, {});

    // Flatten grouped data with date headers
    const result: Array<Record<string, string>> = [];
    Object.entries(grouped).forEach(([date, events]) => {
      result.push({
        'Dátum': `=== ${date} ===`,
        'Počet udalostí': (events).length.toString(),
        'Zamestnanec': '',
        'Typ udalosti': '',
        'Čas': '',
        'Poznámky': ''
      });
      result.push(...(events));
      result.push({}); // Empty row as separator
    });

    return result;
  }

  /**
   * Generate Excel export
   */
  private generateExcelExport(
    data: Array<Record<string, string>>,
    options: Partial<ExportOptionsInput> & { filename?: string; format?: string }
  ): ExportData {
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const firstRow = data[0];
    if (firstRow) {
      const colWidths = Object.keys(firstRow).map((key: string) => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    
    const baseFilename = options.filename ?? 'attendance';
    const dateStr = new Date().toISOString().split('T')[0] ?? '';
    const filename = `${baseFilename}-${dateStr}.xlsx`;
    
    return {
      filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer
    };
  }

  /**
   * Generate CSV export
   */
  private generateCSVExport(
    data: Array<Record<string, string>>,
    options: Partial<ExportOptionsInput> & { filename?: string; format?: string }
  ): ExportData {
    if (data.length === 0) {
      throw new CustomError('No data to export', 400);
    }

    // Get headers from first row
    const headers = Object.keys(data[0] ?? {});
    
    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] ?? '';
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Add UTF-8 BOM for proper Slovak character display
    const buffer = Buffer.concat([
      Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
      Buffer.from(csvContent, 'utf8')
    ]);

    const baseFilename = options.filename ?? 'attendance';
    const dateStr = new Date().toISOString().split('T')[0] ?? '';
    const filename = `${baseFilename}-${dateStr}.csv`;

    return {
      filename,
      mimeType: 'text/csv; charset=utf-8',
      buffer
    };
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

  /**
   * Translate business trip status to Slovak
   */
  private translateBusinessTripStatus(status: string): string {
    const translations: Record<string, string> = {
      'PENDING': 'Čaká na schválenie',
      'APPROVED': 'Schválená',
      'REJECTED': 'Zamietnutá',
      'IN_PROGRESS': 'Prebieha',
      'COMPLETED': 'Dokončená',
      'CANCELLED': 'Zrušená'
    };
    return translations[status] ?? status;
  }

  /**
   * Translate correction status to Slovak
   */
  private translateCorrectionStatus(status: string): string {
    const translations: Record<string, string> = {
      'PENDING': 'Čaká na posúdenie',
      'APPROVED': 'Schválená',
      'REJECTED': 'Zamietnutá'
    };
    return translations[status] ?? status;
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

    return changes.join('; ') || 'Žiadne zmeny';
  }
}
