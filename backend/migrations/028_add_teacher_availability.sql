-- Teacher availability tracking
CREATE TABLE IF NOT EXISTS teacher_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  teacher_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
  reason VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  UNIQUE KEY unique_teacher_date (teacher_id, date)
);

CREATE INDEX idx_teacher_avail_madrasah_date ON teacher_availability(madrasah_id, date);
CREATE INDEX idx_teacher_avail_teacher_date ON teacher_availability(teacher_id, date);

INSERT INTO migrations (name) VALUES ('028_add_teacher_availability');
