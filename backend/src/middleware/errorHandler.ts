import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import type { AppError, AuthenticatedRequest, AuthenticatedRequestHandler } from '../types/index.js';

// Custom error class
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | CustomError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown = undefined;

  // Log the error
  logger.logError(error, `${req.method} ${req.path}`);

  // Handle different error types
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: 'received' in err ? err.received : undefined,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Duplicate entry. This record already exists.';
        details = {
          field: error.meta?.target,
          code: error.code,
        };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found.';
        details = {
          code: error.code,
        };
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed.';
        details = {
          field: error.meta?.field_name,
          code: error.code,
        };
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid relation. The change would violate a required relation.';
        details = {
          code: error.code,
        };
        break;
      default:
        statusCode = 500;
        message = 'Database error occurred.';
        details = {
          code: error.code,
        };
    }
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = 500;
    message = 'Unknown database error occurred.';
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    statusCode = 500;
    message = 'Database engine error occurred.';
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = 'Database connection error.';
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database query validation error.';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
  } else if (error.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token not active.';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format.';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error.';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = undefined;
  }

  // Send error response
  const errorResponse: {
    success: false;
    error: string;
    details?: unknown;
    stack?: string;
  } = {
    success: false,
    error: message,
  };

  if (details !== undefined) {
    errorResponse.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Async handler for authenticated routes
export const authenticatedAsyncHandler = (
  fn: AuthenticatedRequestHandler
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create error helper functions
export const createError = {
  badRequest: (message = 'Bad Request') => new CustomError(message, 400),
  unauthorized: (message = 'Unauthorized') => new CustomError(message, 401),
  forbidden: (message = 'Forbidden') => new CustomError(message, 403),
  notFound: (message = 'Not Found') => new CustomError(message, 404),
  conflict: (message = 'Conflict') => new CustomError(message, 409),
  unprocessableEntity: (message = 'Unprocessable Entity') => new CustomError(message, 422),
  tooManyRequests: (message = 'Too Many Requests') => new CustomError(message, 429),
  internal: (message = 'Internal Server Error') => new CustomError(message, 500),
  internalServerError: (message = 'Internal Server Error') => new CustomError(message, 500),
  notImplemented: (message = 'Not Implemented') => new CustomError(message, 501),
  badGateway: (message = 'Bad Gateway') => new CustomError(message, 502),
  serviceUnavailable: (message = 'Service Unavailable') => new CustomError(message, 503),
};
