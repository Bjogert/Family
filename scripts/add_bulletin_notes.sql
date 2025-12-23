-- Migration: Add bulletin notes table
-- Run with: psql -U family_hub -d family_hub -f add_bulletin_notes.sql

-- Bulletin notes table
CREATE TABLE IF NOT EXISTS bulletin_notes (
    id SERIAL PRIMARY KEY,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    list_items JSONB, -- Array of { id, text, isChecked }
    color VARCHAR(20) DEFAULT 'yellow',
    is_pinned BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulletin note assignments (for notifications)
CREATE TABLE IF NOT EXISTS bulletin_note_assignments (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES bulletin_notes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_family ON bulletin_notes(family_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_created_at ON bulletin_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_expires ON bulletin_notes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulletin_assignments_note ON bulletin_note_assignments(note_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_assignments_user ON bulletin_note_assignments(user_id);

-- Confirm
SELECT 'Bulletin notes tables created successfully' as status;
