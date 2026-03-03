-- Migration: 024_add_sms_credits
-- Description: Add SMS credits system - balance tracking, purchase history, and message log

-- SMS credit balance per madrasah
CREATE TABLE IF NOT EXISTS sms_credits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  total_purchased INT NOT NULL DEFAULT 0,
  total_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_madrasah (madrasah_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase history
CREATE TABLE IF NOT EXISTS sms_credit_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  credits INT NOT NULL,
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  purchased_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Individual SMS message log
CREATE TABLE IF NOT EXISTS sms_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  student_id INT NULL,
  to_phone VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  message_type ENUM('fee_reminder', 'custom', 'announcement') DEFAULT 'custom',
  status ENUM('queued', 'sent', 'delivered', 'failed', 'undelivered') DEFAULT 'queued',
  twilio_sid VARCHAR(50) NULL,
  error_message VARCHAR(255) NULL,
  credits_used INT NOT NULL DEFAULT 1,
  sent_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  INDEX idx_madrasah_type (madrasah_id, message_type),
  INDEX idx_madrasah_created (madrasah_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO migrations (name) VALUES ('024_add_sms_credits.sql')
ON DUPLICATE KEY UPDATE name = name;
