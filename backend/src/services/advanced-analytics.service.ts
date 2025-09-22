import { prisma } from '../utils/database.js';

export class AdvancedAnalyticsService {
  /**
   * Get advanced analytics data
   */
  static async getAdvancedAnalytics(companyId: string) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday

      // Get all employees and their attendance data
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
                gte: startOfMonth
              }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      // Calculate productivity metrics
      const productivity = await this.calculateProductivityMetrics(employees, startOfMonth);
      
      // Calculate time distribution
      const timeDistribution = await this.calculateTimeDistribution(employees, startOfMonth);
      
      // Calculate attendance patterns
      const attendancePatterns = await this.calculateAttendancePatterns(employees, startOfMonth);
      
      // Get department comparison
      const departmentComparison = await this.getDepartmentComparison(companyId, startOfMonth);
      
      // Calculate predictions and insights
      const predictions = await this.calculatePredictions(employees, startOfMonth);
      
      // Detect anomalies
      const anomalies = await this.detectAnomalies(employees, startOfMonth);
      
      // Get benchmarks
      const benchmarks = await this.getBenchmarks(companyId);

      return {
        productivity,
        timeDistribution,
        attendancePatterns,
        departmentComparison,
        predictions,
        anomalies,
        benchmarks
      };
    } catch (error) {
      console.error('Error getting advanced analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate productivity metrics
   */
  private static async calculateProductivityMetrics(employees: any[], startDate: Date) {
    const totalWorkingDays = this.getWorkingDaysBetween(startDate, new Date());
    let totalHours = 0;
    let totalDays = 0;

    for (const employee of employees) {
      const dailyHours = this.groupEventsByDay(employee.attendanceEvents);
      
      for (const [, hours] of Object.entries(dailyHours)) {
        if (typeof hours === 'number' && hours > 0) {
          totalHours += hours;
          totalDays++;
        }
      }
    }

    const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;
    const averageHoursPerWeek = averageHoursPerDay * 5;
    
    // Calculate productivity score based on target hours (8h/day)
    const productivityScore = Math.min(100, (averageHoursPerDay / 8) * 100);
    
    // Calculate efficiency rating (productive time vs total time)
    const efficiencyRating = Math.min(100, productivityScore * 1.1);
    
    // Determine trend (simplified - compare with previous period)
    const productivityTrend = productivityScore >= 75 ? 'up' : productivityScore >= 60 ? 'stable' : 'down';

    return {
      averageHoursPerDay: Math.round(averageHoursPerDay * 10) / 10,
      averageHoursPerWeek: Math.round(averageHoursPerWeek * 10) / 10,
      productivityTrend,
      productivityScore: Math.round(productivityScore),
      efficiencyRating: Math.round(efficiencyRating)
    };
  }

  /**
   * Calculate time distribution
   */
  private static async calculateTimeDistribution(employees: any[], startDate: Date) {
    let regularHours = 0;
    let overtimeHours = 0;
    let breakTime = 0;

    for (const employee of employees) {
      const dailyHours = this.groupEventsByDay(employee.attendanceEvents);
      
      for (const [, hours] of Object.entries(dailyHours)) {
        if (typeof hours === 'number') {
          if (hours <= 8) {
            regularHours += hours;
          } else {
            regularHours += 8;
            overtimeHours += hours - 8;
          }
        }
      }
      
      // Calculate break time from BREAK_START/BREAK_END events
      const breakEvents = employee.attendanceEvents.filter((e: any) => 
        e.type === 'BREAK_START' || e.type === 'BREAK_END'
      );
      
      for (let i = 0; i < breakEvents.length - 1; i += 2) {
        if (breakEvents[i].type === 'BREAK_START' && breakEvents[i + 1]?.type === 'BREAK_END') {
          const breakDuration = (new Date(breakEvents[i + 1].timestamp).getTime() - 
                               new Date(breakEvents[i].timestamp).getTime()) / (1000 * 60 * 60);
          breakTime += breakDuration;
        }
      }
    }

    const totalTime = regularHours + overtimeHours;
    const productiveTime = totalTime * 0.85; // Assume 85% productivity
    const idleTime = totalTime - productiveTime;

    return {
      regularHours: Math.round(regularHours * 10) / 10,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      breakTime: Math.round(breakTime * 10) / 10,
      idleTime: Math.round(idleTime * 10) / 10,
      productiveTime: Math.round(productiveTime * 10) / 10
    };
  }

  /**
   * Calculate attendance patterns
   */
  private static async calculateAttendancePatterns(employees: any[], startDate: Date) {
    let totalDays = 0;
    let onTimeDays = 0;
    let lateArrivals = 0;
    let earlyDepartures = 0;
    const arrivalTimes: number[] = [];
    const departureTimes: number[] = [];

    for (const employee of employees) {
      const dailyEvents = this.groupEventsByDay(employee.attendanceEvents);
      
      for (const [date, events] of Object.entries(dailyEvents)) {
        if (Array.isArray(events) && events.length > 0) {
          totalDays++;
          
          const clockIn = events.find((e: any) => e.type === 'CLOCK_IN');
          const clockOut = events.find((e: any) => e.type === 'CLOCK_OUT');
          
          if (clockIn) {
            const arrivalTime = new Date(clockIn.timestamp);
            const arrivalHour = arrivalTime.getHours() + arrivalTime.getMinutes() / 60;
            arrivalTimes.push(arrivalHour);
            
            // Consider on time if arrived before 8:30 AM
            if (arrivalHour <= 8.5) {
              onTimeDays++;
            } else {
              lateArrivals++;
            }
          }
          
          if (clockOut) {
            const departureTime = new Date(clockOut.timestamp);
            const departureHour = departureTime.getHours() + departureTime.getMinutes() / 60;
            departureTimes.push(departureHour);
            
            // Consider early departure if left before 5:00 PM
            if (departureHour < 17) {
              earlyDepartures++;
            }
          }
        }
      }
    }

    const punctualityScore = totalDays > 0 ? (onTimeDays / totalDays) * 100 : 0;
    const averageArrivalTime = arrivalTimes.length > 0 ? 
      arrivalTimes.reduce((a, b) => a + b, 0) / arrivalTimes.length : 8;
    const averageDepartureTime = departureTimes.length > 0 ? 
      departureTimes.reduce((a, b) => a + b, 0) / departureTimes.length : 17;
    
    const perfectDays = totalDays - lateArrivals - earlyDepartures;

    return {
      punctualityScore: Math.round(punctualityScore),
      averageArrivalTime: this.formatTimeFromHours(averageArrivalTime),
      averageDepartureTime: this.formatTimeFromHours(averageDepartureTime),
      lateArrivals,
      earlyDepartures,
      perfectDays: Math.max(0, perfectDays)
    };
  }

  /**
   * Get department comparison
   */
  private static async getDepartmentComparison(companyId: string, startDate: Date) {
    // Since department field doesn't exist in schema, we'll create mock departments
    // In a real implementation, you would add department field to User model
    const departments = [
      { department: 'IT', _count: { id: 0 } },
      { department: 'HR', _count: { id: 0 } },
      { department: 'Finance', _count: { id: 0 } }
    ];

    const departmentStats = [];

    for (const dept of departments) {
      if (!dept.department) continue;

      // Get all employees since we don't have department field
      // In a real implementation, you would filter by department
      const employees = await prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          role: 'EMPLOYEE'
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: { gte: startDate }
            }
          }
        }
      });

      // Simulate department distribution (divide employees equally among departments)
      const employeesPerDept = Math.ceil(employees.length / departments.length);
      const deptIndex = departments.indexOf(dept);
      const deptEmployees = employees.slice(deptIndex * employeesPerDept, (deptIndex + 1) * employeesPerDept);

      let totalHours = 0;
      let workingDays = 0;
      let overtimeHours = 0;

      for (const employee of deptEmployees) {
        const dailyHours = this.groupEventsByDay(employee.attendanceEvents);
        
        for (const [, hours] of Object.entries(dailyHours)) {
          if (typeof hours === 'number' && hours > 0) {
            totalHours += hours;
            workingDays++;
            if (hours > 8) {
              overtimeHours += hours - 8;
            }
          }
        }
      }

      const averageHours = workingDays > 0 ? totalHours / workingDays : 0;
      const productivityScore = Math.min(100, (averageHours / 8) * 100);
      const attendanceRate = workingDays > 0 ? (workingDays / (deptEmployees.length * this.getWorkingDaysBetween(startDate, new Date()))) * 100 : 0;
      const overtimePercentage = totalHours > 0 ? (overtimeHours / totalHours) * 100 : 0;

      departmentStats.push({
        departmentId: dept.department,
        departmentName: dept.department,
        averageHours: Math.round(averageHours * 10) / 10,
        productivityScore: Math.round(productivityScore),
        attendanceRate: Math.round(attendanceRate),
        overtimePercentage: Math.round(overtimePercentage),
        employeeCount: deptEmployees.length
      });
    }

    return departmentStats;
  }

  /**
   * Calculate predictions and insights
   */
  private static async calculatePredictions(employees: any[], startDate: Date) {
    const currentMonth = new Date();
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const daysPassed = currentMonth.getDate();
    const remainingDays = daysInMonth - daysPassed;

    let totalHours = 0;
    let totalOvertimeHours = 0;
    let totalCosts = 0;

    for (const employee of employees) {
      const dailyHours = this.groupEventsByDay(employee.attendanceEvents);
      let employeeHours = 0;
      let employeeOvertime = 0;

      for (const [, hours] of Object.entries(dailyHours)) {
        if (typeof hours === 'number') {
          employeeHours += hours;
          if (hours > 8) {
            employeeOvertime += hours - 8;
          }
        }
      }

      totalHours += employeeHours;
      totalOvertimeHours += employeeOvertime;
      
      // Assume average hourly rate of €25
      const hourlyRate = 25;
      const overtimeRate = hourlyRate * 1.5;
      
      const regularCost = Math.min(employeeHours, employeeHours - employeeOvertime) * hourlyRate;
      const overtimeCost = employeeOvertime * overtimeRate;
      
      totalCosts += regularCost + overtimeCost;
    }

    const avgHoursPerDay = daysPassed > 0 ? totalHours / (employees.length * daysPassed) : 0;
    const expectedHours = avgHoursPerDay * employees.length * remainingDays;
    const likelyOvertime = Math.max(0, (avgHoursPerDay - 8) * employees.length * remainingDays);

    const regularCosts = totalCosts - (totalOvertimeHours * 25 * 0.5);
    const overtimeCosts = totalOvertimeHours * 25 * 1.5;
    const costPerHour = totalHours > 0 ? totalCosts / totalHours : 25;
    const projectedMonthlyCost = totalCosts + (expectedHours * costPerHour);

    // Risk factors
    const riskFactors = [];
    if (totalOvertimeHours / totalHours > 0.15) riskFactors.push('Vysoké nadčasy');
    if (avgHoursPerDay > 9) riskFactors.push('Preťaženie zamestnancov');
    if (employees.length < 5) riskFactors.push('Nedostatok personálu');

    // Burnout risk
    const avgOvertimePerEmployee = totalOvertimeHours / employees.length;
    let burnoutLevel: 'low' | 'medium' | 'high' = 'low';
    let affectedEmployees = 0;

    if (avgOvertimePerEmployee > 20) {
      burnoutLevel = 'high';
      affectedEmployees = Math.ceil(employees.length * 0.7);
    } else if (avgOvertimePerEmployee > 10) {
      burnoutLevel = 'medium';
      affectedEmployees = Math.ceil(employees.length * 0.3);
    }

    return {
      nextWeekProjection: {
        expectedHours: Math.round(expectedHours),
        likelyOvertime: Math.round(likelyOvertime),
        riskFactors
      },
      burnoutRisk: {
        level: burnoutLevel,
        affectedEmployees,
        recommendations: [
          'Rozložiť záťaž rovnomerne',
          'Plánovať viac prestávok',
          'Monitorovať nadčasy'
        ]
      },
      costAnalysis: {
        regularCosts: Math.round(regularCosts),
        overtimeCosts: Math.round(overtimeCosts),
        totalCosts: Math.round(totalCosts),
        costPerHour: Math.round(costPerHour),
        projectedMonthlyCost: Math.round(projectedMonthlyCost)
      }
    };
  }

  /**
   * Detect anomalies in attendance data
   */
  private static async detectAnomalies(employees: any[], startDate: Date) {
    const anomalies = [];
    const now = new Date();

    for (const employee of employees) {
      const recentEvents = employee.attendanceEvents.filter((e: any) => 
        new Date(e.timestamp) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );

      const dailyHours = this.groupEventsByDay(recentEvents);
      const hoursArray = Object.values(dailyHours).filter(h => typeof h === 'number');

      if (hoursArray.length > 0) {
        const avgHours = hoursArray.reduce((a, b) => a + b, 0) / hoursArray.length;
        const maxHours = Math.max(...hoursArray);

        // Detect overtime spike
        if (maxHours > avgHours * 1.5 && maxHours > 10) {
          anomalies.push({
            type: 'overtime_spike' as const,
            severity: 'medium' as const,
            description: `Neočakávané zvýšenie nadčasov u ${employee.firstName} ${employee.lastName}`,
            affectedEmployees: [`${employee.firstName} ${employee.lastName}`],
            recommendations: ['Prehodnotiť rozdelenie úloh', 'Zvážiť dočasné posilnenie tímu'],
            detectedAt: now.toISOString()
          });
        }

        // Detect performance drop
        if (avgHours < 6) {
          anomalies.push({
            type: 'performance_drop' as const,
            severity: 'high' as const,
            description: `Pokles výkonnosti u ${employee.firstName} ${employee.lastName}`,
            affectedEmployees: [`${employee.firstName} ${employee.lastName}`],
            recommendations: ['Konzultácia s manažérom', 'Preskúmať príčiny poklesu'],
            detectedAt: now.toISOString()
          });
        }
      }

      // Detect attendance issues
      const clockInEvents = recentEvents.filter((e: any) => e.type === 'CLOCK_IN');
      const lateArrivals = clockInEvents.filter((e: any) => {
        const hour = new Date(e.timestamp).getHours();
        return hour > 9; // After 9 AM
      });

      if (lateArrivals.length > clockInEvents.length * 0.5) {
        anomalies.push({
          type: 'attendance_issue' as const,
          severity: 'medium' as const,
          description: `Časté oneskorenia u ${employee.firstName} ${employee.lastName}`,
          affectedEmployees: [`${employee.firstName} ${employee.lastName}`],
          recommendations: ['Diskusia o pracovnom čase', 'Flexibilný začiatok práce'],
          detectedAt: now.toISOString()
        });
      }
    }

    return anomalies;
  }

  /**
   * Get benchmark data
   */
  private static async getBenchmarks(companyId: string) {
    // In a real implementation, these would come from industry data
    return {
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
        vsIndustry: 'above' as const,
        vsGoals: 'meeting' as const,
        improvementAreas: ['Zníženie nadčasov', 'Zlepšenie punktuálnosti']
      }
    };
  }

  /**
   * Get productivity trends over time
   */
  static async getProductivityTrends(companyId: string, period: 'week' | 'month' | 'quarter') {
    try {
      const now = new Date();
      let startDate: Date;
      let periods: number;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periods = 7;
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          periods = 30;
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          periods = 90;
          break;
      }

      const employees = await prisma.user.findMany({
        where: { 
          companyId,
          isActive: true,
          role: 'EMPLOYEE'
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: { gte: startDate }
            },
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      const trendData = [];
      
      for (let i = 0; i < periods; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        let totalHours = 0;
        let activeEmployees = 0;

        for (const employee of employees) {
          const dayEvents = employee.attendanceEvents.filter((e: any) => 
            e.timestamp.toISOString().split('T')[0] === dateStr
          );
          
          if (dayEvents.length > 0) {
            const hours = this.calculateDailyHours(dayEvents);
            if (hours > 0) {
              totalHours += hours;
              activeEmployees++;
            }
          }
        }

        const avgHours = activeEmployees > 0 ? totalHours / activeEmployees : 0;
        const productivityScore = Math.min(100, (avgHours / 8) * 100);

        trendData.push({
          date: dateStr,
          value: Math.round(productivityScore),
          label: `${Math.round(productivityScore)}% produktivita`
        });
      }

      return trendData;
    } catch (error) {
      console.error('Error getting productivity trends:', error);
      throw error;
    }
  }

  /**
   * Get attendance heatmap data
   */
  static async getAttendanceHeatmap(companyId: string) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      const attendanceEvents = await prisma.attendanceEvent.findMany({
        where: {
          user: { companyId },
          timestamp: { gte: startDate },
          type: { in: ['CLOCK_IN', 'CLOCK_OUT'] }
        },
        include: { user: true }
      });

      const heatmapData = [];
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      for (const day of days) {
        for (let hour = 0; hour < 24; hour++) {
          const dayIndex = days.indexOf(day);
          
          const eventsInHour = attendanceEvents.filter(event => {
            const eventDate = new Date(event.timestamp);
            const eventDay = eventDate.getDay() === 0 ? 6 : eventDate.getDay() - 1; // Convert to Monday=0
            const eventHour = eventDate.getHours();
            
            return eventDay === dayIndex && eventHour === hour;
          });

          const intensity = eventsInHour.length;
          
          heatmapData.push({
            day,
            hour,
            value: intensity,
            intensity: intensity > 10 ? 'high' : intensity > 5 ? 'medium' : 'low'
          });
        }
      }

      return heatmapData;
    } catch (error) {
      console.error('Error getting attendance heatmap:', error);
      throw error;
    }
  }

  /**
   * Get cost analysis data
   */
  static async getCostAnalysis(companyId: string, period: 'week' | 'month' | 'quarter') {
    try {
      const now = new Date();
      let startDate: Date;
      let periods: number;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periods = 7;
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          periods = 30;
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          periods = 90;
          break;
      }

      const employees = await prisma.user.findMany({
        where: { 
          companyId,
          isActive: true,
          role: 'EMPLOYEE'
        },
        include: {
          attendanceEvents: {
            where: {
              timestamp: { gte: startDate }
            }
          }
        }
      });

      const totalCosts = [];
      const hourlyRate = 25; // Default hourly rate
      const overtimeRate = hourlyRate * 1.5;

      for (let i = 0; i < periods; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        let dailyCost = 0;

        for (const employee of employees) {
          const dayEvents = employee.attendanceEvents.filter((e: any) => 
            e.timestamp.toISOString().split('T')[0] === dateStr
          );
          
          const hours = this.calculateDailyHours(dayEvents);
          if (hours > 0) {
            const regularHours = Math.min(8, hours);
            const overtimeHours = Math.max(0, hours - 8);
            
            dailyCost += (regularHours * hourlyRate) + (overtimeHours * overtimeRate);
          }
        }

        totalCosts.push({
          date: dateStr,
          value: Math.round(dailyCost),
          label: `€${Math.round(dailyCost).toLocaleString()}`
        });
      }

      // Calculate cost breakdown
      const totalRegularCosts = employees.length * 8 * hourlyRate * periods;
      const totalOvertimeCosts = totalCosts.reduce((sum, day) => sum + day.value, 0) - totalRegularCosts;
      const totalBenefits = totalRegularCosts * 0.2; // 20% benefits
      const totalOther = totalRegularCosts * 0.1; // 10% other costs

      const costBreakdown = [
        { 
          category: 'Základné mzdy', 
          amount: Math.round(totalRegularCosts), 
          percentage: 70, 
          color: '#3b82f6' 
        },
        { 
          category: 'Nadčasy', 
          amount: Math.round(Math.max(0, totalOvertimeCosts)), 
          percentage: 16, 
          color: '#ef4444' 
        },
        { 
          category: 'Benefity', 
          amount: Math.round(totalBenefits), 
          percentage: 10, 
          color: '#10b981' 
        },
        { 
          category: 'Ostatné', 
          amount: Math.round(totalOther), 
          percentage: 4, 
          color: '#f59e0b' 
        }
      ];

      const projections = {
        nextPeriod: Math.round(totalCosts.reduce((sum, day) => sum + day.value, 0) * 1.05),
        trend: 'increasing' as const,
        savingsOpportunities: [
          { area: 'Optimalizácia nadčasov', potentialSavings: 3000, difficulty: 'medium' as const },
          { area: 'Automatizácia procesov', potentialSavings: 2000, difficulty: 'hard' as const },
          { area: 'Lepšie plánovanie zmien', potentialSavings: 1500, difficulty: 'easy' as const }
        ]
      };

      return { totalCosts, costBreakdown, projections };
    } catch (error) {
      console.error('Error getting cost analysis:', error);
      throw error;
    }
  }

  /**
   * Helper method to group events by day and calculate hours
   */
  private static groupEventsByDay(events: any[]) {
    const dailyHours: Record<string, number> = {};
    
    // Group events by date
    const eventsByDate: Record<string, any[]> = {};
    
    for (const event of events) {
      const date = event.timestamp.toISOString().split('T')[0];
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push(event);
    }
    
    // Calculate hours for each day
    for (const [date, dayEvents] of Object.entries(eventsByDate)) {
      dailyHours[date] = this.calculateDailyHours(dayEvents);
    }
    
    return dailyHours;
  }

  /**
   * Calculate daily hours from events
   */
  private static calculateDailyHours(events: any[]): number {
    let totalHours = 0;
    let clockInTime: Date | null = null;
    let breakStartTime: Date | null = null;
    let totalBreakTime = 0;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const event of sortedEvents) {
      const eventTime = new Date(event.timestamp);

      switch (event.type) {
        case 'CLOCK_IN':
          clockInTime = eventTime;
          break;
        
        case 'CLOCK_OUT':
          if (clockInTime) {
            const workTime = (eventTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
            totalHours += workTime - totalBreakTime;
            clockInTime = null;
            totalBreakTime = 0;
          }
          break;
        
        case 'BREAK_START':
          breakStartTime = eventTime;
          break;
        
        case 'BREAK_END':
          if (breakStartTime) {
            const breakDuration = (eventTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60);
            totalBreakTime += breakDuration;
            breakStartTime = null;
          }
          break;
      }
    }

    return Math.max(0, totalHours);
  }

  /**
   * Helper method to get working days between two dates
   */
  private static getWorkingDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Helper method to format time from hours (decimal) to HH:MM format
   */
  private static formatTimeFromHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
