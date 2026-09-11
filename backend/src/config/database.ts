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

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connection established with optimized pool.');
    return true;
  } catch (error) {
    logger.error(`⚠️ Database connection warning: ${(error as Error).message}`);
    return false;
  }
}
