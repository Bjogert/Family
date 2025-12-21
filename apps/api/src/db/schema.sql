-- Family Hub Database Schema
-- Run this manually or via: psql -U postgres -d family_hub -f schema.sql

-- Sessions table for authentication
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
