import dotenv from 'dotenv';
import path from 'path';

// Check all possible .env locations (local backend, root monorepo, cwd)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/rakthasethu?schema=public',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'rakthasethu_dev_access_secret_key_1234567890',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'rakthasethu_dev_refresh_secret_key_0987654321',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
    enabled: process.env.ENABLE_AI_FEATURES !== 'false',
  },

  notifications: {
    emailEnabled: process.env.NOTIFICATION_EMAIL_ENABLED === 'true',
    smsEnabled: process.env.NOTIFICATION_SMS_ENABLED === 'true',
    smtpHost: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    smtpPort: parseInt(process.env.SMTP_PORT || '2525', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromAddress: process.env.SMTP_FROM || 'RakthaSethu Alerts <alerts@rakthasethu.org>',
  },

  constants: {
    DONATION_INTERVAL_DAYS: 90, // Minimum days between whole blood donations
    DEFAULT_SEARCH_RADIUS_KM: 50,
    LOW_STOCK_THRESHOLD: 5,
    EXPIRY_WARNING_DAYS: 7,
  },
};

// Guarantee process.env has DATABASE_URL set for Prisma
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = config.databaseUrl;
}
