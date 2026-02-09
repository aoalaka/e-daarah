-- Migration 015: Student Promotion / Rollover History
-- Tracks class changes and graduations over time

CREATE TABLE IF NOT EXISTS student_promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  from_class_id INT DEFAULT NULL,
  to_class_id INT DEFAULT NULL COMMENT 'NULL means graduated/archived',
  session_id INT DEFAULT NULL COMMENT 'Session during which promotion happened',
  promotion_type ENUM('promoted', 'graduated', 'transferred', 'repeated') NOT NULL DEFAULT 'promoted',
  notes TEXT,
  promoted_by INT NOT NULL COMMENT 'User who performed the action',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_promo_madrasah (madrasah_id),
  INDEX idx_promo_student (student_id),
  INDEX idx_promo_session (session_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
