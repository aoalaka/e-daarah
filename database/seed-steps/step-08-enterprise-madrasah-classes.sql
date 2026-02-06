-- STEP 8: Create Enterprise Demo madrasah + admin + 4 teachers + session/semester + 6 classes
-- Password for all: demo123

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Darul Uloom Al-Hikmah', 'enterprise-demo', '200 Lambton Quay', 'Christchurch', 'Canterbury', 'New Zealand', '95001234', 'admin@enterprise-demo.com', TRUE, 'enterprise', 'active');
SET @ent_id = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@ent_id, 'Sheikh', 'Abdul-Kareem', 'admin@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001001', 'admin');

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@ent_id, 'Mufti', 'Ismail', '30001', 'teacher1@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001002', 'teacher'),
(@ent_id, 'Ustadha', 'Maryam', '30002', 'teacher2@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001003', 'teacher'),
(@ent_id, 'Sheikh', 'Ahmad', '30003', 'teacher3@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001004', 'teacher'),
(@ent_id, 'Ustadha', 'Nusaibah', '30004', 'teacher4@enterprise-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '213001005', 'teacher');

INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@ent_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @ent_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@ent_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);

-- Look up teacher IDs for class assignments
SET @ent_t1 = (SELECT id FROM users WHERE email = 'teacher1@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t2 = (SELECT id FROM users WHERE email = 'teacher2@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t3 = (SELECT id FROM users WHERE email = 'teacher3@enterprise-demo.com' AND madrasah_id = @ent_id);
SET @ent_t4 = (SELECT id FROM users WHERE email = 'teacher4@enterprise-demo.com' AND madrasah_id = @ent_id);

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

SELECT 'Step 8 complete: Enterprise madrasah + 1 admin + 4 teachers + 6 classes' AS status;
SELECT @ent_id AS enterprise_madrasah_id;
