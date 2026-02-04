-- Migration: Add login security columns for account lockout
-- Tracks failed login attempts and lockout status

ALTER TABLE users
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN locked_until TIMESTAMP NULL,
ADD COLUMN last_login_at TIMESTAMP NULL,
ADD COLUMN last_login_ip VARCHAR(45) NULL;

-- Create security_events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  madrasah_id INT NULL,
  event_type ENUM(
    'login_success',
    'login_failed',
    'account_locked',
    'account_unlocked',
    'password_changed',
    'password_reset_requested',
    'password_reset_completed',
    'email_verified',
    'suspicious_activity'
  ) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_security_user (user_id),
  INDEX idx_security_madrasah (madrasah_id),
  INDEX idx_security_type (event_type),
  INDEX idx_security_created (created_at),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE SET NULL
);

-- Create active_sessions table for server-side session tracking
CREATE TABLE IF NOT EXISTS active_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_token (token_hash),
  INDEX idx_sessions_expires (expires_at),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
