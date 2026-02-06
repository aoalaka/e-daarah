-- STEP 4: Standard Demo - Attendance + Exams
-- Depends on Steps 2-3

SET @std_id = (SELECT id FROM madrasahs WHERE slug = 'standard-demo');
SET @std_teacher = (SELECT id FROM users WHERE email = 'teacher@standard-demo.com' AND madrasah_id = @std_id);
SET @std_semester = (SELECT sem.id FROM semesters sem JOIN sessions ses ON sem.session_id = ses.id WHERE ses.madrasah_id = @std_id AND sem.is_active = TRUE LIMIT 1);
SET @std_class1 = (SELECT id FROM classes WHERE madrasah_id = @std_id AND name = 'Quran Basics');
SET @std_class2 = (SELECT id FROM classes WHERE madrasah_id = @std_id AND name = 'Islamic Studies');

SET @std_s1 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200001');
SET @std_s2 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200002');
SET @std_s3 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200003');
SET @std_s4 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200004');
SET @std_s5 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200005');
SET @std_s6 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200006');
SET @std_s7 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200007');
SET @std_s8 = (SELECT id FROM students WHERE madrasah_id = @std_id AND student_id = '200008');

-- Attendance Week 1 (Saturday 2026-01-03)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@std_id, @std_s1, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s2, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Excellent', 'Excellent', 'Mashallah'),
(@std_id, @std_s3, @std_class1, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Fair', 'Late'),
(@std_id, @std_s4, @std_class1, @std_semester, @std_teacher, '2026-01-03', FALSE, NULL, NULL, 'Sick'),
(@std_id, @std_s5, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s6, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Excellent', NULL),
(@std_id, @std_s7, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Fair', 'Good', NULL),
(@std_id, @std_s8, @std_class2, @std_semester, @std_teacher, '2026-01-03', TRUE, 'Good', 'Good', NULL);

-- Attendance Week 2 (Saturday 2026-01-10)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
(@std_id, @std_s1, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Excellent', 'Good', NULL),
(@std_id, @std_s2, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Excellent', 'Excellent', NULL),
(@std_id, @std_s3, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', 'Improved'),
(@std_id, @std_s4, @std_class1, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', 'Back from illness'),
(@std_id, @std_s5, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', NULL),
(@std_id, @std_s6, @std_class2, @std_semester, @std_teacher, '2026-01-10', FALSE, NULL, NULL, 'Family trip'),
(@std_id, @std_s7, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Fair', 'Distracted'),
(@std_id, @std_s8, @std_class2, @std_semester, @std_teacher, '2026-01-10', TRUE, 'Good', 'Good', NULL);

-- Attendance Week 3 (Saturday 2026-01-17)
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

SELECT 'Step 4 complete: Standard attendance (24 records) + exams (8 records)' AS status;
