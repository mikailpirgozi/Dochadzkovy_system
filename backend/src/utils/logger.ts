import pino from 'pino';
import { getConfig } from './environment.js';

// Create Pino logger with proper configuration
const createLogger = () => {
  try {
    const config = getConfig();
    const isDevelopment = config.NODE_ENV === 'development';
    
    return pino({
      level: config.LOG_LEVEL,
      transport: isDevelopment ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME ?? 'unknown',
        service: 'attendance-pro-backend',
      },
    });
  } catch {
    // Fallback logger if config fails
    return pino({
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }
};

const pinoLogger = createLogger();

// Enhanced logger class with Pino backend
class Logger {
  private pino = pinoLogger;

  error(message: string, ...args: unknown[]): void {
    if (args.length > 0) {
      this.pino.error({ extra: args }, message);
    } else {
      this.pino.error(message);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (args.length > 0) {
      this.pino.warn({ extra: args }, message);
    } else {
      this.pino.warn(message);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (args.length > 0) {
      this.pino.info({ extra: args }, message);
    } else {
      this.pino.info(message);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (args.length > 0) {
      this.pino.debug({ extra: args }, message);
    } else {
      this.pino.debug(message);
    }
  }

  // Convenience methods for common use cases with structured logging
  logRequest(method: string, url: string, statusCode: number, responseTime: number): void {
    this.pino.info({
      req: { method, url },
      res: { statusCode },
      responseTime,
    }, `${method} ${url} - ${String(statusCode)} - ${String(responseTime)}ms`);
  }

  logError(error: Error, context?: string): void {
    this.pino.error({
      err: error,
      context,
      stack: error.stack,
    }, `${context ? `[${context}] ` : ''}${error.name}: ${error.message}`);
  }

  logDatabaseQuery(query: string, duration: number): void {
    this.pino.debug({
      db: { query, duration },
    }, `DB Query (${String(duration)}ms)`);
  }

  logAuth(action: string, userId?: string, email?: string): void {
    const userInfo = userId ? `userId: ${userId}` : email ? `email: ${email}` : 'unknown user';
    this.pino.info({
      auth: { action, userId, email },
    }, `Auth ${action} - ${userInfo}`);
  }

  logAttendance(action: string, userId: string, eventType?: string): void {
    const eventInfo = eventType ? ` (${eventType})` : '';
    this.pino.info({
      attendance: { action, userId, eventType },
    }, `Attendance ${action}${eventInfo} - userId: ${userId}`);
  }

  logAlert(type: string, userId: string, message: string): void {
    this.pino.warn({
      alert: { type, userId, message },
    }, `Alert [${type}] - userId: ${userId} - ${message}`);
  }

  logPushNotification(userId: string, title: string, success: boolean): void {
    const status = success ? 'sent' : 'failed';
    this.pino.info({
      push: { userId, title, success },
    }, `Push notification ${status} - userId: ${userId} - title: ${title}`);
  }

  // Additional structured logging methods
  logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    this.pino.info({
      performance: { operation, duration, ...metadata },
    }, `Performance: ${operation} took ${String(duration)}ms`);
  }

  logSecurity(event: string, userId?: string, ip?: string, userAgent?: string): void {
    this.pino.warn({
      security: { event, userId, ip, userAgent },
    }, `Security event: ${event}`);
  }

  logBusinessEvent(event: string, userId: string, companyId: string, data?: Record<string, unknown>): void {
    this.pino.info({
      business: { event, userId, companyId, ...data },
    }, `Business event: ${event}`);
  }

  // Get child logger for specific context
  child(bindings: Record<string, unknown>): Logger {
    const childLogger = new Logger();
    childLogger.pino = this.pino.child(bindings);
    return childLogger;
  }

  // Get raw Pino instance for advanced usage
  getRawLogger() {
    return this.pino;
  }
}

export const logger = new Logger();
export { pino };
export default logger;
