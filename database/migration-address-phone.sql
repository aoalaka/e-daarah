-- Migration: Add address fields and country codes for phone numbers
-- This will delete all existing data and restructure tables

USE madrasah_admin;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all existing data
TRUNCATE TABLE attendance;
TRUNCATE TABLE exam_performance;
TRUNCATE TABLE class_teachers;
TRUNCATE TABLE students;
TRUNCATE TABLE classes;
TRUNCATE TABLE semesters;
TRUNCATE TABLE sessions;
TRUNCATE TABLE users;
TRUNCATE TABLE madrasahs;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Update madrasahs table with split address fields
-- Check and add columns one by one
SET @dbname = DATABASE();
SET @tablename = 'madrasahs';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'street') = 0,
  'ALTER TABLE madrasahs ADD COLUMN street VARCHAR(255) NOT NULL DEFAULT "" AFTER logo_url',
  'SELECT "Column street already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'city') = 0,
  'ALTER TABLE madrasahs ADD COLUMN city VARCHAR(100) NOT NULL DEFAULT "" AFTER street',
  'SELECT "Column city already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'state') = 0,
  'ALTER TABLE madrasahs ADD COLUMN state VARCHAR(100) NOT NULL DEFAULT "" AFTER city',
  'SELECT "Column state already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'country') = 0,
  'ALTER TABLE madrasahs ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT "" AFTER state',
  'SELECT "Column country already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'phone_country_code') = 0,
  'ALTER TABLE madrasahs ADD COLUMN phone_country_code VARCHAR(5) NOT NULL DEFAULT "+1" AFTER country',
  'SELECT "Column phone_country_code already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

ALTER TABLE madrasahs MODIFY COLUMN phone VARCHAR(20) NOT NULL;

-- Update users table with split address fields and phone country code
SET @tablename = 'users';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'street') = 0,
  'ALTER TABLE users ADD COLUMN street VARCHAR(255) NOT NULL DEFAULT "" AFTER phone',
  'SELECT "Column street already exists in users"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'city') = 0,
  'ALTER TABLE users ADD COLUMN city VARCHAR(100) NOT NULL DEFAULT "" AFTER street',
  'SELECT "Column city already exists in users"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'state') = 0,
  'ALTER TABLE users ADD COLUMN state VARCHAR(100) NOT NULL DEFAULT "" AFTER city',
  'SELECT "Column state already exists in users"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'country') = 0,
  'ALTER TABLE users ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT "" AFTER state',
  'SELECT "Column country already exists in users"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'phone_country_code') = 0,
  'ALTER TABLE users ADD COLUMN phone_country_code VARCHAR(5) NOT NULL DEFAULT "+1" AFTER country',
  'SELECT "Column phone_country_code already exists in users"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;

-- Update students table - add phone and address for student contact
SET @tablename = 'students';

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'student_phone') = 0,
  'ALTER TABLE students ADD COLUMN student_phone VARCHAR(20) AFTER gender',
  'SELECT "Column student_phone already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'student_phone_country_code') = 0,
  'ALTER TABLE students ADD COLUMN student_phone_country_code VARCHAR(5) DEFAULT "+1" AFTER student_phone',
  'SELECT "Column student_phone_country_code already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'street') = 0,
  'ALTER TABLE students ADD COLUMN street VARCHAR(255) AFTER student_phone_country_code',
  'SELECT "Column street already exists in students"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'city') = 0,
  'ALTER TABLE students ADD COLUMN city VARCHAR(100) AFTER street',
  'SELECT "Column city already exists in students"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'state') = 0,
  'ALTER TABLE students ADD COLUMN state VARCHAR(100) AFTER city',
  'SELECT "Column state already exists in students"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'country') = 0,
  'ALTER TABLE students ADD COLUMN country VARCHAR(100) AFTER state',
  'SELECT "Column country already exists in students"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'next_of_kin_phone_country_code') = 0,
  'ALTER TABLE students ADD COLUMN next_of_kin_phone_country_code VARCHAR(5) NOT NULL DEFAULT "+1" AFTER country',
  'SELECT "Column next_of_kin_phone_country_code already exists"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

ALTER TABLE students MODIFY COLUMN next_of_kin_phone VARCHAR(20) NOT NULL;

-- Insert sample madrasah with proper address
INSERT INTO madrasahs (name, slug, street, city, state, country, phone_country_code, phone, is_active) VALUES
('Default Madrasah', 'default', '123 Main Street', 'Auckland', 'Auckland Region', 'New Zealand', '+64', '211234567', TRUE);

-- Insert sample admin user
INSERT INTO users (madrasah_id, first_name, last_name, email, password, phone, phone_country_code, street, city, state, country, role) VALUES
(1, 'Admin', 'User', 'admin@madrasah.com', '$2a$10$6YJvXwzP5fHZxVN5j/YUk.p4VZ9mZ0qL5bN5qJx5vZxYvL8hY8Z0O', '211234567', '+64', '123 Admin Street', 'Auckland', 'Auckland Region', 'New Zealand', 'admin');

-- Insert sample teacher
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, phone_country_code, street, city, state, country, role) VALUES
(1, 'Abdulquadri', 'Alaka', '00384', 'teacher@madrasah.com', '$2a$10$6YJvXwzP5fHZxVN5j/YUk.p4VZ9mZ0qL5bN5qJx5vZxYvL8hY8Z0O', '211234568', '+64', '456 Teacher Lane', 'Wellington', 'Wellington Region', 'New Zealand', 'teacher');

-- Insert sample session
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(1, '2025-2026 Academic Year', '2025-09-01', '2026-06-30', TRUE);

-- Insert sample semester
INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(1, 'First Semester', '2025-09-01', '2026-01-31', TRUE);

-- Insert sample class
INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES
(1, 'Beginners Class', 'Beginner', '["Monday", "Wednesday"]', 'Introduction to Islamic studies');

-- Assign teacher to class
INSERT INTO class_teachers (class_id, teacher_id) VALUES (1, 2);

-- Insert sample students
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, student_phone, student_phone_country_code, street, city, state, country, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes) VALUES
(1, 'Miqdad', 'Ibrahim', '000815', 'Male', 1, '211234569', '+64', '789 Student Road', 'Auckland', 'Auckland Region', 'New Zealand', 'Fatima Ibrahim', 'Mother', '211234570', '+64', 'Excellent student'),
(1, 'Mohammad', 'Araf', '000151', 'Male', 1, '211234571', '+64', '321 Park Avenue', 'Hamilton', 'Waikato Region', 'New Zealand', 'Ahmed Araf', 'Father', '211234572', '+64', 'Good progress'),
(1, 'Uthman', 'Khan', '000906', 'Male', 1, '211234573', '+64', '654 Lake Street', 'Christchurch', 'Canterbury Region', 'New Zealand', 'Aisha Khan', 'Mother', '211234574', '+64', 'Needs encouragement'),
(1, 'Zayan', 'Ahmed', '000422', 'Male', 1, '211234575', '+64', '987 Hill Drive', 'Dunedin', 'Otago Region', 'New Zealand', 'Bilal Ahmed', 'Father', '211234576', '+64', 'Very attentive'),
(1, 'Zabir', 'Ahmed', '000988', 'Male', 1, '211234577', '+64', '147 River Road', 'Tauranga', 'Bay of Plenty', 'New Zealand', 'Maryam Ahmed', 'Mother', '211234578', '+64', 'Active participant'),
(1, 'Abdullah', 'Wahid', '000451', 'Male', 1, '211234579', '+64', '258 Ocean View', 'Rotorua', 'Bay of Plenty', 'New Zealand', 'Hassan Wahid', 'Father', '211234580', '+64', 'Hardworking');

-- Verify changes
SELECT 'Madrasahs with address:' as info;
SELECT id, name, street, city, state, country, phone_country_code, phone FROM madrasahs;

SELECT 'Users with address:' as info;
SELECT id, first_name, last_name, role, street, city, state, country, phone_country_code, phone FROM users;

SELECT 'Students with address:' as info;
SELECT id, first_name, last_name, street, city, state, country, student_phone_country_code, student_phone, next_of_kin_phone_country_code, next_of_kin_phone FROM students LIMIT 3;
