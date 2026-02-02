-- Railway Database Initialization Script
-- Complete schema with demo data for e-daarah multi-tenant madrasah system
-- Uses user_id consistently for foreign keys to users table

-- =============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- =============================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS exam_performance;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS class_teachers;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS semesters;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS madrasahs;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- STEP 2: CREATE TABLES
-- =============================================

-- Madrasahs (Tenants) table
CREATE TABLE madrasahs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    street VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    address TEXT,
    phone VARCHAR(30),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

-- Users table (unified admins and teachers)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'teacher') NOT NULL,
    staff_id VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    UNIQUE KEY unique_email_per_madrasah (madrasah_id, email),
    UNIQUE KEY unique_staff_id_per_madrasah (madrasah_id, staff_id),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_role (role)
);

-- Password resets table
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id)
);

-- Sessions table (Academic Years)
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_active (madrasah_id, is_active)
);

-- Semesters table
CREATE TABLE semesters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
);

-- Classes table
CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50),
    school_days JSON COMMENT 'Array of school days: ["Monday", "Wednesday"]',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id)
);

-- Class-User (Teacher) relationship - uses user_id for consistency
CREATE TABLE class_teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_user (class_id, user_id),
    INDEX idx_class (class_id),
    INDEX idx_user (user_id)
);

-- Students table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    student_id VARCHAR(10) NOT NULL,
    gender ENUM('Male', 'Female') NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    class_id INT,
    date_of_birth DATE,
    next_of_kin_name VARCHAR(255),
    next_of_kin_relationship VARCHAR(50),
    next_of_kin_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_id_per_madrasah (madrasah_id, student_id),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_class (class_id)
);

-- Attendance table - uses user_id for teacher reference
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Teacher who recorded attendance',
    date DATE NOT NULL,
    present BOOLEAN DEFAULT FALSE,
    absence_reason ENUM('Sick', 'Parent Request', 'School Not Notified', 'Other') DEFAULT NULL,
    dressing_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL,
    behavior_grade ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, class_id, semester_id, date),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_semester (semester_id),
    INDEX idx_date (date)
);

-- Exam Performance table - uses user_id for teacher reference
CREATE TABLE exam_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Teacher who recorded exam',
    subject VARCHAR(100) NOT NULL,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) NOT NULL,
    exam_date DATE,
    notes TEXT,
    is_absent BOOLEAN DEFAULT FALSE,
    absence_reason ENUM('Sick', 'Parent Request', 'School Not Notified', 'Other'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (madrasah_id) REFERENCES madrasahs(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_semester (semester_id)
);

-- =============================================
-- STEP 3: INSERT DEMO DATA
-- =============================================

-- Demo Madrasah
INSERT INTO madrasahs (id, name, slug, street, city, region, country, phone, email, is_active) VALUES
(999, 'Demo Islamic Academy', 'demo', '123 Education Lane', 'Auckland', 'Auckland Region', 'New Zealand', '+6495551234', 'admin@demo.com', TRUE);

-- Demo Users (password: demo123 - hash: $2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de)
INSERT INTO users (id, madrasah_id, first_name, last_name, email, password, phone, role, staff_id) VALUES
(9991, 999, 'Demo', 'Administrator', 'admin@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '+64211234567', 'admin', NULL),
(9992, 999, 'Fatima', 'Al-Rahman', 'teacher1@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '+64212223333', 'teacher', '00101'),
(9993, 999, 'Ahmed', 'Hassan', 'teacher2@demo.com', '$2a$10$r7P4muXoRZBN0jdg6J7xC.jGj7PGB3wrH58Oagb9aPacssioH13de', '+64214445555', 'teacher', '00102');

-- Demo Session
INSERT INTO sessions (id, madrasah_id, name, start_date, end_date, is_active) VALUES
(999, 999, '2025-2026 Academic Year', '2026-01-01', '2026-12-31', TRUE);

-- Demo Semester
INSERT INTO semesters (id, session_id, name, start_date, end_date, is_active) VALUES
(999, 999, 'Semester 1 - 2025/2026', '2026-01-01', '2026-06-30', TRUE);

-- Demo Classes
INSERT INTO classes (id, madrasah_id, name, description, school_days) VALUES
(9991, 999, 'Boys Quran Class', 'Quran recitation and memorization for boys aged 8-12', '["Monday", "Wednesday", "Friday"]'),
(9992, 999, 'Girls Hifz Class', 'Advanced Quran memorization for girls aged 10-14', '["Sunday", "Tuesday", "Friday"]'),
(9993, 999, 'Arabic Fundamentals', 'Basic Arabic language and grammar', '["Tuesday", "Thursday"]'),
(9994, 999, 'Islamic Studies', 'Islamic history, fiqh, and hadith studies', '["Monday", "Wednesday"]');

-- Assign Teachers to Classes (using user_id)
INSERT INTO class_teachers (class_id, user_id) VALUES
(9991, 9992),  -- Fatima teaches Boys Quran Class
(9992, 9993),  -- Ahmed teaches Girls Hifz Class
(9993, 9992),  -- Fatima teaches Arabic Fundamentals
(9994, 9993);  -- Ahmed teaches Islamic Studies

-- Demo Students (12 students across 4 classes)
INSERT INTO students (id, madrasah_id, student_id, first_name, last_name, class_id, gender, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone) VALUES
-- Boys Quran Class
(99901, 999, '100001', 'Yusuf', 'Khan', 9991, 'Male', 'Sarah Khan', 'Mother', '+6421111111'),
(99902, 999, '100002', 'Ibrahim', 'Ahmed', 9991, 'Male', 'Fatima Ahmed', 'Mother', '+6421222222'),
(99903, 999, '100003', 'Omar', 'Ali', 9991, 'Male', 'Aisha Ali', 'Mother', '+6421333333'),
-- Girls Hifz Class
(99904, 999, '100004', 'Maryam', 'Hassan', 9992, 'Female', 'Khadija Hassan', 'Mother', '+6421444444'),
(99905, 999, '100005', 'Aisha', 'Rahman', 9992, 'Female', 'Layla Rahman', 'Mother', '+6421555555'),
(99906, 999, '100006', 'Fatima', 'Mahmoud', 9992, 'Female', 'Amina Mahmoud', 'Mother', '+6421666666'),
-- Arabic Fundamentals
(99907, 999, '100007', 'Zayd', 'Hussain', 9993, 'Male', 'Mariam Hussain', 'Mother', '+6421777777'),
(99908, 999, '100008', 'Bilal', 'Malik', 9993, 'Male', 'Halima Malik', 'Mother', '+6421888888'),
(99909, 999, '100009', 'Hamza', 'Farooq', 9993, 'Male', 'Zainab Farooq', 'Mother', '+6421999999'),
-- Islamic Studies
(99910, 999, '100010', 'Hafsa', 'Siddiqui', 9994, 'Female', 'Ruqayya Siddiqui', 'Mother', '+6422000000'),
(99911, 999, '100011', 'Zainab', 'Nasir', 9994, 'Female', 'Safiya Nasir', 'Mother', '+6422111111'),
(99912, 999, '100012', 'Khadija', 'Iqbal', 9994, 'Female', 'Sumaya Iqbal', 'Mother', '+6422222222');

-- Attendance Records (using user_id for teacher)
INSERT INTO attendance (madrasah_id, student_id, class_id, semester_id, user_id, date, present, dressing_grade, behavior_grade, notes) VALUES
-- Boys Quran Class
(999, 99901, 9991, 999, 9992, '2026-01-06', TRUE, 'Excellent', 'Excellent', 'Great start to the year'),
(999, 99901, 9991, 999, 9992, '2026-01-08', TRUE, 'Excellent', 'Good', 'Focused today'),
(999, 99901, 9991, 999, 9992, '2026-01-13', TRUE, 'Excellent', 'Excellent', NULL),
(999, 99902, 9991, 999, 9992, '2026-01-06', TRUE, 'Good', 'Good', 'Well prepared'),
(999, 99902, 9991, 999, 9992, '2026-01-08', TRUE, 'Good', 'Excellent', 'Helped others'),
-- Girls Hifz Class
(999, 99904, 9992, 999, 9993, '2026-01-05', TRUE, 'Excellent', 'Excellent', 'Memorized 5 new ayahs'),
(999, 99904, 9992, 999, 9993, '2026-01-10', TRUE, 'Good', 'Excellent', 'Strong revision'),
(999, 99905, 9992, 999, 9993, '2026-01-05', TRUE, 'Good', 'Good', NULL),
(999, 99905, 9992, 999, 9993, '2026-01-10', FALSE, NULL, NULL, 'Sick'),
(999, 99906, 9992, 999, 9993, '2026-01-05', TRUE, 'Fair', 'Good', 'Needs encouragement'),
-- Arabic Fundamentals
(999, 99907, 9993, 999, 9992, '2026-01-07', TRUE, 'Excellent', 'Excellent', 'Outstanding pronunciation'),
(999, 99907, 9993, 999, 9992, '2026-01-09', TRUE, 'Good', 'Good', NULL),
(999, 99907, 9993, 999, 9992, '2026-01-14', TRUE, 'Excellent', 'Excellent', 'Top of class'),
(999, 99908, 9993, 999, 9992, '2026-01-07', TRUE, 'Good', 'Fair', 'Chatty during lesson'),
(999, 99908, 9993, 999, 9992, '2026-01-09', TRUE, 'Good', 'Good', 'Much better today'),
-- Islamic Studies
(999, 99910, 9994, 999, 9993, '2026-01-06', TRUE, 'Excellent', 'Good', 'Asks thoughtful questions'),
(999, 99910, 9994, 999, 9993, '2026-01-08', TRUE, 'Good', 'Excellent', 'Participates well'),
(999, 99910, 9994, 999, 9993, '2026-01-13', TRUE, 'Excellent', 'Excellent', 'Excellent understanding'),
(999, 99911, 9994, 999, 9993, '2026-01-06', TRUE, 'Good', 'Good', NULL),
(999, 99911, 9994, 999, 9993, '2026-01-13', FALSE, NULL, NULL, 'Family emergency');

-- Exam Performance Records (using user_id for teacher)
INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, exam_date, subject, score, max_score, notes) VALUES
-- Boys Quran Class
(999, 99901, 999, 9992, '2026-01-15', 'Quran Recitation', 95.0, 100.0, 'Excellent tajweed'),
(999, 99902, 999, 9992, '2026-01-15', 'Quran Recitation', 87.5, 100.0, 'Good progress'),
(999, 99903, 999, 9992, '2026-01-15', 'Quran Recitation', 78.0, 100.0, 'Needs more practice'),
-- Girls Hifz Class
(999, 99904, 999, 9993, '2026-01-12', 'Memorization', 98.0, 100.0, 'Outstanding memory'),
(999, 99905, 999, 9993, '2026-01-12', 'Memorization', 85.0, 100.0, 'Solid performance'),
(999, 99906, 999, 9993, '2026-01-12', 'Memorization', 92.0, 100.0, 'Very good'),
-- Arabic Fundamentals
(999, 99907, 999, 9992, '2026-01-14', 'Arabic Grammar', 96.5, 100.0, 'Top student'),
(999, 99908, 999, 9992, '2026-01-14', 'Arabic Grammar', 82.0, 100.0, 'Good understanding'),
(999, 99909, 999, 9992, '2026-01-14', 'Arabic Grammar', 88.5, 100.0, 'Well done'),
-- Islamic Studies
(999, 99910, 999, 9993, '2026-01-13', 'Hadith Studies', 94.0, 100.0, 'Excellent analysis'),
(999, 99911, 999, 9993, '2026-01-13', 'Hadith Studies', 89.0, 100.0, 'Good work'),
(999, 99912, 999, 9993, '2026-01-13', 'Hadith Studies', 91.5, 100.0, 'Strong understanding');

-- =============================================
-- STEP 4: VERIFICATION
-- =============================================
SELECT 'Database initialized successfully!' as status;
SELECT 'Tables created:' as info, COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE();
SELECT 'Madrasahs:' as info, COUNT(*) as count FROM madrasahs;
SELECT 'Users:' as info, COUNT(*) as count FROM users;
SELECT 'Classes:' as info, COUNT(*) as count FROM classes;
SELECT 'Students:' as info, COUNT(*) as count FROM students;
SELECT 'Attendance records:' as info, COUNT(*) as count FROM attendance;
SELECT 'Exam records:' as info, COUNT(*) as count FROM exam_performance;

-- Demo login credentials:
-- Admin: admin@demo.com / demo123
-- Teacher 1: teacher1@demo.com / demo123
-- Teacher 2: teacher2@demo.com / demo123
