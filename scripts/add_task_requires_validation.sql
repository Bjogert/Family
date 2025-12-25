-- Add requires_validation column to tasks table
-- This allows parents to validate tasks before points are awarded

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS requires_validation BOOLEAN NOT NULL DEFAULT false;

-- Add index for finding tasks pending validation
CREATE INDEX IF NOT EXISTS idx_tasks_requires_validation ON tasks(requires_validation) WHERE requires_validation = true AND status = 'done';
