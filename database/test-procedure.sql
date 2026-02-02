-- Test procedure to debug madrasah_id issue
USE madrasah_admin;

-- Cleanup
DELETE FROM users WHERE email LIKE '%@demo.com';
DELETE FROM madrasahs WHERE slug = 'demo';

DELIMITER $$

DROP PROCEDURE IF EXISTS test_demo$$
CREATE PROCEDURE test_demo()
BEGIN
  DECLARE demo_madrasah_id INT;
  
  -- Insert madrasah
  INSERT INTO madrasahs (name, slug, address, phone, email, website, created_at) VALUES
  ('Demo Madrasah', 'demo', '123 Test Street', '+6421234567', 'info@demo.com', 'https://demo.madrasah.com', NOW());
  
  SET demo_madrasah_id = LAST_INSERT_ID();
  
  -- Debug: Check if variable was set
  SELECT 'Madrasah ID:', demo_madrasah_id;
  
  -- Try to insert a user
  INSERT INTO users (madrasah_id, first_name, last_name, email, password, role, staff_id, phone, created_at) VALUES
  (demo_madrasah_id, 'Demo', 'Admin', 'admin@demo.com', '$2a$10$X7mZUnlE3oPJRB5qJ1UhH.lS8ribzkEwShTFPeWcvO1VlXvwxy06i', 'admin', '00100', '+6421111111', NOW());
  
  SELECT 'Success! User inserted with madrasah_id:', demo_madrasah_id;
END$$

DELIMITER ;

CALL test_demo();
