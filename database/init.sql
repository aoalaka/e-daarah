-- Create database
CREATE DATABASE IF NOT EXISTS madrasah_admin;
USE madrasah_admin;

-- Madrasahs (Tenants) table
CREATE TABLE IF NOT EXISTS madrasahs (
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
CREATE TABLE IF NOT EXISTS users (
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

-- Sessions table (Academic Years)
CREATE TABLE IF NOT EXISTS sessions (
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
CREATE TABLE IF NOT EXISTS semesters (
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
CREATE TABLE IF NOT EXISTS classes (
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

-- Class-Teacher relationship (many-to-many)
CREATE TABLE IF NOT EXISTS class_teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    teacher_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_teacher (class_id, teacher_id),
    INDEX idx_class (class_id),
    INDEX idx_teacher (teacher_id)
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
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

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    semester_id INT NOT NULL,
    teacher_id INT NOT NULL,
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
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (student_id, class_id, semester_id, date),
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id),
    INDEX idx_semester (semester_id),
    INDEX idx_date (date)
);

-- Exam Performance table
CREATE TABLE IF NOT EXISTS exam_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    madrasah_id INT NOT NULL,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    teacher_id INT NOT NULL,
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
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_madrasah (madrasah_id),
    INDEX idx_student (student_id),
    INDEX idx_semester (semester_id)
);

-- Insert default madrasah for demo purposes
INSERT INTO madrasahs (name, slug, email) VALUES
('Demo Madrasah', 'demo', 'admin@demo.madrasah.com');

-- Insert default admin (password: admin123)
INSERT INTO users (madrasah_id, first_name, last_name, email, password, role) VALUES
(1, 'Admin', 'User', 'admin@madrasah.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin');

-- Insert sample teacher (password: teacher123)
INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, role) VALUES
(1, 'Teacher', 'User', '001', 'teacher@madrasah.com', '$2a$10$WTB7bxxPl5Mae5soq/wlWeNLQpr9tv0LyGhoivn6z5LS6q79DYH8.', '1234567890', 'teacher');

-- Insert sample sessions
INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES
(1, '2024-2025', '2024-09-01', '2025-06-30', TRUE),
(1, '2025-2026', '2025-09-01', '2026-06-30', FALSE);

-- Insert sample semesters
INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES
(1, 'Fall 2024', '2024-09-01', '2024-12-20', FALSE),
(1, 'Spring 2025', '2025-01-15', '2025-06-30', TRUE),
(2, 'Fall 2025', '2025-09-01', '2025-12-20', FALSE);

-- Insert sample classes
INSERT INTO classes (madrasah_id, name, grade_level, school_days) VALUES
(1, 'Junior Boys', 'Grade 5-6', '["Monday", "Wednesday", "Friday"]'),
(1, 'Senior Girls', 'Grade 7-8', '["Tuesday", "Thursday"]');

-- Assign teachers to classes
INSERT INTO class_teachers (class_id, teacher_id) VALUES
(1, 2),
(2, 2);

-- Insert sample student
INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, class_id, next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, notes) VALUES
(1, 'Ahmed', 'Ali', '001', 'Male', 1, 'Fatima Ali', 'Mother', '123494995590', 'Good student');
