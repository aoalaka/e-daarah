-- Multi-Tenant SaaS Database Migration
-- Transforms single-tenant schema to support multiple madrasahs
-- Run Date: February 2, 2026

USE madrasah_admin;

-- Step 1: Create madrasahs table
CREATE TABLE IF NOT EXISTS madrasahs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create unified users table (replaces admins and teachers)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'teacher') NOT NULL,
    staff_id VARCHAR(3) UNIQUE,  -- Only for teachers
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_madrasah_id (madrasah_id),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_staff_id (staff_id),
    CONSTRAINT fk_users_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Insert default madrasah for existing data
INSERT INTO madrasahs (name, slug, is_active, phone, address) 
VALUES (
    'Default Madrasah',
    'default',
    TRUE,
    '000-000-0000',
    'Default Address'
) ON DUPLICATE KEY UPDATE name=name;

-- Get the default madrasah ID (will be 1 if this is first insert)
SET @default_madrasah_id = (SELECT id FROM madrasahs WHERE slug = 'default');

-- Step 4: Migrate existing admins to users table
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role, created_at)
SELECT 
    @default_madrasah_id,
    admins.name as first_name,
    '' as last_name,
    admins.email,
    admins.password,
    'admin' as role,
    admins.created_at
FROM admins
ON DUPLICATE KEY UPDATE users.email=users.email;

-- Step 5: Migrate existing teachers to users table
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role, staff_id, phone, created_at)
SELECT 
    @default_madrasah_id,
    teachers.first_name,
    teachers.last_name,
    teachers.email,
    teachers.password,
    'teacher' as role,
    teachers.staff_id,
    teachers.phone,
    teachers.created_at
FROM teachers
ON DUPLICATE KEY UPDATE users.email=users.email;

-- Step 6: Add madrasah_id to sessions table
-- Check if column exists, add if not
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' AND TABLE_NAME = 'sessions' AND COLUMN_NAME = 'madrasah_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE sessions ADD COLUMN madrasah_id INT AFTER id, ADD INDEX idx_sessions_madrasah (madrasah_id)', 
    'SELECT "Column madrasah_id already exists in sessions"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing sessions with default madrasah
UPDATE sessions SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

-- Make madrasah_id NOT NULL and add foreign key
ALTER TABLE sessions 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_sessions_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 7: Add madrasah_id to semesters table
ALTER TABLE semesters 
ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id,
ADD INDEX idx_semesters_madrasah (madrasah_id);

UPDATE semesters SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

ALTER TABLE semesters 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_semesters_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 8: Add madrasah_id to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id,
ADD INDEX idx_classes_madrasah (madrasah_id);

UPDATE classes SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

ALTER TABLE classes 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_classes_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 9: Add madrasah_id to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id,
ADD INDEX idx_students_madrasah (madrasah_id);

UPDATE students SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

ALTER TABLE students 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_students_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 10: Update class_teachers to reference users table instead of teachers
-- First, create mapping of old teacher IDs to new user IDs
CREATE TEMPORARY TABLE teacher_user_mapping AS
SELECT t.id as old_teacher_id, u.id as new_user_id
FROM teachers t
JOIN users u ON t.email = u.email AND u.role = 'teacher';

-- Add new user_id column to class_teachers
ALTER TABLE class_teachers 
ADD COLUMN IF NOT EXISTS user_id INT AFTER teacher_id,
ADD INDEX idx_class_teachers_user (user_id);

-- Update class_teachers with new user_id based on old teacher_id
UPDATE class_teachers ct
JOIN teacher_user_mapping tum ON ct.teacher_id = tum.old_teacher_id
SET ct.user_id = tum.new_user_id;

-- Drop the temporary mapping table
DROP TEMPORARY TABLE IF EXISTS teacher_user_mapping;

-- Step 11: Update attendance to reference users table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS user_id INT AFTER teacher_id,
ADD INDEX idx_attendance_user (user_id);

-- Create mapping again for attendance update
CREATE TEMPORARY TABLE teacher_user_mapping AS
SELECT t.id as old_teacher_id, u.id as new_user_id
FROM teachers t
JOIN users u ON t.email = u.email AND u.role = 'teacher';

UPDATE attendance a
JOIN teacher_user_mapping tum ON a.teacher_id = tum.old_teacher_id
SET a.user_id = tum.new_user_id;

DROP TEMPORARY TABLE IF EXISTS teacher_user_mapping;

-- Step 12: Add madrasah_id to attendance
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id,
ADD INDEX idx_attendance_madrasah (madrasah_id);

UPDATE attendance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

ALTER TABLE attendance 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_attendance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 13: Add madrasah_id to exam_performance
ALTER TABLE exam_performance 
ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id,
ADD INDEX idx_exam_performance_madrasah (madrasah_id);

UPDATE exam_performance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;

ALTER TABLE exam_performance 
MODIFY COLUMN madrasah_id INT NOT NULL,
ADD CONSTRAINT fk_exam_performance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Step 14: Drop old foreign key constraints referencing teachers table
-- Note: Some constraints may not exist, so we'll handle errors gracefully
SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0;

ALTER TABLE class_teachers DROP FOREIGN KEY IF EXISTS fk_class_teachers_teacher;
ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_teacher;

SET SQL_NOTES=@OLD_SQL_NOTES;

-- Step 15: Now we can safely drop the old admins and teachers tables
-- (After verifying all data has been migrated)
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Step 16: Make user_id NOT NULL in class_teachers and attendance (after migration complete)
ALTER TABLE class_teachers 
MODIFY COLUMN user_id INT NOT NULL,
ADD CONSTRAINT fk_class_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attendance 
MODIFY COLUMN user_id INT NOT NULL,
ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 17: Drop old teacher_id columns (no longer needed)
ALTER TABLE class_teachers DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE attendance DROP COLUMN IF EXISTS teacher_id;

-- Verification queries (comment out if not needed)
SELECT 'Migration Complete!' as Status;
SELECT COUNT(*) as madrasah_count FROM madrasahs;
SELECT COUNT(*) as users_count, role, COUNT(*) as count_by_role FROM users GROUP BY role;
SELECT COUNT(*) as sessions_with_madrasah FROM sessions WHERE madrasah_id IS NOT NULL;
SELECT COUNT(*) as students_with_madrasah FROM students WHERE madrasah_id IS NOT NULL;
