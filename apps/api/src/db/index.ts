import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { runMigrations, getMigrationStatus } from './migrations/index.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

// Initialize database: test connection and run migrations
export async function initDatabase(): Promise<void> {
  try {
    const client = await pool.connect();

    // Test connection
    const result = await client.query('SELECT NOW() as now');
    logger.info('Database connected', { timestamp: result.rows[0].now });
    client.release();

    // Run migrations
    const statusBefore = await getMigrationStatus(pool);
    if (statusBefore.pending.length > 0) {
      logger.info(`Found ${statusBefore.pending.length} pending migrations`);
    }

    await runMigrations(pool);

    // Seed default data
    await seedDefaultData();

    logger.info('Database initialization complete');
  } catch (error) {
    logger.error('Database initialization failed', { error: (error as Error).message });
    throw error;
  }
}

// Seed default family and categories if they don't exist
async function seedDefaultData(): Promise<void> {
  const client = await pool.connect();

  try {
    // Seed default family if it doesn't exist
    const defaultFamilyName = 'Familjen Wiesel';
    const existingFamily = await client.query(
      'SELECT id FROM families WHERE name = $1',
      [defaultFamilyName]
    );

    if (existingFamily.rows.length === 0) {
      // Use bcrypt to hash the default password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash('password', 10);

      await client.query(
        'INSERT INTO families (name, password_hash) VALUES ($1, $2)',
        [defaultFamilyName, passwordHash]
      );
      logger.info('Default family created', { name: defaultFamilyName });
    }

    // Seed grocery categories
    const categories = [
      { name: 'produce', icon: '🥬', sort_order: 1 },
      { name: 'dairy', icon: '🥛', sort_order: 2 },
      { name: 'meat', icon: '🥩', sort_order: 3 },
      { name: 'bakery', icon: '🍞', sort_order: 4 },
      { name: 'frozen', icon: '🧊', sort_order: 5 },
      { name: 'beverages', icon: '🥤', sort_order: 6 },
      { name: 'snacks', icon: '🍿', sort_order: 7 },
      { name: 'household', icon: '🧹', sort_order: 8 },
      { name: 'pet', icon: '🐕', sort_order: 9 },
      { name: 'other', icon: '📦', sort_order: 10 },
    ];

    for (const category of categories) {
      const existingCategory = await client.query(
        'SELECT id FROM grocery_categories WHERE name = $1',
        [category.name]
      );

      if (existingCategory.rows.length === 0) {
        await client.query(
          'INSERT INTO grocery_categories (name, icon, sort_order) VALUES ($1, $2, $3)',
          [category.name, category.icon, category.sort_order]
        );
      }
    }
  } finally {
    client.release();
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
