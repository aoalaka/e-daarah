-- Multi-Tenant Migration - Part 2 (Continue from existing progress)
-- Adds madrasah_id to all tables and completes the migration
-- Run Date: February 2, 2026

USE madrasah_admin;

SET @default_madrasah_id = (SELECT id FROM madrasahs WHERE slug = 'default');

-- Add madrasah_id to tables if not exists
DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddMadrasahId$$
CREATE PROCEDURE SafeAddMadrasahId(IN table_name VARCHAR(64))
BEGIN
    DECLARE col_exists INT;
    DECLARE fk_name VARCHAR(100);
    
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = table_name 
        AND COLUMN_NAME = 'madrasah_id';
    
    IF col_exists = 0 THEN
        -- Add column
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN madrasah_id INT AFTER id');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
    
    -- Update NULL values (column exists now)
    SET @sql = CONCAT('UPDATE ', table_name, ' SET madrasah_id = ', @default_madrasah_id, ' WHERE madrasah_id IS NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    -- Make NOT NULL
    SET @sql = CONCAT('ALTER TABLE ', table_name, ' MODIFY COLUMN madrasah_id INT NOT NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    -- Add index if not exists
    SET fk_name = CONCAT('fk_', table_name, '_madrasah');
    
    SET @index_sql = CONCAT(
        'SELECT COUNT(*) INTO @idx_exists FROM INFORMATION_SCHEMA.STATISTICS ',
        'WHERE TABLE_SCHEMA = ''madrasah_admin'' ',
        'AND TABLE_NAME = ''', table_name, ''' ',
        'AND INDEX_NAME = ''idx_', table_name, '_madrasah'''
    );
    PREPARE stmt FROM @index_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    IF @idx_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD INDEX idx_', table_name, '_madrasah (madrasah_id)');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
    
    -- Add foreign key if not exists
    SET @fk_sql = CONCAT(
        'SELECT COUNT(*) INTO @fk_exists FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS ',
        'WHERE TABLE_SCHEMA = ''madrasah_admin'' ',
        'AND TABLE_NAME = ''', table_name, ''' ',
        'AND CONSTRAINT_NAME = ''', fk_name, ''' ',
        'AND CONSTRAINT_TYPE = ''FOREIGN KEY'''
    );
    PREPARE stmt FROM @fk_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    IF @fk_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD CONSTRAINT ', fk_name, ' FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add madrasah_id to all relevant tables
CALL SafeAddMadrasahId('sessions');
CALL SafeAddMadrasahId('semesters');
CALL SafeAddMadrasahId('classes');
CALL SafeAddMadrasahId('students');
CALL SafeAddMadrasahId('attendance');
CALL SafeAddMadrasahId('exam_performance');

DROP PROCEDURE IF EXISTS SafeAddMadrasahId;

-- Add user_id columns and migrate teacher_id references
DELIMITER $$

DROP PROCEDURE IF EXISTS MigrateToUserId$$
CREATE PROCEDURE MigrateToUserId()
BEGIN
    DECLARE col_exists INT;
    DECLARE teacher_count INT;
    
    -- Count teachers to verify mapping
    SELECT COUNT(*) INTO teacher_count FROM teachers;
    
    IF teacher_count > 0 THEN
        -- Handle class_teachers table
        SELECT COUNT(*) INTO col_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'madrasah_admin' 
            AND TABLE_NAME = 'class_teachers' 
            AND COLUMN_NAME = 'user_id';
        
        IF col_exists = 0 THEN
            ALTER TABLE class_teachers ADD COLUMN user_id INT AFTER teacher_id;
            
            UPDATE class_teachers ct
            JOIN teachers t ON ct.teacher_id = t.id
            JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci 
                AND u.role = 'teacher'
            SET ct.user_id = u.id;
            
            ALTER TABLE class_teachers 
                ADD INDEX idx_class_teachers_user (user_id),
                MODIFY COLUMN user_id INT NOT NULL;
            
            -- Add foreign key
            SELECT COUNT(*) INTO @fk_exists 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = 'madrasah_admin' 
                AND TABLE_NAME = 'class_teachers' 
                AND CONSTRAINT_NAME = 'fk_class_teachers_user';
            
            IF @fk_exists = 0 THEN
                ALTER TABLE class_teachers 
                ADD CONSTRAINT fk_class_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;
        
        -- Handle attendance table
        SELECT COUNT(*) INTO col_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'madrasah_admin' 
            AND TABLE_NAME = 'attendance' 
            AND COLUMN_NAME = 'user_id';
        
        IF col_exists = 0 THEN
            ALTER TABLE attendance ADD COLUMN user_id INT AFTER teacher_id;
            
            UPDATE attendance a
            JOIN teachers t ON a.teacher_id = t.id
            JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci 
                AND u.role = 'teacher'
            SET a.user_id = u.id;
            
            ALTER TABLE attendance 
                ADD INDEX idx_attendance_user (user_id),
                MODIFY COLUMN user_id INT NOT NULL;
            
            -- Add foreign key
            SELECT COUNT(*) INTO @fk_exists 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = 'madrasah_admin' 
                AND TABLE_NAME = 'attendance' 
                AND CONSTRAINT_NAME = 'fk_attendance_user';
            
            IF @fk_exists = 0 THEN
                ALTER TABLE attendance 
                ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

CALL MigrateToUserId();
DROP PROCEDURE IF EXISTS MigrateToUserId;

-- Drop old teacher_id columns after user_id is populated
DELIMITER $$

DROP PROCEDURE IF EXISTS DropTeacherIdColumns$$
CREATE PROCEDURE DropTeacherIdColumns()
BEGIN
    DECLARE col_exists INT;
    
    -- Drop from class_teachers
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'class_teachers' 
        AND COLUMN_NAME = 'teacher_id';
    
    IF col_exists > 0 THEN
        -- Drop foreign key if exists
        SET @fk_sql = 'ALTER TABLE class_teachers DROP FOREIGN KEY IF EXISTS fk_class_teachers_teacher';
        PREPARE stmt FROM @fk_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        ALTER TABLE class_teachers DROP COLUMN teacher_id;
    END IF;
    
    -- Drop from attendance
    SELECT COUNT(*) INTO col_exists 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'madrasah_admin' 
        AND TABLE_NAME = 'attendance' 
        AND COLUMN_NAME = 'teacher_id';
    
    IF col_exists > 0 THEN
        SET @fk_sql = 'ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_teacher';
        PREPARE stmt FROM @fk_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        
        ALTER TABLE attendance DROP COLUMN teacher_id;
    END IF;
END$$

DELIMITER ;

CALL DropTeacherIdColumns();
DROP PROCEDURE IF EXISTS DropTeacherIdColumns;

-- Drop old tables (after confirming data migration)
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Final verification
SELECT '=== Migration Complete ===' as Status;
SELECT 'Madrasahs' as Entity, COUNT(*) as Count FROM madrasahs
UNION ALL
SELECT 'Users (Total)', COUNT(*) FROM users
UNION ALL
SELECT 'Users (Admins)', COUNT(*) FROM users WHERE role = 'admin'
UNION ALL
SELECT 'Users (Teachers)', COUNT(*) FROM users WHERE role = 'teacher'
UNION ALL
SELECT 'Sessions', COUNT(*) FROM sessions WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Semesters', COUNT(*) FROM semesters WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Students', COUNT(*) FROM students WHERE madrasah_id IS NOT NULL
UNION ALL
SELECT 'Class Teachers', COUNT(*) FROM class_teachers WHERE user_id IS NOT NULL
UNION ALL
SELECT 'Attendance Records', COUNT(*) FROM attendance WHERE user_id IS NOT NULL AND madrasah_id IS NOT NULL;
