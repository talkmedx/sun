import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { fail } from '../utils/response';
import { config } from '../config';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return fail(res, err.message, err.statusCode, err.errors);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return fail(res, err.message, 400);
  }

  console.error('[ERROR]', err);

  const message =
    config.env === 'production' ? 'Internal server error' : err.message;

  return fail(res, message, 500);
}

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}
