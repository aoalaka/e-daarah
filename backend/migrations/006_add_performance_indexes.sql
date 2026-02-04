-- Migration: Add performance indexes
-- Optimizes common query patterns for multi-tenant madrasah system
-- Note: Using DROP INDEX IF EXISTS + CREATE INDEX pattern for MySQL compatibility

-- =====================================================
-- STUDENTS table indexes
-- =====================================================

-- Most queries filter by madrasah_id + deleted_at (tenant isolation + soft delete)
DROP INDEX IF EXISTS idx_students_madrasah_deleted ON students;
CREATE INDEX idx_students_madrasah_deleted ON students(madrasah_id, deleted_at);

-- Students by class lookup (class roster, attendance pages)
DROP INDEX IF EXISTS idx_students_class_madrasah ON students;
CREATE INDEX idx_students_class_madrasah ON students(class_id, madrasah_id, deleted_at);

-- Student ID lookup within madrasah (enrollment, search)
DROP INDEX IF EXISTS idx_students_student_id_madrasah ON students;
CREATE INDEX idx_students_student_id_madrasah ON students(student_id, madrasah_id);

-- =====================================================
-- USERS table indexes (teachers, admins)
-- =====================================================

-- Role-based queries within madrasah (teacher list, admin check)
DROP INDEX IF EXISTS idx_users_madrasah_role_deleted ON users;
CREATE INDEX idx_users_madrasah_role_deleted ON users(madrasah_id, role, deleted_at);

-- Email lookup for login (already has unique constraint, but adding for role)
DROP INDEX IF EXISTS idx_users_email_role ON users;
CREATE INDEX idx_users_email_role ON users(email, role);

-- Staff ID lookup within madrasah
DROP INDEX IF EXISTS idx_users_staff_id_madrasah ON users;
CREATE INDEX idx_users_staff_id_madrasah ON users(staff_id, madrasah_id);

-- =====================================================
-- CLASSES table indexes
-- =====================================================

-- Classes by madrasah (class list, dropdowns)
DROP INDEX IF EXISTS idx_classes_madrasah_deleted ON classes;
CREATE INDEX idx_classes_madrasah_deleted ON classes(madrasah_id, deleted_at);

-- =====================================================
-- ATTENDANCE table indexes
-- =====================================================

-- Attendance by class and date (daily attendance page)
DROP INDEX IF EXISTS idx_attendance_class_date ON attendance;
CREATE INDEX idx_attendance_class_date ON attendance(class_id, date, madrasah_id);

-- Attendance by student (student report)
DROP INDEX IF EXISTS idx_attendance_student_madrasah ON attendance;
CREATE INDEX idx_attendance_student_madrasah ON attendance(student_id, madrasah_id);

-- Attendance by date range for reports
DROP INDEX IF EXISTS idx_attendance_madrasah_date ON attendance;
CREATE INDEX idx_attendance_madrasah_date ON attendance(madrasah_id, date);

-- Semester-filtered attendance queries
DROP INDEX IF EXISTS idx_attendance_semester ON attendance;
CREATE INDEX idx_attendance_semester ON attendance(semester_id, class_id);

-- =====================================================
-- EXAM_PERFORMANCE table indexes
-- =====================================================

-- Exam results by student (student report)
DROP INDEX IF EXISTS idx_exam_student_madrasah ON exam_performance;
CREATE INDEX idx_exam_student_madrasah ON exam_performance(student_id, madrasah_id);

-- Exam results by semester (term reports)
DROP INDEX IF EXISTS idx_exam_semester ON exam_performance;
CREATE INDEX idx_exam_semester ON exam_performance(semester_id, madrasah_id);

-- =====================================================
-- SESSIONS table indexes
-- =====================================================

-- Sessions by madrasah (session list)
DROP INDEX IF EXISTS idx_sessions_madrasah_deleted ON sessions;
CREATE INDEX idx_sessions_madrasah_deleted ON sessions(madrasah_id, deleted_at);

-- Active session lookup
DROP INDEX IF EXISTS idx_sessions_madrasah_active ON sessions;
CREATE INDEX idx_sessions_madrasah_active ON sessions(madrasah_id, is_active);

-- =====================================================
-- SEMESTERS table indexes
-- =====================================================

-- Semesters by session (semester list within session)
DROP INDEX IF EXISTS idx_semesters_session_deleted ON semesters;
CREATE INDEX idx_semesters_session_deleted ON semesters(session_id, deleted_at);

-- Active semester lookup
DROP INDEX IF EXISTS idx_semesters_active ON semesters;
CREATE INDEX idx_semesters_active ON semesters(is_active);

-- =====================================================
-- CLASS_TEACHERS table indexes
-- =====================================================

-- Teachers by class (class detail page)
DROP INDEX IF EXISTS idx_class_teachers_class ON class_teachers;
CREATE INDEX idx_class_teachers_class ON class_teachers(class_id);

-- Classes by teacher (teacher's classes)
DROP INDEX IF EXISTS idx_class_teachers_user ON class_teachers;
CREATE INDEX idx_class_teachers_user ON class_teachers(user_id);

-- =====================================================
-- MADRASAHS table indexes
-- =====================================================

-- Slug lookup (login, public pages)
DROP INDEX IF EXISTS idx_madrasahs_slug ON madrasahs;
CREATE INDEX idx_madrasahs_slug ON madrasahs(slug);

-- Subscription status queries (billing, access control)
DROP INDEX IF EXISTS idx_madrasahs_subscription ON madrasahs;
CREATE INDEX idx_madrasahs_subscription ON madrasahs(subscription_status, pricing_plan);

-- Trial expiry queries (scheduler, notifications)
DROP INDEX IF EXISTS idx_madrasahs_trial ON madrasahs;
CREATE INDEX idx_madrasahs_trial ON madrasahs(trial_ends_at, subscription_status);

-- =====================================================
-- SECURITY tables indexes (if migration 005 applied)
-- These will fail silently if tables don't exist
-- =====================================================

-- Active sessions by user (session management)
DROP INDEX IF EXISTS idx_active_sessions_user ON active_sessions;
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);

-- Session expiry cleanup
DROP INDEX IF EXISTS idx_active_sessions_expires ON active_sessions;
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);

-- Security events by user (audit log)
DROP INDEX IF EXISTS idx_security_events_user ON security_events;
CREATE INDEX idx_security_events_user ON security_events(user_id, created_at);

-- Security events by madrasah (admin audit view)
DROP INDEX IF EXISTS idx_security_events_madrasah ON security_events;
CREATE INDEX idx_security_events_madrasah ON security_events(madrasah_id, created_at);
