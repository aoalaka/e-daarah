-- Seed Three Demo Madrasahs: Standard, Plus, Enterprise
-- Each has an admin, teachers, classes, students, attendance, and exam data
-- All passwords are 'demo123'
-- Password hash: $2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i
-- Compatible with Railway MySQL (database: railway)
-- Key schema notes:
--   class_teachers uses user_id (not teacher_id)
--   attendance uses user_id (not teacher_id)
--   exam_performance uses user_id (not teacher_id)
--   students uses parent_guardian_* (not next_of_kin_*)
--   Each INSERT uses SET @var = LAST_INSERT_ID() immediately

-- Clean up existing demo plan data (safe to re-run)
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM exam_performance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM attendance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM class_teachers WHERE class_id IN (SELECT id FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo')));
DELETE FROM students WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM semesters WHERE session_id IN (SELECT id FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo')));
DELETE FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM users WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. STANDARD DEMO MADRASAH
-- Login: admin@standard-demo.com / demo123 at /standard-demo/login
-- Plan: Standard ($12/mo) - 100 students, 20 teachers, 10 classes
-- ============================================================

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Al-Noor Weekend School', 'standard-demo', '55 Hobson Street', 'Auckland', 'Auckland Region', 'New Zealand', '93001234', 'admin@standard-demo.com', TRUE, 'standard', 'active');
SET @std_id = LAST_INSERT_ID();

-- Admin
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@std_id, 'Yusuf', 'Rahman', 'admin@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211001001', 'admin');

-- Teacher
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@std_id, 'Ustadh', 'Bilal', '10001', 'teacher@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211001002', 'teacher');
SET @std_teacher = (SELECT id FROM users WHERE email = 'teacher@standard-demo.com' AND madrasah_id = @std_id);

-- Session & Semester
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@std_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @std_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@std_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);
SET @std_semester = LAST_INSERT_ID();

-- Classes (2)
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@std_id, 'Quran Basics', 'Grade 3-5', '["Saturday"]', 'Weekend Quran class for beginners');
SET @std_class1 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@std_id, 'Islamic Studies', 'Grade 5-7', '["Saturday"]', 'Fiqh and Seerah');
SET @std_class2 = LAST_INSERT_ID();

INSERT INTO class_teachers (class_id, user_id) VALUES
(@std_class1, @std_teacher),
(@std_class2, @std_teacher);

-- Students (8)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Ibrahim', 'Khan', '200001', 'Male', @std_class1, '2015-03-12', 'Amina Khan', 'Mother', '221100001');
SET @std_s1 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Zara', 'Ahmed', '200002', 'Female', @std_class1, '2014-07-22', 'Sara Ahmed', 'Mother', '221100002');
SET @std_s2 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Nuh', 'Patel', '200003', 'Male', @std_class1, '2015-11-08', 'Ismail Patel', 'Father', '221100003');
SET @std_s3 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Amira', 'Hussain', '200004', 'Female', @std_class1, '2014-01-19', 'Fatima Hussain', 'Mother', '221100004');
SET @std_s4 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Suleiman', 'Osman', '200005', 'Male', @std_class2, '2013-05-25', 'Mariam Osman', 'Mother', '221100005');
SET @std_s5 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Halima', 'Diallo', '200006', 'Female', @std_class2, '2012-09-14', 'Kadija Diallo', 'Mother', '221100006');
SET @std_s6 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Dawud', 'Sharif', '200007', 'Male', @std_class2, '2013-08-30', 'Noor Sharif', 'Father', '221100007');
SET @std_s7 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@std_id, 'Safiya', 'Noor', '200008', 'Female', @std_class2, '2012-12-05', 'Hassan Noor', 'Father', '221100008');
SET @std_s8 = LAST_INSERT_ID();

-- Attendance (Saturdays for 3 weeks)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@std_id, @std_s1, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s2, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Excellent', 'Excellent', 'Mashallah'),
(@std_id, @std_s3, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Fair', 'Late'),
(@std_id, @std_s4, @std_class1, @std_semester, @std_teacher, '2026-01-03', FALSE, NULL, NULL, 'Sick'),
(@std_id, @std_s5, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s6, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Excellent', NULL),
(@std_id, @std_s7, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Fair', 'Good', NULL),
(@std_id, @std_s8, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL);

INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@std_id, @std_s1, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Excellent', 'Good', NULL),
(@std_id, @std_s2, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Excellent', 'Excellent', NULL),
(@std_id, @std_s3, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', 'Improved'),
(@std_id, @std_s4, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', 'Back from illness'),
(@std_id, @std_s5, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s6, @std_class2, @std_semester, @std_teacher, '2026-01-10', FALSE, NULL, NULL, 'Family trip'),
(@std_id, @std_s7, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Fair', 'Distracted'),
(@std_id, @std_s8, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', NULL);

INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@std_id, @std_s1, @std_class1, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Good', 'Excellent', NULL),
(@std_id, @std_s2, @std_class1, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Excellent', 'Good', NULL),
(@std_id, @std_s3, @std_class1, @std_semester, @std_teacher, '2026-01-17', FALSE, NULL, NULL, 'Holiday'),
(@std_id, @std_s4, @std_class1, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s5, @std_class2, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Excellent', 'Excellent', 'Great day'),
(@std_id, @std_s6, @std_class2, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s7, @std_class2, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s8, @std_class2, @std_semester, @std_teacher, '2026-01-17', TRUE, 'Excellent', 'Good', NULL);

-- Exams
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@std_id, @std_s1, @std_semester, @std_teacher, 'Surah Al-Fatiha Recitation', 85.0, 100, '2026-01-15', 'Good effort'),
(@std_id, @std_s2, @std_semester, @std_teacher, 'Surah Al-Fatiha Recitation', 92.0, 100, '2026-01-15', 'Excellent tajweed'),
(@std_id, @std_s3, @std_semester, @std_teacher, 'Surah Al-Fatiha Recitation', 72.5, 100, '2026-01-15', 'Needs practice'),
(@std_id, @std_s4, @std_semester, @std_teacher, 'Surah Al-Fatiha Recitation', 88.0, 100, '2026-01-15', 'Very good'),
(@std_id, @std_s5, @std_semester, @std_teacher, 'Fiqh of Salah Test', 78.0, 100, '2026-01-15', 'Good understanding'),
(@std_id, @std_s6, @std_semester, @std_teacher, 'Fiqh of Salah Test', 91.0, 100, '2026-01-15', 'Excellent'),
(@std_id, @std_s7, @std_semester, @std_teacher, 'Fiqh of Salah Test', 65.0, 100, '2026-01-15', 'Needs revision'),
(@std_id, @std_s8, @std_semester, @std_teacher, 'Fiqh of Salah Test', 82.5, 100, '2026-01-15', 'Good');


-- ============================================================
-- 2. PLUS DEMO MADRASAH
-- Login: admin@plus-demo.com / demo123 at /plus-demo/login
-- Plan: Plus ($29/mo) - 500 students, 50 teachers, unlimited classes
-- ============================================================

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Baitul Ilm Academy', 'plus-demo', '120 Queen Street', 'Wellington', 'Wellington Region', 'New Zealand', '94001234', 'admin@plus-demo.com', TRUE, 'plus', 'active');
SET @plus_id = LAST_INSERT_ID();

-- Admin
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@plus_id, 'Fatima', 'Al-Rashid', 'admin@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001001', 'admin');

-- Teachers (3)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@plus_id, 'Ustadh', 'Hamza', '20001', 'teacher1@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001002', 'teacher');
SET @plus_t1 = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@plus_id, 'Ustadha', 'Zaynab', '20002', 'teacher2@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001003', 'teacher');
SET @plus_t2 = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@plus_id, 'Ustadh', 'Khalid', '20003', 'teacher3@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001004', 'teacher');
SET @plus_t3 = LAST_INSERT_ID();

-- Session & Semester
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@plus_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @plus_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@plus_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);
SET @plus_semester = LAST_INSERT_ID();

-- Classes (4)
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@plus_id, 'Hifz Program - Boys', 'Grade 5-8', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Daily Quran memorization');
SET @plus_c1 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@plus_id, 'Hifz Program - Girls', 'Grade 5-8', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Daily Quran memorization');
SET @plus_c2 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@plus_id, 'Arabic Language', 'Grade 6-9', '["Monday", "Wednesday", "Friday"]', 'Comprehensive Arabic');
SET @plus_c3 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@plus_id, 'Islamic Sciences', 'Grade 7-10', '["Tuesday", "Thursday"]', 'Aqeedah, Fiqh, Hadith, Tafseer');
SET @plus_c4 = LAST_INSERT_ID();

INSERT INTO class_teachers (class_id, user_id) VALUES
(@plus_c1, @plus_t1),
(@plus_c2, @plus_t2),
(@plus_c3, @plus_t1),
(@plus_c4, @plus_t3);

-- Students (16)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Muhammad', 'Farooq', '300001', 'Male', @plus_c1, '2013-02-14', 'Aisha Farooq', 'Mother', '222100001');
SET @plus_s1 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Usman', 'Qureshi', '300002', 'Male', @plus_c1, '2012-06-28', 'Zainab Qureshi', 'Mother', '222100002');
SET @plus_s2 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Talha', 'Siddiqui', '300003', 'Male', @plus_c1, '2013-09-03', 'Bilal Siddiqui', 'Father', '222100003');
SET @plus_s3 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Anas', 'Malik', '300004', 'Male', @plus_c1, '2012-11-17', 'Hafsa Malik', 'Mother', '222100004');
SET @plus_s4 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Ruqayyah', 'Hassan', '300005', 'Female', @plus_c2, '2013-04-10', 'Sumayyah Hassan', 'Mother', '222100005');
SET @plus_s5 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Asma', 'Ibrahim', '300006', 'Female', @plus_c2, '2012-08-22', 'Yusuf Ibrahim', 'Father', '222100006');
SET @plus_s6 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Hana', 'Omar', '300007', 'Female', @plus_c2, '2013-01-30', 'Khadija Omar', 'Mother', '222100007');
SET @plus_s7 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Sumayya', 'Ali', '300008', 'Female', @plus_c2, '2012-12-15', 'Nadia Ali', 'Mother', '222100008');
SET @plus_s8 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Idris', 'Mohammed', '300009', 'Male', @plus_c3, '2012-03-20', 'Layla Mohammed', 'Mother', '222100009');
SET @plus_s9 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Mariam', 'Yusuf', '300010', 'Female', @plus_c3, '2011-07-14', 'Ahmad Yusuf', 'Father', '222100010');
SET @plus_s10 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Zakariya', 'Rahman', '300011', 'Male', @plus_c3, '2012-05-09', 'Noor Rahman', 'Mother', '222100011');
SET @plus_s11 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Nadia', 'Bakr', '300012', 'Female', @plus_c3, '2011-10-28', 'Abu Bakr', 'Father', '222100012');
SET @plus_s12 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Yaqub', 'Saleh', '300013', 'Male', @plus_c4, '2011-01-18', 'Fatima Saleh', 'Mother', '222100013');
SET @plus_s13 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Layla', 'Abdulrahman', '300014', 'Female', @plus_c4, '2010-09-05', 'Sara Abdulrahman', 'Mother', '222100014');
SET @plus_s14 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Muadh', 'Tariq', '300015', 'Male', @plus_c4, '2011-06-12', 'Amina Tariq', 'Mother', '222100015');
SET @plus_s15 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@plus_id, 'Huda', 'Nasir', '300016', 'Female', @plus_c4, '2010-11-25', 'Khalid Nasir', 'Father', '222100016');
SET @plus_s16 = LAST_INSERT_ID();

-- Attendance - Week 1 Monday 2026-01-05
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@plus_id, @plus_s1, @plus_c1, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Memorized 2 pages'),
(@plus_id, @plus_s2, @plus_c1, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s3, @plus_c1, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Good', 'Excellent', 'Very focused'),
(@plus_id, @plus_s4, @plus_c1, @plus_semester, @plus_t1, '2026-01-05', FALSE, NULL, NULL, 'Sick'),
(@plus_id, @plus_s5, @plus_c2, @plus_semester, @plus_t2, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Outstanding recitation'),
(@plus_id, @plus_s6, @plus_c2, @plus_semester, @plus_t2, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s7, @plus_c2, @plus_semester, @plus_t2, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s8, @plus_c2, @plus_semester, @plus_t2, '2026-01-05', TRUE, 'Excellent', 'Good', NULL),
(@plus_id, @plus_s9, @plus_c3, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s10, @plus_c3, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Top of class'),
(@plus_id, @plus_s11, @plus_c3, @plus_semester, @plus_t1, '2026-01-05', TRUE, 'Good', 'Fair', 'Chatting'),
(@plus_id, @plus_s12, @plus_c3, @plus_semester, @plus_t1, '2026-01-05', FALSE, NULL, NULL, 'Travel');

-- Week 1 Tuesday 2026-01-06
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@plus_id, @plus_s1, @plus_c1, @plus_semester, @plus_t1, '2026-01-06', TRUE, 'Excellent', 'Good', NULL),
(@plus_id, @plus_s2, @plus_c1, @plus_semester, @plus_t1, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s3, @plus_c1, @plus_semester, @plus_t1, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s4, @plus_c1, @plus_semester, @plus_t1, '2026-01-06', FALSE, NULL, NULL, 'Still sick'),
(@plus_id, @plus_s5, @plus_c2, @plus_semester, @plus_t2, '2026-01-06', TRUE, 'Excellent', 'Excellent', NULL),
(@plus_id, @plus_s6, @plus_c2, @plus_semester, @plus_t2, '2026-01-06', TRUE, 'Excellent', 'Good', NULL),
(@plus_id, @plus_s7, @plus_c2, @plus_semester, @plus_t2, '2026-01-06', FALSE, NULL, NULL, 'Appointment'),
(@plus_id, @plus_s8, @plus_c2, @plus_semester, @plus_t2, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s13, @plus_c4, @plus_semester, @plus_t3, '2026-01-06', TRUE, 'Good', 'Good', 'Active participation'),
(@plus_id, @plus_s14, @plus_c4, @plus_semester, @plus_t3, '2026-01-06', TRUE, 'Excellent', 'Excellent', NULL),
(@plus_id, @plus_s15, @plus_c4, @plus_semester, @plus_t3, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s16, @plus_c4, @plus_semester, @plus_t3, '2026-01-06', TRUE, 'Good', 'Good', NULL);

-- Week 1 Wednesday 2026-01-07
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@plus_id, @plus_s1, @plus_c1, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s2, @plus_c1, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Excellent', 'Helped classmate'),
(@plus_id, @plus_s3, @plus_c1, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Excellent', 'Good', NULL),
(@plus_id, @plus_s4, @plus_c1, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Good', 'Returned'),
(@plus_id, @plus_s5, @plus_c2, @plus_semester, @plus_t2, '2026-01-07', TRUE, 'Excellent', 'Excellent', NULL),
(@plus_id, @plus_s6, @plus_c2, @plus_semester, @plus_t2, '2026-01-07', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s7, @plus_c2, @plus_semester, @plus_t2, '2026-01-07', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s8, @plus_c2, @plus_semester, @plus_t2, '2026-01-07', TRUE, 'Good', 'Excellent', NULL),
(@plus_id, @plus_s9, @plus_c3, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s10, @plus_c3, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Excellent', 'Good', NULL),
(@plus_id, @plus_s11, @plus_c3, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Good', 'Better today'),
(@plus_id, @plus_s12, @plus_c3, @plus_semester, @plus_t1, '2026-01-07', TRUE, 'Good', 'Good', 'Back from trip');

-- Week 2 Monday 2026-01-12
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@plus_id, @plus_s1, @plus_c1, @plus_semester, @plus_t1, '2026-01-12', TRUE, 'Excellent', 'Excellent', 'Completed Juz 28'),
(@plus_id, @plus_s2, @plus_c1, @plus_semester, @plus_t1, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s3, @plus_c1, @plus_semester, @plus_t1, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s4, @plus_c1, @plus_semester, @plus_t1, '2026-01-12', TRUE, 'Good', 'Excellent', 'Great comeback'),
(@plus_id, @plus_s5, @plus_c2, @plus_semester, @plus_t2, '2026-01-12', TRUE, 'Excellent', 'Excellent', NULL),
(@plus_id, @plus_s6, @plus_c2, @plus_semester, @plus_t2, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s7, @plus_c2, @plus_semester, @plus_t2, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@plus_id, @plus_s8, @plus_c2, @plus_semester, @plus_t2, '2026-01-12', TRUE, 'Excellent', 'Good', NULL);

-- Plus Exams
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@plus_id, @plus_s1, @plus_semester, @plus_t1, 'Quran Memorization - Juz 28', 96.0, 100, '2026-01-14', 'Outstanding'),
(@plus_id, @plus_s2, @plus_semester, @plus_t1, 'Quran Memorization - Juz 28', 88.5, 100, '2026-01-14', 'Good recall'),
(@plus_id, @plus_s3, @plus_semester, @plus_t1, 'Quran Memorization - Juz 28', 82.0, 100, '2026-01-14', 'Steady progress'),
(@plus_id, @plus_s4, @plus_semester, @plus_t1, 'Quran Memorization - Juz 28', 79.0, 100, '2026-01-14', 'Catching up'),
(@plus_id, @plus_s5, @plus_semester, @plus_t2, 'Tajweed Practical', 97.5, 100, '2026-01-14', 'Near perfect'),
(@plus_id, @plus_s6, @plus_semester, @plus_t2, 'Tajweed Practical', 93.0, 100, '2026-01-14', 'Excellent'),
(@plus_id, @plus_s7, @plus_semester, @plus_t2, 'Tajweed Practical', 85.0, 100, '2026-01-14', 'Good'),
(@plus_id, @plus_s8, @plus_semester, @plus_t2, 'Tajweed Practical', 90.5, 100, '2026-01-14', 'Very good'),
(@plus_id, @plus_s9, @plus_semester, @plus_t1, 'Arabic Grammar Test', 76.0, 100, '2026-01-15', 'Needs practice'),
(@plus_id, @plus_s10, @plus_semester, @plus_t1, 'Arabic Grammar Test', 95.0, 100, '2026-01-15', 'Excellent'),
(@plus_id, @plus_s11, @plus_semester, @plus_t1, 'Arabic Grammar Test', 71.0, 100, '2026-01-15', 'Must revise'),
(@plus_id, @plus_s12, @plus_semester, @plus_t1, 'Arabic Grammar Test', 83.5, 100, '2026-01-15', 'Good understanding'),
(@plus_id, @plus_s13, @plus_semester, @plus_t3, 'Aqeedah Fundamentals', 88.0, 100, '2026-01-16', 'Strong knowledge'),
(@plus_id, @plus_s14, @plus_semester, @plus_t3, 'Aqeedah Fundamentals', 94.0, 100, '2026-01-16', 'Outstanding'),
(@plus_id, @plus_s15, @plus_semester, @plus_t3, 'Aqeedah Fundamentals', 77.5, 100, '2026-01-16', 'Average'),
(@plus_id, @plus_s16, @plus_semester, @plus_t3, 'Aqeedah Fundamentals', 81.0, 100, '2026-01-16', 'Good');

INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@plus_id, @plus_s1, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 94.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s2, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 86.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s3, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 80.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s4, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 82.5, 100, '2026-01-21', 'Improved'),
(@plus_id, @plus_s5, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 98.0, 100, '2026-01-21', 'Mastery'),
(@plus_id, @plus_s6, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 91.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s7, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 87.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s8, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 89.5, 100, '2026-01-21', NULL);


-- ============================================================
-- 3. ENTERPRISE DEMO MADRASAH
-- Login: admin@enterprise-demo.com / demo123 at /enterprise-demo/login
-- Plan: Enterprise (Custom) - Unlimited everything
-- ============================================================

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Darul Uloom Al-Hikmah', 'enterprise-demo', '200 Lambton Quay', 'Christchurch', 'Canterbury', 'New Zealand', '95001234', 'admin@enterprise-demo.com', TRUE, 'enterprise', 'active');
SET @ent_id = LAST_INSERT_ID();

-- Admin
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@ent_id, 'Sheikh', 'Abdul-Kareem', 'admin@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001001', 'admin');

-- Teachers (4)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@ent_id, 'Mufti', 'Ismail', '30001', 'teacher1@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001002', 'teacher');
SET @ent_t1 = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@ent_id, 'Ustadha', 'Maryam', '30002', 'teacher2@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001003', 'teacher');
SET @ent_t2 = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@ent_id, 'Sheikh', 'Ahmad', '30003', 'teacher3@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001004', 'teacher');
SET @ent_t3 = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@ent_id, 'Ustadha', 'Nusaibah', '30004', 'teacher4@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001005', 'teacher');
SET @ent_t4 = LAST_INSERT_ID();

-- Session & Semester
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@ent_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @ent_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@ent_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);
SET @ent_semester = LAST_INSERT_ID();

-- Classes (6)
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Alim Course - Year 1', 'Year 1', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Full-time Islamic scholarship program');
SET @ent_c1 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Alimah Course - Year 1', 'Year 1', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Full-time Islamic scholarship for sisters');
SET @ent_c2 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Hifz Intensive - Boys', 'Mixed', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Full-time Quran memorization');
SET @ent_c3 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Hifz Intensive - Girls', 'Mixed', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]', 'Full-time Quran memorization for sisters');
SET @ent_c4 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Weekend Maktab - Junior', 'Grade 1-4', '["Saturday", "Sunday"]', 'Weekend Islamic education');
SET @ent_c5 = LAST_INSERT_ID();

INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@ent_id, 'Weekend Maktab - Senior', 'Grade 5-8', '["Saturday", "Sunday"]', 'Weekend Islamic education - advanced');
SET @ent_c6 = LAST_INSERT_ID();

INSERT INTO class_teachers (class_id, user_id) VALUES
(@ent_c1, @ent_t1),
(@ent_c2, @ent_t2),
(@ent_c3, @ent_t3),
(@ent_c4, @ent_t2),
(@ent_c5, @ent_t4),
(@ent_c6, @ent_t3);

-- Enterprise Students (24)
-- Alim (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Abdullah', 'Hashim', '400001', 'Male', @ent_c1, '2008-02-14', 'Maryam Hashim', 'Mother', '223100001');
SET @ent_s1 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Ismail', 'Noorani', '400002', 'Male', @ent_c1, '2007-06-28', 'Khalid Noorani', 'Father', '223100002');
SET @ent_s2 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Suhail', 'Ansari', '400003', 'Male', @ent_c1, '2008-09-03', 'Ruqayyah Ansari', 'Mother', '223100003');
SET @ent_s3 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Junaid', 'Bukhari', '400004', 'Male', @ent_c1, '2007-11-17', 'Safia Bukhari', 'Mother', '223100004');
SET @ent_s4 = LAST_INSERT_ID();

-- Alimah (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Hafsa', 'Qasim', '400005', 'Female', @ent_c2, '2008-04-10', 'Aisha Qasim', 'Mother', '223100005');
SET @ent_s5 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Zainab', 'Farooqi', '400006', 'Female', @ent_c2, '2007-08-22', 'Bilal Farooqi', 'Father', '223100006');
SET @ent_s6 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Umm Kulthum', 'Hasan', '400007', 'Female', @ent_c2, '2008-01-30', 'Noor Hasan', 'Mother', '223100007');
SET @ent_s7 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Safiyyah', 'Umar', '400008', 'Female', @ent_c2, '2007-12-15', 'Khadija Umar', 'Mother', '223100008');
SET @ent_s8 = LAST_INSERT_ID();

-- Hifz Boys (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Muaz', 'Jabal', '400009', 'Male', @ent_c3, '2012-03-20', 'Fatima Jabal', 'Mother', '223100009');
SET @ent_s9 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Salman', 'Farsi', '400010', 'Male', @ent_c3, '2011-07-14', 'Ahmad Farsi', 'Father', '223100010');
SET @ent_s10 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Hamza', 'Asad', '400011', 'Male', @ent_c3, '2012-05-09', 'Sara Asad', 'Mother', '223100011');
SET @ent_s11 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Usama', 'Zayd', '400012', 'Male', @ent_c3, '2011-10-28', 'Noor Zayd', 'Mother', '223100012');
SET @ent_s12 = LAST_INSERT_ID();

-- Hifz Girls (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Amatul-Rahman', 'Siddiq', '400013', 'Female', @ent_c4, '2012-01-18', 'Amina Siddiq', 'Mother', '223100013');
SET @ent_s13 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Khadijah', 'Waleed', '400014', 'Female', @ent_c4, '2011-09-05', 'Hafsa Waleed', 'Mother', '223100014');
SET @ent_s14 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Sumayyah', 'Khattab', '400015', 'Female', @ent_c4, '2012-06-12', 'Zainab Khattab', 'Mother', '223100015');
SET @ent_s15 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Asiyah', 'Imran', '400016', 'Female', @ent_c4, '2011-11-25', 'Maryam Imran', 'Mother', '223100016');
SET @ent_s16 = LAST_INSERT_ID();

-- Weekend Junior (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Yusuf', 'Hadi', '400017', 'Male', @ent_c5, '2016-03-10', 'Sara Hadi', 'Mother', '223100017');
SET @ent_s17 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Aisha', 'Uthman', '400018', 'Female', @ent_c5, '2015-07-25', 'Fatima Uthman', 'Mother', '223100018');
SET @ent_s18 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Bilal', 'Habashi', '400019', 'Male', @ent_c5, '2016-01-05', 'Layla Habashi', 'Mother', '223100019');
SET @ent_s19 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Ruqayyah', 'Talib', '400020', 'Female', @ent_c5, '2015-11-18', 'Ahmad Talib', 'Father', '223100020');
SET @ent_s20 = LAST_INSERT_ID();

-- Weekend Senior (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Khalid', 'Waleed', '400021', 'Male', @ent_c6, '2013-05-22', 'Amina Waleed', 'Mother', '223100021');
SET @ent_s21 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Fatimah', 'Zahrah', '400022', 'Female', @ent_c6, '2012-08-15', 'Noor Zahrah', 'Father', '223100022');
SET @ent_s22 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Taha', 'Husain', '400023', 'Male', @ent_c6, '2013-02-28', 'Safiya Husain', 'Mother', '223100023');
SET @ent_s23 = LAST_INSERT_ID();

INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Maimunah', 'Harith', '400024', 'Female', @ent_c6, '2012-10-10', 'Khadija Harith', 'Mother', '223100024');
SET @ent_s24 = LAST_INSERT_ID();

-- Enterprise Attendance - Week 1 Monday 2026-01-05
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@ent_id, @ent_s1, @ent_c1, @ent_semester, @ent_t1, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Started Nahw chapter'),
(@ent_id, @ent_s2, @ent_c1, @ent_semester, @ent_t1, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s3, @ent_c1, @ent_semester, @ent_t1, '2026-01-05', TRUE, 'Good', 'Excellent', NULL),
(@ent_id, @ent_s4, @ent_c1, @ent_semester, @ent_t1, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s9, @ent_c3, @ent_semester, @ent_t3, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Memorized 3 pages'),
(@ent_id, @ent_s10, @ent_c3, @ent_semester, @ent_t3, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s11, @ent_c3, @ent_semester, @ent_t3, '2026-01-05', FALSE, NULL, NULL, 'Sick'),
(@ent_id, @ent_s12, @ent_c3, @ent_semester, @ent_t3, '2026-01-05', TRUE, 'Good', 'Good', NULL);

-- Week 1 Tuesday 2026-01-06
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@ent_id, @ent_s1, @ent_c1, @ent_semester, @ent_t1, '2026-01-06', TRUE, 'Excellent', 'Good', NULL),
(@ent_id, @ent_s2, @ent_c1, @ent_semester, @ent_t1, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s3, @ent_c1, @ent_semester, @ent_t1, '2026-01-06', FALSE, NULL, NULL, 'Appointment'),
(@ent_id, @ent_s4, @ent_c1, @ent_semester, @ent_t1, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s9, @ent_c3, @ent_semester, @ent_t3, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s10, @ent_c3, @ent_semester, @ent_t3, '2026-01-06', TRUE, 'Good', 'Excellent', 'Helped younger student'),
(@ent_id, @ent_s11, @ent_c3, @ent_semester, @ent_t3, '2026-01-06', FALSE, NULL, NULL, 'Still unwell'),
(@ent_id, @ent_s12, @ent_c3, @ent_semester, @ent_t3, '2026-01-06', TRUE, 'Excellent', 'Good', NULL);

-- Weekend Saturday 2026-01-10
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@ent_id, @ent_s17, @ent_c5, @ent_semester, @ent_t4, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s18, @ent_c5, @ent_semester, @ent_t4, '2026-01-10', TRUE, 'Excellent', 'Excellent', 'Eager to learn'),
(@ent_id, @ent_s19, @ent_c5, @ent_semester, @ent_t4, '2026-01-10', TRUE, 'Good', 'Fair', 'Restless'),
(@ent_id, @ent_s20, @ent_c5, @ent_semester, @ent_t4, '2026-01-10', FALSE, NULL, NULL, 'Holiday'),
(@ent_id, @ent_s21, @ent_c6, @ent_semester, @ent_t3, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s22, @ent_c6, @ent_semester, @ent_t3, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s23, @ent_c6, @ent_semester, @ent_t3, '2026-01-10', TRUE, 'Good', 'Excellent', 'Active participation'),
(@ent_id, @ent_s24, @ent_c6, @ent_semester, @ent_t3, '2026-01-10', TRUE, 'Excellent', 'Good', NULL);

-- Week 2 Monday 2026-01-12
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@ent_id, @ent_s1, @ent_c1, @ent_semester, @ent_t1, '2026-01-12', TRUE, 'Excellent', 'Excellent', NULL),
(@ent_id, @ent_s2, @ent_c1, @ent_semester, @ent_t1, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s3, @ent_c1, @ent_semester, @ent_t1, '2026-01-12', TRUE, 'Good', 'Good', 'Returned'),
(@ent_id, @ent_s4, @ent_c1, @ent_semester, @ent_t1, '2026-01-12', TRUE, 'Excellent', 'Good', NULL),
(@ent_id, @ent_s9, @ent_c3, @ent_semester, @ent_t3, '2026-01-12', TRUE, 'Excellent', 'Excellent', 'Completed Surah Yaseen'),
(@ent_id, @ent_s10, @ent_c3, @ent_semester, @ent_t3, '2026-01-12', TRUE, 'Good', 'Good', NULL),
(@ent_id, @ent_s11, @ent_c3, @ent_semester, @ent_t3, '2026-01-12', TRUE, 'Good', 'Good', 'Recovered'),
(@ent_id, @ent_s12, @ent_c3, @ent_semester, @ent_t3, '2026-01-12', TRUE, 'Good', 'Excellent', NULL);

-- Enterprise Exams
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@ent_id, @ent_s1, @ent_semester, @ent_t1, 'Nahw (Arabic Grammar)', 93.0, 100, '2026-01-18', 'Strong grasp'),
(@ent_id, @ent_s2, @ent_semester, @ent_t1, 'Nahw (Arabic Grammar)', 86.5, 100, '2026-01-18', 'Good'),
(@ent_id, @ent_s3, @ent_semester, @ent_t1, 'Nahw (Arabic Grammar)', 79.0, 100, '2026-01-18', 'Needs more effort'),
(@ent_id, @ent_s4, @ent_semester, @ent_t1, 'Nahw (Arabic Grammar)', 88.0, 100, '2026-01-18', 'Very good'),
(@ent_id, @ent_s1, @ent_semester, @ent_t1, 'Sarf (Morphology)', 91.0, 100, '2026-01-20', NULL),
(@ent_id, @ent_s2, @ent_semester, @ent_t1, 'Sarf (Morphology)', 84.0, 100, '2026-01-20', NULL),
(@ent_id, @ent_s3, @ent_semester, @ent_t1, 'Sarf (Morphology)', 76.5, 100, '2026-01-20', NULL),
(@ent_id, @ent_s4, @ent_semester, @ent_t1, 'Sarf (Morphology)', 82.0, 100, '2026-01-20', NULL),
(@ent_id, @ent_s9, @ent_semester, @ent_t3, 'Hifz Test - Surah Yaseen', 97.0, 100, '2026-01-18', 'Excellent'),
(@ent_id, @ent_s10, @ent_semester, @ent_t3, 'Hifz Test - Surah Yaseen', 89.0, 100, '2026-01-18', 'Good retention'),
(@ent_id, @ent_s11, @ent_semester, @ent_t3, 'Hifz Test - Surah Yaseen', 74.0, 100, '2026-01-18', 'Missed days affected'),
(@ent_id, @ent_s12, @ent_semester, @ent_t3, 'Hifz Test - Surah Yaseen', 85.5, 100, '2026-01-18', NULL),
(@ent_id, @ent_s17, @ent_semester, @ent_t4, 'Duas and Surahs', 82.0, 100, '2026-01-17', NULL),
(@ent_id, @ent_s18, @ent_semester, @ent_t4, 'Duas and Surahs', 95.0, 100, '2026-01-17', 'Star student'),
(@ent_id, @ent_s19, @ent_semester, @ent_t4, 'Duas and Surahs', 70.0, 100, '2026-01-17', 'Needs to revise'),
(@ent_id, @ent_s20, @ent_semester, @ent_t4, 'Duas and Surahs', 78.5, 100, '2026-01-17', NULL),
(@ent_id, @ent_s21, @ent_semester, @ent_t3, 'Seerah Quiz', 88.0, 100, '2026-01-17', 'Good knowledge'),
(@ent_id, @ent_s22, @ent_semester, @ent_t3, 'Seerah Quiz', 92.0, 100, '2026-01-17', 'Excellent'),
(@ent_id, @ent_s23, @ent_semester, @ent_t3, 'Seerah Quiz', 81.0, 100, '2026-01-17', NULL),
(@ent_id, @ent_s24, @ent_semester, @ent_t3, 'Seerah Quiz', 86.5, 100, '2026-01-17', 'Good effort');

-- Summary
SELECT 'Demo plan madrasahs seeded successfully!' AS status;
SELECT '--------------------------------------' AS info;
SELECT 'STANDARD: /standard-demo/login | admin@standard-demo.com / demo123 | teacher@standard-demo.com / demo123' AS logins
UNION ALL
SELECT 'PLUS:     /plus-demo/login     | admin@plus-demo.com / demo123     | teacher1@plus-demo.com / demo123'
UNION ALL
SELECT 'ENTERPRISE: /enterprise-demo/login | admin@enterprise-demo.com / demo123 | teacher1@enterprise-demo.com / demo123';
