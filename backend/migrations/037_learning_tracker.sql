-- Learning Tracker: courses, units, and progress tables
-- Also renames enable_quran_tracking → enable_learning_tracker
-- The migration runner skips ER_DUP_FIELDNAME / ER_DUP_KEYNAME errors,
-- so this file is safe to run against a DB that already has some of these columns.

-- 1. Rename the feature flag (copy value, add new column, update, keep old as alias briefly)
ALTER TABLE madrasahs
  ADD COLUMN enable_learning_tracker BOOLEAN NOT NULL DEFAULT TRUE
  AFTER enable_quran_tracking;

UPDATE madrasahs
  SET enable_learning_tracker = enable_quran_tracking;

-- 2. Courses: admin defines a course and pins it to a class
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  class_id INT NOT NULL COMMENT 'Course is pinned to a specific class',
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  colour VARCHAR(7) DEFAULT NULL COMMENT 'Optional hex colour for UI e.g. #4CAF50',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_courses_madrasah (madrasah_id, deleted_at),
  INDEX idx_courses_class (class_id, deleted_at)
);

-- 3. Course units: ordered curriculum items within a course
CREATE TABLE IF NOT EXISTS course_units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  madrasah_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  INDEX idx_units_course (course_id, deleted_at)
);

-- 4. Course progress: teacher records a student's progress on a unit
CREATE TABLE IF NOT EXISTS course_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  course_id INT NOT NULL,
  unit_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT DEFAULT NULL,
  cohort_period_id INT DEFAULT NULL,
  recorded_by INT NOT NULL COMMENT 'Teacher user_id',
  date DATE NOT NULL,
  grade ENUM('Excellent', 'Good', 'Fair', 'Needs Improvement') NOT NULL DEFAULT 'Good',
  passed TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES course_units(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_cp_madrasah (madrasah_id, deleted_at),
  INDEX idx_cp_student (student_id, deleted_at),
  INDEX idx_cp_class (class_id, deleted_at),
  INDEX idx_cp_unit (unit_id, deleted_at),
  INDEX idx_cp_semester (semester_id),
  INDEX idx_cp_cohort_period (cohort_period_id)
);
