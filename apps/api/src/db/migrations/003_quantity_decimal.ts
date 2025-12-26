import { PoolClient } from 'pg';
import { Migration } from './index.js';

export const migration003: Migration = {
    version: 3,
    name: 'quantity_to_decimal',

    up: async (client: PoolClient) => {
        // Change quantity from INTEGER to DECIMAL(10,2) to support decimal quantities
        // like 0.5 kg, 2.5 dl, etc.
        await client.query(`
            ALTER TABLE groceries 
            ALTER COLUMN quantity TYPE DECIMAL(10,2) 
            USING quantity::DECIMAL(10,2)
        `);

        // Update default to 1.00
        await client.query(`
            ALTER TABLE groceries 
            ALTER COLUMN quantity SET DEFAULT 1.00
        `);
    },

    down: async (client: PoolClient) => {
        // Revert back to INTEGER (will truncate decimals)
        await client.query(`
            ALTER TABLE groceries 
            ALTER COLUMN quantity TYPE INTEGER 
            USING ROUND(quantity)::INTEGER
        `);

        await client.query(`
            ALTER TABLE groceries 
            ALTER COLUMN quantity SET DEFAULT 1
        `);
    },
};
