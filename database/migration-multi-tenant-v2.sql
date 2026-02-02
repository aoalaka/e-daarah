-- Multi-Tenant SaaS Database Migration (Simplified)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
    INDEX idx_staff_id (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 3: Insert default madrasah for existing data
INSERT IGNORE INTO madrasahs (name, slug, is_active, phone, address) 
VALUES (
    'Default Madrasah',
    'default',
    TRUE,
    '000-000-0000',
    'Default Address'
);

-- Get the default madrasah ID
SET @default_madrasah_id = (SELECT id FROM madrasahs WHERE slug = 'default');

-- Step 4: Migrate existing admins to users table
INSERT IGNORE INTO users (madrasah_id, first_name, last_name, email, password, role, created_at)
SELECT 
    @default_madrasah_id,
    admins.name as first_name,
    '' as last_name,
    admins.email,
    admins.password,
    'admin' as role,
    admins.created_at
FROM admins;

-- Step 5: Migrate existing teachers to users table
INSERT IGNORE INTO users (madrasah_id, first_name, last_name, email, password, role, staff_id, phone, created_at)
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
FROM teachers;

-- Step 6-13: Add madrasah_id to all tables (using dynamic SQL to handle existing columns)
DELIMITER $$

DROP PROCEDURE IF EXISTS AddMadrasahIdColumn$$
CREATE PROCEDURE AddMadrasahIdColumn(IN table_name VARCHAR(64))
BEGIN
    DECLARE col_exists INT;
    
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = table_name 
        AND COLUMN_NAME = 'madrasah_id';
    
    IF col_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN madrasah_id INT AFTER id');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET @sql = CONCAT('UPDATE ', table_name, ' SET madrasah_id = ', @default_madrasah_id, ' WHERE madrasah_id IS NULL');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' MODIFY COLUMN madrasah_id INT NOT NULL');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD INDEX idx_', table_name, '_madrasah (madrasah_id)');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add madrasah_id to all relevant tables
CALL AddMadrasahIdColumn('sessions');
CALL AddMadrasahIdColumn('semesters');
CALL AddMadrasahIdColumn('classes');
CALL AddMadrasahIdColumn('students');
CALL AddMadrasahIdColumn('attendance');
CALL AddMadrasahIdColumn('exam_performance');

DROP PROCEDURE IF EXISTS AddMadrasahIdColumn;

-- Step 14: Add user_id column to class_teachers and attendance (replacing teacher_id)
DELIMITER $$

DROP PROCEDURE IF EXISTS AddUserIdColumn$$
CREATE PROCEDURE AddUserIdColumn()
BEGIN
    DECLARE col_exists INT;
    
    -- Check if user_id exists in class_teachers
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'class_teachers' 
        AND COLUMN_NAME = 'user_id';
    
    IF col_exists = 0 THEN
        ALTER TABLE class_teachers ADD COLUMN user_id INT AFTER teacher_id;
        
        -- Create temporary mapping and update
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_teacher_mapping AS
        SELECT t.id as old_teacher_id, u.id as new_user_id
        FROM teachers t
        JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci AND u.role = 'teacher';
        
        UPDATE class_teachers ct
        JOIN temp_teacher_mapping ttm ON ct.teacher_id = ttm.old_teacher_id
        SET ct.user_id = ttm.new_user_id;
        
        DROP TEMPORARY TABLE IF EXISTS temp_teacher_mapping;
        
        ALTER TABLE class_teachers ADD INDEX idx_class_teachers_user (user_id);
    END IF;
    
    -- Check if user_id exists in attendance
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'attendance' 
        AND COLUMN_NAME = 'user_id';
    
    IF col_exists = 0 THEN
        ALTER TABLE attendance ADD COLUMN user_id INT AFTER teacher_id;
        
        -- Create temporary mapping and update
        CREATE TEMPORARY TABLE IF NOT EXISTS temp_teacher_mapping AS
        SELECT t.id as old_teacher_id, u.id as new_user_id
        FROM teachers t
        JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci AND u.role = 'teacher';
        
        UPDATE attendance a
        JOIN temp_teacher_mapping ttm ON a.teacher_id = ttm.old_teacher_id
        SET a.user_id = ttm.new_user_id;
        
        DROP TEMPORARY TABLE IF EXISTS temp_teacher_mapping;
        
        ALTER TABLE attendance ADD INDEX idx_attendance_user (user_id);
    END IF;
END$$

DELIMITER ;

CALL AddUserIdColumn();
DROP PROCEDURE IF EXISTS AddUserIdColumn;

-- Step 15: Add foreign key constraints (after all data is migrated)
-- Drop existing foreign keys that reference old tables
SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE users 
ADD CONSTRAINT fk_users_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE semesters 
ADD CONSTRAINT fk_semesters_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE classes 
ADD CONSTRAINT fk_classes_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE students 
ADD CONSTRAINT fk_students_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE attendance 
ADD CONSTRAINT fk_attendance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

ALTER TABLE exam_performance 
ADD CONSTRAINT fk_exam_performance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Make user_id NOT NULL and add foreign keys
ALTER TABLE class_teachers 
MODIFY COLUMN user_id INT NOT NULL,
ADD CONSTRAINT fk_class_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attendance 
MODIFY COLUMN user_id INT NOT NULL,
ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- Step 16: Drop old teacher_id columns (after confirming user_id is populated)
DELIMITER $$

DROP PROCEDURE IF EXISTS DropOldColumns$$
CREATE PROCEDURE DropOldColumns()
BEGIN
    DECLARE col_exists INT;
    
    -- Drop teacher_id from class_teachers if it exists
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'class_teachers' 
        AND COLUMN_NAME = 'teacher_id';
    
    IF col_exists > 0 THEN
        ALTER TABLE class_teachers DROP FOREIGN KEY IF EXISTS fk_class_teachers_teacher;
        ALTER TABLE class_teachers DROP COLUMN teacher_id;
    END IF;
    
    -- Drop teacher_id from attendance if it exists
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'attendance' 
        AND COLUMN_NAME = 'teacher_id';
    
    IF col_exists > 0 THEN
        ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_teacher;
        ALTER TABLE attendance DROP COLUMN teacher_id;
    END IF;
END$$

DELIMITER ;

CALL DropOldColumns();
DROP PROCEDURE IF EXISTS DropOldColumns;

-- Step 17: Drop old admins and teachers tables (after all data migrated)
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Verification queries
SELECT 'Migration Complete!' as Status;
SELECT 'Madrasahs:' as Table_Name, COUNT(*) as Count FROM madrasahs
UNION ALL
SELECT 'Users (Admins):', COUNT(*) FROM users WHERE role = 'admin'
UNION ALL
SELECT 'Users (Teachers):', COUNT(*) FROM users WHERE role = 'teacher'
UNION ALL
SELECT 'Sessions with madrasah_id:', COUNT(*) FROM sessions WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Students with madrasah_id:', COUNT(*) FROM students WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Classes with madrasah_id:', COUNT(*) FROM classes WHERE madrasah_id IS NOT NULL;
