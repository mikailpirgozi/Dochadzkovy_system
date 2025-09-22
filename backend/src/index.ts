import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';

import { prisma } from './utils/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { validateEnvironment } from './utils/environment.js';
import { logger } from './utils/logger.js';
import { WebSocketService } from './services/websocket.service.js';
import { SchedulerService } from './services/scheduler.service.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import companyRoutes from './routes/company.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import locationRoutes from './routes/location.routes.js';
import alertRoutes from './routes/alert.routes.js';
import correctionRoutes from './routes/correction.routes.js';
import businessTripRoutes from './routes/businessTrip.routes.js';
import companySettingsRoutes from './routes/companySettings.routes.js';
import exportRoutes from './routes/export.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';
import overtimeRoutes from './routes/overtime.routes.js';
import advancedAnalyticsRoutes from './routes/advanced-analytics.routes.js';
import bulkOperationsRoutes from './routes/bulk-operations.routes.js';

// Validate environment variables
const config = validateEnvironment();

// Create Express app
const app = express();
const server = createServer(app);

// Trust proxy for Railway deployment (fixes rate limiting issues)
app.set('trust proxy', 1);

// Initialize WebSocket service
WebSocketService.initialize(server);

// Initialize scheduled jobs
SchedulerService.initialize();

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for public endpoints
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Slug'],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging with Pino HTTP
if (config.NODE_ENV !== 'test') {
  app.use(pinoHttp({
    logger: logger.getRawLogger(),
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';
      } else if (res.statusCode >= 500 || err) {
        return 'error';
      }
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
  }));
}

// Apply rate limiting to all requests (except company validation for testing)
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/companies/validate')) {
    next(); // Skip rate limiting for company validation
  } else {
    limiter(req, res, next);
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/corrections', correctionRoutes);
app.use('/api/business-trips', businessTripRoutes);
app.use('/api/companies/settings', companySettingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/bulk', bulkOperationsRoutes);

// WebSocket service is now initialized and handling connections

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop all scheduled jobs
  SchedulerService.stopAll();
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    server.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${config.PORT}`);
      logger.info(`📱 Environment: ${config.NODE_ENV}`);
      logger.info(`🌐 CORS origins: ${config.CORS_ORIGIN}`);
      logger.info(`📊 Health check: http://0.0.0.0:${config.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { app };
