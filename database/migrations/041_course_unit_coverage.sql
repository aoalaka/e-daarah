-- Lightweight coverage records used when a madrasah has course_tracking_mode = 'class_coverage'.
-- One row per (class, unit, date) instead of per-student. Used to track which units the
-- teacher has actually taught the class, without grades.

CREATE TABLE IF NOT EXISTS course_unit_coverage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  course_id INT NOT NULL,
  unit_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT DEFAULT NULL,
  cohort_period_id INT DEFAULT NULL,
  recorded_by INT NOT NULL COMMENT 'Teacher user_id',
  date DATE NOT NULL,
  notes TEXT DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES course_units(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_cuc_madrasah (madrasah_id, deleted_at),
  INDEX idx_cuc_class_course (class_id, course_id),
  INDEX idx_cuc_unit (unit_id)
);
