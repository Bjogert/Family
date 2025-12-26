import { PoolClient } from 'pg';
import { Migration } from './index.js';

export const migration001: Migration = {
    version: 1,
    name: 'initial_schema',

    up: async (client: PoolClient) => {
        // Create families table
        await client.query(`
      CREATE TABLE IF NOT EXISTS families (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_families_name ON families(name)`);

        // Create users table
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
        email VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMPTZ,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMPTZ,
        privacy_consent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_login TIMESTAMPTZ,
        UNIQUE(family_id, username)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL`);

        // Create sessions table
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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON sessions(family_id)`);

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

        // Create push_subscriptions table
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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`);

        // Create grocery_categories table
        await client.query(`
      CREATE TABLE IF NOT EXISTS grocery_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(10),
        sort_order INTEGER DEFAULT 0
      )
    `);

        // Create groceries table
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
        await client.query(`CREATE INDEX IF NOT EXISTS idx_groceries_family_id ON groceries(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_groceries_added_by ON groceries(added_by)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_groceries_bought_by ON groceries(bought_by)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_groceries_category ON groceries(category)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_groceries_bought ON groceries(is_bought)`);

        // Create grocery_assignments table
        await client.query(`
      CREATE TABLE IF NOT EXISTS grocery_assignments (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(family_id, user_id)
      )
    `);

        // Create food_preferences table
        await client.query(`
      CREATE TABLE IF NOT EXISTS food_preferences (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        spicy INTEGER DEFAULT 5 CHECK (spicy >= 1 AND spicy <= 10),
        asian INTEGER DEFAULT 5 CHECK (asian >= 1 AND asian <= 10),
        swedish INTEGER DEFAULT 5 CHECK (swedish >= 1 AND swedish <= 10),
        vegetarian INTEGER DEFAULT 3 CHECK (vegetarian >= 1 AND vegetarian <= 10),
        vegan INTEGER DEFAULT 1 CHECK (vegan >= 1 AND vegan <= 10),
        health_conscious INTEGER DEFAULT 5 CHECK (health_conscious >= 1 AND health_conscious <= 10),
        kid_friendly INTEGER DEFAULT 5 CHECK (kid_friendly >= 1 AND kid_friendly <= 10),
        quick_meals INTEGER DEFAULT 5 CHECK (quick_meals >= 1 AND quick_meals <= 10),
        budget_conscious INTEGER DEFAULT 5 CHECK (budget_conscious >= 1 AND budget_conscious <= 10),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(family_id, user_id)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_food_preferences_family_id ON food_preferences(family_id)`);

        // Create dietary_restrictions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS dietary_restrictions (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        restriction VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(family_id, user_id, restriction)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_dietary_restrictions_family_id ON dietary_restrictions(family_id)`);

        // Create weekly_menus table
        await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_menus (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        week_start DATE NOT NULL,
        meals JSONB NOT NULL DEFAULT '[]',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(family_id, week_start)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_weekly_menus_family_id ON weekly_menus(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_weekly_menus_week_start ON weekly_menus(week_start)`);

        // Create calendar_events table
        await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        location VARCHAR(200),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        all_day BOOLEAN DEFAULT false,
        recurrence VARCHAR(50),
        recurrence_end DATE,
        color VARCHAR(20),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_family_id ON calendar_events(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time)`);

        // Create event_participants table
        await client.query(`
      CREATE TABLE IF NOT EXISTS event_participants (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      )
    `);

        // Create tasks table
        await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date TIMESTAMPTZ,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        completed_at TIMESTAMPTZ,
        reminder_minutes INTEGER,
        reminder_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_family_id ON tasks(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(reminder_minutes, reminder_sent, due_date, status) WHERE reminder_minutes IS NOT NULL AND reminder_sent = false`);

        // Create bulletin_notes table
        await client.query(`
      CREATE TABLE IF NOT EXISTS bulletin_notes (
        id SERIAL PRIMARY KEY,
        family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        list_items JSONB,
        color VARCHAR(20) DEFAULT 'yellow',
        is_pinned BOOLEAN DEFAULT false,
        expires_at TIMESTAMPTZ,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_notes_family ON bulletin_notes(family_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_notes_created_at ON bulletin_notes(created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_notes_expires ON bulletin_notes(expires_at) WHERE expires_at IS NOT NULL`);

        // Create bulletin_note_assignments table
        await client.query(`
      CREATE TABLE IF NOT EXISTS bulletin_note_assignments (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL REFERENCES bulletin_notes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(note_id, user_id)
      )
    `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_assignments_note ON bulletin_note_assignments(note_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_assignments_user ON bulletin_note_assignments(user_id)`);

        // Create google_calendar_connections table
        await client.query(`
      CREATE TABLE IF NOT EXISTS google_calendar_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        google_email VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ NOT NULL,
        selected_calendar_ids JSONB DEFAULT '[]',
        family_calendar_id VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    },

    down: async (client: PoolClient) => {
        // Drop tables in reverse order (respecting foreign keys)
        await client.query('DROP TABLE IF EXISTS google_calendar_connections CASCADE');
        await client.query('DROP TABLE IF EXISTS bulletin_note_assignments CASCADE');
        await client.query('DROP TABLE IF EXISTS bulletin_notes CASCADE');
        await client.query('DROP TABLE IF EXISTS tasks CASCADE');
        await client.query('DROP TABLE IF EXISTS event_participants CASCADE');
        await client.query('DROP TABLE IF EXISTS calendar_events CASCADE');
        await client.query('DROP TABLE IF EXISTS weekly_menus CASCADE');
        await client.query('DROP TABLE IF EXISTS dietary_restrictions CASCADE');
        await client.query('DROP TABLE IF EXISTS food_preferences CASCADE');
        await client.query('DROP TABLE IF EXISTS grocery_assignments CASCADE');
        await client.query('DROP TABLE IF EXISTS groceries CASCADE');
        await client.query('DROP TABLE IF EXISTS grocery_categories CASCADE');
        await client.query('DROP TABLE IF EXISTS push_subscriptions CASCADE');
        await client.query('DROP TABLE IF EXISTS user_preferences CASCADE');
        await client.query('DROP TABLE IF EXISTS sessions CASCADE');
        await client.query('DROP TABLE IF EXISTS users CASCADE');
        await client.query('DROP TABLE IF EXISTS families CASCADE');
    },
};
