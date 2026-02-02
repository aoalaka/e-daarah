-- Migration Cleanup - Drop old tables
-- The migration is mostly complete, just need to drop old tables
-- Run Date: February 2, 2026

USE madrasah_admin;

-- Add user_id to exam_performance if not exists
SET @sql = 'ALTER TABLE exam_performance ADD COLUMN user_id INT AFTER madrasah_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND COLUMN_NAME='user_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "exam_performance.user_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Migrate teacher_id to user_id in exam_performance
UPDATE exam_performance ep
JOIN teachers t ON ep.teacher_id = t.id
JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci AND u.role = 'teacher'
SET ep.user_id = u.id
WHERE ep.user_id IS NULL;

ALTER TABLE exam_performance MODIFY COLUMN user_id INT NOT NULL;

-- Add index and foreign key for user_id in exam_performance
SET @sql = 'CREATE INDEX idx_exam_performance_user ON exam_performance(user_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND INDEX_NAME='idx_exam_performance_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE exam_performance ADD CONSTRAINT fk_exam_performance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND CONSTRAINT_NAME='fk_exam_performance_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old foreign key and column from exam_performance
SET @sql = 'ALTER TABLE exam_performance DROP FOREIGN KEY exam_performance_ibfk_3';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND CONSTRAINT_NAME='exam_performance_ibfk_3';
SET @sql = IF(@err > 0, @sql, 'SELECT "fk already dropped"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE exam_performance DROP COLUMN teacher_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND COLUMN_NAME='teacher_id';
SET @sql = IF(@err > 0, @sql, 'SELECT "teacher_id already dropped"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old tables (they're no longer needed)
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Final verification
SELECT '=== Migration Complete! ===' as Status;
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

-- Show madrasahs table
SELECT 'Current Madrasahs:' as Info;
SELECT id, name, slug, is_active FROM madrasahs;

-- Show users table sample
SELECT 'Current Users:' as Info;
SELECT id, madrasah_id, CONCAT(first_name, ' ', last_name) as name, email, role, staff_id FROM users;
