import type { SocketStream } from '@fastify/websocket';
import { logger } from '../utils/logger.js';

interface Client {
  connection: SocketStream;
  familyId: number;
  userId: number | null;
  connectedAt: Date;
}

export class ConnectionManager {
  private clients: Map<SocketStream, Client> = new Map();

  addClient(connection: SocketStream, familyId: number, userId: number | null) {
    const client: Client = {
      connection,
      familyId,
      userId,
      connectedAt: new Date(),
    };
    this.clients.set(connection, client);
    logger.info('WebSocket client connected', {
      familyId,
      userId,
      totalClients: this.clients.size,
    });
  }

  removeClient(connection: SocketStream) {
    const client = this.clients.get(connection);
    if (client) {
      this.clients.delete(connection);
      logger.info('WebSocket client disconnected', {
        familyId: client.familyId,
        userId: client.userId,
        totalClients: this.clients.size,
      });
    }
  }

  getClient(connection: SocketStream): Client | undefined {
    return this.clients.get(connection);
  }

  // Broadcast to all clients in a specific family
  broadcastToFamily(familyId: number, message: object, excludeConnection?: SocketStream) {
    let sentCount = 0;
    for (const [connection, client] of this.clients.entries()) {
      const ws = connection.socket;
      if (client.familyId === familyId && connection !== excludeConnection && ws.readyState === ws.OPEN) {
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
  sendToClient(connection: SocketStream, message: object) {
    const ws = connection.socket;
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
