-- =====================================================
-- Seed Data for Local Development
-- Adds realistic test data beyond the demo defaults in init.sql
-- =====================================================

USE madrasah_admin;

-- =====================================================
-- Second madrasah (active subscription)
-- =====================================================
INSERT INTO madrasahs (name, slug, email, phone, phone_country_code, street, city, region, country, institution_type, pricing_plan, subscription_status, stripe_customer_id, verification_status, verified_at) VALUES
('Al-Noor Islamic School', 'al-noor', 'admin@al-noor.com', '2123456789', '+1', '45 Elm Street', 'Auckland', 'Auckland', 'New Zealand', 'mosque_based', 'standard', 'active', 'cus_test_alnoor', 'verified', NOW());

-- Third madrasah (solo plan)
INSERT INTO madrasahs (name, slug, email, phone, phone_country_code, street, city, region, country, institution_type, pricing_plan, subscription_status, stripe_customer_id, verification_status, verified_at) VALUES
('Baitul Ilm Academy', 'baitul-ilm', 'admin@baitul-ilm.com', '2129876543', '+1', '12 Oak Ave', 'Wellington', 'Wellington', 'New Zealand', 'independent', 'solo', 'active', 'cus_test_baitul', 'verified', NOW());

-- Fourth madrasah (trial, about to expire)
INSERT INTO madrasahs (name, slug, email, pricing_plan, subscription_status, trial_ends_at) VALUES
('Sunrise Madrasah', 'sunrise', 'admin@sunrise.com', 'trial', 'trialing', DATE_ADD(NOW(), INTERVAL 3 DAY));

-- =====================================================
-- Users for madrasah 2 (Al-Noor)
-- =====================================================
-- Admin (password: admin123)
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role) VALUES
(2, 'Yusuf', 'Rahman', 'yusuf@al-noor.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin');

-- Teachers (password: teacher123)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(2, 'Aisha', 'Khan', '00001', 'aisha@al-noor.com', '$2a$10$WTB7bxxPl5Mae5soq/wlWeNLQpr9tv0LyGhoivn6z5LS6q79DYH8.', '2125551001', 'teacher'),
(2, 'Omar', 'Farooq', '00002', 'omar@al-noor.com', '$2a$10$WTB7bxxPl5Mae5soq/wlWeNLQpr9tv0LyGhoivn6z5LS6q79DYH8.', '2125551002', 'teacher');

-- =====================================================
-- Users for madrasah 3 (Baitul Ilm — solo plan)
-- =====================================================
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role) VALUES
(3, 'Ibrahim', 'Malik', 'ibrahim@baitul-ilm.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin');

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, role) VALUES
(3, 'Khadija', 'Ahmed', '00001', 'khadija@baitul-ilm.com', '$2a$10$WTB7bxxPl5Mae5soq/wlWeNLQpr9tv0LyGhoivn6z5LS6q79DYH8.', 'teacher');

-- =====================================================
-- Sessions and semesters for madrasah 2
-- =====================================================
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(2, '2025-2026', '2025-09-01', '2026-06-30', TRUE);

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(3, 'Term 1', '2025-09-01', '2025-12-19', FALSE),
(3, 'Term 2', '2026-01-20', '2026-04-10', TRUE),
(3, 'Term 3', '2026-04-27', '2026-06-30', FALSE);

-- =====================================================
-- Classes for madrasah 2
-- =====================================================
INSERT INTO classes (madrasah_id, name, grade_level, school_days) VALUES
(2, 'Beginners', 'Level 1', '["Saturday", "Sunday"]'),
(2, 'Intermediate', 'Level 2', '["Saturday", "Sunday"]'),
(2, 'Advanced Hifz', 'Level 3', '["Monday", "Wednesday", "Friday", "Saturday", "Sunday"]');

-- Assign teachers to classes
INSERT INTO class_teachers (class_id, user_id) VALUES
(3, 4),  -- Aisha -> Beginners
(4, 4),  -- Aisha -> Intermediate
(5, 5);  -- Omar -> Advanced Hifz

-- =====================================================
-- Students for Demo Madrasah (madrasah 1) — expand beyond single demo student
-- =====================================================
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, date_of_birth) VALUES
(1, 'Fatima', 'Hassan', '000002', 'Female', 2, 'Amina Hassan', 'Mother', '6421234002', '2013-05-15'),
(1, 'Yusuf', 'Ibrahim', '000003', 'Male', 1, 'Khalid Ibrahim', 'Father', '6421234003', '2012-08-22'),
(1, 'Zainab', 'Omar', '000004', 'Female', 2, 'Salma Omar', 'Mother', '6421234004', '2013-11-03'),
(1, 'Ali', 'Mohammed', '000005', 'Male', 1, 'Rashid Mohammed', 'Father', '6421234005', '2011-02-14'),
(1, 'Maryam', 'Yusuf', '000006', 'Female', 2, 'Halima Yusuf', 'Mother', '6421234006', '2014-07-28'),
(1, 'Hassan', 'Ali', '000007', 'Male', 1, 'Kareem Ali', 'Father', '6421234007', '2012-01-10'),
(1, 'Khadija', 'Bakr', '000008', 'Female', 2, 'Nadia Bakr', 'Mother', '6421234008', '2013-09-05'),
(1, 'Bilal', 'Osman', '000009', 'Male', 1, 'Tariq Osman', 'Father', '6421234009', '2011-12-20'),
(1, 'Aisha', 'Saleh', '000010', 'Female', 2, 'Layla Saleh', 'Mother', '6421234010', '2014-03-17'),
(1, 'Omar', 'Abdallah', '000011', 'Male', 1, 'Saeed Abdallah', 'Father', '6421234011', '2012-06-08'),
-- Unassigned students
(1, 'Hamza', 'Noor', '000012', 'Male', NULL, 'Idris Noor', 'Father', '6421234012', '2013-04-25'),
(1, 'Safiya', 'Amin', '000013', 'Female', NULL, 'Ruqayya Amin', 'Mother', '6421234013', '2014-10-12');

-- =====================================================
-- Students for madrasah 2 (Al-Noor)
-- =====================================================
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, date_of_birth) VALUES
(2, 'Zayd', 'Rahman', '000001', 'Male', 3, 'Nadia Rahman', 'Mother', '2125550101', '+1', '2014-03-12'),
(2, 'Sumaya', 'Khan', '000002', 'Female', 3, 'Mariam Khan', 'Mother', '2125550102', '+1', '2015-07-08'),
(2, 'Idris', 'Shah', '000003', 'Male', 3, 'Tahir Shah', 'Father', '2125550103', '+1', '2013-11-22'),
(2, 'Ruqaya', 'Hussain', '000004', 'Female', 4, 'Fareeda Hussain', 'Mother', '2125550104', '+1', '2012-05-30'),
(2, 'Uthman', 'Patel', '000005', 'Male', 4, 'Yaqub Patel', 'Father', '2125550105', '+1', '2012-09-14'),
(2, 'Hafsa', 'Qureshi', '000006', 'Female', 4, 'Saba Qureshi', 'Mother', '2125550106', '+1', '2013-01-03'),
(2, 'Muadh', 'Farooq', '000007', 'Male', 5, 'Amira Farooq', 'Mother', '2125550107', '+1', '2010-06-19'),
(2, 'Asma', 'Siddiqui', '000008', 'Female', 5, 'Rabia Siddiqui', 'Mother', '2125550108', '+1', '2011-08-25'),
(2, 'Hamza', 'Mirza', '000009', 'Male', 5, 'Faisal Mirza', 'Father', '2125550109', '+1', '2010-12-07'),
(2, 'Noor', 'Ahmed', '000010', 'Female', 3, 'Bushra Ahmed', 'Mother', '2125550110', '+1', '2015-02-14'),
(2, 'Tariq', 'Ali', '000011', 'Male', 4, 'Junaid Ali', 'Father', '2125550111', '+1', '2012-10-30'),
(2, 'Layla', 'Hassan', '000012', 'Female', 5, 'Saira Hassan', 'Mother', '2125550112', '+1', '2011-04-18');

-- =====================================================
-- Attendance data for Demo Madrasah (recent dates)
-- =====================================================
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade) VALUES
-- Monday March 16, 2026 — Junior Boys (class 1)
(1, 1, 1, 2, 2, '2026-03-16', TRUE, 'Good', 'Good'),
(1, 3, 1, 2, 2, '2026-03-16', TRUE, 'Excellent', 'Excellent'),
(1, 5, 1, 2, 2, '2026-03-16', TRUE, 'Good', 'Fair'),
(1, 7, 1, 2, 2, '2026-03-16', FALSE, NULL, NULL),
(1, 8, 1, 2, 2, '2026-03-16', TRUE, 'Good', 'Good'),
(1, 10, 1, 2, 2, '2026-03-16', TRUE, 'Fair', 'Good'),
-- Wednesday March 11, 2026 — Junior Boys
(1, 1, 1, 2, 2, '2026-03-11', TRUE, 'Good', 'Good'),
(1, 3, 1, 2, 2, '2026-03-11', TRUE, 'Good', 'Excellent'),
(1, 5, 1, 2, 2, '2026-03-11', FALSE, NULL, NULL),
(1, 7, 1, 2, 2, '2026-03-11', TRUE, 'Good', 'Good'),
(1, 8, 1, 2, 2, '2026-03-11', TRUE, 'Excellent', 'Good'),
(1, 10, 1, 2, 2, '2026-03-11', TRUE, 'Good', 'Good');

-- =====================================================
-- Exam performance data
-- =====================================================
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date) VALUES
(1, 1, 2, 2, 'Quran Recitation', 85.00, 100.00, '2026-03-01'),
(1, 3, 2, 2, 'Quran Recitation', 92.00, 100.00, '2026-03-01'),
(1, 5, 2, 2, 'Quran Recitation', 78.00, 100.00, '2026-03-01'),
(1, 1, 2, 2, 'Islamic Studies', 88.00, 100.00, '2026-03-02'),
(1, 3, 2, 2, 'Islamic Studies', 95.00, 100.00, '2026-03-02'),
(1, 5, 2, 2, 'Islamic Studies', 72.00, 100.00, '2026-03-02');

-- =====================================================
-- SMS credits
-- =====================================================
INSERT INTO sms_credits (madrasah_id, balance, total_purchased, total_used) VALUES
(1, 45, 50, 5),
(2, 92, 100, 8);

INSERT INTO sms_credit_purchases (madrasah_id, credits, amount_cents, currency, status, purchased_by, created_at) VALUES
(1, 50, 500, 'usd', 'completed', 1, '2026-02-15 10:00:00'),
(2, 100, 900, 'usd', 'completed', 3, '2026-02-20 14:30:00');

INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, credits_used, sent_by, created_at) VALUES
(1, 1, '123494995590', 'Assalamu Alaikum. This is a fee reminder from Demo Madrasah.', 'fee_reminder', 'delivered', 1, 1, '2026-03-01 09:00:00'),
(1, 2, '6421234002', 'Assalamu Alaikum. This is a fee reminder from Demo Madrasah.', 'fee_reminder', 'delivered', 1, 1, '2026-03-01 09:00:01');

-- =====================================================
-- Student promotions (one dropout)
-- =====================================================
INSERT INTO student_promotions (madrasah_id, student_id, from_class_id, to_class_id, session_id, promotion_type, promoted_by) VALUES
(1, 12, 1, NULL, 1, 'dropped_out', 1);

-- =====================================================
-- Fee tracking
-- =====================================================
UPDATE students SET expected_fee = 50.00, fee_note = 'Monthly tuition' WHERE madrasah_id = 1 AND class_id IS NOT NULL;
UPDATE students SET expected_fee = 75.00, fee_note = 'Monthly tuition' WHERE madrasah_id = 2 AND class_id IN (3, 4);
UPDATE students SET expected_fee = 100.00, fee_note = 'Monthly Hifz program' WHERE madrasah_id = 2 AND class_id = 5;

-- =====================================================
-- Auto fee reminder and currency settings
-- =====================================================
UPDATE madrasahs SET currency = 'NZD' WHERE id IN (1, 2);

-- =====================================================
-- Demo madrasahs (for /demo page)
-- =====================================================
INSERT INTO madrasahs (name, slug, email, pricing_plan, subscription_status) VALUES
('Ustadh Idris Classes', 'solo-demo', 'admin@solo-demo.com', 'solo', 'active'),
('Al-Noor Weekend School', 'standard-demo', 'admin@standard-demo.com', 'standard', 'active'),
('Baitul Ilm Academy Demo', 'plus-demo', 'admin@plus-demo.com', 'plus', 'active'),
('Darul Uloom Al-Hikmah', 'enterprise-demo', 'admin@enterprise-demo.com', 'enterprise', 'active');

-- Demo admins (password: demo123)
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role) VALUES
(5, 'Idris', 'Demo', 'admin@solo-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin'),
(6, 'Noor', 'Demo', 'admin@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin'),
(7, 'Ilm', 'Demo', 'admin@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin'),
(8, 'Hikmah', 'Demo', 'admin@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin');

-- Demo teachers (password: demo123)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, role) VALUES
(5, 'Solo', 'Teacher', '00001', 'teacher@solo-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'teacher'),
(6, 'Standard', 'Teacher', '00001', 'teacher@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'teacher'),
(7, 'Plus', 'Teacher', '00001', 'teacher@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'teacher'),
(8, 'Enterprise', 'Teacher', '00001', 'teacher@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'teacher');

-- Demo sessions (active for each demo madrasah)
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(5, '2025-2026', '2025-09-01', '2026-06-30', TRUE),
(6, '2025-2026', '2025-09-01', '2026-06-30', TRUE),
(7, '2025-2026', '2025-09-01', '2026-06-30', TRUE),
(8, '2025-2026', '2025-09-01', '2026-06-30', TRUE);

-- Demo semesters
INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(4, 'Term 1', '2025-09-01', '2025-12-19', FALSE),
(4, 'Term 2', '2026-01-20', '2026-06-30', TRUE),
(5, 'Term 1', '2025-09-01', '2025-12-19', FALSE),
(5, 'Term 2', '2026-01-20', '2026-06-30', TRUE),
(6, 'Term 1', '2025-09-01', '2025-12-19', FALSE),
(6, 'Term 2', '2026-01-20', '2026-06-30', TRUE),
(7, 'Term 1', '2025-09-01', '2025-12-19', FALSE),
(7, 'Term 2', '2026-01-20', '2026-06-30', TRUE);

-- Demo classes
INSERT INTO classes (madrasah_id, name, grade_level, school_days) VALUES
-- Solo (2 classes)
(5, 'Quran Basics', 'Level 1', '["Saturday"]'),
(5, 'Quran Intermediate', 'Level 2', '["Sunday"]'),
-- Standard (2 classes)
(6, 'Junior Boys', 'Grade 5-6', '["Saturday", "Sunday"]'),
(6, 'Junior Girls', 'Grade 5-6', '["Saturday", "Sunday"]'),
-- Plus (4 classes)
(7, 'Beginners', 'Level 1', '["Saturday", "Sunday"]'),
(7, 'Intermediate', 'Level 2', '["Saturday", "Sunday"]'),
(7, 'Advanced', 'Level 3', '["Saturday", "Sunday"]'),
(7, 'Hifz', 'Level 4', '["Monday", "Wednesday", "Friday", "Saturday", "Sunday"]'),
-- Enterprise (6 classes)
(8, 'Prep A', 'Year 1', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
(8, 'Prep B', 'Year 1', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
(8, 'Middle A', 'Year 2', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
(8, 'Middle B', 'Year 2', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
(8, 'Senior', 'Year 3', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'),
(8, 'Hifz Program', 'Year 3', '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]');

-- Demo students (sampling — solo 6, standard 8, plus 16, enterprise 24)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
-- Solo (6 students)
(5, 'Ahmad', 'Nasser', '000001', 'Male', 6, 'Khalid Nasser', 'Father', '5551000001'),
(5, 'Sara', 'Nasser', '000002', 'Female', 6, 'Khalid Nasser', 'Father', '5551000001'),
(5, 'Yusuf', 'Bakri', '000003', 'Male', 6, 'Mahmoud Bakri', 'Father', '5551000002'),
(5, 'Amina', 'Salim', '000004', 'Female', 7, 'Ruqayya Salim', 'Mother', '5551000003'),
(5, 'Tariq', 'Hassan', '000005', 'Male', 7, 'Ali Hassan', 'Father', '5551000004'),
(5, 'Layla', 'Omar', '000006', 'Female', 7, 'Fatima Omar', 'Mother', '5551000005'),
-- Standard (8 students)
(6, 'Zayd', 'Mahmoud', '000001', 'Male', 8, 'Jamal Mahmoud', 'Father', '5552000001'),
(6, 'Bilal', 'Ahmed', '000002', 'Male', 8, 'Rashid Ahmed', 'Father', '5552000002'),
(6, 'Hamza', 'Osman', '000003', 'Male', 8, 'Saeed Osman', 'Father', '5552000003'),
(6, 'Omar', 'Farooq', '000004', 'Male', 8, 'Imran Farooq', 'Father', '5552000004'),
(6, 'Aisha', 'Khan', '000005', 'Female', 9, 'Nasreen Khan', 'Mother', '5552000005'),
(6, 'Maryam', 'Iqbal', '000006', 'Female', 9, 'Sabina Iqbal', 'Mother', '5552000006'),
(6, 'Hafsa', 'Siddiq', '000007', 'Female', 9, 'Rabia Siddiq', 'Mother', '5552000007'),
(6, 'Khadija', 'Rashid', '000008', 'Female', 9, 'Bushra Rashid', 'Mother', '5552000008'),
-- Plus (16 students)
(7, 'Ibrahim', 'Zahir', '000001', 'Male', 10, 'Nabil Zahir', 'Father', '5553000001'),
(7, 'Yasir', 'Khalil', '000002', 'Male', 10, 'Adnan Khalil', 'Father', '5553000002'),
(7, 'Sami', 'Noor', '000003', 'Male', 10, 'Kamran Noor', 'Father', '5553000003'),
(7, 'Nadia', 'Aziz', '000004', 'Female', 10, 'Safiya Aziz', 'Mother', '5553000004'),
(7, 'Uthman', 'Raza', '000005', 'Male', 11, 'Farhan Raza', 'Father', '5553000005'),
(7, 'Salman', 'Qureshi', '000006', 'Male', 11, 'Rizwan Qureshi', 'Father', '5553000006'),
(7, 'Sumaya', 'Bhatt', '000007', 'Female', 11, 'Shabnam Bhatt', 'Mother', '5553000007'),
(7, 'Ruqaya', 'Mir', '000008', 'Female', 11, 'Asma Mir', 'Mother', '5553000008'),
(7, 'Muadh', 'Shah', '000009', 'Male', 12, 'Waqar Shah', 'Father', '5553000009'),
(7, 'Asma', 'Lone', '000010', 'Female', 12, 'Mehvish Lone', 'Mother', '5553000010'),
(7, 'Idris', 'Dar', '000011', 'Male', 12, 'Shabir Dar', 'Father', '5553000011'),
(7, 'Noor', 'Wani', '000012', 'Female', 12, 'Rifat Wani', 'Mother', '5553000012'),
(7, 'Hamza', 'Bhat', '000013', 'Male', 13, 'Mushtaq Bhat', 'Father', '5553000013'),
(7, 'Safiya', 'Rather', '000014', 'Female', 13, 'Shaheen Rather', 'Mother', '5553000014'),
(7, 'Talha', 'Ganie', '000015', 'Male', 13, 'Bashir Ganie', 'Father', '5553000015'),
(7, 'Zara', 'Malik', '000016', 'Female', 13, 'Nusrat Malik', 'Mother', '5553000016'),
-- Enterprise (24 students)
(8, 'Abdullah', 'Sharif', '000001', 'Male', 14, 'Imran Sharif', 'Father', '5554000001'),
(8, 'Fatima', 'Sharif', '000002', 'Female', 14, 'Imran Sharif', 'Father', '5554000001'),
(8, 'Usman', 'Jamil', '000003', 'Male', 14, 'Naveed Jamil', 'Father', '5554000002'),
(8, 'Ayesha', 'Jamil', '000004', 'Female', 14, 'Naveed Jamil', 'Father', '5554000002'),
(8, 'Hassan', 'Riaz', '000005', 'Male', 15, 'Shahid Riaz', 'Father', '5554000003'),
(8, 'Husain', 'Riaz', '000006', 'Male', 15, 'Shahid Riaz', 'Father', '5554000003'),
(8, 'Mariam', 'Butt', '000007', 'Female', 15, 'Nazia Butt', 'Mother', '5554000004'),
(8, 'Zainab', 'Butt', '000008', 'Female', 15, 'Nazia Butt', 'Mother', '5554000004'),
(8, 'Ali', 'Chaudhry', '000009', 'Male', 16, 'Afzal Chaudhry', 'Father', '5554000005'),
(8, 'Ahmad', 'Chaudhry', '000010', 'Male', 16, 'Afzal Chaudhry', 'Father', '5554000005'),
(8, 'Sara', 'Akhtar', '000011', 'Female', 16, 'Parveen Akhtar', 'Mother', '5554000006'),
(8, 'Hira', 'Akhtar', '000012', 'Female', 16, 'Parveen Akhtar', 'Mother', '5554000006'),
(8, 'Bilal', 'Mughal', '000013', 'Male', 17, 'Tariq Mughal', 'Father', '5554000007'),
(8, 'Yasir', 'Mughal', '000014', 'Male', 17, 'Tariq Mughal', 'Father', '5554000007'),
(8, 'Sana', 'Sheikh', '000015', 'Female', 17, 'Rubina Sheikh', 'Mother', '5554000008'),
(8, 'Huma', 'Sheikh', '000016', 'Female', 17, 'Rubina Sheikh', 'Mother', '5554000008'),
(8, 'Talha', 'Ansari', '000017', 'Male', 18, 'Zahid Ansari', 'Father', '5554000009'),
(8, 'Owais', 'Ansari', '000018', 'Male', 18, 'Zahid Ansari', 'Father', '5554000009'),
(8, 'Amna', 'Kazmi', '000019', 'Female', 18, 'Sadaf Kazmi', 'Mother', '5554000010'),
(8, 'Iqra', 'Kazmi', '000020', 'Female', 18, 'Sadaf Kazmi', 'Mother', '5554000010'),
(8, 'Hamid', 'Zaidi', '000021', 'Male', 19, 'Syed Zaidi', 'Father', '5554000011'),
(8, 'Mehdi', 'Zaidi', '000022', 'Male', 19, 'Syed Zaidi', 'Father', '5554000011'),
(8, 'Rabia', 'Naqvi', '000023', 'Female', 19, 'Tahira Naqvi', 'Mother', '5554000012'),
(8, 'Sakina', 'Naqvi', '000024', 'Female', 19, 'Tahira Naqvi', 'Mother', '5554000012');
UPDATE madrasahs SET
  auto_fee_reminder_enabled = TRUE,
  auto_fee_reminder_day = 1,
  auto_fee_reminder_message = 'Assalamu Alaikum. This is a friendly reminder that fees for {month} are now due. JazakAllah khair.'
WHERE id = 2;

-- =====================================================
-- Demo cohort data for enterprise-demo (id=8)
-- Admin can switch to Cohort mode in Settings to use these
-- =====================================================
INSERT INTO cohorts (madrasah_id, name, start_date, end_date, is_active, default_school_days) VALUES
(8, 'Beginners Cohort 2025', '2025-01-06', '2025-12-20', TRUE, '["Saturday", "Sunday"]'),
(8, 'Advanced Cohort 2025', '2025-01-06', '2025-12-20', TRUE, '["Saturday", "Sunday"]');

-- Periods for each cohort (cohort ids: last 2 inserts)
INSERT INTO cohort_periods (cohort_id, name, start_date, end_date, is_active)
SELECT id, 'Term 1', '2025-01-06', '2025-04-05', TRUE FROM cohorts WHERE madrasah_id = 8 AND name = 'Beginners Cohort 2025';

INSERT INTO cohort_periods (cohort_id, name, start_date, end_date, is_active)
SELECT id, 'Term 2', '2025-04-28', '2025-07-19', FALSE FROM cohorts WHERE madrasah_id = 8 AND name = 'Beginners Cohort 2025';

INSERT INTO cohort_periods (cohort_id, name, start_date, end_date, is_active)
SELECT id, 'Term 1', '2025-01-06', '2025-04-05', TRUE FROM cohorts WHERE madrasah_id = 8 AND name = 'Advanced Cohort 2025';

INSERT INTO cohort_periods (cohort_id, name, start_date, end_date, is_active)
SELECT id, 'Term 2', '2025-04-28', '2025-07-19', FALSE FROM cohorts WHERE madrasah_id = 8 AND name = 'Advanced Cohort 2025';
