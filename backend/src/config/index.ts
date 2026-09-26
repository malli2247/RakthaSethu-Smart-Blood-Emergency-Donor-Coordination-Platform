import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Check all possible .env locations (local backend, root monorepo, cwd)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: isProd,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((s) => s.trim()),

  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/rakthasethu?schema=public',

  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'rakthasethu_dev_access_secret_key_1234567890',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'rakthasethu_dev_refresh_secret_key_0987654321',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    cookieSecure: isProd,
    cookieSameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute sliding window
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10), // 10,000 requests per minute
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10), // 100 auth attempts per minute
    skipLocalhost: process.env.RATE_LIMIT_SKIP_LOCALHOST !== 'false', // Never lock out dev/local testing
  },

  scaling: {
    clusterMode: process.env.CLUSTER_MODE === 'true',
    workers: parseInt(process.env.WEB_CONCURRENCY || '0', 10),
    cacheTTLSeconds: parseInt(process.env.CACHE_DEFAULT_TTL_SECONDS || '60', 10),
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    maxConnectionPool: parseInt(process.env.DATABASE_POOL_SIZE || '50', 10),
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || (isProd ? 'smtp' : 'mock'),
    smtpHost: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    smtpPort: parseInt(process.env.SMTP_PORT || '2525', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromAddress: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'RakthaSethu Alerts <alerts@rakthasethu.org>',
    apiKey: process.env.EMAIL_API_KEY || '',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || (isProd ? 'twilio' : 'mock'),
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    fast2smsApiKey: process.env.FAST2SMS_API_KEY || '',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
    uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads'),
    s3Bucket: process.env.S3_BUCKET || '',
    s3Region: process.env.S3_REGION || 'ap-south-1',
    s3AccessKey: process.env.S3_ACCESS_KEY || '',
    s3SecretKey: process.env.S3_SECRET_KEY || '',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    enabled: process.env.ENABLE_AI_FEATURES !== 'false',
  },

  push: {
    vapidPublicKey:
      process.env.VAPID_PUBLIC_KEY ||
      'BD3wUSOHMziCiqA6EoULEnRcC7ouASGCDyyQ_0L7HSImy-ByJqC9ooZsVGGyUnBMPwig_hf5I0FOMtD5IGhtpxA',
    vapidPrivateKey:
      process.env.VAPID_PRIVATE_KEY ||
      'PO8bjY2xH7m065PJN6pd-61D688dZ_EeYaEEU3Bj9UM',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@rakthasethu.org',
  },

  matching: {
    radiusSequence: (process.env.PROGRESSIVE_SEARCH_RADII || '5,7,9,10,15,20,25,50,100')
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0),
    minimumSuitableDonors: parseInt(process.env.MIN_SUITABLE_DONORS || '5', 10),
    sequencesByUrgency: {
      CRITICAL: [5, 7, 9, 10, 15, 20, 25, 50, 100],
      HIGH: [5, 7, 9, 10, 15, 20, 25],
      NORMAL: [5, 7, 10, 15, 20],
    },
  },

  constants: {
    DONATION_INTERVAL_DAYS: 90, // Minimum days between whole blood donations
    DEFAULT_SEARCH_RADIUS_KM: 50,
    LOW_STOCK_THRESHOLD: 5,
    EXPIRY_WARNING_DAYS: 7,
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
  },
};

// Guarantee process.env has DATABASE_URL set for Prisma
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = config.databaseUrl;
}

export type ConfigStatus = 'CONFIGURED' | 'MISSING' | 'INVALID';

/**
 * Evaluates environment configuration integrity safely without revealing secret values.
 */
export function checkProductionEnvironment(): Record<string, ConfigStatus> {
  const insecureDevJwtPatterns = ['dev', 'change_in_prod', '1234567890', '0987654321'];

  // DATABASE_URL
  let dbStatus: ConfigStatus = 'MISSING';
  if (config.databaseUrl) {
    if (
      config.databaseUrl.startsWith('postgresql://') ||
      config.databaseUrl.startsWith('postgres://') ||
      config.databaseUrl.startsWith('file:')
    ) {
      dbStatus = 'CONFIGURED';
    } else {
      dbStatus = 'INVALID';
    }
  }

  // JWT ACCESS SECRET
  let jwtAccessStatus: ConfigStatus = 'MISSING';
  if (config.jwt.accessSecret) {
    if (
      (config.isProduction && insecureDevJwtPatterns.some((p) => config.jwt.accessSecret.toLowerCase().includes(p))) ||
      config.jwt.accessSecret.length < 16
    ) {
      jwtAccessStatus = 'INVALID';
    } else {
      jwtAccessStatus = 'CONFIGURED';
    }
  }

  // JWT REFRESH SECRET
  let jwtRefreshStatus: ConfigStatus = 'MISSING';
  if (config.jwt.refreshSecret) {
    if (
      (config.isProduction && insecureDevJwtPatterns.some((p) => config.jwt.refreshSecret.toLowerCase().includes(p))) ||
      config.jwt.refreshSecret.length < 16
    ) {
      jwtRefreshStatus = 'INVALID';
    } else {
      jwtRefreshStatus = 'CONFIGURED';
    }
  }

  // VAPID KEYS
  let vapidPublicStatus: ConfigStatus = 'MISSING';
  if (config.push.vapidPublicKey) {
    vapidPublicStatus = config.push.vapidPublicKey.length >= 60 ? 'CONFIGURED' : 'INVALID';
  }

  let vapidPrivateStatus: ConfigStatus = 'MISSING';
  if (config.push.vapidPrivateKey) {
    vapidPrivateStatus = config.push.vapidPrivateKey.length >= 30 ? 'CONFIGURED' : 'INVALID';
  }

  let vapidSubjectStatus: ConfigStatus = 'MISSING';
  if (config.push.vapidSubject) {
    vapidSubjectStatus =
      config.push.vapidSubject.startsWith('mailto:') || config.push.vapidSubject.startsWith('http')
        ? 'CONFIGURED'
        : 'INVALID';
  }

  // SMS PROVIDER
  let smsStatus: ConfigStatus = 'MISSING';
  if (config.sms.provider === 'twilio') {
    smsStatus =
      config.sms.twilioAccountSid && config.sms.twilioAuthToken && config.sms.twilioPhoneNumber
        ? 'CONFIGURED'
        : 'MISSING';
  } else if (config.sms.provider === 'mock') {
    smsStatus = config.isProduction && process.env.OTP_DEV_MODE !== 'true' ? 'INVALID' : 'CONFIGURED';
  }

  // EMAIL PROVIDER
  let emailStatus: ConfigStatus = 'MISSING';
  if (config.email.provider === 'smtp') {
    emailStatus = config.email.smtpUser && config.email.smtpPass ? 'CONFIGURED' : 'MISSING';
  } else if (config.email.provider === 'mock') {
    emailStatus = 'CONFIGURED';
  }

  // CORS
  const corsStatus: ConfigStatus = config.corsOrigins.length > 0 ? 'CONFIGURED' : 'MISSING';

  return {
    DATABASE_URL: dbStatus,
    JWT_ACCESS_SECRET: jwtAccessStatus,
    JWT_REFRESH_SECRET: jwtRefreshStatus,
    VAPID_PUBLIC_KEY: vapidPublicStatus,
    VAPID_PRIVATE_KEY: vapidPrivateStatus,
    VAPID_SUBJECT: vapidSubjectStatus,
    SMS_PROVIDER: smsStatus,
    EMAIL_PROVIDER: emailStatus,
    CORS_ORIGINS: corsStatus,
  };
}

/**
 * Startup sanity check and environment validator.
 * Warns on unconfigured optional services and prevents insecure production boot.
 */
export function validateEnvironment(): void {
  const sanityReport = checkProductionEnvironment();
  logger.info('[Config Sanity] Safe Configuration Status Check:');
  for (const [key, status] of Object.entries(sanityReport)) {
    const symbol = status === 'CONFIGURED' ? '✅' : status === 'INVALID' ? '❌' : '⚠️';
    logger.info(`  ${symbol} ${key.padEnd(20)}: ${status}`);
  }

  if (config.isProduction) {
    // Critical security assertions in production
    const insecureDevJwtPatterns = ['dev', 'change_in_prod', '1234567890'];
    if (insecureDevJwtPatterns.some((p) => config.jwt.accessSecret.toLowerCase().includes(p))) {
      throw new Error(
        'FATAL: JWT_ACCESS_SECRET contains default or insecure values in production environment. Refusing to boot.'
      );
    }
    if (insecureDevJwtPatterns.some((p) => config.jwt.refreshSecret.toLowerCase().includes(p))) {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET contains default or insecure values in production environment. Refusing to boot.'
      );
    }
    if (config.jwt.accessSecret.length < 32 || config.jwt.refreshSecret.length < 32) {
      throw new Error(
        'FATAL: JWT secrets must be at least 32 characters in production. Generate using openssl rand -hex 32.'
      );
    }
  }

  // Graceful warnings for optional services (App will NOT crash)
  if (config.email.provider === 'smtp' && (!config.email.smtpUser || !config.email.smtpPass)) {
    logger.warn('Email provider is set to SMTP but credentials are empty. Outgoing emails will be simulated.');
  }

  if (config.sms.provider === 'twilio' && (!config.sms.twilioAccountSid || !config.sms.twilioAuthToken)) {
    logger.warn('SMS provider is set to Twilio but credentials are empty. SMS alerts will run in simulation mode.');
  }

  if (!config.ai.apiKey) {
    logger.info('AI_API_KEY not configured. Heuristic clinical urgency engine active.');
  }

  if (!config.maps.apiKey) {
    logger.info('GOOGLE_MAPS_API_KEY not configured. High-precision Haversine distance engine active.');
  }
}
