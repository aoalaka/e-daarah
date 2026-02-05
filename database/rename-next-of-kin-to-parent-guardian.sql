-- Migration: Rename next_of_kin fields to parent_guardian fields
-- Safe to run - only renames columns

ALTER TABLE students 
CHANGE COLUMN next_of_kin_name parent_guardian_name VARCHAR(255),
CHANGE COLUMN next_of_kin_relationship parent_guardian_relationship VARCHAR(100),
CHANGE COLUMN next_of_kin_phone parent_guardian_phone VARCHAR(20),
CHANGE COLUMN next_of_kin_phone_country_code parent_guardian_phone_country_code VARCHAR(5) DEFAULT '+64';
