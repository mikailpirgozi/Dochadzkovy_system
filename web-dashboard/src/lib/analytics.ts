import { dashboardApi } from './api';

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
      // In a real implementation, this would call multiple API endpoints
      // For now, we'll simulate the data structure
      
      const response = await dashboardApi.getStats();
      const baseStats = response.data;

      // Simulate advanced analytics based on base stats
      return this.generateAdvancedAnalytics(baseStats);
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
      // Simulate productivity trend data
      const now = new Date();
      const data: TimeSeriesData[] = [];
      
      const periods = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        // Simulate productivity score with some variance
        const baseScore = 75 + Math.sin(i / 10) * 10;
        const variance = (Math.random() - 0.5) * 20;
        const score = Math.max(0, Math.min(100, baseScore + variance));
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(score),
          label: `${Math.round(score)}% produktivita`
        });
      }
      
      return data;
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
      const heatmapData: HeatmapData[] = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      // Generate heatmap data for each day and hour
      days.forEach(day => {
        for (let hour = 0; hour < 24; hour++) {
          // Simulate attendance intensity based on typical work patterns
          let intensity = 0;
          
          if (hour >= 8 && hour <= 17) {
            // Work hours - higher intensity
            intensity = 70 + Math.random() * 30;
          } else if (hour >= 6 && hour <= 8 || hour >= 17 && hour <= 19) {
            // Commute hours - medium intensity
            intensity = 20 + Math.random() * 30;
          } else {
            // Off hours - low intensity
            intensity = Math.random() * 10;
          }
          
          // Weekend adjustment
          if (day === 'Saturday' || day === 'Sunday') {
            intensity *= 0.2;
          }
          
          heatmapData.push({
            day,
            hour,
            value: Math.round(intensity),
            intensity: intensity > 60 ? 'high' : intensity > 30 ? 'medium' : 'low'
          });
        }
      });
      
      return heatmapData;
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
      // Simulate cost data
      const now = new Date();
      const periods = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      
      const totalCosts: TimeSeriesData[] = [];
      const baseCost = 50000; // Base monthly cost
      
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        const variance = (Math.random() - 0.5) * 0.2;
        const cost = baseCost * (1 + variance);
        
        totalCosts.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(cost),
          label: `€${Math.round(cost).toLocaleString()}`
        });
      }
      
      const costBreakdown = [
        { category: 'Základné mzdy', amount: 35000, percentage: 70, color: '#3b82f6' },
        { category: 'Nadčasy', amount: 8000, percentage: 16, color: '#ef4444' },
        { category: 'Benefity', amount: 5000, percentage: 10, color: '#10b981' },
        { category: 'Ostatné', amount: 2000, percentage: 4, color: '#f59e0b' },
      ];
      
      const projections = {
        nextPeriod: 52000,
        trend: 'increasing' as const,
        savingsOpportunities: [
          { area: 'Optimalizácia nadčasov', potentialSavings: 3000, difficulty: 'medium' as const },
          { area: 'Automatizácia procesov', potentialSavings: 2000, difficulty: 'hard' as const },
          { area: 'Lepšie plánovanie zmien', potentialSavings: 1500, difficulty: 'easy' as const },
        ]
      };
      
      return { totalCosts, costBreakdown, projections };
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
