import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './db/index.js';
import authRoutes from './modules/auth/routes.js';
import familyRoutes from './modules/families/routes.js';
import groceryRoutes from './modules/groceries/routes.js';
import activityRoutes from './modules/activities/routes.js';
import taskRoutes from './modules/tasks/routes.js';
import websocketRoutes from './websocket/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: config.isDev
      ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }
      : true,
  });

  // Register plugins
  await app.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await app.register(cookie, {
    secret: config.sessionSecret,
    parseOptions: {},
  });

  await app.register(websocket, {
    options: { maxPayload: 1048576 }, // 1MB max
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API info endpoint
  app.get('/api', async () => {
    return {
      name: 'Family Hub API',
      version: '0.1.0',
      status: 'running',
    };
  });

  // Initialize database
  await initDatabase();

  // Register module routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(familyRoutes, { prefix: '/api/families' });
  await app.register(groceryRoutes, { prefix: '/api/groceries' });
  await app.register(activityRoutes, { prefix: '/api/activities' });
  await app.register(taskRoutes, { prefix: '/api/tasks' });
  await app.register(websocketRoutes, { prefix: '/api' });
  // TODO: Register in later phases
  // await app.register(calendarRoutes, { prefix: '/api/calendar' });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    // Don't expose internal errors in production
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500 && !config.isDev
      ? 'Internal Server Error'
      : error.message;

    reply.status(statusCode).send({
      error: message,
      statusCode,
    });
  });

  return app;
}
