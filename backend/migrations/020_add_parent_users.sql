-- Migration 020: Parent Users table for phone-based multi-child login
CREATE TABLE IF NOT EXISTS parent_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_country_code VARCHAR(5) NOT NULL DEFAULT '+64',
  pin_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_phone_madrasah (madrasah_id, phone_country_code, phone),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id)
);
