-- Seed Solo Demo Madrasah
-- Solo plan: single teacher managing their own classes (no separate teacher role)
-- Login: admin@solo-demo.com / demo123 at /solo-demo/login
-- Password hash: $2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i

SET FOREIGN_KEY_CHECKS = 0;

-- Clean up existing solo demo data
DELETE FROM exam_performance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM attendance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM class_teachers WHERE class_id IN (SELECT id FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo'));
DELETE FROM students WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM semesters WHERE session_id IN (SELECT id FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo'));
DELETE FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM users WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug = 'solo-demo');
DELETE FROM madrasahs WHERE slug = 'solo-demo';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SOLO DEMO MADRASAH
-- Login: admin@solo-demo.com / demo123
-- Plan: Solo ($5/mo) - 50 students, 0 teachers, 5 classes
-- ============================================================

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Ustadh Idris Classes', 'solo-demo', '12 Main Road', 'Wellington', 'Wellington Region', 'New Zealand', '44001234', 'admin@solo-demo.com', TRUE, 'solo', 'active');
SET @solo_id = LAST_INSERT_ID();

-- Admin (the solo teacher-admin)
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@solo_id, 'Idris', 'Mahmoud', 'admin@solo-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '440001001', 'admin');
SET @solo_admin = LAST_INSERT_ID();

-- Session & Semester
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@solo_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @solo_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@solo_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);
SET @solo_semester = LAST_INSERT_ID();

-- Classes (2)
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@solo_id, 'Quran Memorisation', 'Ages 8-12', '["Tuesday", "Thursday"]', 'Hifdh and revision sessions');
SET @solo_class1 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@solo_id, 'Islamic Foundations', 'Ages 10-14', '["Saturday"]', 'Basic fiqh, seerah, and aqeedah');
SET @solo_class2 = LAST_INSERT_ID();

-- Students (6)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Yusuf', 'Saleh', '300001', 'Male', @solo_class1, '2014-04-10', 'Khadijah Saleh', 'Mother', '440100001');
SET @solo_s1 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Maryam', 'Bakare', '300002', 'Female', @solo_class1, '2015-08-22', 'Aisha Bakare', 'Mother', '440100002');
SET @solo_s2 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Adam', 'Conteh', '300003', 'Male', @solo_class1, '2013-12-05', 'Ibrahim Conteh', 'Father', '440100003');
SET @solo_s3 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Fatima', 'Omar', '300004', 'Female', @solo_class2, '2012-06-18', 'Hassan Omar', 'Father', '440100004');
SET @solo_s4 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Bilal', 'Traore', '300005', 'Male', @solo_class2, '2011-09-30', 'Mariama Traore', 'Mother', '440100005');
SET @solo_s5 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@solo_id, 'Aisha', 'Deen', '300006', 'Female', @solo_class2, '2012-02-14', 'Amina Deen', 'Mother', '440100006');
SET @solo_s6 = LAST_INSERT_ID();

-- Attendance (2 weeks of data)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@solo_id, @solo_s1, @solo_class1, @solo_semester, @solo_admin, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@solo_id, @solo_s2, @solo_class1, @solo_semester, @solo_admin, '2026-01-06', TRUE, 'Excellent', 'Excellent', 'Mashallah'),
(@solo_id, @solo_s3, @solo_class1, @solo_semester, @solo_admin, '2026-01-06', FALSE, NULL, NULL, 'Sick'),
(@solo_id, @solo_s4, @solo_class2, @solo_semester, @solo_admin, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@solo_id, @solo_s5, @solo_class2, @solo_semester, @solo_admin, '2026-01-10', TRUE, 'Fair', 'Good', NULL),
(@solo_id, @solo_s6, @solo_class2, @solo_semester, @solo_admin, '2026-01-10', TRUE, 'Good', 'Excellent', NULL);

INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@solo_id, @solo_s1, @solo_class1, @solo_semester, @solo_admin, '2026-01-13', TRUE, 'Excellent', 'Good', NULL),
(@solo_id, @solo_s2, @solo_class1, @solo_semester, @solo_admin, '2026-01-13', TRUE, 'Good', 'Good', NULL),
(@solo_id, @solo_s3, @solo_class1, @solo_semester, @solo_admin, '2026-01-13', TRUE, 'Good', 'Fair', 'Returned'),
(@solo_id, @solo_s4, @solo_class2, @solo_semester, @solo_admin, '2026-01-17', TRUE, 'Excellent', 'Excellent', NULL),
(@solo_id, @solo_s5, @solo_class2, @solo_semester, @solo_admin, '2026-01-17', FALSE, NULL, NULL, 'Travel'),
(@solo_id, @solo_s6, @solo_class2, @solo_semester, @solo_admin, '2026-01-17', TRUE, 'Good', 'Good', NULL);

-- Exam Performance
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@solo_id, @solo_s1, @solo_semester, @solo_admin, 'Quran Recitation', 88.5, 100, '2026-01-15', 'Strong tajweed'),
(@solo_id, @solo_s2, @solo_semester, @solo_admin, 'Quran Recitation', 92.0, 100, '2026-01-15', 'Excellent memorisation'),
(@solo_id, @solo_s3, @solo_semester, @solo_admin, 'Quran Recitation', 75.0, 100, '2026-01-15', 'Needs more revision'),
(@solo_id, @solo_s4, @solo_semester, @solo_admin, 'Islamic Studies', 85.0, 100, '2026-01-15', NULL),
(@solo_id, @solo_s5, @solo_semester, @solo_admin, 'Islamic Studies', 78.5, 100, '2026-01-15', NULL),
(@solo_id, @solo_s6, @solo_semester, @solo_admin, 'Islamic Studies', 91.0, 100, '2026-01-15', 'Top of class');
