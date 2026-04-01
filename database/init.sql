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
    pricing_plan ENUM('trial', 'solo', 'standard', 'plus', 'enterprise', 'free') DEFAULT 'trial',
    subscription_status ENUM('trialing', 'active', 'past_due', 'canceled', 'expired') DEFAULT 'trialing',
    current_period_end TIMESTAMP NULL,
    billing_email VARCHAR(255),
    trial_ends_at TIMESTAMP NULL,
    trial_reminder_sent JSON DEFAULT NULL COMMENT 'JSON tracking which trial reminder emails have been sent',
    -- Verification
    institution_type ENUM('mosque_based', 'independent', 'school_affiliated', 'online', 'other', 'quran_focused'),
    verification_status ENUM('unverified', 'pending', 'verified', 'flagged', 'rejected') DEFAULT 'unverified',
    student_count_estimate INT,
    verification_document_url VARCHAR(500),
    verification_notes TEXT,
    verified_at TIMESTAMP NULL,
    verified_by INT NULL,
    -- Feature toggles
    enable_quran_tracking BOOLEAN NOT NULL DEFAULT TRUE,
    enable_learning_tracker BOOLEAN NOT NULL DEFAULT TRUE,
    enable_fee_tracking BOOLEAN NOT NULL DEFAULT TRUE,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fee_tracking_mode ENUM('manual', 'auto') NOT NULL DEFAULT 'manual',
    fee_prorate_mid_period BOOLEAN NOT NULL DEFAULT FALSE,
    -- Grade toggles
    enable_dressing_grade BOOLEAN NOT NULL DEFAULT FALSE,
    enable_behavior_grade BOOLEAN NOT NULL DEFAULT FALSE,
    enable_punctuality_grade BOOLEAN NOT NULL DEFAULT FALSE,
    -- Availability planner
    availability_planner_aware TINYINT(1) NOT NULL DEFAULT 1,
    -- Scheduling mode
    scheduling_mode ENUM('academic', 'cohort') NOT NULL DEFAULT 'academic',
    -- Onboarding
    setup_complete BOOLEAN NOT NULL DEFAULT FALSE,
    -- Auto fee reminders
    auto_fee_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    auto_fee_reminder_message TEXT NULL DEFAULT NULL,
    auto_fee_reminder_day TINYINT NOT NULL DEFAULT 1 COMMENT 'Day of month to send (1-28)',
    auto_fee_reminder_timing ENUM('day_of_month', 'semester_start') NOT NULL DEFAULT 'day_of_month',
    auto_fee_reminder_last_sent DATE NULL DEFAULT NULL,
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
    default_school_days JSON DEFAULT NULL COMMENT 'Default school days for this session e.g. ["Saturday", "Sunday"]',
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
-- Cohorts table (like sessions but multiple can be active)
-- =====================================================
CREATE TABLE IF NOT EXISTS cohorts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    default_school_days JSON DEFAULT NULL COMMENT 'Default school days for this cohort e.g. ["Saturday", "Sunday"]',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_cohorts_madrasah (madrasah_id),
    INDEX idx_cohorts_active (madrasah_id, is_active),
    INDEX idx_cohorts_deleted (madrasah_id, deleted_at)
);

-- =====================================================
-- Cohort Periods table (like semesters, within a cohort)
-- =====================================================
CREATE TABLE IF NOT EXISTS cohort_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cohort_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE,
    INDEX idx_cohort_periods_cohort (cohort_id),
    INDEX idx_cohort_periods_deleted (cohort_id, deleted_at),
    INDEX idx_cohort_periods_active (is_active)
);

-- =====================================================
-- Academic Holidays table
-- =====================================================
CREATE TABLE IF NOT EXISTS academic_holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    session_id INT NULL DEFAULT NULL,
    cohort_id INT NULL DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_holidays_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE,
    INDEX idx_holidays_madrasah (madrasah_id),
    INDEX idx_holidays_session (session_id),
    INDEX idx_holidays_cohort (cohort_id)
);

-- =====================================================
-- Schedule Overrides table
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    session_id INT NULL DEFAULT NULL,
    cohort_id INT NULL DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    school_days JSON DEFAULT NULL,
    is_school_day BOOLEAN NULL DEFAULT NULL COMMENT 'Cohort overrides: TRUE = force school day, FALSE = force non-school day',
    reason VARCHAR(255) NULL DEFAULT NULL COMMENT 'Cohort override reason',
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_overrides_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE,
    INDEX idx_overrides_madrasah (madrasah_id),
    INDEX idx_overrides_session (session_id),
    INDEX idx_overrides_cohort (cohort_id)
);

-- =====================================================
-- Classes table
-- =====================================================
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    cohort_id INT NULL DEFAULT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50),
    school_days JSON COMMENT 'Array of school days, e.g. ["Monday", "Wednesday"]',
    description TEXT,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    CONSTRAINT fk_classes_cohort FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_classes_cohort (cohort_id),
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
    expected_fee DECIMAL(10,2) NULL DEFAULT NULL,
    fee_note VARCHAR(255) NULL DEFAULT NULL,
    enrollment_date DATE NULL DEFAULT NULL,
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
    semester_id INT NULL DEFAULT NULL,
    cohort_period_id INT NULL DEFAULT NULL,
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
    CONSTRAINT fk_attendance_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, class_id, semester_id, date),
    UNIQUE KEY unique_attendance_cohort (student_id, class_id, cohort_period_id, date),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_semester (semester_id),
    INDEX idx_attendance_cohort_period (cohort_period_id),
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
    semester_id INT NULL DEFAULT NULL,
    cohort_period_id INT NULL DEFAULT NULL,
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
    CONSTRAINT fk_exam_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_semester (semester_id),
    INDEX idx_exam_cohort_period (cohort_period_id),
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
-- Announcements table (superadmin broadcasts)
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'success', 'update') DEFAULT 'info',
    target_plans JSON DEFAULT NULL,
    target_madrasah_id INT NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active, expires_at),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    madrasah_id INT NOT NULL,
    dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_dismissal (announcement_id, madrasah_id)
);

-- =====================================================
-- Support Tickets tables
-- =====================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_type ENUM('user', 'super_admin') NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket (ticket_id)
);

CREATE TABLE IF NOT EXISTS teacher_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    teacher_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('available', 'unavailable') NOT NULL DEFAULT 'available',
    reason VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE KEY unique_teacher_date (teacher_id, date),
    INDEX idx_teacher_avail_madrasah_date (madrasah_id, date),
    INDEX idx_teacher_avail_teacher_date (teacher_id, date)
);

-- =====================================================
-- Student applications (enrollment requests from public)
-- =====================================================
CREATE TABLE IF NOT EXISTS student_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female') NOT NULL,
    date_of_birth DATE,
    email VARCHAR(255),
    phone VARCHAR(20),
    phone_country_code VARCHAR(5) DEFAULT '+64',
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    parent_guardian_name VARCHAR(255),
    parent_guardian_relationship VARCHAR(100),
    parent_guardian_phone VARCHAR(20),
    parent_guardian_phone_country_code VARCHAR(5) DEFAULT '+64',
    notes TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejected_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_applications_madrasah_status (madrasah_id, status),
    INDEX idx_applications_rejected_at (rejected_at)
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

-- =====================================================
-- Quran Progress tables (migration 014)
-- =====================================================
CREATE TABLE IF NOT EXISTS quran_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT DEFAULT NULL,
  semester_id INT DEFAULT NULL,
  cohort_period_id INT DEFAULT NULL,
  user_id INT NOT NULL COMMENT 'Teacher who recorded',
  date DATE NOT NULL,
  type ENUM('hifz', 'tilawah', 'revision') NOT NULL,
  surah_number INT NOT NULL COMMENT '1-114',
  surah_name VARCHAR(50) NOT NULL,
  to_surah_number INT DEFAULT NULL COMMENT 'For cross-surah sessions',
  to_surah_name VARCHAR(50) DEFAULT NULL,
  juz INT DEFAULT NULL COMMENT '1-30',
  ayah_from INT DEFAULT NULL,
  ayah_to INT DEFAULT NULL,
  grade ENUM('Excellent', 'Good', 'Fair', 'Needs Improvement') NOT NULL DEFAULT 'Good',
  passed TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quran_madrasah (madrasah_id, deleted_at),
  INDEX idx_quran_student (student_id, deleted_at),
  INDEX idx_quran_class_date (class_id, date, deleted_at),
  INDEX idx_quran_semester (semester_id, deleted_at),
  INDEX idx_quran_cohort_period (cohort_period_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_quran_cohort_period FOREIGN KEY (cohort_period_id) REFERENCES cohort_periods(id) ON DELETE CASCADE
);

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
  tilawah_surah_number INT DEFAULT NULL,
  tilawah_surah_name VARCHAR(50) DEFAULT NULL,
  tilawah_juz INT DEFAULT NULL,
  tilawah_ayah INT DEFAULT NULL,
  revision_surah_number INT DEFAULT NULL,
  revision_surah_name VARCHAR(50) DEFAULT NULL,
  revision_juz INT DEFAULT NULL,
  revision_ayah INT DEFAULT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student (madrasah_id, student_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- =====================================================
-- Courses table (migration 037 — Learning Tracker)
-- =====================================================
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  class_id INT NOT NULL COMMENT 'Course is pinned to a specific class',
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  colour VARCHAR(7) DEFAULT NULL COMMENT 'Optional hex colour for UI e.g. #4CAF50',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  INDEX idx_courses_madrasah (madrasah_id, deleted_at),
  INDEX idx_courses_class (class_id, deleted_at)
);

-- =====================================================
-- Course Units table (migration 037 — Learning Tracker)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  madrasah_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  INDEX idx_units_course (course_id, deleted_at)
);

-- =====================================================
-- Course Progress table (migration 037 — Learning Tracker)
-- =====================================================
CREATE TABLE IF NOT EXISTS course_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  course_id INT NOT NULL,
  unit_id INT NOT NULL,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  semester_id INT DEFAULT NULL,
  cohort_period_id INT DEFAULT NULL,
  recorded_by INT NOT NULL COMMENT 'Teacher user_id',
  date DATE NOT NULL,
  grade ENUM('Excellent', 'Good', 'Fair', 'Needs Improvement') NOT NULL DEFAULT 'Good',
  passed TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT DEFAULT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (unit_id) REFERENCES course_units(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_cp_madrasah (madrasah_id, deleted_at),
  INDEX idx_cp_student (student_id, deleted_at),
  INDEX idx_cp_class (class_id, deleted_at),
  INDEX idx_cp_unit (unit_id, deleted_at),
  INDEX idx_cp_semester (semester_id),
  INDEX idx_cp_cohort_period (cohort_period_id)
);

-- =====================================================
-- Student Promotions table (migration 015)
-- =====================================================
CREATE TABLE IF NOT EXISTS student_promotions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  madrasah_id INT NOT NULL,
  student_id INT NOT NULL,
  from_class_id INT DEFAULT NULL,
  to_class_id INT DEFAULT NULL COMMENT 'NULL means graduated/archived',
  session_id INT DEFAULT NULL COMMENT 'Session during which promotion happened',
  promotion_type ENUM('promoted', 'graduated', 'transferred', 'repeated', 'dropped_out') NOT NULL DEFAULT 'promoted',
  notes TEXT,
  promoted_by INT NOT NULL COMMENT 'User who performed the action',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_promo_madrasah (madrasah_id),
  INDEX idx_promo_student (student_id),
  INDEX idx_promo_session (session_id),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

-- =====================================================
-- Fee Tracking tables (migrations 016, 017, 021)
-- =====================================================
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
  fee_template_id INT NULL DEFAULT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash','bank_transfer','online','other') NOT NULL DEFAULT 'cash',
  reference_note VARCHAR(255) NULL DEFAULT NULL,
  period_label VARCHAR(100) NULL DEFAULT NULL,
  payment_label VARCHAR(100) NULL DEFAULT NULL,
  recorded_by INT NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fp_madrasah (madrasah_id),
  INDEX idx_fp_student (student_id),
  INDEX idx_fp_template (fee_template_id),
  INDEX idx_fp_date (payment_date),
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- =====================================================
-- Parent Users table (migration 020)
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  madrasah_id INT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_country_code VARCHAR(5) DEFAULT '+64',
  access_code_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_parent_student (student_id),
  INDEX idx_parent_madrasah (madrasah_id),
  INDEX idx_parent_phone (phone, madrasah_id)
);

-- =====================================================
-- SMS Credits tables (migration 024)
-- =====================================================
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
);

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
);

CREATE TABLE IF NOT EXISTS sms_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  student_id INT NULL,
  to_phone VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  message_type ENUM('fee_reminder', 'custom', 'announcement') DEFAULT 'custom',
  status ENUM('queued', 'sent', 'delivered', 'failed', 'undelivered') DEFAULT 'queued',
  provider_message_id VARCHAR(50) NULL,
  error_message VARCHAR(255) NULL,
  credits_used INT NOT NULL DEFAULT 1,
  sent_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  INDEX idx_madrasah_type (madrasah_id, message_type),
  INDEX idx_madrasah_created (madrasah_id, created_at DESC)
);

-- =====================================================
-- Fee Schedules table (migration 027)
-- =====================================================
CREATE TABLE IF NOT EXISTS fee_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  madrasah_id INT NOT NULL,
  class_id INT NULL,
  student_id INT NULL,
  billing_cycle ENUM('weekly', 'monthly', 'per_semester', 'per_session') NOT NULL DEFAULT 'per_semester',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_fee_schedules_madrasah (madrasah_id),
  INDEX idx_fee_schedules_class (class_id),
  INDEX idx_fee_schedules_student (student_id)
);

-- =====================================================
-- Mark all migrations as applied (init.sql includes full schema)
-- =====================================================
INSERT INTO migrations (name) VALUES
('001_create_migrations_table'),
('002_add_soft_deletes'),
('003_add_stripe_columns'),
('004_add_trial_reminder_column'),
('005_add_login_security'),
('006_add_performance_indexes'),
('007_add_website_column'),
('008_add_verification_columns'),
('009_fix_verification_enum'),
('010_add_enterprise_plan'),
('010_add_grading_toggles'),
('010_add_parent_access_code'),
('011_add_enterprise_plan'),
('011_add_punctuality_grade'),
('012_add_suspended_columns'),
('013_add_announcements_tickets'),
('014_add_quran_progress'),
('015_add_student_promotions'),
('016_add_fee_tracking'),
('017_add_currency'),
('018_fix_quran_types_and_position'),
('019_add_dropout_promotion_type'),
('020_add_parent_users'),
('021_simplify_fee_tracking'),
('022_add_solo_plan'),
('023_default_grading_off'),
('024_add_sms_credits'),
('025_rename_twilio_sid'),
('026_announcement_target_madrasah'),
('027_auto_fee_tracking'),
('028_add_teacher_availability'),
('029_add_availability_planner_aware'),
('030_student_applications'),
('031_auto_fee_reminders'),
('032_free_quran_tier'),
('033_quran_progress_free_plan'),
('034_quran_position_tracks'),
('035_cross_surah_columns'),
('036_cohort_scheduling'),
('037_learning_tracker'),
('038_setup_complete')
ON DUPLICATE KEY UPDATE name = name;
