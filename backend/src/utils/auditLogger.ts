import { prisma } from '../config/database';
import { logger } from './logger';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    const detailsStr =
      typeof options.details === 'object' && options.details !== null
        ? JSON.stringify(options.details)
        : (options.details as string | null);

    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        entity: options.entity,
        entityId: options.entityId || null,
        details: detailsStr || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (err) {
    logger.error(`[AuditLogger] Failed to write audit log for action: ${options.action}`, err);
  }
}
