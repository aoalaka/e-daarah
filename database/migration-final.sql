-- Multi-Tenant Migration - Final Simple Version
-- Handles duplicate column/index errors gracefully
-- Run Date: February 2, 2026

USE madrasah_admin;

SET @default_madrasah_id = (SELECT id FROM madrasahs WHERE slug = 'default');

-- Add madrasah_id columns (ignore errors if they exist)
-- Sessions
SET @sql = 'ALTER TABLE sessions ADD COLUMN madrasah_id INT AFTER id';
SET @err = 0;
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='sessions' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "sessions.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE sessions SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE sessions MODIFY COLUMN madrasah_id INT NOT NULL;

-- Semesters
SET @sql = 'ALTER TABLE semesters ADD COLUMN madrasah_id INT AFTER id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='semesters' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "semesters.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE semesters SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE semesters MODIFY COLUMN madrasah_id INT NOT NULL;

-- Classes
SET @sql = 'ALTER TABLE classes ADD COLUMN madrasah_id INT AFTER id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='classes' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "classes.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE classes SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE classes MODIFY COLUMN madrasah_id INT NOT NULL;

-- Students
SET @sql = 'ALTER TABLE students ADD COLUMN madrasah_id INT AFTER id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='students' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "students.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE students SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE students MODIFY COLUMN madrasah_id INT NOT NULL;

-- Attendance
SET @sql = 'ALTER TABLE attendance ADD COLUMN madrasah_id INT AFTER id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "attendance.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE attendance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE attendance MODIFY COLUMN madrasah_id INT NOT NULL;

-- Exam Performance
SET @sql = 'ALTER TABLE exam_performance ADD COLUMN madrasah_id INT AFTER id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND COLUMN_NAME='madrasah_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "exam_performance.madrasah_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE exam_performance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL;
ALTER TABLE exam_performance MODIFY COLUMN madrasah_id INT NOT NULL;

-- Add user_id to class_teachers
SET @sql = 'ALTER TABLE class_teachers ADD COLUMN user_id INT AFTER class_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='class_teachers' AND COLUMN_NAME='user_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "class_teachers.user_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE class_teachers ct
JOIN teachers t ON ct.teacher_id = t.id
JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci AND u.role = 'teacher'
SET ct.user_id = u.id
WHERE ct.user_id IS NULL;

ALTER TABLE class_teachers MODIFY COLUMN user_id INT NOT NULL;

-- Add user_id to attendance
SET @sql = 'ALTER TABLE attendance ADD COLUMN user_id INT AFTER madrasah_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND COLUMN_NAME='user_id';
SET @sql = IF(@err = 0, @sql, 'SELECT "attendance.user_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE attendance a
JOIN teachers t ON a.teacher_id = t.id
JOIN users u ON t.email COLLATE utf8mb4_0900_ai_ci = u.email COLLATE utf8mb4_0900_ai_ci AND u.role = 'teacher'
SET a.user_id = u.id
WHERE a.user_id IS NULL;

ALTER TABLE attendance MODIFY COLUMN user_id INT NOT NULL;

-- Add indexes (check if they exist first)
SET FOREIGN_KEY_CHECKS = 0;

SET @sql = 'CREATE INDEX idx_sessions_madrasah ON sessions(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='sessions' AND INDEX_NAME='idx_sessions_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_semesters_madrasah ON semesters(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='semesters' AND INDEX_NAME='idx_semesters_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_classes_madrasah ON classes(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='classes' AND INDEX_NAME='idx_classes_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_students_madrasah ON students(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='students' AND INDEX_NAME='idx_students_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_attendance_madrasah ON attendance(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND INDEX_NAME='idx_attendance_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_exam_performance_madrasah ON exam_performance(madrasah_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND INDEX_NAME='idx_exam_performance_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_class_teachers_user ON class_teachers(user_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='class_teachers' AND INDEX_NAME='idx_class_teachers_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'CREATE INDEX idx_attendance_user ON attendance(user_id)';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND INDEX_NAME='idx_attendance_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "idx exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add foreign keys (check if they exist first)
SET @sql = 'ALTER TABLE sessions ADD CONSTRAINT fk_sessions_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='sessions' AND CONSTRAINT_NAME='fk_sessions_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE semesters ADD CONSTRAINT fk_semesters_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='semesters' AND CONSTRAINT_NAME='fk_semesters_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE classes ADD CONSTRAINT fk_classes_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='classes' AND CONSTRAINT_NAME='fk_classes_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE students ADD CONSTRAINT fk_students_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='students' AND CONSTRAINT_NAME='fk_students_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE attendance ADD CONSTRAINT fk_attendance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND CONSTRAINT_NAME='fk_attendance_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE exam_performance ADD CONSTRAINT fk_exam_performance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='exam_performance' AND CONSTRAINT_NAME='fk_exam_performance_madrasah';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE class_teachers ADD CONSTRAINT fk_class_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='class_teachers' AND CONSTRAINT_NAME='fk_class_teachers_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE attendance ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND CONSTRAINT_NAME='fk_attendance_user';
SET @sql = IF(@err = 0, @sql, 'SELECT "fk exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- Drop old columns
SET @sql = 'ALTER TABLE class_teachers DROP FOREIGN KEY class_teachers_ibfk_2';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='class_teachers' AND CONSTRAINT_NAME='class_teachers_ibfk_2';
SET @sql = IF(@err > 0, @sql, 'SELECT "fk not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE class_teachers DROP COLUMN teacher_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='class_teachers' AND COLUMN_NAME='teacher_id';
SET @sql = IF(@err > 0, @sql, 'SELECT "teacher_id not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_4';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND CONSTRAINT_NAME='attendance_ibfk_4';
SET @sql = IF(@err > 0, @sql, 'SELECT "fk not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE attendance DROP COLUMN teacher_id';
SELECT COUNT(*) INTO @err FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA='madrasah_admin' AND TABLE_NAME='attendance' AND COLUMN_NAME='teacher_id';
SET @sql = IF(@err > 0, @sql, 'SELECT "teacher_id not found"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old tables
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Verification
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
