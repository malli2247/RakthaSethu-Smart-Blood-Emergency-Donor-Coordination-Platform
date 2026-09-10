import { PrismaClient } from '@prisma/client';
import { config } from './index';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

export const prisma =
  global.prismaInstance ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || config.databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully.');
    return true;
  } catch (error) {
    console.error('⚠️ Could not connect to PostgreSQL database:', (error as Error).message);
    console.warn('⚠️ If running in development without PostgreSQL, run `docker compose up -d postgres` or start a PostgreSQL instance.');
    return false;
  }
}
