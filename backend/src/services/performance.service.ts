import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';
import type { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowQueries: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

interface DatabaseMetrics {
  connectionCount: number;
  slowQueries: number;
  queryCount: number;
  averageQueryTime: number;
}

export class PerformanceService {
  private static readonly metrics = new Map<string, number>();
  private static queryTimes: number[] = [];
  private static errorCount = 0;
  private static requestCount = 0;

  /**
   * Track API request performance
   */
  static trackRequest(endpoint: string, duration: number, success: boolean): void {
    this.requestCount++;
    
    if (!success) {
      this.errorCount++;
    }

    // Store response times for averaging
    const key = `${endpoint}_times`;
    const times = this.metrics.get(key) || 0;
    this.metrics.set(key, times + duration);

    // Track slow requests
    if (duration > 1000) {
      logger.warn(`Slow request: ${endpoint} took ${duration}ms`);
    }

    // Track very slow requests
    if (duration > 5000) {
      logger.error(`Very slow request: ${endpoint} took ${duration}ms`);
    }
  }

  /**
   * Track database query performance
   */
  static trackQuery(query: string, duration: number): void {
    this.queryTimes.push(duration);

    // Keep only last 1000 queries
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }

    // Log slow queries
    if (duration > 500) {
      logger.warn(`Slow query: ${query} took ${duration}ms`);
    }

    if (duration > 2000) {
      logger.error(`Very slow query: ${query} took ${duration}ms`);
    }
  }

  /**
   * Get current performance metrics
   */
  static getMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      requestCount: this.requestCount,
      averageResponseTime: this.getAverageResponseTime(),
      slowQueries: this.queryTimes.filter(time => time > 500).length,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      memoryUsage,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to ms
    };
  }

  /**
   * Get database performance metrics
   */
  static async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    try {
      // Get database stats (PostgreSQL specific)
      const connectionCount = await this.getActiveConnections();
      
      return {
        connectionCount,
        slowQueries: this.queryTimes.filter(time => time > 500).length,
        queryCount: this.queryTimes.length,
        averageQueryTime: this.getAverageQueryTime(),
      };
    } catch (error) {
      logger.error('Error getting database metrics:', error);
      return {
        connectionCount: 0,
        slowQueries: 0,
        queryCount: 0,
        averageQueryTime: 0,
      };
    }
  }

  /**
   * Optimize database queries
   */
  static async optimizeQueries(): Promise<void> {
    try {
      // Analyze slow queries
      const slowQueries = this.queryTimes.filter(time => time > 500);
      
      if (slowQueries.length > 10) {
        logger.warn(`Found ${slowQueries.length} slow queries. Consider optimization.`);
        
        // Suggest optimizations
        await this.suggestOptimizations();
      }

      // Clear old metrics
      if (this.queryTimes.length > 1000) {
        this.queryTimes = this.queryTimes.slice(-500);
      }
    } catch (error) {
      logger.error('Error optimizing queries:', error);
    }
  }

  /**
   * Monitor memory usage
   */
  static monitorMemory(): void {
    const usage = process.memoryUsage();
    const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
    
    logger.info(`Memory usage: ${usedMB}MB / ${totalMB}MB`);
    
    // Warn if memory usage is high
    if (usedMB > 500) {
      logger.warn(`High memory usage: ${usedMB}MB`);
    }
    
    // Force garbage collection if available
    if (global.gc && usedMB > 1000) {
      logger.info('Running garbage collection...');
      global.gc();
    }
  }

  /**
   * Clean up old data
   */
  static async cleanupOldData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Clean up old location logs (keep only 30 days)
      const deletedLogs = await prisma.locationLog.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      });

      if (deletedLogs.count > 0) {
        logger.info(`Cleaned up ${deletedLogs.count} old location logs`);
      }

      // Clean up resolved alerts older than 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const deletedAlerts = await prisma.alert.deleteMany({
        where: {
          resolved: true,
          resolvedAt: {
            lt: ninetyDaysAgo,
          },
        },
      });

      if (deletedAlerts.count > 0) {
        logger.info(`Cleaned up ${deletedAlerts.count} old resolved alerts`);
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Get health check status
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Record<string, boolean>;
    metrics: PerformanceMetrics;
  }> {
    const checks = {
      database: false,
      memory: false,
      cpu: false,
      queries: false,
    };

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    const metrics = this.getMetrics();
    
    // Check memory usage (< 1GB)
    checks.memory = metrics.memoryUsage.heapUsed < 1024 * 1024 * 1024;
    
    // Check CPU usage (< 80%)
    checks.cpu = metrics.cpuUsage < 80;
    
    // Check query performance (< 10% slow queries)
    const slowQueryRate = (metrics.slowQueries / this.queryTimes.length) * 100;
    checks.queries = slowQueryRate < 10;

    // Determine overall status
    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'warning' | 'critical';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.75) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      checks,
      metrics,
    };
  }

  /**
   * Private helper methods
   */
  private static getAverageResponseTime(): number {
    const totalTime = Array.from(this.metrics.values()).reduce((sum, time) => sum + time, 0);
    return this.requestCount > 0 ? totalTime / this.requestCount : 0;
  }

  private static getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    const total = this.queryTimes.reduce((sum, time) => sum + time, 0);
    return total / this.queryTimes.length;
  }

  private static async getActiveConnections(): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ count: number }]>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  private static async suggestOptimizations(): Promise<void> {
    logger.info('Performance optimization suggestions:');
    
    // Check for missing indexes
    const slowAttendanceQueries = this.queryTimes.filter(time => time > 1000).length;
    if (slowAttendanceQueries > 5) {
      logger.info('- Consider adding indexes on attendance_events (user_id, timestamp)');
      logger.info('- Consider adding indexes on location_logs (user_id, timestamp)');
    }

    // Check for N+1 queries
    if (this.requestCount > 100 && this.queryTimes.length > this.requestCount * 3) {
      logger.info('- Possible N+1 query detected. Use includes instead of separate queries');
    }

    // Memory optimization
    const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    if (memUsage > 500) {
      logger.info('- High memory usage detected. Consider implementing pagination');
      logger.info('- Consider using streaming for large data exports');
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  static resetMetrics(): void {
    this.metrics.clear();
    this.queryTimes = [];
    this.errorCount = 0;
    this.requestCount = 0;
  }
}

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const success = (res as any).statusCode < 400;
    
    PerformanceService.trackRequest((req as any).path, duration, success);
  });

  next();
};
