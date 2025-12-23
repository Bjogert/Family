-- Add reminder columns to tasks table
-- Run this migration to enable task reminders

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT NULL;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Index for finding tasks that need reminder
CREATE INDEX IF NOT EXISTS idx_tasks_reminder 
ON tasks(reminder_minutes, reminder_sent, due_date, status)
WHERE reminder_minutes IS NOT NULL AND reminder_sent = false;

-- Update any existing tasks to have reminder_sent = false
UPDATE tasks SET reminder_sent = false WHERE reminder_sent IS NULL;
