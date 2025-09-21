import type { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const error = createError.notFound(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};
