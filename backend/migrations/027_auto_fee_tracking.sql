-- Migration 027: Auto Fee Tracking
-- Adds fee_tracking_mode to madrasahs, enrollment_date to students, and fee_schedules table

-- Add fee tracking mode to madrasahs (manual = current behavior, auto = calculated from planner)
ALTER TABLE madrasahs ADD COLUMN fee_tracking_mode ENUM('manual', 'auto') NOT NULL DEFAULT 'manual';

-- Add enrollment_date to students (used for proration in auto mode)
ALTER TABLE students ADD COLUMN enrollment_date DATE NULL DEFAULT NULL;

-- Backfill enrollment_date from created_at for existing students
UPDATE students SET enrollment_date = DATE(created_at) WHERE enrollment_date IS NULL AND created_at IS NOT NULL;

-- Fee schedules: defines how much to charge per class (or per student override)
CREATE TABLE IF NOT EXISTS fee_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  class_id INT NULL,
  student_id INT NULL,
  billing_cycle ENUM('weekly', 'monthly', 'per_semester', 'per_session') NOT NULL DEFAULT 'per_semester',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_fee_schedules_madrasah (madrasah_id),
  INDEX idx_fee_schedules_class (class_id),
  INDEX idx_fee_schedules_student (student_id)
);

-- Prorate option: whether to prorate fees for mid-period enrollment
ALTER TABLE madrasahs ADD COLUMN fee_prorate_mid_period BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO migrations (name) VALUES ('027_auto_fee_tracking.sql')
ON DUPLICATE KEY UPDATE name = name;
