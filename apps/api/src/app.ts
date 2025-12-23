import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { initDatabase, pool } from './db/index.js';
import authRoutes from './modules/auth/routes.js';
import familyRoutes from './modules/families/routes.js';
import groceryRoutes from './modules/groceries/routes.js';
import activityRoutes from './modules/activities/routes.js';
import taskRoutes from './modules/tasks/routes.js';
import { bulletinRoutes } from './modules/bulletin/index.js';
import websocketRoutes from './websocket/routes.js';
import { pushRoutes, initializeVapid } from './modules/push/index.js';
import {
  createGoogleCalendarRepository,
  createGoogleCalendarService,
  registerGoogleCalendarRoutes,
} from './modules/googleCalendar/index.js';
import { setCalendarService } from './modules/activities/service.js';

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

  // Security headers - Helmet adds CSP, XSS protection, etc.
  await app.register(helmet, {
    contentSecurityPolicy: config.isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "wss:", "https://accounts.google.com", "https://www.googleapis.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some external resources
  });

  await app.register(websocket, {
    options: { maxPayload: 1048576 }, // 1MB max
  });

  // Rate limiting - protect against brute force and DoS
  await app.register(rateLimit, {
    max: 100, // 100 requests per window
    timeWindow: '1 minute',
    // Stricter limits for auth endpoints (applied via route config)
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

  // Initialize VAPID for push notifications
  initializeVapid();

  // Register module routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(familyRoutes, { prefix: '/api/families' });
  await app.register(groceryRoutes, { prefix: '/api/groceries' });
  await app.register(activityRoutes, { prefix: '/api/activities' });
  await app.register(taskRoutes, { prefix: '/api/tasks' });
  await app.register(bulletinRoutes, { prefix: '/api/bulletin' });
  await app.register(pushRoutes, { prefix: '/api/push' });
  await app.register(websocketRoutes, { prefix: '/api' });

  // Google Calendar integration
  const calendarRepository = createGoogleCalendarRepository(pool);
  const calendarService = createGoogleCalendarService(calendarRepository);

  // Inject calendar service into activity service for syncing
  setCalendarService(calendarService);

  await app.register(
    async (instance) => registerGoogleCalendarRoutes(instance, calendarService),
    { prefix: '/api/calendar' }
  );

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
