import { PoolClient } from 'pg';
import { Migration } from './index.js';

export const migration002: Migration = {
    version: 2,
    name: 'add_is_favorite_to_groceries',

    up: async (client: PoolClient) => {
        // Add is_favorite column to groceries table
        await client.query(`
      ALTER TABLE groceries 
      ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false
    `);
    },

    down: async (client: PoolClient) => {
        // Remove is_favorite column
        await client.query(`
      ALTER TABLE groceries 
      DROP COLUMN IF EXISTS is_favorite
    `);
    },
};
