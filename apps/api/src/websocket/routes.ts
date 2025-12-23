import type { FastifyPluginAsync } from 'fastify';
import { connectionManager } from './connectionManager.js';
import { logger } from '../utils/logger.js';
import * as authService from '../modules/auth/service.js';

interface WsMessage {
  type: string;
  payload?: unknown;
}

const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  // WebSocket endpoint
  fastify.get('/ws', { websocket: true }, async (connection, request) => {
    // Extract session from cookie
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
      logger.warn('WebSocket connection rejected: no session');
      connection.socket.close(1008, 'Unauthorized');
      return;
    }

    // Validate session and get family/user info
    const session = await authService.validateSession(sessionId);

    if (!session) {
      logger.warn('WebSocket connection rejected: invalid session');
      connection.socket.close(1008, 'Unauthorized');
      return;
    }

    const familyId = session.familyId;
    const userId = session.userId;

    // Add client to connection manager
    connectionManager.addClient(connection, familyId, userId);

    // Send welcome message
    connectionManager.sendToClient(connection, {
      type: 'connected',
      payload: {
        familyId,
        timestamp: new Date().toISOString(),
      },
    });

    // Handle incoming messages
    connection.socket.on('message', (rawMessage: Buffer) => {
      try {
        const message: WsMessage = JSON.parse(rawMessage.toString());

        switch (message.type) {
          case 'ping':
            connectionManager.sendToClient(connection, {
              type: 'pong',
              payload: { timestamp: new Date().toISOString() },
            });
            break;

          case 'subscribe':
            // Future: handle channel subscriptions
            logger.debug('Client subscribed', { channel: message.payload });
            break;

          default:
            logger.warn('Unknown WebSocket message type', { type: message.type });
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', {
          error: (error as Error).message,
        });
      }
    });

    // Handle disconnection
    connection.socket.on('close', () => {
      connectionManager.removeClient(connection);
    });

    connection.socket.on('error', (error: Error) => {
      logger.error('WebSocket error', { error: error.message });
      connectionManager.removeClient(connection);
    });
  });

  // WebSocket stats endpoint (for debugging)
  fastify.get('/ws/stats', async () => {
    return connectionManager.getStats();
  });
};

export default websocketRoutes;
