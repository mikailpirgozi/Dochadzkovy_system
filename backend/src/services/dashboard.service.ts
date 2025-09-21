import { prisma } from '../utils/database.js';
import type { UserRole } from '@prisma/client';

export class DashboardService {
  private constructor() {
    // Static class
  }
  /**
   * Get dashboard statistics for a company
   */
  static async getDashboardStats(companyId: string) {
    try {
      // Get all employees for the company
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
                gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
              }
            },
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      // Calculate current status for each employee
      let employeesAtWork = 0;
      let employeesOnBreak = 0;
      let totalHoursToday = 0;
      const clockedInEmployees: any[] = [];

      for (const employee of employees) {
        const lastEvent = employee.attendanceEvents[0];
        
        if (lastEvent) {
          const status = this.getCurrentStatus(lastEvent);
          
          switch (status) {
            case 'CLOCKED_IN':
            case 'BUSINESS_TRIP':
              employeesAtWork++;
              clockedInEmployees.push({
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                email: employee.email,
                status,
                clockInTime: lastEvent.timestamp,
                user: employee
              });
              break;
            case 'ON_BREAK':
            case 'ON_PERSONAL':
              employeesOnBreak++;
              break;
          }

          // Calculate hours worked today
          const todayEvents = employee.attendanceEvents;
          const hoursWorked = this.calculateDailyHours(todayEvents);
          totalHoursToday += hoursWorked;
        }
      }

      // Get active alerts count
      const activeAlertsCount = await prisma.alert.count({
        where: {
          resolved: false,
          user: {
            companyId
          }
        }
      });

      return {
        employeesAtWork,
        employeesOnBreak,
        totalHoursToday: Math.round(totalHoursToday * 10) / 10, // Round to 1 decimal
        activeAlerts: activeAlertsCount,
        totalEmployees: employees.length,
        clockedInEmployees
      };
    } catch (_error) {
      // console.error('Error getting dashboard stats:', _error);
      throw new Error('Failed to get dashboard statistics');
    }
  }

  /**
   * Get live employee locations for a company
   */
  static async getLiveEmployeeLocations(companyId: string) {
    try {
      // Get employees who are currently clocked in
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
                gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          locationLogs: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      const liveEmployees: any[] = [];

      for (const employee of employees) {
        const lastEvent = employee.attendanceEvents[0];
        const lastLocation = employee.locationLogs[0];
        
        if (lastEvent && lastLocation) {
          const status = this.getCurrentStatus(lastEvent);
          
          // Only include employees who are currently active
          if (['CLOCKED_IN', 'ON_BREAK', 'ON_PERSONAL', 'BUSINESS_TRIP'].includes(status)) {
            // Calculate hours worked today
            const todayEvents = employee.attendanceEvents;
            const hoursWorked = this.calculateDailyHours(todayEvents);

            liveEmployees.push({
              id: employee.id,
              name: `${employee.firstName} ${employee.lastName}`,
              email: employee.email,
              status,
              lastLocation: {
                latitude: lastLocation.latitude,
                longitude: lastLocation.longitude,
                timestamp: lastLocation.timestamp,
                accuracy: lastLocation.accuracy
              },
              clockInTime: status === 'CLOCKED_IN' ? lastEvent.timestamp : null,
              totalHoursToday: Math.round(hoursWorked * 10) / 10,
              user: employee
            });
          }
        }
      }

      return liveEmployees;
    } catch (_error) {
      // console.error('Error getting live employee locations:', _error);
      throw new Error('Failed to get live employee locations');
    }
  }

  /**
   * Get current status from last attendance event
   */
  private static getCurrentStatus(lastEvent: { type: string }): string {
    switch (lastEvent.type) {
      case 'CLOCK_IN':
      case 'BREAK_END':
      case 'PERSONAL_END':
        return 'CLOCKED_IN';
      case 'BREAK_START':
        return 'ON_BREAK';
      case 'PERSONAL_START':
        return 'ON_PERSONAL';
      case 'BUSINESS_TRIP_START':
        return 'BUSINESS_TRIP';
      default:
        return 'CLOCKED_OUT';
    }
  }

  /**
   * Calculate daily working hours from attendance events
   */
  private static calculateDailyHours(events: Array<{ type: string; timestamp: Date }>): number {
    if (events.length === 0) return 0;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let totalWorkingMinutes = 0;
    let workStartTime: Date | null = null;
    let isWorking = false;

    for (const event of sortedEvents) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
        case 'BUSINESS_TRIP_START':
          workStartTime = eventTime;
          isWorking = true;
          break;
        
        case 'CLOCK_OUT':
        case 'BUSINESS_TRIP_END':
          if (workStartTime && isWorking) {
            totalWorkingMinutes += (eventTime.getTime() - workStartTime.getTime()) / (1000 * 60);
          }
          workStartTime = null;
          isWorking = false;
          break;
        
        case 'BREAK_START':
        case 'PERSONAL_START':
          // Pause working time - add time worked until now
          if (workStartTime && isWorking) {
            totalWorkingMinutes += (eventTime.getTime() - workStartTime.getTime()) / (1000 * 60);
          }
          isWorking = false;
          break;
        
        case 'BREAK_END':
        case 'PERSONAL_END':
          // Resume working time
          workStartTime = eventTime;
          isWorking = true;
          break;
      }
    }

    // If still working, add time until now
    if (workStartTime && isWorking) {
      const now = new Date();
      totalWorkingMinutes += (now.getTime() - workStartTime.getTime()) / (1000 * 60);
    }

    return totalWorkingMinutes / 60; // Convert to hours
  }

  /**
   * Get weekly chart data for dashboard
   */
  static async getWeeklyChartData(companyId: string, startDate?: Date) {
    try {
      const weekStart = startDate ?? new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);

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
                gte: weekStart,
                lte: weekEnd,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const weeklyData = {
        labels: ['Pon', 'Uto', 'Str', 'Štv', 'Pia', 'Sob', 'Ned'],
        datasets: [{
          data: [] as number[],
          color: '#3b82f6',
          label: 'Pracovné hodiny'
        }],
        period: 'week' as const,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString()
      };

      // Calculate daily hours for each day of the week
      for (let day = 0; day < 7; day++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(dayStart.getDate() + day);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        let totalDayHours = 0;

        for (const employee of employees) {
          const dayEvents = employee.attendanceEvents.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= dayStart && eventDate <= dayEnd;
          });

          const dailyHours = this.calculateDailyHours(dayEvents);
          totalDayHours += dailyHours;
        }

        weeklyData.datasets[0]?.data.push(Math.round(totalDayHours * 10) / 10);
      }

      return weeklyData;
    } catch (_error) {
      // console.error('Error getting weekly chart data:', _error);
      throw new Error('Failed to get weekly chart data');
    }
  }

  /**
   * Get monthly chart data for dashboard
   */
  static async getMonthlyChartData(companyId: string, year?: number, month?: number) {
    try {
      const targetDate = new Date();
      if (year) targetDate.setFullYear(year);
      if (month !== undefined) targetDate.setMonth(month - 1);
      
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

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
                gte: monthStart,
                lte: monthEnd,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const daysInMonth = monthEnd.getDate();
      const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      
      const monthlyData = {
        labels,
        datasets: [{
          data: [] as number[],
          color: '#10b981',
          label: 'Pracovné hodiny'
        }],
        period: 'month' as const,
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      };

      // Calculate daily hours for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        let totalDayHours = 0;

        for (const employee of employees) {
          const dayEvents = employee.attendanceEvents.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= dayStart && eventDate <= dayEnd;
          });

          const dailyHours = this.calculateDailyHours(dayEvents);
          totalDayHours += dailyHours;
        }

        monthlyData.datasets[0]?.data.push(Math.round(totalDayHours * 10) / 10);
      }

      return monthlyData;
    } catch (_error) {
      // console.error('Error getting monthly chart data:', _error);
      throw new Error('Failed to get monthly chart data');
    }
  }

  /**
   * Get comparison chart data between employees or periods
   */
  static async getComparisonChartData(
    companyId: string, 
    period: 'week' | 'month', 
    userIds?: string[],
    startDate?: Date
  ) {
    try {
      const now = startDate ?? new Date();
      let periodStart: Date, periodEnd: Date;

      if (period === 'week') {
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - periodStart.getDay() + 1); // Monday
        periodStart.setHours(0, 0, 0, 0);
        
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 6); // Sunday
        periodEnd.setHours(23, 59, 59, 999);
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        periodEnd.setHours(23, 59, 59, 999);
      }

      const baseWhereClause = {
        companyId,
        isActive: true,
        role: 'EMPLOYEE' as const
      };

      const finalWhereClause = userIds && userIds.length > 0 
        ? { ...baseWhereClause, id: { in: userIds } }
        : baseWhereClause;

      const employees = await prisma.user.findMany({
        where: finalWhereClause,
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: periodStart,
                lte: periodEnd,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        },
        take: 10 // Limit to top 10 employees for readability
      });

      const comparisonData = {
        labels: employees.map(emp => `${emp.firstName} ${emp.lastName}`),
        datasets: [{
          data: [] as number[],
          color: '#f59e0b',
          label: 'Pracovné hodiny'
        }],
        period,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      };

      // Calculate total hours for each employee in the period
      for (const employee of employees) {
        const totalHours = this.calculateDailyHours(employee.attendanceEvents);
        comparisonData.datasets[0]?.data.push(Math.round(totalHours * 10) / 10);
      }

      return comparisonData;
    } catch (_error) {
      // console.error('Error getting comparison chart data:', _error);
      throw new Error('Failed to get comparison chart data');
    }
  }

  /**
   * Get company analytics
   */
  static async getCompanyAnalytics(companyId: string, dateRange: { from: Date; to: Date }) {
    try {
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

      let totalWorkingHours = 0;
      const employeeStats: any[] = [];

      for (const employee of employees) {
        const events = employee.attendanceEvents;
        const dailyHours = this.calculateDailyHours(events);
        
        if (dailyHours > 0) {
          totalWorkingHours += dailyHours;
        }

        employeeStats.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          totalHours: Math.round(dailyHours * 10) / 10,
          events: events.length
        });
      }

      return {
        totalEmployees: employees.length,
        activeEmployees: employeeStats.filter((emp: any) => emp.totalHours > 0).length,
        totalWorkingHours: Math.round(totalWorkingHours * 10) / 10,
        averageHoursPerEmployee: employees.length > 0 
          ? Math.round((totalWorkingHours / employees.length) * 10) / 10 
          : 0,
        employeeStats
      };
    } catch (_error) {
      // console.error('Error getting company analytics:', _error);
      throw new Error('Failed to get company analytics');
    }
  }

  /**
   * Get detailed employee statistics for a specific time period
   */
  static async getEmployeeStatistics(
    companyId: string, 
    period: 'day' | 'week' | 'month',
    date?: Date,
    userId?: string
  ) {
    try {
      const targetDate = date ?? new Date();
      let startDate: Date, endDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(targetDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(targetDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week': {
          const dayOfWeek = targetDate.getDay();
          const diff = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
          startDate = new Date(targetDate.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        }
        case 'month':
          startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
          endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        default:
          throw new Error('Invalid period');
      }

      const whereClause: {
        companyId: string;
        isActive: boolean;
        role: UserRole;
        id?: string;
      } = { 
        companyId,
        isActive: true,
        role: 'EMPLOYEE'
      };

      // If userId is provided, filter for specific user
      if (userId) {
        whereClause.id = userId;
      }

      const employees = await prisma.user.findMany({
        where: whereClause,
        include: {
          attendanceEvents: {
            where: {
              timestamp: {
                gte: startDate,
                lte: endDate,
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const statistics: any[] = [];

      for (const employee of employees) {
        const events = employee.attendanceEvents;
        const workingHours = this.calculateDailyHours(events);
        const breakTime = this.calculateBreakTime(events);
        const workingDays = this.getWorkingDaysCount(events, period);
        
        // Calculate overtime (assuming 8 hours per day is standard)
        const standardHours = workingDays * 8;
        const overtime = Math.max(0, workingHours - standardHours);

        // Get first and last activity times
        const firstEvent = events.find((e: { type: string }) => e.type === 'CLOCK_IN');
        const lastEvent = events.length > 0 ? events[events.length - 1] : null;

        statistics.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          workingHours: Math.round(workingHours * 10) / 10,
          breakTime: Math.round(breakTime * 10) / 10,
          workingDays,
          overtime: Math.round(overtime * 10) / 10,
          averageHoursPerDay: workingDays > 0 ? Math.round((workingHours / workingDays) * 10) / 10 : 0,
          firstActivity: firstEvent?.timestamp ?? null,
          lastActivity: lastEvent?.timestamp ?? null,
          totalEvents: events.length,
          status: this.getCurrentStatus(events[events.length - 1] ?? { type: 'CLOCK_OUT' })
        });
      }

      return {
        period,
        startDate,
        endDate,
        totalEmployees: employees.length,
        statistics
      };
    } catch (_error) {
      // console.error('Error getting employee statistics:', _error);
      throw new Error('Failed to get employee statistics');
    }
  }

  /**
   * Get detailed day activities for a specific employee or all employees
   */
  static async getDayActivities(
    companyId: string, 
    date: Date,
    userId?: string
  ) {
    try {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const whereClause: {
        companyId: string;
        timestamp: { gte: Date; lte: Date };
        userId?: string;
      } = {
        companyId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        }
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const events = await prisma.attendanceEvent.findMany({
        where: whereClause,
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
        orderBy: { timestamp: 'asc' }
      });

      // Group events by user
      const userActivities: Record<string, {
        user: { id: string; firstName: string; lastName: string; email: string };
        events: Array<{
          id: string;
          type: string;
          timestamp: Date;
          location: unknown;
          notes: string | null;
          qrVerified: boolean;
        }>;
        summary: {
          clockInTime: Date | null;
          clockOutTime: Date | null;
          totalWorkingTime: number;
          totalBreakTime: number;
          breaks: unknown[];
        };
      }> = {};

      for (const event of events) {
        const userId = event.user.id;
        
        userActivities[userId] ??= {
            user: event.user,
            events: [],
            summary: {
              clockInTime: null,
              clockOutTime: null,
              totalWorkingTime: 0,
              totalBreakTime: 0,
              breaks: []
            }
          };

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const activity = userActivities[userId] as NonNullable<(typeof userActivities)[string]>;
        activity.events.push({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp,
          location: event.location,
          notes: event.notes,
          qrVerified: event.qrVerified
        });
      }

      // Calculate summaries for each user
      for (const userId in userActivities) {
        const activity = userActivities[userId];
        if (activity) {
          const summary = this.calculateDetailedSummary(activity.events);
          activity.summary = summary;
        }
      }

      return {
        date,
        activities: Object.values(userActivities)
      };
    } catch (_error) {
      // console.error('Error getting day activities:', _error);
      throw new Error('Failed to get day activities');
    }
  }

  /**
   * Calculate detailed summary from events
   */
  private static calculateDetailedSummary(events: Array<{
    id: string;
    type: string;
    timestamp: Date;
    location: unknown;
    notes: string | null;
    qrVerified: boolean;
  }>) {
    if (events.length === 0) {
      return {
        clockInTime: null,
        clockOutTime: null,
        totalWorkingTime: 0,
        totalBreakTime: 0,
        breaks: []
      };
    }

    let clockInTime: Date | null = null;
    let clockOutTime: Date | null = null;
    let totalWorkingTime = 0;
    let totalBreakTime = 0;
    const breaks: Array<{
      type: string;
      startTime: Date;
      endTime: Date | null;
      duration: number;
    }> = [];
    let currentBreakStart: Date | null = null;
    let currentBreakType: string | null = null;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let isWorking = false;

    for (const event of sortedEvents) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
          clockInTime = eventTime;
          isWorking = true;
          break;
        
        case 'CLOCK_OUT':
          clockOutTime = eventTime;
          if (clockInTime && isWorking) {
            totalWorkingTime += (eventTime.getTime() - clockInTime.getTime()) / (1000 * 60);
          }
          isWorking = false;
          break;
        
        case 'BREAK_START':
        case 'PERSONAL_START':
          // Pause working time - add time worked until now
          if (clockInTime && isWorking) {
            totalWorkingTime += (eventTime.getTime() - clockInTime.getTime()) / (1000 * 60);
          }
          currentBreakStart = eventTime;
          currentBreakType = event.type === 'BREAK_START' ? 'BREAK' : 'PERSONAL';
          isWorking = false;
          break;
        
        case 'BREAK_END':
        case 'PERSONAL_END':
          if (currentBreakStart && currentBreakType) {
            const breakDuration = (eventTime.getTime() - currentBreakStart.getTime()) / (1000 * 60);
            totalBreakTime += breakDuration;
            breaks.push({
              type: currentBreakType,
              startTime: currentBreakStart,
              endTime: eventTime,
              duration: Math.round(breakDuration)
            });
            currentBreakStart = null;
            currentBreakType = null;
          }
          // Resume working time
          clockInTime = eventTime;
          isWorking = true;
          break;
      }
    }

    // Handle ongoing break
    if (currentBreakStart && currentBreakType) {
      const now = new Date();
      const breakDuration = (now.getTime() - currentBreakStart.getTime()) / (1000 * 60);
      totalBreakTime += breakDuration;
      breaks.push({
        type: currentBreakType,
        startTime: currentBreakStart,
        endTime: null, // ongoing
        duration: Math.round(breakDuration)
      });
    }

    // Handle ongoing work (if clocked in but not clocked out)
    if (clockInTime && isWorking) {
      const now = new Date();
      totalWorkingTime += (now.getTime() - clockInTime.getTime()) / (1000 * 60);
    }

    return {
      clockInTime,
      clockOutTime,
      totalWorkingTime: Math.round(totalWorkingTime),
      totalBreakTime: Math.round(totalBreakTime),
      breaks
    };
  }

  /**
   * Calculate break time from events
   */
  private static calculateBreakTime(events: Array<{ type: string; timestamp: Date }>): number {
    let totalBreakTime = 0;
    let breakStart: Date | null = null;

    for (const event of events) {
      if (event.type === 'BREAK_START' || event.type === 'PERSONAL_START') {
        breakStart = new Date(event.timestamp);
      } else if ((event.type === 'BREAK_END' || event.type === 'PERSONAL_END') && breakStart) {
        totalBreakTime += (new Date(event.timestamp).getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        breakStart = null;
      }
    }

    return totalBreakTime;
  }

  /**
   * Get working days count based on events and period
   */
  private static getWorkingDaysCount(events: Array<{ type: string; timestamp: Date }>, _period: string): number {
    if (events.length === 0) return 0;

    const workingDays = new Set<string>();
    
    for (const event of events) {
      if (event.type === 'CLOCK_IN') {
        const dateStr = event.timestamp.toISOString().split('T')[0];
        if (dateStr) {
          workingDays.add(dateStr);
        }
      }
    }

    return workingDays.size;
  }

  /**
   * Get employee statuses for dashboard
   */
  static async getEmployeeStatuses(companyId: string) {
    try {
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
                gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
              }
            },
            orderBy: { timestamp: 'desc' }
          }
        }
      });

      const locationLogs = await prisma.locationLog.findMany({
        where: {
          userId: { in: employees.map(emp => emp.id) },
          timestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      return employees.map(employee => {
        const lastEvent = employee.attendanceEvents[0];
        const lastLocation = locationLogs.find(log => log.userId === employee.id);
        
        let status = 'CLOCKED_OUT';
        let hoursToday = 0;
        
        if (lastEvent) {
          status = this.getCurrentStatus(lastEvent);
          hoursToday = this.calculateDailyHours(employee.attendanceEvents);
        }

        return {
          userId: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          status,
          lastEvent: lastEvent || null,
          lastLocation: lastLocation || null,
          hoursToday
        };
      });
    } catch (error) {
      console.error('Error getting employee statuses:', error);
      throw error;
    }
  }
}
