import type { WebSocket } from '@fastify/websocket';
import { logger } from '../utils/logger.js';

interface Client {
  ws: WebSocket;
  familyId: number;
  userId: number | null;
  connectedAt: Date;
}

export class ConnectionManager {
  private clients: Map<WebSocket, Client> = new Map();

  addClient(ws: WebSocket, familyId: number, userId: number | null) {
    const client: Client = {
      ws,
      familyId,
      userId,
      connectedAt: new Date(),
    };
    this.clients.set(ws, client);
    logger.info('WebSocket client connected', {
      familyId,
      userId,
      totalClients: this.clients.size,
    });
  }

  removeClient(ws: WebSocket) {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);
      logger.info('WebSocket client disconnected', {
        familyId: client.familyId,
        userId: client.userId,
        totalClients: this.clients.size,
      });
    }
  }

  getClient(ws: WebSocket): Client | undefined {
    return this.clients.get(ws);
  }

  // Broadcast to all clients in a specific family
  broadcastToFamily(familyId: number, message: object, excludeWs?: WebSocket) {
    let sentCount = 0;
    for (const [ws, client] of this.clients.entries()) {
      if (client.familyId === familyId && ws !== excludeWs && ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          logger.error('Failed to send WebSocket message', {
            error: (error as Error).message,
            familyId: client.familyId,
          });
        }
      }
    }
    return sentCount;
  }

  // Send message to specific client
  sendToClient(ws: WebSocket, message: object) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        logger.error('Failed to send WebSocket message', {
          error: (error as Error).message,
        });
        return false;
      }
    }
    return false;
  }

  // Get stats
  getStats() {
    const familyGroups = new Map<number, number>();
    for (const client of this.clients.values()) {
      const count = familyGroups.get(client.familyId) || 0;
      familyGroups.set(client.familyId, count + 1);
    }

    return {
      totalClients: this.clients.size,
      familyGroups: Array.from(familyGroups.entries()).map(([familyId, count]) => ({
        familyId,
        clientCount: count,
      })),
    };
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
