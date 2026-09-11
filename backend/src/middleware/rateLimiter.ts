import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../config';

/**
 * Checks if an IP is a local loopback address
 */
function isLoopback(ip?: string): boolean {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost' ||
    ip.startsWith('127.')
  );
}

/**
 * High-Throughput Tiered API Rate Limiter
 * Designed to handle 10,000+ requests/minute per client and never lock out localhost development
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // 1. Skip SSE events and health check
    if (req.path.includes('/events') || req.path === '/health' || req.path.startsWith('/uploads')) {
      return true;
    }
    // 2. Skip localhost loopback in development/testing if enabled
    if (config.rateLimit.skipLocalhost && isLoopback(req.ip)) {
      return true;
    }
    return false;
  },
  message: {
    success: false,
    message: 'Rate limit threshold reached. Please throttle requests and retry shortly.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * High-Capacity Authentication Rate Limiter
 * Protects against brute-force attacks while allowing high concurrent traffic
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute sliding window (instead of rigid 15 minutes lockout)
  max: config.rateLimit.authMax, // 100 attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    if (config.rateLimit.skipLocalhost && isLoopback(req.ip)) {
      return true;
    }
    return false;
  },
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 60 seconds before trying again.',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});
