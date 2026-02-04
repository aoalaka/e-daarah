-- Migration: Add trial_reminder_sent column to track email reminders
-- This column stores JSON with sent reminder timestamps

ALTER TABLE madrasahs
ADD COLUMN trial_reminder_sent JSON DEFAULT NULL
COMMENT 'JSON tracking which trial reminder emails have been sent (e.g., {"day_7": "2024-01-01T00:00:00Z"})';
