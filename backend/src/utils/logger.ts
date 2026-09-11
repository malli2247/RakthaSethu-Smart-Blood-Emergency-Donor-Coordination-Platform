/**
 * RakthaSethu Production-Grade Sanitized Logger
 * Redacts passwords, auth tokens, refresh tokens, API keys, and OTPs.
 */

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'authorization',
  'cookie',
  'otp',
  'apikey',
  'credential',
];

function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*/.test(data) && data.length > 30) {
      return '[REDACTED_JWT]';
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitize);
  }
  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_KEYS.some((k) => lower.includes(k))) {
        clean[key] = '[REDACTED]';
      } else {
        clean[key] = sanitize(value);
      }
    }
    return clean;
  }
  return data;
}

export const logger = {
  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      if (meta !== undefined) {
        console.debug(`[${timestamp}] [DEBUG] ${message}`, JSON.stringify(sanitize(meta)));
      } else {
        console.debug(`[${timestamp}] [DEBUG] ${message}`);
      }
    }
  },

  info(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.log(`[${timestamp}] [INFO] ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`);
    }
  },

  warn(message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    if (meta !== undefined) {
      console.warn(`[${timestamp}] [WARN] ⚠️ ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.warn(`[${timestamp}] [WARN] ⚠️ ${message}`);
    }
  },

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
      console.error(`[${timestamp}] [ERROR] ❌ ${message}: ${error.message}`);
      if (process.env.NODE_ENV !== 'production' && error.stack) {
        console.error(error.stack);
      }
    } else if (error !== undefined) {
      console.error(`[${timestamp}] [ERROR] ❌ ${message}:`, JSON.stringify(sanitize(error)));
    } else {
      console.error(`[${timestamp}] [ERROR] ❌ ${message}`);
    }
  },

  security(event: string, meta?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [SECURITY_AUDIT] 🔒 ${event}`, JSON.stringify(sanitize(meta || {})));
  },
};
