import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { createError } from './errorHandler.js';
import { getConfig } from '../utils/environment.js';
import type { AuthenticatedRequest, JWTPayload, UserRole } from '../types/index.js';

const config = getConfig();

// Extract token from request headers
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

// Verify JWT token and get user data
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw createError.unauthorized('No token provided');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    if (!decoded.userId || !decoded.companyId) {
      throw createError.unauthorized('Invalid token payload');
    }

    // Get user from database with company information
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            qrCode: true,
            settings: true,
            geofence: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw createError.unauthorized('User not found or inactive');
    }

    if (!user.company?.isActive) {
      throw createError.unauthorized('Company not found or inactive');
    }

    // Verify company matches token
    if (user.companyId !== decoded.companyId) {
      throw createError.unauthorized('Token company mismatch');
    }

    // Add user and company to request object
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).company = user.company;

    logger.logAuth('authenticated', user.id, user.email);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError.unauthorized('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError.unauthorized('Token expired'));
    } else {
      next(error);
    }
  }
};

// Multi-tenant middleware - validates company context
export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const companySlug = req.headers['x-company-slug'] as string;

    if (!companySlug) {
      throw createError.badRequest('Company slug header required');
    }

    // If user is already authenticated, verify company matches
    const authReq = req as AuthenticatedRequest;
    if (authReq.user && authReq.company) {
      if (authReq.company.slug !== companySlug) {
        throw createError.forbidden('Company access denied');
      }
      next(); return;
    }

    // For non-authenticated routes, just validate company exists
    const company = await prisma.company.findUnique({
      where: { 
        slug: companySlug,
        isActive: true,
      },
    });

    if (!company) {
      throw createError.notFound('Company not found');
    }

    (req as AuthenticatedRequest).company = company;
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      next(createError.unauthorized('Authentication required')); return;
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      next(createError.forbidden('Insufficient permissions')); return;
    }

    next();
  };
};

// Specific role middleware functions
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireCompanyAdmin = requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN']);
export const requireManager = requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']);
export const requireEmployee = requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']);

// Company ownership middleware - ensures user belongs to the company
export const requireCompanyAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user || !authReq.company) {
    next(createError.unauthorized('Authentication required')); return;
  }

  if (authReq.user.companyId !== authReq.company.id) {
    next(createError.forbidden('Company access denied')); return;
  }

  next();
};

// Resource ownership middleware - ensures user can access specific resource
export const requireResourceOwnership = (resourceUserIdField = 'userId') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      next(createError.unauthorized('Authentication required')); return;
    }

    // Super admins and company admins can access all resources in their company
    if (authReq.user.role === 'SUPER_ADMIN' || authReq.user.role === 'COMPANY_ADMIN') {
      next(); return;
    }

    // For other roles, check resource ownership
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      next(createError.badRequest(`${resourceUserIdField} is required`)); return;
    }

    if (authReq.user.id !== resourceUserId) {
      next(createError.forbidden('Resource access denied')); return;
    }

    next();
  };
};

// Optional authentication middleware - doesn't fail if no token
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      next(); return;
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    if (decoded.userId && decoded.companyId) {
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        include: {
          company: true,
        },
      });

      if (user?.company?.isActive) {
        (req as AuthenticatedRequest).user = user;
        (req as AuthenticatedRequest).company = user.company;
      }
    }

    next();
  } catch (_error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

// Rate limiting by user
export const userRateLimit = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      next(); return;
    }

    const userId = authReq.user.id;
    const now = Date.now();
    const userLimit = userRequests.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      next(); return;
    }

    if (userLimit.count >= maxRequests) {
      next(createError.tooManyRequests('Too many requests from this user')); return;
    }

    userLimit.count++;
    next();
  };
};

// Device validation middleware
export const validateDevice = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      next(createError.unauthorized('Authentication required')); return;
    }

    const deviceId = req.headers['x-device-id'] as string;

    if (!deviceId) {
      next(createError.badRequest('Device ID header required')); return;
    }

    // Check if device is registered for this user
    if (authReq.user.deviceId && authReq.user.deviceId !== deviceId) {
      logger.warn(`Device mismatch for user ${authReq.user.id}: expected ${authReq.user.deviceId}, got ${deviceId}`);
      next(createError.forbidden('Device not authorized')); return;
    }

    // If no device registered, this might be first login - allow but log
    if (!authReq.user.deviceId) {
      logger.info(`New device registration for user ${authReq.user.id}: ${deviceId}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};
