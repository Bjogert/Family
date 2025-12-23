-- Add password reset columns to families table
ALTER TABLE families ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE families ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;
