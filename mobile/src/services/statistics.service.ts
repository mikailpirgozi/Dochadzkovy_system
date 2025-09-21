import { apiService } from './api';

export interface EmployeeStatistic {
  id: string;
  name: string;
  email: string;
  workingHours: number;
  breakTime: number;
  workingDays: number;
  overtime: number;
  averageHoursPerDay: number;
  firstActivity: string | null;
  lastActivity: string | null;
  totalEvents: number;
  status: string;
}

export interface StatisticsResponse {
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalEmployees: number;
  statistics: EmployeeStatistic[];
}

export interface ActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  location: any;
  notes?: string;
  qrVerified: boolean;
}

export interface ActivitySummary {
  clockInTime: string | null;
  clockOutTime: string | null;
  totalWorkingTime: number; // minutes
  totalBreakTime: number; // minutes
  breaks: Array<{
    type: 'BREAK' | 'PERSONAL';
    startTime: string;
    endTime: string | null;
    duration: number; // minutes
  }>;
}

export interface UserActivity {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  events: ActivityEvent[];
  summary: ActivitySummary;
}

export interface DayActivitiesResponse {
  date: string;
  activities: UserActivity[];
}

export interface DashboardStats {
  employeesAtWork: number;
  employeesOnBreak: number;
  totalHoursToday: number;
  activeAlerts: number;
  totalEmployees: number;
  clockedInEmployees: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    clockInTime: string;
  }>;
}

export class StatisticsService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiService.getDashboardStats();
      if (!response.success) {
        throw new Error(response.error || 'Failed to get dashboard statistics');
      }
      return response.data;
    } catch (error) {
      console.error('Statistics service - dashboard stats error:', error);
      throw error instanceof Error ? error : new Error('Failed to get dashboard statistics');
    }
  }

  /**
   * Get employee statistics for a specific period
   */
  static async getEmployeeStatistics(
    period: 'day' | 'week' | 'month',
    date?: Date
  ): Promise<StatisticsResponse> {
    try {
      const dateString = date ? date.toISOString() : undefined;
      const response = await apiService.getEmployeeStatistics(period, dateString);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get employee statistics');
      }
      
      return response.data;
    } catch (error) {
      console.error('Statistics service - employee statistics error:', error);
      throw error instanceof Error ? error : new Error('Failed to get employee statistics');
    }
  }

  /**
   * Get detailed day activities
   */
  static async getDayActivities(date: Date, userId?: string): Promise<DayActivitiesResponse> {
    try {
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const response = await apiService.getDayActivities(dateString, userId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get day activities');
      }
      
      return response.data;
    } catch (error) {
      console.error('Statistics service - day activities error:', error);
      throw error instanceof Error ? error : new Error('Failed to get day activities');
    }
  }

  /**
   * Get recent activity feed
   */
  static async getRecentActivity(limit?: number): Promise<any[]> {
    try {
      const response = await apiService.getRecentActivity(limit);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get recent activity');
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Statistics service - recent activity error:', error);
      throw error instanceof Error ? error : new Error('Failed to get recent activity');
    }
  }

  /**
   * Format working time for display
   */
  static formatWorkingTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  }

  /**
   * Format time for display (HH:MM)
   */
  static formatTime(date: string | Date): string {
    return new Date(date).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format date for display
   */
  static formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Get period display name
   */
  static getPeriodDisplayName(period: 'day' | 'week' | 'month'): string {
    switch (period) {
      case 'day':
        return 'Dnes';
      case 'week':
        return 'Tento týždeň';
      case 'month':
        return 'Tento mesiac';
      default:
        return period;
    }
  }

  /**
   * Translate event type to Slovak
   */
  static translateEventType(type: string): string {
    switch (type) {
      case 'CLOCK_IN':
        return 'Príchod';
      case 'CLOCK_OUT':
        return 'Odchod';
      case 'BREAK_START':
        return 'Začiatok obeda';
      case 'BREAK_END':
        return 'Koniec obeda';
      case 'PERSONAL_START':
        return 'Začiatok súkromných vecí';
      case 'PERSONAL_END':
        return 'Koniec súkromných vecí';
      case 'BUSINESS_TRIP_START':
        return 'Začiatok služobnej cesty';
      case 'BUSINESS_TRIP_END':
        return 'Koniec služobnej cesty';
      default:
        return type;
    }
  }

  /**
   * Get status color for display
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case 'CLOCKED_IN':
        return '#10b981'; // green
      case 'ON_BREAK':
        return '#f59e0b'; // yellow
      case 'ON_PERSONAL':
        return '#8b5cf6'; // purple
      case 'ON_BUSINESS_TRIP':
        return '#3b82f6'; // blue
      case 'CLOCKED_OUT':
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Calculate total hours for multiple employees
   */
  static calculateTotalHours(statistics: EmployeeStatistic[]): number {
    return statistics.reduce((total, stat) => total + stat.workingHours, 0);
  }

  /**
   * Get top performers by working hours
   */
  static getTopPerformers(statistics: EmployeeStatistic[], limit: number = 5): EmployeeStatistic[] {
    return [...statistics]
      .sort((a, b) => b.workingHours - a.workingHours)
      .slice(0, limit);
  }

  /**
   * Calculate average working hours
   */
  static calculateAverageHours(statistics: EmployeeStatistic[]): number {
    if (statistics.length === 0) return 0;
    const total = this.calculateTotalHours(statistics);
    return Math.round((total / statistics.length) * 10) / 10;
  }
}
