import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';
import { config } from '../config';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction): void {
  let statusCode = err.statusCode || (err.status ? parseInt(err.status, 10) : 500);
  let message = err.message || 'An unexpected internal server error occurred';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let details = err.details || undefined;

  // Handle Prisma Database Exceptions cleanly
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'DUPLICATE_RESOURCE';
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      message = 'A resource with this ' + target + ' already exists.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'NOT_FOUND';
      message = 'The requested database record was not found.';
    } else {
      statusCode = 400;
      code = 'DATABASE_ERROR';
      message = config.isProduction
        ? 'A database error occurred while processing your request.'
        : 'Database Error (' + err.code + '): ' + err.message;
    }
  } else if (err.name === 'PrismaClientInitializationError') {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database service is temporarily unavailable. Please try again later.';
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Invalid request parameters';
    details = err.errors;
  }

  // Security & logging
  if (statusCode >= 500) {
    logger.error('[Server Error] ' + req.method + ' ' + req.originalUrl, err);
  } else {
    logger.warn('[Client Error] ' + req.method + ' ' + req.originalUrl + ' (' + statusCode + ') - ' + message);
  }

  // In production, sanitize unexpected 500 messages to prevent leakage of internal system details
  if (config.isProduction && statusCode === 500 && !(err instanceof AppError)) {
    message = 'An unexpected internal server error occurred. Our team has been notified.';
    code = 'INTERNAL_SERVER_ERROR';
    details = undefined;
  }


  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details && { details }),
    ...(!config.isProduction && err.stack && { stack: err.stack }),
  });
}
