-- e-daarah Database Schema (Current)
-- Reflects the full production schema including all applied migrations
-- Compatible with Railway MySQL (database: railway)

CREATE DATABASE IF NOT EXISTS madrasah_admin;
USE madrasah_admin;

-- =====================================================
-- Migrations tracking table
-- =====================================================
CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Madrasahs (Tenants) table
-- =====================================================
CREATE TABLE IF NOT EXISTS madrasahs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    street VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(30),
    phone_country_code VARCHAR(5) DEFAULT '+64',
    email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    -- Billing / Subscription
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    pricing_plan ENUM('trial', 'standard', 'plus', 'enterprise') DEFAULT 'trial',
    subscription_status ENUM('trialing', 'active', 'past_due', 'canceled', 'expired') DEFAULT 'trialing',
    current_period_end TIMESTAMP NULL,
    billing_email VARCHAR(255),
    trial_ends_at TIMESTAMP NULL,
    trial_reminder_sent JSON DEFAULT NULL COMMENT 'JSON tracking which trial reminder emails have been sent',
    -- Verification
    institution_type ENUM('mosque_based', 'independent', 'school_affiliated', 'online', 'other'),
    verification_status ENUM('unverified', 'pending', 'verified', 'flagged', 'rejected') DEFAULT 'unverified',
    student_count_estimate INT,
    verification_document_url VARCHAR(500),
    verification_notes TEXT,
    verified_at TIMESTAMP NULL,
    verified_by INT NULL,
    -- Grade toggles
    enable_dressing_grade BOOLEAN NOT NULL DEFAULT TRUE,
    enable_behavior_grade BOOLEAN NOT NULL DEFAULT TRUE,
    enable_punctuality_grade BOOLEAN NOT NULL DEFAULT TRUE,
    -- Suspension
    suspended_at TIMESTAMP NULL DEFAULT NULL,
    suspended_reason TEXT NULL DEFAULT NULL,
    -- Soft delete
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    INDEX idx_madrasahs_deleted_at (deleted_at),
    INDEX idx_madrasahs_stripe_customer (stripe_customer_id),
    INDEX idx_madrasahs_subscription_status (subscription_status),
    INDEX idx_madrasahs_pricing_plan (pricing_plan),
    INDEX idx_madrasahs_subscription (subscription_status, pricing_plan),
    INDEX idx_madrasahs_trial (trial_ends_at, subscription_status),
    INDEX idx_madrasahs_verification (verification_status, created_at)
);

-- =====================================================
-- Users table (unified admins and teachers)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    phone_country_code VARCHAR(5) DEFAULT '+64',
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    role ENUM('admin', 'teacher') NOT NULL,
    staff_id VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    -- Email verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(64),
    email_verification_expires TIMESTAMP NULL,
    -- Password reset
    reset_token VARCHAR(255) DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    -- Login security
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    -- Soft delete
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_per_madrasah (madrasah_id, email),
    UNIQUE KEY unique_staff_id_per_madrasah (madrasah_id, staff_id),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_role (role),
    INDEX idx_users_deleted_at (deleted_at),
    INDEX idx_users_madrasah_role_deleted (madrasah_id, role, deleted_at),
    INDEX idx_users_email_role (email, role),
    INDEX idx_users_staff_id_madrasah (staff_id, madrasah_id),
    INDEX idx_users_reset_token (reset_token)
);

-- =====================================================
-- Sessions table (Academic Years)
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_active (madrasah_id, is_active),
    INDEX idx_sessions_deleted_at (deleted_at),
    INDEX idx_sessions_madrasah_deleted (madrasah_id, deleted_at)
);

-- =====================================================
-- Semesters table
-- =====================================================
CREATE TABLE IF NOT EXISTS semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_semesters_deleted_at (deleted_at),
    INDEX idx_semesters_session_deleted (session_id, deleted_at),
    INDEX idx_semesters_active (is_active)
);

-- =====================================================
-- Classes table
-- =====================================================
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50),
    school_days JSON COMMENT 'Array of school days, e.g. ["Monday", "Wednesday"]',
    description TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_classes_deleted_at (deleted_at),
    INDEX idx_classes_madrasah_deleted (madrasah_id, deleted_at)
);

-- =====================================================
-- Class-Teacher relationship (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS class_teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_teacher (class_id, user_id),
    INDEX idx_class (class_id),
    INDEX idx_class_teachers_user (user_id)
);

-- =====================================================
-- Students table
-- =====================================================
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(10) NOT NULL,
    gender ENUM('Male', 'Female') NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    student_phone VARCHAR(20),
    student_phone_country_code VARCHAR(5) DEFAULT '+64',
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    class_id INT,
    date_of_birth DATE,
    parent_guardian_name VARCHAR(255),
    parent_guardian_relationship VARCHAR(100),
    parent_guardian_phone VARCHAR(20),
    parent_guardian_phone_country_code VARCHAR(5) DEFAULT '+64',
    notes TEXT,
    parent_access_code VARCHAR(255),
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_id_per_madrasah (madrasah_id, student_id),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_class (class_id),
    INDEX idx_students_deleted_at (deleted_at),
    INDEX idx_students_madrasah_deleted (madrasah_id, deleted_at),
    INDEX idx_students_class_madrasah (class_id, madrasah_id, deleted_at),
    INDEX idx_students_student_id_madrasah (student_id, madrasah_id)
);

-- =====================================================
-- Attendance table
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    present BOOLEAN DEFAULT FALSE,
    absence_reason ENUM('Sick', 'Parent Request', 'School Not Notified', 'Other') DEFAULT NULL,
    dressing_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL,
    behavior_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL,
    punctuality_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL,
    notes TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, class_id, semester_id, date),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_semester (semester_id),
    INDEX idx_date (date),
    INDEX idx_attendance_deleted_at (deleted_at),
    INDEX idx_attendance_class_date (class_id, date, madrasah_id),
    INDEX idx_attendance_student_madrasah (student_id, madrasah_id),
    INDEX idx_attendance_madrasah_date (madrasah_id, date),
    INDEX idx_attendance_semester (semester_id, class_id),
    INDEX idx_attendance_user (user_id)
);

-- =====================================================
-- Exam Performance table
-- =====================================================
CREATE TABLE IF NOT EXISTS exam_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) NOT NULL,
    exam_date DATE,
    notes TEXT,
    is_absent BOOLEAN DEFAULT FALSE,
    absence_reason ENUM('Sick', 'Parent Request', 'School Not Notified', 'Other'),
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_semester (semester_id),
    INDEX idx_exam_performance_deleted_at (deleted_at),
    INDEX idx_exam_student_madrasah (student_id, madrasah_id),
    INDEX idx_exam_semester (semester_id, madrasah_id)
);

-- =====================================================
-- Security Events table (audit logging)
-- =====================================================
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
    INDEX idx_security_events_user (user_id, created_at),
    INDEX idx_security_events_madrasah (madrasah_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE SET NULL
);

-- =====================================================
-- Active Sessions table (server-side session tracking)
-- =====================================================
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

-- =====================================================
-- Super Admins table (platform-level admins)
-- =====================================================
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

-- =====================================================
-- Audit Logs table (tracks all sensitive operations)
-- =====================================================
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

-- =====================================================
-- Platform Settings table (global settings)
-- =====================================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- Default data
-- =====================================================

-- Platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('maintenance_mode', 'false', 'Enable maintenance mode for all madrasahs'),
('allow_registration', 'true', 'Allow new madrasah registrations'),
('default_trial_days', '14', 'Number of trial days for new madrasahs'),
('starter_max_students', '50', 'Max students for starter plan'),
('starter_max_teachers', '3', 'Max teachers for starter plan'),
('professional_max_students', '200', 'Max students for professional plan'),
('professional_max_teachers', '10', 'Max teachers for professional plan')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- Default super admin (password: SuperAdmin123! -- CHANGE IN PRODUCTION)
INSERT INTO super_admins (email, password, first_name, last_name) VALUES
('superadmin@e-daarah.com', '$2a$10$rQnM.DqWoFoEjmYn5.zJxOQz5GjKp5vK5nVn5Qm5K5vK5nVn5Qm5K', 'Super', 'Admin')
ON DUPLICATE KEY UPDATE email = email;

-- Demo madrasah
INSERT INTO madrasahs (name, slug, email, pricing_plan, subscription_status) VALUES
('Demo Madrasah', 'demo', 'admin@demo.madrasah.com', 'trial', 'trialing');

-- Demo admin (password: admin123)
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role) VALUES
(1, 'Admin', 'User', 'admin@madrasah.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin');

-- Demo teacher (password: teacher123)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(1, 'Teacher', 'User', '00001', 'teacher@madrasah.com', '$2a$10$WTB7bxxPl5Mae5soq/wlWeNLQpr9tv0LyGhoivn6z5LS6q79DYH8.', '1234567890', 'teacher');

-- Demo sessions
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(1, '2024-2025', '2024-09-01', '2025-06-30', TRUE),
(1, '2025-2026', '2025-09-01', '2026-06-30', FALSE);

-- Demo semesters
INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(1, 'Fall 2024', '2024-09-01', '2024-12-20', FALSE),
(1, 'Spring 2025', '2025-01-15', '2025-06-30', TRUE),
(2, 'Fall 2025', '2025-09-01', '2025-12-20', FALSE);

-- Demo classes
INSERT INTO classes (madrasah_id, name, grade_level, school_days) VALUES
(1, 'Junior Boys', 'Grade 5-6', '["Monday", "Wednesday", "Friday"]'),
(1, 'Senior Girls', 'Grade 7-8', '["Tuesday", "Thursday"]');

-- Assign teacher to classes
INSERT INTO class_teachers (class_id, user_id) VALUES
(1, 2),
(2, 2);

-- Demo student
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, notes) VALUES
(1, 'Ahmed', 'Ali', '000001', 'Male', 1, 'Fatima Ali', 'Mother', '123494995590', 'Good student');
