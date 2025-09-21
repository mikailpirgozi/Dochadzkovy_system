import cron from 'node-cron';
import { OvertimeService } from './overtime.service.js';
import { AuditService } from './audit.service.js';

export class SchedulerService {
  private static readonly jobs = new Map<string, cron.ScheduledTask>();

  /**
   * Initialize all scheduled jobs
   */
  static initialize(): void {
    console.log('Initializing scheduled jobs...');

    // Check overtime warnings every 30 minutes during work hours (8 AM - 8 PM, Monday-Friday)
    this.scheduleJob('overtime-check', '*/30 8-20 * * 1-5', async () => {
      console.log('Running scheduled overtime check...');
      await OvertimeService.checkOvertimeWarnings();
    });

    // Clean old audit logs daily at 2 AM
    this.scheduleJob('audit-cleanup', '0 2 * * *', async () => {
      console.log('Running scheduled audit log cleanup...');
      try {
        // Get all companies
        const { prisma } = await import('../utils/database.js');
        const companies = await prisma.company.findMany({
          where: { isActive: true },
          select: { id: true, name: true }
        });

        let totalCleaned = 0;
        for (const company of companies) {
          const cleaned = await AuditService.cleanOldAuditLogs(company.id, 365); // Keep 1 year
          totalCleaned += cleaned;
          console.log(`Cleaned ${cleaned} old audit logs for company ${company.name}`);
        }
        
        console.log(`Total audit logs cleaned: ${totalCleaned}`);
      } catch (error) {
        console.error('Error during audit log cleanup:', error);
      }
    });

    // Health check job - runs every hour to ensure system is responsive
    this.scheduleJob('health-check', '0 * * * *', async () => {
      try {
        const { prisma } = await import('../utils/database.js');
        await prisma.$queryRaw`SELECT 1`;
        console.log('Health check passed - database connection OK');
      } catch (error) {
        console.error('Health check failed - database connection issue:', error);
      }
    });

    // Weekly summary job - runs every Monday at 9 AM
    this.scheduleJob('weekly-summary', '0 9 * * 1', async () => {
      console.log('Running weekly summary job...');
      try {
        await this.generateWeeklySummaries();
      } catch (error) {
        console.error('Error generating weekly summaries:', error);
      }
    });

    console.log(`Initialized ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Schedule a new job
   */
  private static scheduleJob(name: string, cronExpression: string, task: () => Promise<void>): void {
    try {
      const job = cron.schedule(cronExpression, async () => {
        const startTime = Date.now();
        console.log(`Starting scheduled job: ${name}`);
        
        try {
          await task();
          const duration = Date.now() - startTime;
          console.log(`Completed scheduled job: ${name} (${duration}ms)`);
        } catch (error) {
          console.error(`Error in scheduled job ${name}:`, error);
        }
      }, {
        scheduled: true,
        timezone: 'Europe/Bratislava'
      });

      this.jobs.set(name, job);
      console.log(`Scheduled job '${name}' with cron expression: ${cronExpression}`);
    } catch (error) {
      console.error(`Failed to schedule job '${name}':`, error);
    }
  }

  /**
   * Stop a specific job
   */
  static stopJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      console.log(`Stopped scheduled job: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Start a specific job
   */
  static startJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (job) {
      job.start();
      console.log(`Started scheduled job: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all scheduled jobs
   */
  static stopAll(): void {
    console.log('Stopping all scheduled jobs...');
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${name}`);
    }
    this.jobs.clear();
  }

  /**
   * Get status of all jobs
   */
  static getJobsStatus(): Array<{ name: string; running: boolean; nextRun?: Date }> {
    const status: any[] = [];
    for (const [name, job] of this.jobs) {
      status.push({
        name,
        running: (job as any).running || false,
        // Note: node-cron doesn't provide nextRun info directly
      });
    }
    return status;
  }

  /**
   * Generate weekly summaries for all companies
   */
  private static async generateWeeklySummaries(): Promise<void> {
    try {
      const { prisma } = await import('../utils/database.js');
      
      // Get all active companies
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true, name: true }
      });

      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekEnd = new Date();
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      lastWeekEnd.setHours(23, 59, 59, 999);

      for (const company of companies) {
        try {
          // Get overtime statistics for last week
          const overtimeStats = await OvertimeService.getOvertimeStats(
            company.id,
            { from: lastWeekStart, to: lastWeekEnd }
          );

          // Get company admins
          const admins = await prisma.user.findMany({
            where: {
              companyId: company.id,
              role: 'COMPANY_ADMIN',
              isActive: true
            }
          });

          if (admins.length > 0 && overtimeStats.criticalAlerts + overtimeStats.legalLimitAlerts > 0) {
            // Send weekly summary to admins
            const { PushService } = await import('./push.service.js');
            const { WebSocketService } = await import('./websocket.service.js');
            
            const message = `Týždenný prehľad nadčasov: ${overtimeStats.totalAlerts} upozornení, ${overtimeStats.affectedEmployees} zamestnancov s nadčasmi.`;
            
            const adminIds = admins.map(admin => admin.id);
            
            await PushService.sendToUsers(adminIds, {
              title: 'Týždenný prehľad nadčasov',
              body: message,
              data: {
                type: 'alert',
                companyId: company.id,
                totalAlerts: overtimeStats.totalAlerts.toString(),
                affectedEmployees: overtimeStats.affectedEmployees.toString()
              }
            } as any);

            // Send WebSocket notification
            for (const admin of admins) {
              WebSocketService.sendNotificationToUser(admin.id, {
                type: 'weekly_overtime_summary',
                title: 'Týždenný prehľad nadčasov',
                message,
                timestamp: new Date().toISOString(),
                severity: 'info',
                data: overtimeStats
              });
            }

            console.log(`Sent weekly summary to ${admins.length} admins for company ${company.name}`);
          }
        } catch (error) {
          console.error(`Error generating weekly summary for company ${company.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in generateWeeklySummaries:', error);
    }
  }

  /**
   * Run overtime check manually (for testing)
   */
  static async runOvertimeCheckNow(): Promise<void> {
    console.log('Running manual overtime check...');
    await OvertimeService.checkOvertimeWarnings();
  }

  /**
   * Run audit cleanup manually (for testing)
   */
  static async runAuditCleanupNow(companyId: string, olderThanDays = 365): Promise<number> {
    console.log(`Running manual audit cleanup for company ${companyId}...`);
    return await AuditService.cleanOldAuditLogs(companyId, olderThanDays);
  }
}
