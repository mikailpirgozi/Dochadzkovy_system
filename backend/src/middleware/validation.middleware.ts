import type { Request, Response, NextFunction } from 'express';
import type { z } from 'zod';

export interface ValidationSchemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          res.status(400).json({
            error: 'Invalid request body',
            details: bodyResult.error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          });
          return;
        }
        req.body = bodyResult.data;
      }

      // Validate query parameters
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          res.status(400).json({
            error: 'Invalid query parameters',
            details: queryResult.error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          });
          return;
        }
        req.query = queryResult.data;
      }

      // Validate route parameters
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          res.status(400).json({
            error: 'Invalid route parameters',
            details: paramsResult.error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          });
          return;
        }
        req.params = paramsResult.data;
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
      });
    }
  };
};
