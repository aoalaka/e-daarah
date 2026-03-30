-- Add cohort-based scheduling mode alongside existing academic planner
-- Existing madrasahs default to 'academic' mode — zero impact

-- 1. Add scheduling_mode to madrasahs
ALTER TABLE madrasahs
  ADD COLUMN scheduling_mode ENUM('academic', 'cohort') NOT NULL DEFAULT 'academic'
  AFTER availability_planner_aware;

-- 2. Create cohorts table (like sessions but multiple can be active)
CREATE TABLE IF NOT EXISTS cohorts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    default_school_days JSON DEFAULT NULL COMMENT 'Default school days for this cohort e.g. ["Saturday", "Sunday"]',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_cohorts_madrasah (madrasah_id),
    INDEX idx_cohorts_active (madrasah_id, is_active),
    INDEX idx_cohorts_deleted (madrasah_id, deleted_at)
);

-- 3. Create cohort_periods table (like semesters, within a cohort)
CREATE TABLE IF NOT EXISTS cohort_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cohort_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE,
    INDEX idx_cohort_periods_cohort (cohort_id),
    INDEX idx_cohort_periods_deleted (cohort_id, deleted_at),
    INDEX idx_cohort_periods_active (is_active)
);

-- 4. Add cohort_id to classes (nullable — NULL means academic mode)
ALTER TABLE classes
  ADD COLUMN cohort_id INT NULL DEFAULT NULL AFTER madrasah_id,
  ADD INDEX idx_classes_cohort (cohort_id),
  ADD CONSTRAINT fk_classes_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- 5. Add cohort_period_id to attendance + make semester_id nullable for cohort mode
ALTER TABLE attendance
  MODIFY COLUMN semester_id INT NULL DEFAULT NULL,
  ADD COLUMN cohort_period_id INT NULL DEFAULT NULL AFTER semester_id,
  ADD INDEX idx_attendance_cohort_period (cohort_period_id),
  ADD CONSTRAINT fk_attendance_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE,
  ADD UNIQUE KEY unique_attendance_cohort (student_id, class_id, cohort_period_id, date);

-- 6. Add cohort_period_id to exam_performance + make semester_id nullable
ALTER TABLE exam_performance
  MODIFY COLUMN semester_id INT NULL DEFAULT NULL,
  ADD COLUMN cohort_period_id INT NULL DEFAULT NULL AFTER semester_id,
  ADD INDEX idx_exam_cohort_period (cohort_period_id),
  ADD CONSTRAINT fk_exam_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE;

-- 7. Add cohort_period_id to quran_progress + make semester_id nullable
ALTER TABLE quran_progress
  MODIFY COLUMN semester_id INT NULL DEFAULT NULL,
  ADD COLUMN cohort_period_id INT NULL DEFAULT NULL AFTER semester_id,
  ADD INDEX idx_quran_cohort_period (cohort_period_id),
  ADD CONSTRAINT fk_quran_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE;

-- 8. Add cohort_id to academic_holidays (nullable — NULL means session-scoped)
ALTER TABLE academic_holidays
  ADD COLUMN cohort_id INT NULL DEFAULT NULL AFTER session_id,
  ADD INDEX idx_holidays_cohort (cohort_id),
  ADD CONSTRAINT fk_holidays_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;

-- 9. Add cohort_id to schedule_overrides (nullable — NULL means session-scoped)
ALTER TABLE schedule_overrides
  ADD COLUMN cohort_id INT NULL DEFAULT NULL AFTER session_id,
  ADD INDEX idx_overrides_cohort (cohort_id),
  ADD CONSTRAINT fk_overrides_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE;
