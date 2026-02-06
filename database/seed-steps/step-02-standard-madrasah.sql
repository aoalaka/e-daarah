-- STEP 2: Create Standard Demo madrasah + admin + teacher
-- Password for all: demo123

INSERT INTO madrasahs (name, slug, street, city, region, country, phone, email, is_active, pricing_plan, subscription_status) VALUES
('Al-Noor Weekend School', 'standard-demo', '55 Hobson Street', 'Auckland', 'Auckland Region', 'New Zealand', '93001234', 'admin@standard-demo.com', TRUE, 'standard', 'active');
SET @std_id = LAST_INSERT_ID();

INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, role) VALUES
(@std_id, 'Yusuf', 'Rahman', 'admin@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211001001', 'admin');

INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(@std_id, 'Ustadh', 'Bilal', '10001', 'teacher@standard-demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', '211001002', 'teacher');

INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(@std_id, '2025-2026', '2025-09-01', '2026-06-30', TRUE);
SET @std_session = LAST_INSERT_ID();

INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(@std_session, 'Semester 1', '2025-09-01', '2026-01-31', TRUE);

SELECT 'Step 2 complete: Standard madrasah created' AS status;
SELECT @std_id AS standard_madrasah_id;
