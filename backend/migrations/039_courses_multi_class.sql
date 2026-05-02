-- Allow a course to be assigned to multiple classes via a join table.
-- The legacy courses.class_id column is kept as the "primary class" for backward
-- compatibility but reads should go through course_classes going forward.

CREATE TABLE IF NOT EXISTS course_classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  class_id INT NOT NULL,
  madrasah_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_course_class (course_id, class_id),
  INDEX idx_cc_class (class_id),
  INDEX idx_cc_madrasah (madrasah_id)
);

-- Backfill the join table from the existing one-to-one assignments
INSERT IGNORE INTO course_classes (course_id, class_id, madrasah_id)
SELECT id, class_id, madrasah_id FROM courses WHERE deleted_at IS NULL;
