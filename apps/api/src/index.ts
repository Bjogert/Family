import { buildApp } from './app.js';
import { config } from './config.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Family Hub API running`, {
      port: config.port,
      env: config.nodeEnv,
      url: `http://localhost:${config.port}`,
    });
  } catch (err) {
    logger.error('Failed to start server', { error: (err as Error).message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  process.exit(0);
});

start();
