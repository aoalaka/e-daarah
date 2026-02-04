-- Migration: 002_add_soft_deletes
-- Created: 2026-02-04
-- Description: Add soft delete columns to critical tables for data protection

-- Madrasahs table
ALTER TABLE madrasahs ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_madrasahs_deleted_at ON madrasahs(deleted_at);

-- Users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- Students table
ALTER TABLE students ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_students_deleted_at ON students(deleted_at);

-- Attendance table
ALTER TABLE attendance ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_attendance_deleted_at ON attendance(deleted_at);

-- Exam performance table
ALTER TABLE exam_performance ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_exam_performance_deleted_at ON exam_performance(deleted_at);

-- Classes table (also important)
ALTER TABLE classes ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_classes_deleted_at ON classes(deleted_at);

-- Sessions table
ALTER TABLE sessions ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_sessions_deleted_at ON sessions(deleted_at);

-- Semesters table
ALTER TABLE semesters ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_semesters_deleted_at ON semesters(deleted_at);

-- Record this migration
INSERT INTO migrations (name) VALUES ('002_add_soft_deletes');
