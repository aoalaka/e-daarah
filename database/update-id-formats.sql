-- Update ID formats from 3 to 6 digits (students) and 5 digits (staff)
-- Run this after updating validation code

USE madrasah_admin;

-- Update staff_id column in users table (from 3 to 5 digits)
ALTER TABLE users 
MODIFY COLUMN staff_id VARCHAR(5) UNIQUE;

-- Update student_id column in students table (from 3 to 6 digits)
ALTER TABLE students 
MODIFY COLUMN student_id VARCHAR(6) NOT NULL UNIQUE;

-- Update existing staff IDs to new format (pad with leading zeros)
-- Example: "384" becomes "00384"
UPDATE users 
SET staff_id = LPAD(staff_id, 5, '0')
WHERE role = 'teacher' AND staff_id IS NOT NULL AND LENGTH(staff_id) < 5;

-- Update existing student IDs to new format (pad with leading zeros)
-- Example: "123" becomes "000123"
UPDATE students 
SET student_id = LPAD(student_id, 6, '0')
WHERE LENGTH(student_id) < 6;

-- Verify the changes
SELECT 'Teachers with updated staff_id:' as info;
SELECT id, first_name, last_name, staff_id, LENGTH(staff_id) as id_length
FROM users 
WHERE role = 'teacher' AND staff_id IS NOT NULL;

SELECT 'Students with updated student_id:' as info;
SELECT id, first_name, last_name, student_id, LENGTH(student_id) as id_length
FROM students
LIMIT 10;
