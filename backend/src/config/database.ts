import { PrismaClient } from '@prisma/client';
import { config } from './index';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

function getOptimizedDatabaseUrl(): string {
  const rawUrl = process.env.DATABASE_URL || config.databaseUrl;
  // If PostgreSQL, ensure connection pooling query parameters are appended if missing
  if (rawUrl.startsWith('postgresql://') || rawUrl.startsWith('postgres://')) {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(config.scaling?.maxConnectionPool || 50));
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '10');
    }
    return url.toString();
  }
  return rawUrl;
}

export const prisma =
  global.prismaInstance ||
  new PrismaClient({
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

// Slow query detection instrumentation (logs queries taking longer than 200ms)
if (process.env.NODE_ENV === 'development') {
  (prisma as any).$on?.('query', (e: any) => {
    if (e.duration > 200) {
      logger.warn(`⚠️ [Slow Query Detected] ${e.duration}ms: ${e.query.substring(0, 120)}...`);
    }
  });
}

if (process.env.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

async function ensureAdminUser(): Promise<void> {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });
    if (adminCount === 0) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash('Admin@123456', 10);
      await prisma.user.upsert({
        where: { email: 'admin@rakthasethu.org' },
        update: {},
        create: {
          email: 'admin@rakthasethu.org',
          passwordHash,
          phone: '+919999900001',
          role: 'ADMIN',
          isVerified: true,
          isActive: true,
        },
      });
      logger.info('👑 Default Admin account initialized: admin@rakthasethu.org (Password: Admin@123456)');
    }
  } catch (err) {
    logger.warn(`⚠️ Note on admin initialization: ${(err as Error).message}`);
  }
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connection established with optimized pool.');
    await ensureAdminUser();
    return true;
  } catch (error) {
    logger.error(`⚠️ Database connection warning: ${(error as Error).message}`);
    return false;
  }
}
