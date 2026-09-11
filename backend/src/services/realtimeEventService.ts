import { Response } from 'express';
import { logger } from '../utils/logger';

export interface SSEClient {
  id: string;
  res: Response;
  requestId?: string;
}

export class RealtimeEventService {
  private static clients: Map<string, SSEClient> = new Map();

  /**
   * Registers a client response stream for Server-Sent Events
   */
  static registerClient(clientId: string, res: Response, requestId?: string): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for instant delivery
    res.flushHeaders();

    // Send initial handshake ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    this.clients.set(clientId, { id: clientId, res, requestId });
    logger.info(`[RealtimeEvents] Client connected: ${clientId} (Subscribed to: ${requestId || 'GLOBAL'})`);

    // Keep connection alive with periodic heartbeat
    const heartbeatTimer = setInterval(() => {
      if (res.writableEnded) {
        clearInterval(heartbeatTimer);
        return;
      }
      res.write(': heartbeat\n\n');
    }, 25000);

    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(heartbeatTimer);
      this.clients.delete(clientId);
      logger.info(`[RealtimeEvents] Client disconnected: ${clientId}`);
    });
  }

  /**
   * Broadcasts an event to all connected clients
   */
  static broadcast(eventType: string, payload: any): void {
    const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    for (const [id, client] of this.clients.entries()) {
      try {
        if (!client.res.writableEnded) {
          client.res.write(`data: ${data}\n\n`);
        }
      } catch (err) {
        logger.warn(`[RealtimeEvents] Failed to write to client ${id}`, err);
        this.clients.delete(id);
      }
    }
  }

  /**
   * Dispatches an event to clients viewing a specific emergency request
   */
  static sendToRequest(requestId: string, eventType: string, payload: any): void {
    const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    for (const [id, client] of this.clients.entries()) {
      if (client.requestId === requestId || !client.requestId) {
        try {
          if (!client.res.writableEnded) {
            client.res.write(`data: ${data}\n\n`);
          }
        } catch (err) {
          logger.warn(`[RealtimeEvents] Failed to write to client ${id}`, err);
          this.clients.delete(id);
        }
      }
    }
  }

  /**
   * Gets current active connection count
   */
  static getActiveClientsCount(): number {
    return this.clients.size;
  }
}
