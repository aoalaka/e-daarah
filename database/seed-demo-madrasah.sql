-- Seed Demo Madrasah with Complete Sample Data
-- This adds a fully functional demo madrasah for users to explore

USE madrasah_admin;

-- Clean up existing demo data
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM users WHERE email IN ('admin@demo.com', 'teacher@demo.com', 'aisha@demo.com');
DELETE FROM madrasahs WHERE slug = 'demo';
SET FOREIGN_KEY_CHECKS = 1;

-- All operations in a single transaction
START TRANSACTION;

-- Insert Demo Madrasah
INSERT INTO madrasahs (name, slug, logo_url, street, city, state, country, phone, phone_country_code, is_active) VALUES
('Demo Islamic Academy', 'demo', NULL, '123 Education Lane', 'Auckland', 'Auckland Region', 'New Zealand', '95551234', '+64', TRUE);

SELECT @demo_madrasah_id := LAST_INSERT_ID();

-- Insert Demo Admin User (email: admin@demo.com, password: demo123)
-- Password hash for 'demo123': $2a$10$demo123hash.........................
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, phone_country_code, street, city, state, country, role) VALUES
(@demo_madrasah_id, 'Demo', 'Administrator', 'admin@demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211234567', '+64', '123 Education Lane', 'Auckland', 'Auckland Region', 'New Zealand', 'admin');

-- Insert Demo Teacher Users (password: demo123)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, phone_country_code, street, city, state, country, role) VALUES
(@demo_madrasah_id, 'Ustadh', 'Kareem', '00101', 'teacher@demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211234568', '+64', '456 Scholar Street', 'Wellington', 'Wellington Region', 'New Zealand', 'teacher'),
(@demo_madrasah_id, 'Ustadha', 'Aisha', '00102', 'aisha@demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211234569', '+64', '789 Knowledge Road', 'Christchurch', 'Canterbury', 'New Zealand', 'teacher');

SET @demo_teacher1_id := (SELECT id FROM users WHERE madrasah_id = @demo_madrasah_id AND staff_id = '00101');
SET @demo_teacher2_id := (SELECT id FROM users WHERE madrasah_id = @demo_madrasah_id AND staff_id = '00102');

-- Insert Session: 2025-2026
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@demo_madrasah_id, '2025-2026 Academic Year', '2025-09-01', '2026-06-30', TRUE);

SELECT @demo_session_id := LAST_INSERT_ID();

-- Insert Semester: Semester 1 (2025-2026)
INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@demo_session_id, 'Semester 1 - 2025/2026', '2025-09-01', '2026-01-31', TRUE);

SELECT @demo_semester_id := LAST_INSERT_ID();

-- Insert Sample Classes
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(@demo_madrasah_id, 'Boys Quran Class', 'Grade 5-7', '["Monday", "Wednesday", "Friday"]', 'Quran recitation and memorization for boys'),
(@demo_madrasah_id, 'Girls Hifz Class', 'Grade 6-8', '["Tuesday", "Thursday", "Saturday"]', 'Advanced Quran memorization for girls'),
(@demo_madrasah_id, 'Arabic Fundamentals', 'Grade 4-6', '["Wednesday", "Friday"]', 'Basic Arabic language and grammar'),
(@demo_madrasah_id, 'Islamic Studies', 'Grade 7-9', '["Monday", "Thursday"]', 'Fiqh, Hadith, and Islamic history');

SET @class1_id := (SELECT id FROM classes WHERE madrasah_id = @demo_madrasah_id AND name = 'Boys Quran Class');
SET @class2_id := (SELECT id FROM classes WHERE madrasah_id = @demo_madrasah_id AND name = 'Girls Hifz Class');
SET @class3_id := (SELECT id FROM classes WHERE madrasah_id = @demo_madrasah_id AND name = 'Arabic Fundamentals');
SET @class4_id := (SELECT id FROM classes WHERE madrasah_id = @demo_madrasah_id AND name = 'Islamic Studies');

-- Assign Teachers to Classes
INSERT INTO class_teachers (class_id, teacher_id) VALUES
(@class1_id, @demo_teacher1_id),
(@class2_id, @demo_teacher2_id),
(@class3_id, @demo_teacher1_id),
(@class4_id, @demo_teacher2_id);

-- Insert Sample Students
-- Boys Quran Class Students
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, 
                     student_phone, student_phone_country_code, street, city, state, country,
                     next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes) VALUES
(@demo_madrasah_id, 'Ahmed', 'Hassan', '100001', 'Male', @class1_id, '2013-05-15', 
 '221234501', '+64', '10 Mosque Lane', 'Auckland', 'Auckland Region', 'New Zealand',
 'Fatima Hassan', 'Mother', '221234601', '+64', 'Excellent recitation skills'),
 
(@demo_madrasah_id, 'Omar', 'Abdullah', '100002', 'Male', @class1_id, '2012-08-22', 
 '221234502', '+64', '25 Islamic Avenue', 'Auckland', 'Auckland Region', 'New Zealand',
 'Khadija Abdullah', 'Mother', '221234602', '+64', 'Good memorization'),
 
(@demo_madrasah_id, 'Yusuf', 'Ibrahim', '100003', 'Male', @class1_id, '2013-11-10', 
 NULL, NULL, '42 Faith Street', 'Hamilton', 'Waikato', 'New Zealand',
 'Ibrahim Ibrahim', 'Father', '221234603', '+64', 'Needs encouragement'),
 
(@demo_madrasah_id, 'Ali', 'Mohammed', '100004', 'Male', @class1_id, '2012-03-18', 
 '221234504', '+64', NULL, NULL, NULL, NULL,
 'Aisha Mohammed', 'Mother', '221234604', '+64', 'Very dedicated student');

-- Girls Hifz Class Students
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth,
                     student_phone, student_phone_country_code, street, city, state, country,
                     next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes) VALUES
(@demo_madrasah_id, 'Maryam', 'Ahmad', '100005', 'Female', @class2_id, '2012-06-20', 
 '221234505', '+64', '15 Prayer Place', 'Wellington', 'Wellington Region', 'New Zealand',
 'Hafsa Ahmad', 'Mother', '221234605', '+64', 'Memorizing Juz 30'),
 
(@demo_madrasah_id, 'Fatima', 'Malik', '100006', 'Female', @class2_id, '2011-09-14', 
 '221234506', '+64', '88 Salah Street', 'Wellington', 'Wellington Region', 'New Zealand',
 'Zainab Malik', 'Mother', '221234606', '+64', 'Excellent tajweed'),
 
(@demo_madrasah_id, 'Aisha', 'Usman', '100007', 'Female', @class2_id, '2012-12-05', 
 NULL, NULL, '33 Hadith Road', 'Christchurch', 'Canterbury', 'New Zealand',
 'Ruqayya Usman', 'Mother', '221234607', '+64', 'Strong focus'),
 
(@demo_madrasah_id, 'Khadija', 'Saleh', '100008', 'Female', @class2_id, '2011-07-25', 
 '221234508', '+64', '67 Sunnah Lane', 'Wellington', 'Wellington Region', 'New Zealand',
 'Sumayyah Saleh', 'Mother', '221234608', '+64', 'Fast learner');

-- Arabic Fundamentals Students
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth,
                     student_phone, student_phone_country_code, street, city, state, country,
                     next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes) VALUES
(@demo_madrasah_id, 'Zayd', 'Rahman', '100009', 'Male', @class3_id, '2014-02-10', 
 '221234509', '+64', '12 Grammar Street', 'Auckland', 'Auckland Region', 'New Zealand',
 'Layla Rahman', 'Mother', '221234609', '+64', 'Enjoys Arabic'),
 
(@demo_madrasah_id, 'Hamza', 'Khan', '100010', 'Male', @class3_id, '2013-04-30', 
 NULL, NULL, '99 Vocabulary Road', 'Tauranga', 'Bay of Plenty', 'New Zealand',
 'Mariam Khan', 'Mother', '221234610', '+64', 'Good pronunciation');

-- Islamic Studies Students
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth,
                     student_phone, student_phone_country_code, street, city, state, country,
                     next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes) VALUES
(@demo_madrasah_id, 'Hassan', 'Ali', '100011', 'Male', @class4_id, '2011-01-15', 
 '221234511', '+64', '22 Hadith Avenue', 'Dunedin', 'Otago', 'New Zealand',
 'Safiya Ali', 'Mother', '221234611', '+64', 'Interested in history'),
 
(@demo_madrasah_id, 'Bilal', 'Yusuf', '100012', 'Male', @class4_id, '2010-10-08', 
 '221234512', '+64', '77 Fiqh Street', 'Auckland', 'Auckland Region', 'New Zealand',
 'Aminah Yusuf', 'Mother', '221234612', '+64', 'Thoughtful questions');

-- Get student IDs for attendance records
SET @student1_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100001');
SET @student2_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100002');
SET @student3_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100003');
SET @student4_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100004');
SET @student5_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100005');
SET @student6_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100006');
SET @student7_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100007');
SET @student8_id := (SELECT id FROM students WHERE madrasah_id = @demo_madrasah_id AND student_id = '100008');

-- Insert Attendance Records for Boys Quran Class (Past 4 weeks - Mondays, Wednesdays, Fridays)
-- Week 1 - Monday 2026-01-05
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student1_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-06', TRUE, 'Excellent', 'Excellent', 'Great start to the year'),
(@demo_madrasah_id, @student2_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-06', TRUE, 'Good', 'Good', 'Well prepared'),
(@demo_madrasah_id, @student3_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-06', TRUE, 'Good', 'Fair', 'Late arrival'),
(@demo_madrasah_id, @student4_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-06', FALSE, NULL, NULL, 'Sick');

-- Week 1 - Wednesday 2026-01-08
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student1_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-08', TRUE, 'Excellent', 'Good', 'Focused today'),
(@demo_madrasah_id, @student2_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-08', TRUE, 'Good', 'Excellent', 'Helped others'),
(@demo_madrasah_id, @student3_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-08', TRUE, 'Fair', 'Good', 'Uniform needs attention'),
(@demo_madrasah_id, @student4_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-08', TRUE, 'Good', 'Good', 'Back from illness');

-- Week 1 - Friday 2026-01-10
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student1_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-10', TRUE, 'Excellent', 'Excellent', 'Perfect week'),
(@demo_madrasah_id, @student2_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-10', TRUE, 'Good', 'Good', 'Consistent effort'),
(@demo_madrasah_id, @student3_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-10', TRUE, 'Good', 'Good', 'Improvement noted'),
(@demo_madrasah_id, @student4_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-10', TRUE, 'Excellent', 'Good', 'Catching up well');

-- Week 2 - Monday 2026-01-13
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student1_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-13', TRUE, 'Excellent', 'Excellent', NULL),
(@demo_madrasah_id, @student2_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-13', TRUE, 'Excellent', 'Good', NULL),
(@demo_madrasah_id, @student3_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-13', FALSE, NULL, NULL, 'Family emergency'),
(@demo_madrasah_id, @student4_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-13', TRUE, 'Good', 'Excellent', 'Very attentive');

-- Week 2 - Wednesday 2026-01-15
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student1_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-15', TRUE, 'Good', 'Good', NULL),
(@demo_madrasah_id, @student2_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-15', TRUE, 'Good', 'Good', NULL),
(@demo_madrasah_id, @student3_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-15', TRUE, 'Good', 'Fair', 'Distracted'),
(@demo_madrasah_id, @student4_id, @class1_id, @demo_semester_id, @demo_teacher1_id, '2026-01-15', TRUE, 'Good', 'Good', NULL);

-- Insert Attendance Records for Girls Hifz Class (Past 4 weeks - Tuesdays, Thursdays, Saturdays)
-- Week 1 - Tuesday 2026-01-07
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student5_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-07', TRUE, 'Excellent', 'Excellent', 'Beautiful recitation'),
(@demo_madrasah_id, @student6_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-07', TRUE, 'Excellent', 'Good', 'Strong performance'),
(@demo_madrasah_id, @student7_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-07', TRUE, 'Good', 'Good', NULL),
(@demo_madrasah_id, @student8_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-07', TRUE, 'Good', 'Excellent', 'Helped classmates');

-- Week 1 - Thursday 2026-01-09
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student5_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-09', TRUE, 'Excellent', 'Excellent', NULL),
(@demo_madrasah_id, @student6_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-09', TRUE, 'Good', 'Good', NULL),
(@demo_madrasah_id, @student7_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-09', FALSE, NULL, NULL, 'Dental appointment'),
(@demo_madrasah_id, @student8_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-09', TRUE, 'Good', 'Good', NULL);

-- Week 2 - Tuesday 2026-01-14
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, teacher_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@demo_madrasah_id, @student5_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-14', TRUE, 'Excellent', 'Good', NULL),
(@demo_madrasah_id, @student6_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-14', TRUE, 'Excellent', 'Excellent', 'Outstanding'),
(@demo_madrasah_id, @student7_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-14', TRUE, 'Good', 'Good', NULL),
(@demo_madrasah_id, @student8_id, @class2_id, @demo_semester_id, @demo_teacher2_id, '2026-01-14', TRUE, 'Good', 'Good', NULL);

-- Insert Exam Performance Records
-- Boys Quran Class - Quran Memorization Test
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, teacher_id, subject, score, max_score, exam_date, notes) VALUES
(@demo_madrasah_id, @student1_id, @demo_semester_id, @demo_teacher1_id, 'Quran Memorization - Surah Al-Mulk', 95.5, 100, '2026-01-12', 'Excellent memorization and tajweed'),
(@demo_madrasah_id, @student2_id, @demo_semester_id, @demo_teacher1_id, 'Quran Memorization - Surah Al-Mulk', 88.0, 100, '2026-01-12', 'Good effort'),
(@demo_madrasah_id, @student3_id, @demo_semester_id, @demo_teacher1_id, 'Quran Memorization - Surah Al-Mulk', 75.5, 100, '2026-01-12', 'Needs more practice'),
(@demo_madrasah_id, @student4_id, @demo_semester_id, @demo_teacher1_id, 'Quran Memorization - Surah Al-Mulk', 92.0, 100, '2026-01-12', 'Very good');

-- Girls Hifz Class - Tajweed Test
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, teacher_id, subject, score, max_score, exam_date, notes) VALUES
(@demo_madrasah_id, @student5_id, @demo_semester_id, @demo_teacher2_id, 'Tajweed Rules Assessment', 98.0, 100, '2026-01-11', 'Mastery level'),
(@demo_madrasah_id, @student6_id, @demo_semester_id, @demo_teacher2_id, 'Tajweed Rules Assessment', 94.5, 100, '2026-01-11', 'Excellent understanding'),
(@demo_madrasah_id, @student7_id, @demo_semester_id, @demo_teacher2_id, 'Tajweed Rules Assessment', 87.0, 100, '2026-01-11', 'Good progress'),
(@demo_madrasah_id, @student8_id, @demo_semester_id, @demo_teacher2_id, 'Tajweed Rules Assessment', 91.5, 100, '2026-01-11', 'Very good');

-- Boys Quran Class - Quran Recitation Assessment
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, teacher_id, subject, score, max_score, exam_date, notes) VALUES
(@demo_madrasah_id, @student1_id, @demo_semester_id, @demo_teacher1_id, 'Quran Recitation - Juz 29', 93.5, 100, '2026-01-19', 'Clear and accurate'),
(@demo_madrasah_id, @student2_id, @demo_semester_id, @demo_teacher1_id, 'Quran Recitation - Juz 29', 85.5, 100, '2026-01-19', 'Some minor errors'),
(@demo_madrasah_id, @student3_id, @demo_semester_id, @demo_teacher1_id, 'Quran Recitation - Juz 29', 78.0, 100, '2026-01-19', 'Needs to review rules'),
(@demo_madrasah_id, @student4_id, @demo_semester_id, @demo_teacher1_id, 'Quran Recitation - Juz 29', 89.5, 100, '2026-01-19', 'Good improvement');

-- Commit the transaction
COMMIT;

-- Demo madrasah seed data complete
SELECT 'Demo madrasah seed data inserted successfully!' as status;
