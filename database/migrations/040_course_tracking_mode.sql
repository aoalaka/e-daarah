-- Course tracking mode: 'student_progress' (default, current behaviour) records grades per
-- student per unit. 'class_coverage' records only that a unit was taught to a class on a date,
-- without grades — used by schools that only want to track teacher coverage of the curriculum.

ALTER TABLE madrasahs
  ADD COLUMN course_tracking_mode ENUM('student_progress', 'class_coverage') NOT NULL DEFAULT 'student_progress'
  AFTER enable_learning_tracker;
