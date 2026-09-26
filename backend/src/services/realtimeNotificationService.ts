import { Response } from 'express';
import { logger } from '../utils/logger';

interface SseClient {
  userId: string;
  role?: string;
  res: Response;
  connectedAt: Date;
}

export class RealtimeNotificationService {
  private static clients: Map<string, Set<SseClient>> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes the heartbeat timer if not already running
   */
  private static ensureHeartbeat() {
    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(() => {
        this.broadcastHeartbeat();
      }, 25000); // 25 seconds keep-alive
    }
  }

  /**
   * Registers a new SSE connection for a user
   */
  static addClient(userId: string, role: string | undefined, res: Response): () => void {
    this.ensureHeartbeat();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in proxies/Nginx
    res.flushHeaders?.();

    const client: SseClient = {
      userId,
      role,
      res,
      connectedAt: new Date(),
    };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(client);

    logger.info(`[RealtimeSSE] Client connected: user ${userId} (${role || 'USER'}). Total connections for user: ${this.clients.get(userId)!.size}`);

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    const cleanup = () => {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.delete(client);
        if (userClients.size === 0) {
          this.clients.delete(userId);
        }
      }
      logger.info(`[RealtimeSSE] Client disconnected: user ${userId}`);
    };

    res.on('close', cleanup);
    res.on('error', (err) => {
      logger.warn(`[RealtimeSSE] Connection error for user ${userId}:`, err);
      cleanup();
    });

    return cleanup;
  }

  /**
   * Send a real-time event to a specific user across all their open tabs/devices
   */
  static sendToUser(userId: string, eventName: string, payload: any): boolean {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      return false; // User is not currently connected via SSE
    }

    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    userClients.forEach((client) => {
      try {
        client.res.write(message);
      } catch (err) {
        logger.warn(`[RealtimeSSE] Failed to write event to client ${userId}:`, err);
      }
    });

    return true;
  }

  /**
   * Send a real-time event to all active users with a specific role
   */
  static sendToRole(role: string, eventName: string, payload: any): number {
    let sentCount = 0;
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;

    this.clients.forEach((userClients) => {
      userClients.forEach((client) => {
        if (client.role === role || (role === 'ADMIN' && client.role === 'SUPER_ADMIN')) {
          try {
            client.res.write(message);
            sentCount++;
          } catch {
            // Client write failed
          }
        }
      });
    });

    return sentCount;
  }

  /**
   * Broadcast an event to all connected users
   */
  static broadcast(eventName: string, payload: any): void {
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    this.clients.forEach((userClients) => {
      userClients.forEach((client) => {
        try {
          client.res.write(message);
        } catch {
          // Client write failed
        }
      });
    });
  }

  /**
   * Sends keep-alive ping comment to keep intermediate proxies from timing out
   */
  private static broadcastHeartbeat() {
    const ping = `:keepalive ${Date.now()}\n\n`;
    this.clients.forEach((userClients) => {
      userClients.forEach((client) => {
        try {
          client.res.write(ping);
        } catch {
          // ignore closed socket
        }
      });
    });
  }

  /**
   * Return live active connection metrics
   */
  static getStats() {
    let totalConnections = 0;
    this.clients.forEach((set) => {
      totalConnections += set.size;
    });
    return {
      connectedUsers: this.clients.size,
      totalConnections,
    };
  }

  /**
   * Return total count of active SSE subscribers
   */
  static getActiveSubscribersCount(): number {
    return this.getStats().totalConnections;
  }
}
