import type { EnvironmentConfig } from '../types/index.js';

export const validateEnvironment = (): EnvironmentConfig => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  // Check for required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Validate and parse environment variables
  const config: EnvironmentConfig = {
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
    PORT: parseInt(process.env.PORT ?? '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    JWT_SECRET: process.env.JWT_SECRET ?? '',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:8081,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://192.168.1.22:8081,exp://192.168.1.22:8081',
    SMTP_HOST: process.env.SMTP_HOST ?? '',
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
    SMTP_USER: process.env.SMTP_USER ?? '',
    SMTP_PASS: process.env.SMTP_PASS ?? '',
    SMTP_FROM: process.env.SMTP_FROM ?? '',
    EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN ?? '',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '2000', 10), // Increased for development with multiple components
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    ADMIN_DASHBOARD_URL: process.env.ADMIN_DASHBOARD_URL ?? '',
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : 5242880,
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES ?? 'image/jpeg,image/png,application/pdf',
  };

  // Validate PORT
  if (isNaN(config.PORT) || config.PORT < 1 || config.PORT > 65535) {
    throw new Error('PORT must be a valid port number between 1 and 65535');
  }

  // Validate JWT_SECRET length
  if (config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate SMTP configuration if provided
  if (config.SMTP_HOST && (!config.SMTP_USER || !config.SMTP_PASS)) {
    throw new Error('SMTP_USER and SMTP_PASS are required when SMTP_HOST is provided');
  }

  // Validate rate limiting values
  if (config.RATE_LIMIT_WINDOW_MS < 1000) {
    throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
  }

  if (config.RATE_LIMIT_MAX_REQUESTS < 1) {
    throw new Error('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  return config;
};

export const getConfig = (): EnvironmentConfig => {
  return validateEnvironment();
};
