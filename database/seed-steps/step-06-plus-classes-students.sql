-- STEP 6: Plus Demo - Classes + Students (16)
-- Depends on Step 5

SET @plus_id = (SELECT id FROM madrasahs WHERE slug = 'plus-demo');
SET @plus_t1 = (SELECT id FROM users WHERE email = 'teacher1@plus-demo.com' AND madrasah_id = @plus_id);
SET @plus_t2 = (SELECT id FROM users WHERE email = 'teacher2@plus-demo.com' AND madrasah_id = @plus_id);
SET @plus_t3 = (SELECT id FROM users WHERE email = 'teacher3@plus-demo.com' AND madrasah_id = @plus_id);

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
(@plus_id, 'Muhammad', 'Farooq', '300001', 'Male', @plus_c1, '2013-02-14', 'Aisha Farooq', 'Mother', '222100001'),
(@plus_id, 'Usman', 'Qureshi', '300002', 'Male', @plus_c1, '2012-06-28', 'Zainab Qureshi', 'Mother', '222100002'),
(@plus_id, 'Talha', 'Siddiqui', '300003', 'Male', @plus_c1, '2013-09-03', 'Bilal Siddiqui', 'Father', '222100003'),
(@plus_id, 'Anas', 'Malik', '300004', 'Male', @plus_c1, '2012-11-17', 'Hafsa Malik', 'Mother', '222100004'),
(@plus_id, 'Ruqayyah', 'Hassan', '300005', 'Female', @plus_c2, '2013-04-10', 'Sumayyah Hassan', 'Mother', '222100005'),
(@plus_id, 'Asma', 'Ibrahim', '300006', 'Female', @plus_c2, '2012-08-22', 'Yusuf Ibrahim', 'Father', '222100006'),
(@plus_id, 'Hana', 'Omar', '300007', 'Female', @plus_c2, '2013-01-30', 'Khadija Omar', 'Mother', '222100007'),
(@plus_id, 'Sumayya', 'Ali', '300008', 'Female', @plus_c2, '2012-12-15', 'Nadia Ali', 'Mother', '222100008'),
(@plus_id, 'Idris', 'Mohammed', '300009', 'Male', @plus_c3, '2012-03-20', 'Layla Mohammed', 'Mother', '222100009'),
(@plus_id, 'Mariam', 'Yusuf', '300010', 'Female', @plus_c3, '2011-07-14', 'Ahmad Yusuf', 'Father', '222100010'),
(@plus_id, 'Zakariya', 'Rahman', '300011', 'Male', @plus_c3, '2012-05-09', 'Noor Rahman', 'Mother', '222100011'),
(@plus_id, 'Nadia', 'Bakr', '300012', 'Female', @plus_c3, '2011-10-28', 'Abu Bakr', 'Father', '222100012'),
(@plus_id, 'Yaqub', 'Saleh', '300013', 'Male', @plus_c4, '2011-01-18', 'Fatima Saleh', 'Mother', '222100013'),
(@plus_id, 'Layla', 'Abdulrahman', '300014', 'Female', @plus_c4, '2010-09-05', 'Sara Abdulrahman', 'Mother', '222100014'),
(@plus_id, 'Muadh', 'Tariq', '300015', 'Male', @plus_c4, '2011-06-12', 'Amina Tariq', 'Mother', '222100015'),
(@plus_id, 'Huda', 'Nasir', '300016', 'Female', @plus_c4, '2010-11-25', 'Khalid Nasir', 'Father', '222100016');

SELECT 'Step 6 complete: Plus 4 classes + 16 students created' AS status;
