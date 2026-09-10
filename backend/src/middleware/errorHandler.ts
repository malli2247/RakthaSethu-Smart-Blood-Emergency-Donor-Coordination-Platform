import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || (err.status ? parseInt(err.status, 10) : 500);
  const message = err.message || 'An unexpected internal server error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  if (config.nodeEnv === 'development') {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details: err.details || undefined,
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
}
