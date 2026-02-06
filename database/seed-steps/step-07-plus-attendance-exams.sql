-- STEP 7: Plus Demo - Attendance + Exams
-- Depends on Steps 5-6

SET @plus_id = (SELECT id FROM madrasahs WHERE slug = 'plus-demo');
SET @plus_t1 = (SELECT id FROM users WHERE email = 'teacher1@plus-demo.com' AND madrasah_id = @plus_id);
SET @plus_t2 = (SELECT id FROM users WHERE email = 'teacher2@plus-demo.com' AND madrasah_id = @plus_id);
SET @plus_t3 = (SELECT id FROM users WHERE email = 'teacher3@plus-demo.com' AND madrasah_id = @plus_id);
SET @plus_semester = (SELECT sem.id FROM semesters sem JOIN sessions ses ON sem.session_id = ses.id WHERE ses.madrasah_id = @plus_id AND sem.is_active = TRUE LIMIT 1);
SET @plus_c1 = (SELECT id FROM classes WHERE madrasah_id = @plus_id AND name = 'Hifz Program - Boys');
SET @plus_c2 = (SELECT id FROM classes WHERE madrasah_id = @plus_id AND name = 'Hifz Program - Girls');
SET @plus_c3 = (SELECT id FROM classes WHERE madrasah_id = @plus_id AND name = 'Arabic Language');
SET @plus_c4 = (SELECT id FROM classes WHERE madrasah_id = @plus_id AND name = 'Islamic Sciences');

SET @plus_s1 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300001');
SET @plus_s2 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300002');
SET @plus_s3 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300003');
SET @plus_s4 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300004');
SET @plus_s5 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300005');
SET @plus_s6 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300006');
SET @plus_s7 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300007');
SET @plus_s8 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300008');
SET @plus_s9 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300009');
SET @plus_s10 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300010');
SET @plus_s11 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300011');
SET @plus_s12 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300012');
SET @plus_s13 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300013');
SET @plus_s14 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300014');
SET @plus_s15 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300015');
SET @plus_s16 = (SELECT id FROM students WHERE madrasah_id = @plus_id AND student_id = '300016');

-- Week 1 Monday 2026-01-05
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

-- Exams batch 1
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

-- Exams batch 2
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, score, max_score, exam_date, notes) VALUES
(@plus_id, @plus_s1, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 94.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s2, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 86.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s3, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 80.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s4, @plus_semester, @plus_t1, 'Quran Recitation Assessment', 82.5, 100, '2026-01-21', 'Improved'),
(@plus_id, @plus_s5, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 98.0, 100, '2026-01-21', 'Mastery'),
(@plus_id, @plus_s6, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 91.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s7, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 87.0, 100, '2026-01-21', NULL),
(@plus_id, @plus_s8, @plus_semester, @plus_t2, 'Hifz Revision - Juz 30', 89.5, 100, '2026-01-21', NULL);

SELECT 'Step 7 complete: Plus attendance (44 records) + exams (24 records)' AS status;
