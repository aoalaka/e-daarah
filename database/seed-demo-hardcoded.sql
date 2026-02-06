-- Demo Madrasah Seed Data (Using Transaction + Hardcoded IDs)
USE madrasah_admin;

START TRANSACTION;

-- Insert Demo Madrasah with known ID (999)
INSERT INTO madrasahs (id, name, slug, logo_url, street, city, state, country, phone, phone_country_code, is_active) VALUES
(999, 'Demo Islamic Academy', 'demo', NULL, '123 Education Lane', 'Auckland', 'Auckland Region', 'New Zealand', '95551234', '+64', TRUE);

-- Insert Demo Users (password: demo123)
INSERT INTO users (id, madrasah_id, first_name, last_name, email, password, phone, phone_country_code, street, city, state, country, role, staff_id) VALUES
(9991, 999, 'Demo', 'Administrator', 'admin@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '211234567', '+64', '123 Education Lane', 'Auckland', 'Auckland Region', 'New Zealand', 'admin', NULL),
(9992, 999, 'Fatima', 'Al-Rahman', 'teacher1@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '212223333', '+64', '45 Masjid Road', 'Auckland', 'Auckland Region', 'New Zealand', 'teacher', '00101'),
(9993, 999, 'Ahmed', 'Hassan', 'teacher2@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '214445555', '+64', '78 Quran Street', 'Wellington', 'Wellington Region', 'New Zealand', 'teacher', '00102');

-- Insert Demo Session
INSERT INTO sessions (id, madrasah_id, name, start_date, end_date, is_active) VALUES
(999, 999, '2025-2026 Academic Year', '2026-01-01', '2026-12-31', TRUE);

-- Insert Demo Semester
INSERT INTO semesters (id, madrasah_id, session_id, name, start_date, end_date, is_active) VALUES
(999, 999, 999, 'Semester 1 - 2025/2026', '2026-01-01', '2026-06-30', TRUE);

-- Insert Demo Classes
INSERT INTO classes (id, madrasah_id, name, description, school_days) VALUES
(9991, 999, 'Boys Quran Class', 'Quran recitation and memorization for boys aged 8-12', '["Monday", "Wednesday", "Friday"]'),
(9992, 999, 'Girls Hifz Class', 'Advanced Quran memorization for girls aged 10-14', '["Sunday", "Tuesday", "Friday"]'),
(9993, 999, 'Arabic Fundamentals', 'Basic Arabic language and grammar', '["Tuesday", "Thursday"]'),
(9994, 999, 'Islamic Studies', 'Islamic history, fiqh, and hadith studies', '["Monday", "Wednesday"]');

-- Assign Teachers to Classes
INSERT INTO class_teachers (class_id, user_id) VALUES
(9991, 9992), -- Fatima teaches Boys Quran Class
(9992, 9993), -- Ahmed teaches Girls Hifz Class
(9993, 9992), -- Fatima teaches Arabic Fundamentals
(9994, 9993); -- Ahmed teaches Islamic Studies

-- Insert Demo Students (12 students across 4 classes)
-- All demo students use parent access code: 123456
INSERT INTO students (id, madrasah_id, student_id, first_name, last_name, class_id, gender, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, street, city, state, country, parent_access_code) VALUES
-- Boys Quran Class (3 students)
(99901, 999, '100001', 'Yusuf', 'Khan', 9991, 'Male', 'Sarah Khan', 'Mother', '21111111', '+64', '15 Kauri Road', 'Auckland', 'Auckland Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99902, 999, '100002', 'Ibrahim', 'Ahmed', 9991, 'Male', 'Fatima Ahmed', 'Mother', '21222222', '+64', '22 Rimu Avenue', 'Auckland', 'Auckland Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99903, 999, '100003', 'Omar', 'Ali', 9991, 'Male', 'Aisha Ali', 'Mother', '21333333', '+64', '8 Pohutukawa Drive', 'Auckland', 'Auckland Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),

-- Girls Hifz Class (3 students)
(99904, 999, '100004', 'Maryam', 'Hassan', 9992, 'Female', 'Khadija Hassan', 'Mother', '21444444', '+64', '12 Totara Lane', 'Wellington', 'Wellington Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99905, 999, '100005', 'Aisha', 'Rahman', 9992, 'Female', 'Layla Rahman', 'Mother', '21555555', '+64', '34 Nikau Street', 'Wellington', 'Wellington Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99906, 999, '100006', 'Fatima', 'Mahmoud', 9992, 'Female', 'Amina Mahmoud', 'Mother', '21666666', '+64', '56 Manuka Road', 'Christchurch', 'Canterbury Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),

-- Arabic Fundamentals (3 students)
(99907, 999, '100007', 'Zayd', 'Hussain', 9993, 'Male', 'Mariam Hussain', 'Mother', '21777777', '+64', '78 Rata Avenue', 'Hamilton', 'Waikato Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99908, 999, '100008', 'Bilal', 'Malik', 9993, 'Male', 'Halima Malik', 'Mother', '21888888', '+64', '90 Karaka Drive', 'Tauranga', 'Bay of Plenty Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99909, 999, '100009', 'Hamza', 'Farooq', 9993, 'Male', 'Zainab Farooq', 'Mother', '21999999', '+64', '11 Kowhai Street', 'Rotorua', 'Bay of Plenty Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),

-- Islamic Studies (3 students)
(99910, 999, '100010', 'Hafsa', 'Siddiqui', 9994, 'Female', 'Ruqayya Siddiqui', 'Mother', '22000000', '+64', '23 Puriri Road', 'Dunedin', 'Otago Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99911, 999, '100011', 'Zainab', 'Nasir', 9994, 'Female', 'Safiya Nasir', 'Mother', '22111111', '+64', '45 Matai Lane', 'Napier', 'Hawke\'s Bay Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK'),
(99912, 999, '100012', 'Khadija', 'Iqbal', 9994, 'Female', 'Sumaya Iqbal', 'Mother', '22222222', '+64', '67 Kahikatea Avenue', 'Palmerston North', 'Manawatu-Wanganui Region', 'New Zealand', '$2a$10$zaR/kNnRkpA9bzscO4h9Su3WD1eWlDklgpjb7iedGw7x400B5aPgK');

-- Insert Attendance Records (20 records across January 2026)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
-- Boys Quran Class - Student 1 (Yusuf)
(999, 99901, 9991, 999, 9992, '2026-01-06', TRUE, 'Excellent', 'Excellent', 'Great start to the year'),
(999, 99901, 9991, 999, 9992, '2026-01-08', TRUE, 'Excellent', 'Good', 'Focused today'),
(999, 99901, 9991, 999, 9992, '2026-01-13', TRUE, 'Excellent', 'Excellent', NULL),

-- Boys Quran Class - Student 2 (Ibrahim)
(999, 99902, 9991, 999, 9992, '2026-01-06', TRUE, 'Good', 'Good', 'Well prepared'),
(999, 99902, 9991, 999, 9992, '2026-01-08', TRUE, 'Good', 'Excellent', 'Helped others'),

-- Girls Hifz Class - Student 4 (Maryam)
(999, 99904, 9992, 999, 9993, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Memorized 5 new ayahs'),
(999, 99904, 9992, 999, 9993, '2026-01-10', TRUE, 'Good', 'Excellent', 'Strong revision'),

-- Girls Hifz Class - Student 5 (Aisha)
(999, 99905, 9992, 999, 9993, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(999, 99905, 9992, 999, 9993, '2026-01-10', FALSE, NULL, NULL, 'Sick'),

-- Girls Hifz Class - Student 6 (Fatima)
(999, 99906, 9992, 999, 9993, '2026-01-05', TRUE, 'Fair', 'Good', 'Needs encouragement'),

-- Arabic Fundamentals - Student 7 (Zayd)
(999, 99907, 9993, 999, 9992, '2026-01-07', TRUE, 'Excellent', 'Excellent', 'Outstanding pronunciation'),
(999, 99907, 9993, 999, 9992, '2026-01-09', TRUE, 'Good', 'Good', NULL),
(999, 99907, 9993, 999, 9992, '2026-01-14', TRUE, 'Excellent', 'Excellent', 'Top of class'),

-- Arabic Fundamentals - Student 8 (Bilal)
(999, 99908, 9993, 999, 9992, '2026-01-07', TRUE, 'Good', 'Fair', 'Chatty during lesson'),
(999, 99908, 9993, 999, 9992, '2026-01-09', TRUE, 'Good', 'Good', 'Much better today'),

-- Islamic Studies - Student 10 (Hafsa)
(999, 99910, 9994, 999, 9993, '2026-01-06', TRUE, 'Excellent', 'Good', 'Asks thoughtful questions'),
(999, 99910, 9994, 999, 9993, '2026-01-08', TRUE, 'Good', 'Excellent', 'Participates well'),
(999, 99910, 9994, 999, 9993, '2026-01-13', TRUE, 'Excellent', 'Excellent', 'Excellent understanding of hadith'),

-- Islamic Studies - Student 11 (Zainab)
(999, 99911, 9994, 999, 9993, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(999, 99911, 9994, 999, 9993, '2026-01-13', FALSE, NULL, NULL, 'Family emergency');

-- Insert Exam Performance Records (12 records)
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, exam_date, subject, score, max_score, notes) VALUES
-- Boys Quran Class exams
(999, 99901, 999, 9992, '2026-01-15', 'Quran Recitation', 95.0, 100.0, 'Excellent tajweed'),
(999, 99902, 999, 9992, '2026-01-15', 'Quran Recitation', 87.5, 100.0, 'Good progress'),
(999, 99903, 999, 9992, '2026-01-15', 'Quran Recitation', 78.0, 100.0, 'Needs more practice'),

-- Girls Hifz Class exams
(999, 99904, 999, 9993, '2026-01-12', 'Memorization', 98.0, 100.0, 'Outstanding memory'),
(999, 99905, 999, 9993, '2026-01-12', 'Memorization', 85.0, 100.0, 'Solid performance'),
(999, 99906, 999, 9993, '2026-01-12', 'Memorization', 92.0, 100.0, 'Very good'),

-- Arabic Fundamentals exams
(999, 99907, 999, 9992, '2026-01-14', 'Arabic Grammar', 96.5, 100.0, 'Top student'),
(999, 99908, 999, 9992, '2026-01-14', 'Arabic Grammar', 82.0, 100.0, 'Good understanding'),
(999, 99909, 999, 9992, '2026-01-14', 'Arabic Grammar', 88.5, 100.0, 'Well done'),

-- Islamic Studies exams
(999, 99910, 999, 9993, '2026-01-13', 'Hadith Studies', 94.0, 100.0, 'Excellent analysis'),
(999, 99911, 999, 9993, '2026-01-13', 'Hadith Studies', 89.0, 100.0, 'Good work'),
(999, 99912, 999, 9993, '2026-01-13', 'Hadith Studies', 91.5, 100.0, 'Strong understanding');

COMMIT;

SELECT 'Demo madrasah data seeded successfully!' as status;
SELECT id, name, slug FROM madrasahs WHERE slug = 'demo';
SELECT id, first_name, last_name, email, role FROM users WHERE madrasah_id = 999;
SELECT COUNT(*) as student_count FROM students WHERE madrasah_id = 999;
SELECT COUNT(*) as attendance_count FROM attendance WHERE madrasah_id = 999;
SELECT COUNT(*) as exam_count FROM exam_performance WHERE madrasah_id = 999;
