-- Migration 016: Fee Tracking
-- Adds fee templates, assignments, payments, and feature toggle

ALTER TABLE madrasahs ADD COLUMN enable_fee_tracking BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS fee_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  frequency ENUM('session','semester','monthly','weekly','daily') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ft_madrasah (madrasah_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id)
);

CREATE TABLE IF NOT EXISTS fee_template_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fee_template_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_fti_template (fee_template_id),
  FOREIGN KEY (fee_template_id) REFERENCES fee_templates(id)
);

CREATE TABLE IF NOT EXISTS fee_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  fee_template_id INT NOT NULL,
  class_id INT NULL DEFAULT NULL,
  student_id INT NULL DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fa_madrasah (madrasah_id),
  INDEX idx_fa_template (fee_template_id),
  INDEX idx_fa_class (class_id),
  INDEX idx_fa_student (student_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (fee_template_id) REFERENCES fee_templates(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  fee_template_id INT NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash','bank_transfer','online','other') NOT NULL DEFAULT 'cash',
  reference_note VARCHAR(255) NULL DEFAULT NULL,
  period_label VARCHAR(100) NULL DEFAULT NULL,
  recorded_by INT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fp_madrasah (madrasah_id),
  INDEX idx_fp_student (student_id),
  INDEX idx_fp_template (fee_template_id),
  INDEX idx_fp_date (payment_date),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (fee_template_id) REFERENCES fee_templates(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

INSERT INTO migrations (name) VALUES ('016_add_fee_tracking.sql')
ON DUPLICATE KEY UPDATE name = name;
