-- Add timing option for auto fee reminders (day_of_month or semester_start)
ALTER TABLE madrasahs
  ADD COLUMN auto_fee_reminder_timing ENUM('day_of_month', 'semester_start') NOT NULL DEFAULT 'day_of_month'
  AFTER auto_fee_reminder_day;
