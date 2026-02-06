-- STEP 5: Create Plus Demo madrasah + admin + 3 teachers + session/semester
-- Password for all: demo123

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Baitul Ilm Academy', 'plus-demo', '120 Queen Street', 'Wellington', 'Wellington Region', 'New Zealand', '94001234', 'admin@plus-demo.com', TRUE, 'plus', 'active');
SET @plus_id = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@plus_id, 'Fatima', 'Al-Rashid', 'admin@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001001', 'admin');

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@plus_id, 'Ustadh', 'Hamza', '20001', 'teacher1@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001002', 'teacher'),
(@plus_id, 'Ustadha', 'Zaynab', '20002', 'teacher2@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001003', 'teacher'),
(@plus_id, 'Ustadh', 'Khalid', '20003', 'teacher3@plus-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '212001004', 'teacher');

INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@plus_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @plus_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@plus_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);

SELECT 'Step 5 complete: Plus madrasah + 1 admin + 3 teachers created' AS status;
SELECT @plus_id AS plus_madrasah_id;
