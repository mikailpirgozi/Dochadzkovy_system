import { apiService } from './api';

export interface ChartDataset {
  data: number[];
  color: string;
  label: string;
}

export interface WeeklyChartData {
  labels: string[];
  datasets: ChartDataset[];
  period: 'week';
  startDate: string;
  endDate: string;
  dailyData: Array<{
    date: string;
    totalHours: number;
    averageHours: number;
    activeEmployees: number;
  }>;
}

export interface MonthlyChartData {
  labels: string[];
  datasets: ChartDataset[];
  period: 'month';
  startDate: string;
  endDate: string;
  dailyData: Array<{
    date: string;
    totalHours: number;
    averageHours: number;
    activeEmployees: number;
  }>;
}

export interface ComparisonChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    averageHoursPerDay: number;
    workingDays: number;
  }>;
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  employeeCount: number;
}

export class ChartsService {
  /**
   * Get weekly chart data
   */
  static async getWeeklyChartData(startDate?: string): Promise<WeeklyChartData> {
    try {
      const response = await apiService.getWeeklyChartData(startDate);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get weekly chart data');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting weekly chart data:', error);
      throw error;
    }
  }

  /**
   * Get monthly chart data
   */
  static async getMonthlyChartData(year?: number, month?: number): Promise<MonthlyChartData> {
    try {
      const response = await apiService.getMonthlyChartData(year, month);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get monthly chart data');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting monthly chart data:', error);
      throw error;
    }
  }

  /**
   * Get comparison chart data
   */
  static async getComparisonChartData(
    period: 'week' | 'month',
    userIds?: string[],
    startDate?: string
  ): Promise<ComparisonChartData> {
    try {
      const response = await apiService.getComparisonChartData(period, userIds, startDate);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get comparison chart data');
      }

      return response.data;
    } catch (error) {
      console.error('Error getting comparison chart data:', error);
      throw error;
    }
  }

  /**
   * Get current week start date (Monday)
   */
  static getCurrentWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday as start
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Get previous week start date
   */
  static getPreviousWeekStart(): Date {
    const currentWeekStart = this.getCurrentWeekStart();
    const previousWeek = new Date(currentWeekStart);
    previousWeek.setDate(currentWeekStart.getDate() - 7);
    return previousWeek;
  }

  /**
   * Get current month start date
   */
  static getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Get previous month start date
   */
  static getPreviousMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  /**
   * Format date for API
   */
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
