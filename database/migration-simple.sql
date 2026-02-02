-- Multi-Tenant Migration - Simple Direct Approach
-- Run Date: February 2, 2026

USE madrasah_admin;

SET @default_madrasah_id = (SELECT id FROM madrasahs WHERE slug = 'default');

-- Sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE sessions SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE sessions MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_madrasah ON sessions(madrasah_id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Semesters table
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE semesters SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE semesters MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_semesters_madrasah ON semesters(madrasah_id);
ALTER TABLE semesters ADD CONSTRAINT fk_semesters_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE classes SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE classes MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classes_madrasah ON classes(madrasah_id);
ALTER TABLE classes ADD CONSTRAINT fk_classes_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE students SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE students MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_madrasah ON students(madrasah_id);
ALTER TABLE students ADD CONSTRAINT fk_students_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE attendance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE attendance MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_madrasah ON attendance(madrasah_id);
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Exam Performance table
ALTER TABLE exam_performance ADD COLUMN IF NOT EXISTS madrasah_id INT AFTER id;
UPDATE exam_performance SET madrasah_id = @default_madrasah_id WHERE madrasah_id IS NULL OR madrasah_id = 0;
ALTER TABLE exam_performance MODIFY COLUMN madrasah_id INT NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exam_performance_madrasah ON exam_performance(madrasah_id);
ALTER TABLE exam_performance ADD CONSTRAINT fk_exam_performance_madrasah FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE;

-- Add user_id to class_teachers
ALTER TABLE class_teachers ADD COLUMN IF NOT EXISTS user_id INT AFTER class_id;

UPDATE class_teachers ct
JOIN teachers t ON ct.teacher_id = t.id
JOIN users u ON t.email = u.email AND u.role = 'teacher'
SET ct.user_id = u.id
WHERE ct.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_class_teachers_user ON class_teachers(user_id);
ALTER TABLE class_teachers MODIFY COLUMN user_id INT NOT NULL;
ALTER TABLE class_teachers ADD CONSTRAINT fk_class_teachers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to attendance
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS user_id INT AFTER madrasah_id;

UPDATE attendance a
JOIN teachers t ON a.teacher_id = t.id
JOIN users u ON t.email = u.email AND u.role = 'teacher'
SET a.user_id = u.id
WHERE a.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);
ALTER TABLE attendance MODIFY COLUMN user_id INT NOT NULL;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop old foreign keys and teacher_id columns
ALTER TABLE class_teachers DROP FOREIGN KEY IF EXISTS fk_class_teachers_teacher;
ALTER TABLE class_teachers DROP COLUMN IF EXISTS teacher_id;

ALTER TABLE attendance DROP FOREIGN KEY IF EXISTS fk_attendance_teacher;
ALTER TABLE attendance DROP COLUMN IF EXISTS teacher_id;

-- Drop old tables
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS teachers;

-- Verification
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
