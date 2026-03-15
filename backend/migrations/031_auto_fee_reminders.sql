-- Migration 031: Auto fee reminder settings per madrasah
-- Allows admins to enable automatic monthly SMS fee reminders to all parents

ALTER TABLE madrasahs ADD COLUMN auto_fee_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE madrasahs ADD COLUMN auto_fee_reminder_message TEXT NULL DEFAULT NULL;
ALTER TABLE madrasahs ADD COLUMN auto_fee_reminder_day TINYINT NOT NULL DEFAULT 1 COMMENT 'Day of month to send (1-28)';
ALTER TABLE madrasahs ADD COLUMN auto_fee_reminder_last_sent DATE NULL DEFAULT NULL;

INSERT INTO migrations (name) VALUES ('031_auto_fee_reminders.sql')
ON DUPLICATE KEY UPDATE name = name;
