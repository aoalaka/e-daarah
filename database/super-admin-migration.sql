-- Super Admin Migration for e-daarah Enterprise
-- Run this after the initial railway-init.sql

-- 1. Create super_admins table (platform-level admins)
CREATE TABLE IF NOT EXISTS super_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Create audit_logs table (tracks all sensitive operations)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36),
    user_type ENUM('super_admin', 'admin', 'teacher', 'parent') NOT NULL,
    user_id INT,
    madrasah_id INT,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_type, user_id),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);

-- 3. Add status tracking columns to madrasahs
ALTER TABLE madrasahs
ADD COLUMN IF NOT EXISTS subscription_plan ENUM('starter', 'professional', 'enterprise') DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_teachers INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT NULL;

-- 4. Create platform_settings table (global settings)
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('maintenance_mode', 'false', 'Enable maintenance mode for all madrasahs'),
('allow_registration', 'true', 'Allow new madrasah registrations'),
('default_trial_days', '14', 'Number of trial days for new madrasahs'),
('starter_max_students', '50', 'Max students for starter plan'),
('starter_max_teachers', '3', 'Max teachers for starter plan'),
('professional_max_students', '200', 'Max students for professional plan'),
('professional_max_teachers', '10', 'Max teachers for professional plan')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- 6. Add email verification columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP NULL;

-- 6b. Add institution type and verification columns to madrasahs table
ALTER TABLE madrasahs
ADD COLUMN IF NOT EXISTS institution_type ENUM('mosque_based', 'independent', 'school_affiliated', 'online', 'other'),
ADD COLUMN IF NOT EXISTS verification_status ENUM('unverified', 'basic_verified', 'fully_verified', 'rejected') DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS student_count_estimate INT,
ADD COLUMN IF NOT EXISTS verification_document_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS verified_by INT NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL;

-- 7. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_madrasah_role ON users(madrasah_id, role);
CREATE INDEX IF NOT EXISTS idx_students_madrasah ON students(madrasah_id);
CREATE INDEX IF NOT EXISTS idx_attendance_madrasah_date ON attendance(madrasah_id, date);

-- 8. Create default super admin (change password immediately!)
-- Password: SuperAdmin123! (bcrypt hash)
INSERT INTO super_admins (email, password, first_name, last_name) VALUES
('superadmin@e-daarah.com', '$2a$10$rQnM.DqWoFoEjmYn5.zJxOQz5GjKp5vK5nVn5Qm5K5vK5nVn5Qm5K', 'Super', 'Admin')
ON DUPLICATE KEY UPDATE email = email;
