import { prisma } from '../utils/database.js';
import type { AttendanceEvent, User } from '@prisma/client';
import * as ExcelJS from 'exceljs';
// import { DashboardService } from './dashboard.service.js';

interface DateRange {
  from: Date;
  to: Date;
}

interface EmployeeReportData extends User {
  attendanceEvents: AttendanceEvent[];
}

export class ReportService {
  /**
   * Generate attendance report for date range
   */
  static async generateAttendanceReport(companyId: string, dateRange: DateRange) {
    try {
      // Get employees with their attendance events
      const employees = await prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: 'EMPLOYEE'
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: dateRange.from,
                lte: dateRange.to,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const employeeReports: any[] = [];
      let totalHours = 0;
      let totalWorkingDays = 0;

      for (const employee of employees) {
        const report = await this.generateEmployeeReport(employee, dateRange);
        employeeReports.push(report);
        totalHours += report.totalHours;
        totalWorkingDays += report.workingDays;
      }

      const averageHoursPerDay = totalWorkingDays > 0 ? totalHours / totalWorkingDays : 0;

      return {
        employees: employeeReports,
        totalHours: Math.round(totalHours * 10) / 10,
        averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
        workingDays: totalWorkingDays,
        dateRange,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating attendance report:', error);
      throw new Error('Failed to generate attendance report');
    }
  }

  /**
   * Generate report for individual employee
   */
  private static async generateEmployeeReport(
    employee: EmployeeReportData, 
    _dateRange: DateRange
  ) {
    const events = employee.attendanceEvents;
    
    // Calculate total hours worked
    const totalHours = this.calculateTotalHours(events);
    
    // Calculate working days (days with at least one event)
    const workingDays = this.calculateWorkingDays(events);
    
    // Calculate average hours per day
    const averageHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;
    
    // Calculate punctuality score
    const punctualityScore = this.calculatePunctualityScore(events);

    return {
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      totalHours: Math.round(totalHours * 10) / 10,
      workingDays,
      averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
      punctualityScore: Math.round(punctualityScore * 10) / 10,
      events
    };
  }

  /**
   * Calculate total working hours from events
   */
  private static calculateTotalHours(events: AttendanceEvent[]): number {
    if (events.length === 0) return 0;

    // Group events by day
    const eventsByDay = new Map<string, AttendanceEvent[]>();
    
    events.forEach(event => {
      const day = event.timestamp.toISOString().split('T')[0] || '';
      if (!eventsByDay.has(day)) {
        eventsByDay.set(day, []);
      }
      eventsByDay.get(day)?.push(event);
    });

    let totalHours = 0;

    // Calculate hours for each day
    eventsByDay.forEach(dayEvents => {
      const sortedEvents = dayEvents.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );

      let clockInTime: Date | null = null;
      let dailyMinutes = 0;

      for (const event of sortedEvents) {
        switch (event.type) {
          case 'CLOCK_IN':
          case 'BUSINESS_TRIP_START':
            clockInTime = event.timestamp;
            break;
          
          case 'CLOCK_OUT':
          case 'BUSINESS_TRIP_END':
            if (clockInTime) {
              dailyMinutes += (event.timestamp.getTime() - clockInTime.getTime()) / (1000 * 60);
              clockInTime = null;
            }
            break;
          
          case 'BREAK_START':
          case 'PERSONAL_START':
            if (clockInTime) {
              dailyMinutes += (event.timestamp.getTime() - clockInTime.getTime()) / (1000 * 60);
              clockInTime = null;
            }
            break;
          
          case 'BREAK_END':
          case 'PERSONAL_END':
            clockInTime = event.timestamp;
            break;
        }
      }

      totalHours += dailyMinutes / 60;
    });

    return totalHours;
  }

  /**
   * Calculate number of working days
   */
  private static calculateWorkingDays(events: AttendanceEvent[]): number {
    const workingDays = new Set<string>();
    
    events.forEach(event => {
      if (['CLOCK_IN', 'BUSINESS_TRIP_START'].includes(event.type || '')) {
        const day = event.timestamp.toISOString().split('T')[0] || '';
        workingDays.add(day);
      }
    });

    return workingDays.size;
  }

  /**
   * Calculate punctuality score (percentage of on-time arrivals)
   */
  private static calculatePunctualityScore(events: AttendanceEvent[]): number {
    const clockInEvents = events.filter(event => event.type === 'CLOCK_IN');
    
    if (clockInEvents.length === 0) return 100;

    // Assume standard work start time is 8:00 AM
    const standardStartHour = 8;
    const toleranceMinutes = 15; // 15 minutes tolerance

    let onTimeCount = 0;

    clockInEvents.forEach(event => {
      const eventTime = event.timestamp;
      const eventHour = eventTime.getHours();
      const eventMinute = eventTime.getMinutes();
      
      // Calculate minutes from standard start time
      const standardStartMinutes = standardStartHour * 60;
      const eventMinutes = eventHour * 60 + eventMinute;
      
      // Check if within tolerance
      if (eventMinutes <= standardStartMinutes + toleranceMinutes) {
        onTimeCount++;
      }
    });

    return (onTimeCount / clockInEvents.length) * 100;
  }

  /**
   * Export report to CSV format
   */
  static async exportToCSV(companyId: string, dateRange: DateRange): Promise<string> {
    const report = await this.generateAttendanceReport(companyId, dateRange);
    
    const headers = [
      'Meno',
      'Email',
      'Celkové hodiny',
      'Pracovné dni',
      'Priemer hodín/deň',
      'Punktualita (%)',
      'Počet udalostí'
    ].join(',');

    const rows = report.employees.map((emp: any) => [
      emp.name,
      emp.email,
      emp.totalHours.toString(),
      emp.workingDays.toString(),
      emp.averageHoursPerDay.toString(),
      emp.punctualityScore.toString(),
      emp.events.length.toString()
    ].join(',')).join('\n');

    return `${headers}\n${rows}`;
  }

  /**
   * Export report to Excel format
   */
  static async exportToExcel(companyId: string, dateRange: DateRange): Promise<Buffer> {
    const report = await this.generateAttendanceReport(companyId, dateRange);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');
    
    // Add headers
    const headers = [
      'Meno',
      'Email',
      'Celkové hodiny',
      'Pracovné dni',
      'Priemer hodín/deň',
      'Punktualita (%)',
      'Počet udalostí'
    ];
    
    worksheet.addRow(headers);
    
    // Add data rows
    report.employees.forEach((emp: any) => {
      worksheet.addRow([
        emp.name,
        emp.email,
        emp.totalHours,
        emp.workingDays,
        emp.averageHoursPerDay,
        emp.punctualityScore,
        emp.events.length
      ]);
    });
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    // Auto-size columns
    worksheet.columns.forEach((column, index) => {
      const header = headers[index];
      if (header) {
        column.width = Math.max(header.length, 15);
      }
    });
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Get attendance summary for dashboard
   */
  static async getAttendanceSummary(companyId: string, dateRange: DateRange) {
    try {
      const report = await this.generateAttendanceReport(companyId, dateRange);
      
      return {
        totalEmployees: report.employees.length,
        activeEmployees: report.employees.filter((emp: any) => emp.totalHours > 0).length,
        totalHours: report.totalHours,
        averageHours: report.employees.length > 0 
          ? report.totalHours / report.employees.length 
          : 0,
        topPerformers: report.employees
          .sort((a: any, b: any) => b.totalHours - a.totalHours)
          .slice(0, 5),
        punctualityAverage: report.employees.length > 0
          ? report.employees.reduce((sum: any, emp: any) => sum + emp.punctualityScore, 0) / report.employees.length
          : 0
      };
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw new Error('Failed to get attendance summary');
    }
  }
}
