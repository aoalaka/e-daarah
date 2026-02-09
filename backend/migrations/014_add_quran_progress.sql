-- Migration 014: Add Quran Progress Tracking
-- Tracks student Hifz (memorization) and Tilawah (recitation) progress

CREATE TABLE IF NOT EXISTS quran_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT NOT NULL,
  user_id INT NOT NULL COMMENT 'Teacher who recorded',
  date DATE NOT NULL,
  type ENUM('memorization_new', 'memorization_revision', 'tilawah') NOT NULL,
  surah_number INT NOT NULL COMMENT '1-114',
  surah_name VARCHAR(50) NOT NULL,
  juz INT DEFAULT NULL COMMENT '1-30',
  ayah_from INT DEFAULT NULL,
  ayah_to INT DEFAULT NULL,
  grade ENUM('Excellent', 'Good', 'Fair', 'Needs Improvement') NOT NULL DEFAULT 'Good',
  notes TEXT,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quran_madrasah (madrasah_id, deleted_at),
  INDEX idx_quran_student (student_id, deleted_at),
  INDEX idx_quran_class_date (class_id, date, deleted_at),
  INDEX idx_quran_semester (semester_id, deleted_at),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Track current position per student (latest surah/juz they're working on)
CREATE TABLE IF NOT EXISTS quran_student_position (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  current_surah_number INT NOT NULL DEFAULT 1,
  current_surah_name VARCHAR(50) NOT NULL DEFAULT 'Al-Fatiha',
  current_juz INT NOT NULL DEFAULT 1,
  current_ayah INT DEFAULT NULL,
  total_surahs_completed INT NOT NULL DEFAULT 0,
  total_juz_completed INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student (madrasah_id, student_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
