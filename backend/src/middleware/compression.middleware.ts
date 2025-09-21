import compression from 'compression';
import type { Request, Response, NextFunction } from 'express';

/**
 * Smart compression middleware that only compresses when beneficial
 */
export const smartCompression = compression({
  filter: (req: Request, res: Response): boolean => {
    // Don't compress if client doesn't support it
    if (!req.headers['accept-encoding']) {
      return false;
    }

    // Don't compress small responses (< 1KB)
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength.toString()) < 1024) {
      return false;
    }

    // Don't compress already compressed content
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.toString().toLowerCase();
      if (type.includes('image/') || type.includes('video/') || type.includes('application/zip')) {
        return false;
      }
    }

    // Don't compress real-time data
    if (req.path.includes('/live') || req.path.includes('/realtime')) {
      return false;
    }

    // Compress everything else
    return compression.filter(req, res);
  },
  
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress files larger than 1KB
  memLevel: 8, // Memory usage level
});

/**
 * Response caching middleware for static data
 */
export const cacheMiddleware = (duration = 300) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      next(); return;
    }

    // Don't cache real-time or user-specific data
    if (
      req.path.includes('/live') ||
      req.path.includes('/status') ||
      req.path.includes('/me') ||
      req.path.includes('/events')
    ) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      next(); return;
    }

    // Cache static data
    res.setHeader('Cache-Control', `public, max-age=${duration}`);
    res.setHeader('ETag', `"${Date.now()}"`);
    
    next();
  };
};

/**
 * Request optimization middleware
 */
export const requestOptimization = (req: Request, res: Response, next: NextFunction): void => {
  // Add performance timing headers
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

/**
 * Database query optimization middleware
 */
export const queryOptimization = (req: Request, _res: Response, next: NextFunction): void => {
  // Add query optimization hints to request
  req.queryOptimization = {
    useIndex: true,
    selectOptimized: true,
    includeOptimized: true,
  };
  
  next();
};

// Extend Request interface
declare module 'express-serve-static-core' {
  interface Request {
    queryOptimization?: {
      useIndex: boolean;
      selectOptimized: boolean;
      includeOptimized: boolean;
    };
  }
}
