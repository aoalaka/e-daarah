-- Auto attendance alert system: SMS parents whose kids have missed N or more classes
-- in a configurable period (week / month / semester / cohort period).
-- Mirrors the auto fee reminder design — multi-child families get one SMS that names all
-- qualifying children, so we don't waste SMS credits.

ALTER TABLE madrasahs
  ADD COLUMN auto_attendance_alert_enabled BOOLEAN NOT NULL DEFAULT FALSE
  AFTER auto_fee_reminder_last_sent;

ALTER TABLE madrasahs
  ADD COLUMN auto_attendance_alert_period ENUM('weekly', 'monthly', 'semester', 'cohort_period') NOT NULL DEFAULT 'monthly'
  AFTER auto_attendance_alert_enabled;

ALTER TABLE madrasahs
  ADD COLUMN auto_attendance_alert_threshold TINYINT UNSIGNED NOT NULL DEFAULT 3
  AFTER auto_attendance_alert_period;

ALTER TABLE madrasahs
  ADD COLUMN auto_attendance_alert_message TEXT DEFAULT NULL
  AFTER auto_attendance_alert_threshold;

ALTER TABLE madrasahs
  ADD COLUMN auto_attendance_alert_last_sent DATE DEFAULT NULL
  AFTER auto_attendance_alert_message;
