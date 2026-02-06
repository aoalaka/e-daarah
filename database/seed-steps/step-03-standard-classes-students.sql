-- STEP 3: Standard Demo - Classes + Students
-- Depends on Step 2 (uses standard-demo madrasah)

SET @std_id = (SELECT id FROM madrasahs WHERE slug = 'standard-demo');
SET @std_teacher = (SELECT id FROM users WHERE email = 'teacher@standard-demo.com' AND madrasah_id = @std_id);

-- Classes
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
(@std_id, 'Ibrahim', 'Khan', '200001', 'Male', @std_class1, '2015-03-12', 'Amina Khan', 'Mother', '221100001'),
(@std_id, 'Zara', 'Ahmed', '200002', 'Female', @std_class1, '2014-07-22', 'Sara Ahmed', 'Mother', '221100002'),
(@std_id, 'Nuh', 'Patel', '200003', 'Male', @std_class1, '2015-11-08', 'Ismail Patel', 'Father', '221100003'),
(@std_id, 'Amira', 'Hussain', '200004', 'Female', @std_class1, '2014-01-19', 'Fatima Hussain', 'Mother', '221100004'),
(@std_id, 'Suleiman', 'Osman', '200005', 'Male', @std_class2, '2013-05-25', 'Mariam Osman', 'Mother', '221100005'),
(@std_id, 'Halima', 'Diallo', '200006', 'Female', @std_class2, '2012-09-14', 'Kadija Diallo', 'Mother', '221100006'),
(@std_id, 'Dawud', 'Sharif', '200007', 'Male', @std_class2, '2013-08-30', 'Noor Sharif', 'Father', '221100007'),
(@std_id, 'Safiya', 'Noor', '200008', 'Female', @std_class2, '2012-12-05', 'Hassan Noor', 'Father', '221100008');

SELECT 'Step 3 complete: Standard classes + 8 students created' AS status;
