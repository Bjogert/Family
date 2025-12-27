import { PoolClient } from 'pg';
import { Migration } from './index.js';

export const migration004: Migration = {
    version: 4,
    name: 'add_bulletin_recipient',

    up: async (client: PoolClient) => {
        // Add recipient_id column for private messages to a specific user's wall
        await client.query(`
            ALTER TABLE bulletin_notes 
            ADD COLUMN IF NOT EXISTS recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);

        // Add index for efficient filtering by recipient
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_bulletin_notes_recipient ON bulletin_notes(recipient_id) WHERE recipient_id IS NOT NULL
        `);
    },

    down: async (client: PoolClient) => {
        await client.query(`DROP INDEX IF EXISTS idx_bulletin_notes_recipient`);
        await client.query(`ALTER TABLE bulletin_notes DROP COLUMN IF EXISTS recipient_id`);
    },
};
