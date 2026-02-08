-- Add suspended_at and suspended_reason columns to madrasahs table
-- These are used by the superadmin dashboard to suspend/reactivate madrasahs

ALTER TABLE madrasahs
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT NULL DEFAULT NULL;

-- Record migration
INSERT INTO migrations (name) VALUES ('012_add_suspended_columns.sql')
ON DUPLICATE KEY UPDATE name = name;
