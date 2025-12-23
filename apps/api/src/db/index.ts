import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

// Initialize database: test connection and create tables
export async function initDatabase(): Promise<void> {
  try {
    const client = await pool.connect();

    // Test connection
    const result = await client.query('SELECT NOW() as now');
    logger.info('Database connected', { timestamp: result.rows[0].now });

    // Create families table
    await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_families_name ON families(name)
    `);

    // Create users table (with family_id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255),
        display_name VARCHAR(100),
        role VARCHAR(20),
        birthday DATE,
        gender VARCHAR(20),
        avatar_emoji VARCHAR(10),
        color VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        UNIQUE(family_id, username)
      )
    `);

    // Migration: Allow NULL passwords for existing tables
    await client.query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL
    `).catch(() => {
      // Column might already allow nulls, ignore error
    });

    // Migration: Add new columns if they don't exist
    const newColumns = [
      { name: 'role', type: 'VARCHAR(20)' },
      { name: 'birthday', type: 'DATE' },
      { name: 'gender', type: 'VARCHAR(20)' },
      { name: 'avatar_emoji', type: 'VARCHAR(10)' },
      { name: 'color', type: 'VARCHAR(20)' }
    ];

    for (const col of newColumns) {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
      `).catch(() => {
        // Column might already exist, ignore error
      });
    }

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
    `);

    // Create sessions table (with family_id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        user_agent TEXT
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id)
    `);

    // Create user_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        notify_grocery_assigned BOOLEAN DEFAULT true,
        notify_grocery_updated BOOLEAN DEFAULT true,
        notify_calendar_created BOOLEAN DEFAULT true,
        notify_calendar_reminder BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create push_subscriptions table for Web Push notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)
    `);

    // Create grocery_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grocery_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(10),
        sort_order INTEGER DEFAULT 0
      )
    `);

    // Drop old groceries table if it exists
    await client.query(`DROP TABLE IF EXISTS groceries CASCADE`);

    // Create groceries table (with family_id)
    await client.query(`
      CREATE TABLE IF NOT EXISTS groceries (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'other',
        quantity INTEGER DEFAULT 1,
        unit VARCHAR(20),
        is_bought BOOLEAN DEFAULT false,
        added_by INTEGER REFERENCES users(id),
        bought_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        bought_at TIMESTAMPTZ
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_family_id ON groceries(family_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_added_by ON groceries(added_by)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_bought_by ON groceries(bought_by)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_category ON groceries(category)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groceries_bought ON groceries(is_bought)
    `);

    // Seed default family if it doesn't exist
    const defaultFamilyName = 'Familjen Wiesel';
    const existingFamily = await client.query(
      'SELECT id FROM families WHERE name = $1',
      [defaultFamilyName]
    );

    // Import bcrypt for password hashing
    const bcrypt = (await import('bcrypt')).default;

    let familyId: number;
    if (existingFamily.rows.length === 0) {
      const defaultPassword = await bcrypt.hash(config.familyPassword, 10);
      const newFamily = await client.query(
        'INSERT INTO families (name, password_hash) VALUES ($1, $2) RETURNING id',
        [defaultFamilyName, defaultPassword]
      );
      familyId = newFamily.rows[0].id;
      logger.info(`Created family: ${defaultFamilyName}`);
    } else {
      familyId = existingFamily.rows[0].id;
    }

    // Seed default users if they don't exist (no passwords - optional login)

    const users = [
      { username: 'robert', displayName: 'Robert' },
      { username: 'julia', displayName: 'Julia' },
      { username: 'tore', displayName: 'Tore' },
    ];

    for (const user of users) {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE family_id = $1 AND username = $2',
        [familyId, user.username]
      );

      if (existingUser.rows.length === 0) {
        await client.query(
          'INSERT INTO users (family_id, username, password_hash, display_name) VALUES ($1, $2, NULL, $3)',
          [familyId, user.username, user.displayName]
        );
        logger.info(`Created user: ${user.username} in family ${familyId}`);
      }
    }

    // Seed default categories if they don't exist
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

    client.release();
    logger.info('Database schema initialized');
  } catch (error) {
    logger.error('Database initialization failed', { error: (error as Error).message });
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  logger.info('Database pool closed');
}
