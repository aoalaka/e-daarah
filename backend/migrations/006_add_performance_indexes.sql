-- Migration: Add performance indexes
-- Optimizes common query patterns for multi-tenant madrasah system

-- =====================================================
-- STUDENTS table indexes
-- =====================================================

-- Most queries filter by madrasah_id + deleted_at (tenant isolation + soft delete)
CREATE INDEX IF NOT EXISTS idx_students_madrasah_deleted
ON students(madrasah_id, deleted_at);

-- Students by class lookup (class roster, attendance pages)
CREATE INDEX IF NOT EXISTS idx_students_class_madrasah
ON students(class_id, madrasah_id, deleted_at);

-- Student ID lookup within madrasah (enrollment, search)
CREATE INDEX IF NOT EXISTS idx_students_student_id_madrasah
ON students(student_id, madrasah_id);

-- =====================================================
-- USERS table indexes (teachers, admins)
-- =====================================================

-- Role-based queries within madrasah (teacher list, admin check)
CREATE INDEX IF NOT EXISTS idx_users_madrasah_role_deleted
ON users(madrasah_id, role, deleted_at);

-- Email lookup for login (already has unique constraint, but adding for role)
CREATE INDEX IF NOT EXISTS idx_users_email_role
ON users(email, role);

-- Staff ID lookup within madrasah
CREATE INDEX IF NOT EXISTS idx_users_staff_id_madrasah
ON users(staff_id, madrasah_id);

-- =====================================================
-- CLASSES table indexes
-- =====================================================

-- Classes by madrasah (class list, dropdowns)
CREATE INDEX IF NOT EXISTS idx_classes_madrasah_deleted
ON classes(madrasah_id, deleted_at);

-- =====================================================
-- ATTENDANCE table indexes
-- =====================================================

-- Attendance by class and date (daily attendance page)
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
ON attendance(class_id, date, madrasah_id);

-- Attendance by student (student report)
CREATE INDEX IF NOT EXISTS idx_attendance_student_madrasah
ON attendance(student_id, madrasah_id);

-- Attendance by date range for reports
CREATE INDEX IF NOT EXISTS idx_attendance_madrasah_date
ON attendance(madrasah_id, date);

-- Semester-filtered attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_semester
ON attendance(semester_id, class_id);

-- =====================================================
-- EXAM_PERFORMANCE table indexes
-- =====================================================

-- Exam results by student (student report)
CREATE INDEX IF NOT EXISTS idx_exam_student_madrasah
ON exam_performance(student_id, madrasah_id);

-- Exam results by semester (term reports)
CREATE INDEX IF NOT EXISTS idx_exam_semester
ON exam_performance(semester_id, madrasah_id);

-- =====================================================
-- SESSIONS table indexes
-- =====================================================

-- Sessions by madrasah (session list)
CREATE INDEX IF NOT EXISTS idx_sessions_madrasah_deleted
ON sessions(madrasah_id, deleted_at);

-- Active session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_madrasah_active
ON sessions(madrasah_id, is_active);

-- =====================================================
-- SEMESTERS table indexes
-- =====================================================

-- Semesters by session (semester list within session)
CREATE INDEX IF NOT EXISTS idx_semesters_session_deleted
ON semesters(session_id, deleted_at);

-- Active semester lookup
CREATE INDEX IF NOT EXISTS idx_semesters_active
ON semesters(is_active);

-- =====================================================
-- CLASS_TEACHERS table indexes
-- =====================================================

-- Teachers by class (class detail page)
CREATE INDEX IF NOT EXISTS idx_class_teachers_class
ON class_teachers(class_id);

-- Classes by teacher (teacher's classes)
CREATE INDEX IF NOT EXISTS idx_class_teachers_user
ON class_teachers(user_id);

-- =====================================================
-- MADRASAHS table indexes
-- =====================================================

-- Slug lookup (login, public pages)
CREATE INDEX IF NOT EXISTS idx_madrasahs_slug
ON madrasahs(slug);

-- Subscription status queries (billing, access control)
CREATE INDEX IF NOT EXISTS idx_madrasahs_subscription
ON madrasahs(subscription_status, pricing_plan);

-- Trial expiry queries (scheduler, notifications)
CREATE INDEX IF NOT EXISTS idx_madrasahs_trial
ON madrasahs(trial_ends_at, subscription_status);

-- =====================================================
-- SECURITY tables indexes (if migration 005 applied)
-- =====================================================

-- Active sessions by user (session management)
CREATE INDEX IF NOT EXISTS idx_active_sessions_user
ON active_sessions(user_id);

-- Session expiry cleanup
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires
ON active_sessions(expires_at);

-- Security events by user (audit log)
CREATE INDEX IF NOT EXISTS idx_security_events_user
ON security_events(user_id, created_at);

-- Security events by madrasah (admin audit view)
CREATE INDEX IF NOT EXISTS idx_security_events_madrasah
ON security_events(madrasah_id, created_at);
