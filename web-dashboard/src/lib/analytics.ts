import api from './api';

export interface AdvancedAnalytics {
  // Performance Metrics
  productivity: {
    averageHoursPerDay: number;
    averageHoursPerWeek: number;
    productivityTrend: 'up' | 'down' | 'stable';
    productivityScore: number; // 0-100
    efficiencyRating: number; // 0-100
  };

  // Time Distribution
  timeDistribution: {
    regularHours: number;
    overtimeHours: number;
    breakTime: number;
    idleTime: number;
    productiveTime: number;
  };

  // Attendance Patterns
  attendancePatterns: {
    punctualityScore: number; // 0-100
    averageArrivalTime: string;
    averageDepartureTime: string;
    lateArrivals: number;
    earlyDepartures: number;
    perfectDays: number;
  };

  // Department Comparisons
  departmentComparison: Array<{
    departmentId: string;
    departmentName: string;
    averageHours: number;
    productivityScore: number;
    attendanceRate: number;
    overtimePercentage: number;
    employeeCount: number;
  }>;

  // Predictions & Insights
  predictions: {
    nextWeekProjection: {
      expectedHours: number;
      likelyOvertime: number;
      riskFactors: string[];
    };
    burnoutRisk: {
      level: 'low' | 'medium' | 'high';
      affectedEmployees: number;
      recommendations: string[];
    };
    costAnalysis: {
      regularCosts: number;
      overtimeCosts: number;
      totalCosts: number;
      costPerHour: number;
      projectedMonthlyCost: number;
    };
  };

  // Alerts & Anomalies
  anomalies: Array<{
    type: 'unusual_pattern' | 'performance_drop' | 'attendance_issue' | 'overtime_spike';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedEmployees: string[];
    recommendations: string[];
    detectedAt: string;
  }>;

  // Benchmarks
  benchmarks: {
    industryAverage: {
      hoursPerWeek: number;
      overtimePercentage: number;
      attendanceRate: number;
    };
    companyGoals: {
      targetHoursPerWeek: number;
      maxOvertimePercentage: number;
      minAttendanceRate: number;
    };
    performance: {
      vsIndustry: 'above' | 'below' | 'average';
      vsGoals: 'above' | 'below' | 'meeting';
      improvementAreas: string[];
    };
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface HeatmapData {
  day: string;
  hour: number;
  value: number;
  intensity: 'low' | 'medium' | 'high';
}

export class AdvancedAnalyticsService {
  /**
   * Get comprehensive analytics for the dashboard
   */
  static async getAdvancedAnalytics(): Promise<AdvancedAnalytics> {
    try {
      const response = await api.get('/advanced-analytics');
      return response.data.data;
    } catch (error) {
      console.error('Error getting advanced analytics:', error);
      return this.getFallbackAnalytics();
    }
  }

  /**
   * Get productivity trends over time
   */
  static async getProductivityTrends(
    period: 'week' | 'month' | 'quarter'
  ): Promise<TimeSeriesData[]> {
    try {
      const response = await api.get(`/advanced-analytics/productivity-trends?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting productivity trends:', error);
      return [];
    }
  }

  /**
   * Get attendance heatmap data
   */
  static async getAttendanceHeatmap(): Promise<HeatmapData[]> {
    try {
      const response = await api.get('/advanced-analytics/attendance-heatmap');
      return response.data.data;
    } catch (error) {
      console.error('Error getting attendance heatmap:', error);
      return [];
    }
  }

  /**
   * Get cost analysis data
   */
  static async getCostAnalysis(
    period: 'week' | 'month' | 'quarter'
  ): Promise<{
    totalCosts: TimeSeriesData[];
    costBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
      color: string;
    }>;
    projections: {
      nextPeriod: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      savingsOpportunities: Array<{
        area: string;
        potentialSavings: number;
        difficulty: 'easy' | 'medium' | 'hard';
      }>;
    };
  }> {
    try {
      const response = await api.get(`/advanced-analytics/cost-analysis?period=${period}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting cost analysis:', error);
      return {
        totalCosts: [],
        costBreakdown: [],
        projections: {
          nextPeriod: 0,
          trend: 'stable',
          savingsOpportunities: []
        }
      };
    }
  }

  /**
   * Generate advanced analytics from base stats
   */
  private static generateAdvancedAnalytics(
    baseStats: any
  ): AdvancedAnalytics {
    // Simulate advanced analytics based on base statistics
    const totalEmployees = baseStats?.totalEmployees || 10;
    const totalHours = baseStats?.totalHoursToday || 64;
    
    return {
      productivity: {
        averageHoursPerDay: totalHours / totalEmployees,
        averageHoursPerWeek: (totalHours / totalEmployees) * 5,
        productivityTrend: 'up',
        productivityScore: 78,
        efficiencyRating: 85
      },
      
      timeDistribution: {
        regularHours: totalHours * 0.8,
        overtimeHours: totalHours * 0.15,
        breakTime: totalHours * 0.05,
        idleTime: totalHours * 0.1,
        productiveTime: totalHours * 0.9
      },
      
      attendancePatterns: {
        punctualityScore: 92,
        averageArrivalTime: '08:15',
        averageDepartureTime: '17:30',
        lateArrivals: 2,
        earlyDepartures: 1,
        perfectDays: 18
      },
      
      departmentComparison: [
        {
          departmentId: '1',
          departmentName: 'IT',
          averageHours: 8.2,
          productivityScore: 88,
          attendanceRate: 95,
          overtimePercentage: 12,
          employeeCount: 5
        },
        {
          departmentId: '2',
          departmentName: 'HR',
          averageHours: 7.8,
          productivityScore: 82,
          attendanceRate: 98,
          overtimePercentage: 5,
          employeeCount: 3
        }
      ],
      
      predictions: {
        nextWeekProjection: {
          expectedHours: totalHours * 5,
          likelyOvertime: totalHours * 0.1,
          riskFactors: ['Vysoká záťaž v IT oddelení', 'Plánované projekty']
        },
        burnoutRisk: {
          level: 'medium',
          affectedEmployees: 2,
          recommendations: [
            'Rozložiť záťaž rovnomerne',
            'Plánovať viac prestávok',
            'Monitorovať nadčasy'
          ]
        },
        costAnalysis: {
          regularCosts: 35000,
          overtimeCosts: 8000,
          totalCosts: 43000,
          costPerHour: 25,
          projectedMonthlyCost: 52000
        }
      },
      
      anomalies: [
        {
          type: 'overtime_spike',
          severity: 'medium',
          description: 'Neočakávané zvýšenie nadčasov v IT oddelení',
          affectedEmployees: ['John Doe', 'Jane Smith'],
          recommendations: ['Prehodnotiť rozdelenie úloh', 'Zvážiť dočasné posilnenie tímu'],
          detectedAt: new Date().toISOString()
        }
      ],
      
      benchmarks: {
        industryAverage: {
          hoursPerWeek: 40,
          overtimePercentage: 8,
          attendanceRate: 94
        },
        companyGoals: {
          targetHoursPerWeek: 40,
          maxOvertimePercentage: 10,
          minAttendanceRate: 95
        },
        performance: {
          vsIndustry: 'above',
          vsGoals: 'meeting',
          improvementAreas: ['Zníženie nadčasov', 'Zlepšenie punktuálnosti']
        }
      }
    };
  }

  /**
   * Get fallback analytics when API fails
   */
  private static getFallbackAnalytics(): AdvancedAnalytics {
    return this.generateAdvancedAnalytics({});
  }
}
