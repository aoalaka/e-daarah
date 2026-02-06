-- STEP 9: Enterprise Demo - 24 Students
-- Depends on Step 8

SET @ent_id = (SELECT id FROM madrasahs WHERE slug = 'enterprise-demo');
SET @ent_c1 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Alim Course - Year 1');
SET @ent_c2 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Alimah Course - Year 1');
SET @ent_c3 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Hifz Intensive - Boys');
SET @ent_c4 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Hifz Intensive - Girls');
SET @ent_c5 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Weekend Maktab - Junior');
SET @ent_c6 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Weekend Maktab - Senior');

-- Alim (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Abdullah', 'Hashim', '400001', 'Male', @ent_c1, '2008-02-14', 'Maryam Hashim', 'Mother', '223100001'),
(@ent_id, 'Ismail', 'Noorani', '400002', 'Male', @ent_c1, '2007-06-28', 'Khalid Noorani', 'Father', '223100002'),
(@ent_id, 'Suhail', 'Ansari', '400003', 'Male', @ent_c1, '2008-09-03', 'Ruqayyah Ansari', 'Mother', '223100003'),
(@ent_id, 'Junaid', 'Bukhari', '400004', 'Male', @ent_c1, '2007-11-17', 'Safia Bukhari', 'Mother', '223100004');

-- Alimah (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Hafsa', 'Qasim', '400005', 'Female', @ent_c2, '2008-04-10', 'Aisha Qasim', 'Mother', '223100005'),
(@ent_id, 'Zainab', 'Farooqi', '400006', 'Female', @ent_c2, '2007-08-22', 'Bilal Farooqi', 'Father', '223100006'),
(@ent_id, 'Umm Kulthum', 'Hasan', '400007', 'Female', @ent_c2, '2008-01-30', 'Noor Hasan', 'Mother', '223100007'),
(@ent_id, 'Safiyyah', 'Umar', '400008', 'Female', @ent_c2, '2007-12-15', 'Khadija Umar', 'Mother', '223100008');

-- Hifz Boys (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Muaz', 'Jabal', '400009', 'Male', @ent_c3, '2012-03-20', 'Fatima Jabal', 'Mother', '223100009'),
(@ent_id, 'Salman', 'Farsi', '400010', 'Male', @ent_c3, '2011-07-14', 'Ahmad Farsi', 'Father', '223100010'),
(@ent_id, 'Hamza', 'Asad', '400011', 'Male', @ent_c3, '2012-05-09', 'Sara Asad', 'Mother', '223100011'),
(@ent_id, 'Usama', 'Zayd', '400012', 'Male', @ent_c3, '2011-10-28', 'Noor Zayd', 'Mother', '223100012');

-- Hifz Girls (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Amatul-Rahman', 'Siddiq', '400013', 'Female', @ent_c4, '2012-01-18', 'Amina Siddiq', 'Mother', '223100013'),
(@ent_id, 'Khadijah', 'Waleed', '400014', 'Female', @ent_c4, '2011-09-05', 'Hafsa Waleed', 'Mother', '223100014'),
(@ent_id, 'Sumayyah', 'Khattab', '400015', 'Female', @ent_c4, '2012-06-12', 'Zainab Khattab', 'Mother', '223100015'),
(@ent_id, 'Asiyah', 'Imran', '400016', 'Female', @ent_c4, '2011-11-25', 'Maryam Imran', 'Mother', '223100016');

-- Weekend Junior (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Yusuf', 'Hadi', '400017', 'Male', @ent_c5, '2016-03-10', 'Sara Hadi', 'Mother', '223100017'),
(@ent_id, 'Aisha', 'Uthman', '400018', 'Female', @ent_c5, '2015-07-25', 'Fatima Uthman', 'Mother', '223100018'),
(@ent_id, 'Bilal', 'Habashi', '400019', 'Male', @ent_c5, '2016-01-05', 'Layla Habashi', 'Mother', '223100019'),
(@ent_id, 'Ruqayyah', 'Talib', '400020', 'Female', @ent_c5, '2015-11-18', 'Ahmad Talib', 'Father', '223100020');

-- Weekend Senior (4)
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, date_of_birth, parent_guardian_name, parent_guardian_relationship, parent_guardian_phone) VALUES
(@ent_id, 'Khalid', 'Waleed', '400021', 'Male', @ent_c6, '2013-05-22', 'Amina Waleed', 'Mother', '223100021'),
(@ent_id, 'Fatimah', 'Zahrah', '400022', 'Female', @ent_c6, '2012-08-15', 'Noor Zahrah', 'Father', '223100022'),
(@ent_id, 'Taha', 'Husain', '400023', 'Male', @ent_c6, '2013-02-28', 'Safiya Husain', 'Mother', '223100023'),
(@ent_id, 'Maimunah', 'Harith', '400024', 'Female', @ent_c6, '2012-10-10', 'Khadija Harith', 'Mother', '223100024');

SELECT 'Step 9 complete: Enterprise 24 students created' AS status;
