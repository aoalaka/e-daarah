-- STEP 1: Clean up existing demo data (safe to re-run)
-- Run this FIRST before all other steps

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM exam_performance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM attendance WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM class_teachers WHERE class_id IN (SELECT id FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo')));
DELETE FROM students WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM classes WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM semesters WHERE session_id IN (SELECT id FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo')));
DELETE FROM sessions WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM users WHERE madrasah_id IN (SELECT id FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo'));
DELETE FROM madrasahs WHERE slug IN ('standard-demo', 'plus-demo', 'enterprise-demo');

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Step 1 complete: Demo data cleaned up' AS status;
