import { Pool, PoolClient } from 'pg';
import { logger } from '../../utils/logger.js';

export interface Migration {
    version: number;
    name: string;
    up: (client: PoolClient) => Promise<void>;
    down: (client: PoolClient) => Promise<void>;
}

// Import all migrations
import { migration001 } from './001_initial_schema.js';
import { migration002 } from './002_add_is_favorite.js';
import { migration003 } from './003_quantity_decimal.js';
import { migration004 } from './004_bulletin_recipient.js';

// Register migrations in order
const migrations: Migration[] = [
    migration001,
    migration002,
    migration003,
    migration004,
];

export async function runMigrations(pool: Pool): Promise<void> {
    const client = await pool.connect();

    try {
        // Create migrations tracking table if it doesn't exist
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

        // Get already applied migrations
        const result = await client.query('SELECT version FROM schema_migrations ORDER BY version');
        const appliedVersions = new Set(result.rows.map(r => r.version));

        // Run pending migrations
        for (const migration of migrations) {
            if (!appliedVersions.has(migration.version)) {
                logger.info(`Running migration ${migration.version}: ${migration.name}`);

                await client.query('BEGIN');
                try {
                    await migration.up(client);
                    await client.query(
                        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
                        [migration.version, migration.name]
                    );
                    await client.query('COMMIT');
                    logger.info(`Migration ${migration.version} completed successfully`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    logger.error(`Migration ${migration.version} failed`, { error });
                    throw error;
                }
            }
        }

        logger.info('All migrations completed');
    } finally {
        client.release();
    }
}

export async function rollbackMigration(pool: Pool, targetVersion?: number): Promise<void> {
    const client = await pool.connect();

    try {
        // Get current version
        const result = await client.query(
            'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
        );

        if (result.rows.length === 0) {
            logger.info('No migrations to rollback');
            return;
        }

        const currentVersion = result.rows[0].version;
        const target = targetVersion ?? currentVersion - 1;

        // Rollback migrations in reverse order
        const migrationsToRollback = migrations
            .filter(m => m.version > target && m.version <= currentVersion)
            .sort((a, b) => b.version - a.version);

        for (const migration of migrationsToRollback) {
            logger.info(`Rolling back migration ${migration.version}: ${migration.name}`);

            await client.query('BEGIN');
            try {
                await migration.down(client);
                await client.query(
                    'DELETE FROM schema_migrations WHERE version = $1',
                    [migration.version]
                );
                await client.query('COMMIT');
                logger.info(`Rollback of migration ${migration.version} completed`);
            } catch (error) {
                await client.query('ROLLBACK');
                logger.error(`Rollback of migration ${migration.version} failed`, { error });
                throw error;
            }
        }
    } finally {
        client.release();
    }
}

export async function getMigrationStatus(pool: Pool): Promise<{
    applied: { version: number; name: string; appliedAt: Date }[];
    pending: { version: number; name: string }[];
}> {
    const client = await pool.connect();

    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

        const result = await client.query(
            'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
        );
        const appliedVersions = new Set(result.rows.map(r => r.version));

        return {
            applied: result.rows.map(r => ({
                version: r.version,
                name: r.name,
                appliedAt: r.applied_at,
            })),
            pending: migrations
                .filter(m => !appliedVersions.has(m.version))
                .map(m => ({ version: m.version, name: m.name })),
        };
    } finally {
        client.release();
    }
}
