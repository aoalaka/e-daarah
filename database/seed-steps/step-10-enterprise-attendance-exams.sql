-- STEP 10: Enterprise Demo - Attendance + Exams
-- Depends on Steps 8-9

SET @ent_id = (SELECT id FROM madrasahs WHERE slug = 'enterprise-demo');
SET @ent_t1 = (SELECT id FROM users WHERE email = 'teacher1@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t2 = (SELECT id FROM users WHERE email = 'teacher2@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t3 = (SELECT id FROM users WHERE email = 'teacher3@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t4 = (SELECT id FROM users WHERE email = 'teacher4@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_semester = (SELECT sem.id FROM semesters sem JOIN sessions ses ON sem.session_id = ses.id WHERE ses.madrasah_id = @ent_id AND sem.is_active = TRUE LIMIT 1);
SET @ent_c1 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Alim Course - Year 1');
SET @ent_c3 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Hifz Intensive - Boys');
SET @ent_c5 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Weekend Maktab - Junior');
SET @ent_c6 = (SELECT id FROM classes WHERE madrasah_id = @ent_id AND name = 'Weekend Maktab - Senior');

SET @ent_s1 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400001');
SET @ent_s2 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400002');
SET @ent_s3 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400003');
SET @ent_s4 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400004');
SET @ent_s9 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400009');
SET @ent_s10 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400010');
SET @ent_s11 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400011');
SET @ent_s12 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400012');
SET @ent_s17 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400017');
SET @ent_s18 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400018');
SET @ent_s19 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400019');
SET @ent_s20 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400020');
SET @ent_s21 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400021');
SET @ent_s22 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400022');
SET @ent_s23 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400023');
SET @ent_s24 = (SELECT id FROM students WHERE madrasah_id = @ent_id AND student_id = '400024');

-- Week 1 Monday 2026-01-05
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

SELECT 'Step 10 complete: Enterprise attendance (32 records) + exams (20 records)' AS status;
SELECT '========================================' AS info;
SELECT 'ALL DONE! Demo logins:' AS summary;
SELECT 'STANDARD:   /standard-demo/login   | admin@standard-demo.com / demo123' AS login1;
SELECT 'PLUS:       /plus-demo/login       | admin@plus-demo.com / demo123' AS login2;
SELECT 'ENTERPRISE: /enterprise-demo/login | admin@enterprise-demo.com / demo123' AS login3;
