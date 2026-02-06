import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateTeacher, validateStudent, validateSession, validateSemester, validateClass } from '../utils/validation.js';
import {
  requireActiveSubscription,
  enforceStudentLimit,
  enforceTeacherLimit,
  enforceClassLimit,
  requirePlusPlan
} from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken, requireRole('admin'));

// Get all sessions (scoped to madrasah)
router.get('/sessions', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE madrasah_id = ? AND deleted_at IS NULL ORDER BY start_date DESC',
      [madrasahId]
    );
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Create session (scoped to madrasah)
router.post('/sessions', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, start_date, end_date, is_active } = req.body;

    // If setting this session as active, deactivate all other sessions in THIS madrasah
    if (is_active) {
      await pool.query('UPDATE sessions SET is_active = false WHERE madrasah_id = ?', [madrasahId]);
    }

    const [result] = await pool.query(
      'INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
      [madrasahId, name, start_date, end_date, is_active || false]
    );
    res.status(201).json({ id: result.insertId, name, start_date, end_date, is_active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session (scoped to madrasah)
router.put('/sessions/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, start_date, end_date, is_active } = req.body;

    // Verify session belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM sessions WHERE id = ? AND madrasah_id = ?',
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If setting this session as active, deactivate all other sessions in THIS madrasah
    if (is_active) {
      await pool.query('UPDATE sessions SET is_active = false WHERE madrasah_id = ? AND id != ?', [madrasahId, id]);
    }

    await pool.query(
      'UPDATE sessions SET name = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ? AND madrasah_id = ?',
      [name, start_date, end_date, is_active, id, madrasahId]
    );
    res.json({ id, name, start_date, end_date, is_active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session (soft delete, scoped to madrasah)
router.delete('/sessions/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query(
      'UPDATE sessions SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get all semesters (scoped to madrasah via sessions)
router.get('/semesters', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ? AND s.deleted_at IS NULL AND sess.deleted_at IS NULL
       ORDER BY s.start_date DESC`,
      [madrasahId]
    );
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

// Create semester (scoped to madrasah via session)
router.post('/semesters', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { session_id, name, start_date, end_date, is_active } = req.body;

    // Log request for debugging
    console.log('Creating semester:', { madrasahId, session_id, name, start_date, end_date, is_active });

    // Validate required fields
    if (!session_id || !name || !start_date || !end_date) {
      console.error('Missing required fields:', { session_id, name, start_date, end_date });
      return res.status(400).json({ error: 'Missing required fields: session_id, name, start_date, end_date' });
    }

    // Verify session belongs to this madrasah and get session dates
    const [sessionCheck] = await pool.query(
      'SELECT id, start_date, end_date FROM sessions WHERE id = ? AND madrasah_id = ?',
      [session_id, madrasahId]
    );
    if (sessionCheck.length === 0) {
      console.error('Invalid session:', { session_id, madrasahId });
      return res.status(400).json({ error: 'Invalid session' });
    }
    
    const session = sessionCheck[0];
    
    // Validate semester dates are within session dates
    if (new Date(start_date) < new Date(session.start_date)) {
      console.error('Semester start date before session start:', { semester_start: start_date, session_start: session.start_date });
      return res.status(400).json({ error: 'Semester start date must be within session date range' });
    }
    if (new Date(end_date) > new Date(session.end_date)) {
      console.error('Semester end date after session end:', { semester_end: end_date, session_end: session.end_date });
      return res.status(400).json({ error: 'Semester end date must be within session date range' });
    }
    
    // Check for overlapping semesters in the same session
    const [overlapping] = await pool.query(
      `SELECT id, name FROM semesters 
       WHERE session_id = ? 
       AND (
         (start_date <= ? AND end_date >= ?) OR
         (start_date <= ? AND end_date >= ?) OR
         (start_date >= ? AND end_date <= ?)
       )`,
      [session_id, start_date, start_date, end_date, end_date, start_date, end_date]
    );

    if (overlapping.length > 0) {
      console.error('Overlapping semester found:', overlapping[0]);
      return res.status(400).json({
        error: `Semester dates overlap with existing semester: ${overlapping[0].name}`
      });
    }

    // If setting this semester as active, deactivate all other semesters in THIS madrasah
    if (is_active) {
      await pool.query(
        `UPDATE semesters s
         INNER JOIN sessions sess ON s.session_id = sess.id
         SET s.is_active = false
         WHERE sess.madrasah_id = ?`,
        [madrasahId]
      );
    }

    const [result] = await pool.query(
      'INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
      [session_id, name, start_date, end_date, is_active || false]
    );
    res.status(201).json({ id: result.insertId, session_id, name, start_date, end_date, is_active });
  } catch (error) {
    console.error('Failed to create semester:', error);
    res.status(500).json({ error: 'Failed to create semester' });
  }
});

// Update semester (scoped to madrasah via session)
router.put('/semesters/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { session_id, name, start_date, end_date, is_active } = req.body;

    // Verify semester belongs to this madrasah
    const [check] = await pool.query(
      `SELECT s.id FROM semesters s
       INNER JOIN sessions sess ON s.session_id = sess.id
       WHERE s.id = ? AND sess.madrasah_id = ?`,
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    // Verify new session_id belongs to this madrasah and get session dates
    const [sessionCheck] = await pool.query(
      'SELECT id, start_date, end_date FROM sessions WHERE id = ? AND madrasah_id = ?',
      [session_id, madrasahId]
    );
    if (sessionCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid session' });
    }
    
    const session = sessionCheck[0];
    
    // Validate semester dates are within session dates
    if (new Date(start_date) < new Date(session.start_date)) {
      return res.status(400).json({ error: 'Semester start date must be within session date range' });
    }
    if (new Date(end_date) > new Date(session.end_date)) {
      return res.status(400).json({ error: 'Semester end date must be within session date range' });
    }
    
    // Check for overlapping semesters in the same session (excluding current semester)
    const [overlapping] = await pool.query(
      `SELECT id, name FROM semesters 
       WHERE session_id = ? 
       AND id != ?
       AND (
         (start_date <= ? AND end_date >= ?) OR
         (start_date <= ? AND end_date >= ?) OR
         (start_date >= ? AND end_date <= ?)
       )`,
      [session_id, id, start_date, start_date, end_date, end_date, start_date, end_date]
    );
    
    if (overlapping.length > 0) {
      return res.status(400).json({ 
        error: `Semester dates overlap with existing semester: ${overlapping[0].name}` 
      });
    }

    // If setting this semester as active, deactivate all other semesters in THIS madrasah
    if (is_active) {
      await pool.query(
        `UPDATE semesters s
         INNER JOIN sessions sess ON s.session_id = sess.id
         SET s.is_active = false
         WHERE sess.madrasah_id = ? AND s.id != ?`,
        [madrasahId, id]
      );
    }

    await pool.query(
      'UPDATE semesters SET session_id = ?, name = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
      [session_id, name, start_date, end_date, is_active, id]
    );
    res.json({ id, session_id, name, start_date, end_date, is_active });
  } catch (error) {
    console.error('Failed to update semester:', error);
    res.status(500).json({ error: 'Failed to update semester' });
  }
});

// Delete semester (scoped to madrasah via session)
router.delete('/semesters/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;

    // Verify semester belongs to this madrasah before deleting
    const [check] = await pool.query(
      `SELECT s.id FROM semesters s
       INNER JOIN sessions sess ON s.session_id = sess.id
       WHERE s.id = ? AND sess.madrasah_id = ?`,
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Semester not found' });
    }

    await pool.query('UPDATE semesters SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
    res.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete semester' });
  }
});

// Create class (scoped to madrasah)
router.post('/classes', requireActiveSubscription, enforceClassLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, grade_level, school_days, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES (?, ?, ?, ?, ?)',
      [madrasahId, name, grade_level, JSON.stringify(school_days), description]
    );
    res.status(201).json({ id: result.insertId, name, grade_level, school_days, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class (scoped to madrasah)
router.put('/classes/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, grade_level, school_days, description } = req.body;

    // Verify class belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    await pool.query(
      'UPDATE classes SET name = ?, grade_level = ?, school_days = ?, description = ? WHERE id = ? AND madrasah_id = ?',
      [name, grade_level, JSON.stringify(school_days), description, id, madrasahId]
    );
    res.json({ id: parseInt(id), name, grade_level, school_days, description });
  } catch (error) {
    console.error('Failed to update class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class (soft delete, scoped to madrasah)
router.delete('/classes/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;

    // Verify class belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Soft delete
    await pool.query(
      'UPDATE classes SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?',
      [id, madrasahId]
    );
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Failed to delete class:', error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Get teachers for a class (scoped to madrasah)
router.get('/classes/:classId/teachers', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const [teachers] = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.staff_id, u.email, u.phone
       FROM users u
       INNER JOIN class_teachers ct ON u.id = ct.user_id
       WHERE ct.class_id = ? AND u.madrasah_id = ? AND u.role = 'teacher'
       ORDER BY u.last_name, u.first_name`,
      [classId, madrasahId]
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Assign teacher to class (scoped to madrasah)
router.post('/classes/:classId/teachers', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { teacher_id } = req.body;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Verify teacher belongs to this madrasah
    const [teacherCheck] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND madrasah_id = ? AND role = 'teacher'",
      [teacher_id, madrasahId]
    );
    if (teacherCheck.length === 0) {
      return res.status(400).json({ error: 'Teacher not found' });
    }

    // Check if already assigned
    const [existing] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacher_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Teacher already assigned to this class' });
    }

    await pool.query(
      'INSERT INTO class_teachers (class_id, user_id) VALUES (?, ?)',
      [classId, teacher_id]
    );
    res.status(201).json({ message: 'Teacher assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign teacher' });
  }
});

// Remove teacher from class (scoped to madrasah)
router.delete('/classes/:classId/teachers/:teacherId', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId, teacherId } = req.params;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    await pool.query(
      'DELETE FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacherId]
    );
    res.json({ message: 'Teacher removed from class' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove teacher' });
  }
});

// Get all teachers (scoped to madrasah - from unified users table)
router.get('/teachers', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [teachers] = await pool.query(
      `SELECT id, first_name, last_name, staff_id, email, phone
       FROM users
       WHERE madrasah_id = ? AND role = 'teacher' AND deleted_at IS NULL
       ORDER BY last_name, first_name`,
      [madrasahId]
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Create teacher (scoped to madrasah - admin creates, teacher sets password later)
router.post('/teachers', requireActiveSubscription, enforceTeacherLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country } = req.body;

    // Validate input
    const validationErrors = validateTeacher({ first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country }, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Default password is staff_id (teacher must change on first login)
    const bcrypt = await import('bcryptjs');
    const defaultPassword = await bcrypt.default.hash(staff_id, 10);

    const [result] = await pool.query(
      `INSERT INTO users (madrasah_id, first_name, last_name, staff_id, email, password, phone, phone_country_code, street, city, state, country, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'teacher')`,
      [madrasahId, first_name, last_name, staff_id, email, defaultPassword, phone, phone_country_code, street, city, state, country]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Staff ID or email already exists in this madrasah' });
    }
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// Update teacher (scoped to madrasah)
router.put('/teachers/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country } = req.body;

    console.log('Updating teacher:', { id, madrasahId, first_name, last_name, staff_id, email, phone });

    // Validate input
    const validationErrors = validateTeacher({ first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country }, true);
    if (validationErrors.length > 0) {
      console.error('Teacher validation failed:', validationErrors);
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Verify teacher belongs to this madrasah
    const [check] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND madrasah_id = ? AND role = 'teacher'",
      [id, madrasahId]
    );
    if (check.length === 0) {
      console.error('Teacher not found:', { id, madrasahId });
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, staff_id = ?, email = ?, phone = ?, phone_country_code = ?, street = ?, city = ?, state = ?, country = ? WHERE id = ? AND madrasah_id = ?',
      [first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country, id, madrasahId]
    );
    console.log('Teacher updated successfully:', id);
    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    console.error('Failed to update teacher:', error);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// Delete teacher (soft delete, scoped to madrasah)
router.delete('/teachers/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query(
      "UPDATE users SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND role = 'teacher' AND deleted_at IS NULL",
      [id, madrasahId]
    );
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// Get all students (scoped to madrasah)
router.get('/students', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [students] = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
       ORDER BY s.last_name, s.first_name`,
      [madrasahId]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create student (scoped to madrasah)
router.post('/students', requireActiveSubscription, enforceStudentLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes } = req.body;

    // Validate input
    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code
    }, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // If class_id provided, verify it belongs to this madrasah
    if (class_id) {
      const [classCheck] = await pool.query(
        'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
        [class_id, madrasahId]
      );
      if (classCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid class' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, email, class_id,
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth,
       parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, first_name, last_name, student_id, gender, email, class_id || null,
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth,
       parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes]
    );
    res.status(201).json({ id: result.insertId, first_name, last_name, student_id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Student ID already exists in this madrasah' });
    }
    console.error('Failed to create student:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// Update student (scoped to madrasah)
router.put('/students/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes } = req.body;

    // Validate input
    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code
    }, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Verify student belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM students WHERE id = ? AND madrasah_id = ?',
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If class_id provided, verify it belongs to this madrasah
    if (class_id) {
      const [classCheck] = await pool.query(
        'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
        [class_id, madrasahId]
      );
      if (classCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid class' });
      }
    }

    await pool.query(
      `UPDATE students SET first_name = ?, last_name = ?, student_id = ?, gender = ?, email = ?,
       student_phone = ?, student_phone_country_code = ?, street = ?, city = ?, state = ?, country = ?,
       class_id = ?, date_of_birth = ?, parent_guardian_name = ?, parent_guardian_relationship = ?,
       parent_guardian_phone = ?, parent_guardian_phone_country_code = ?, notes = ? WHERE id = ? AND madrasah_id = ?`,
      [first_name, last_name, student_id, gender, email,
       student_phone, student_phone_country_code, street, city, state, country,
       class_id || null, date_of_birth,
       parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes, id, madrasahId]
    );
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Failed to update student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student (soft delete, scoped to madrasah)
router.delete('/students/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query(
      'UPDATE students SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Get class KPIs with high-risk students (scoped to madrasah)
router.get('/classes/:classId/kpis', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    let semesterFilter = '';
    const params = [classId, madrasahId];

    if (semester_id) {
      semesterFilter = ' AND a.semester_id = ?';
      params.push(semester_id);
    }

    // Get overall class statistics
    const [classStats] = await pool.query(`
      SELECT
        COUNT(DISTINCT a.student_id) as total_students,
        COUNT(*) as total_attendance_records,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as total_present,
        AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100 as attendance_rate,
        SUM(CASE WHEN a.dressing_grade = 'Excellent' THEN 4 WHEN a.dressing_grade = 'Good' THEN 3 WHEN a.dressing_grade = 'Fair' THEN 2 WHEN a.dressing_grade = 'Poor' THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN a.dressing_grade IS NOT NULL THEN 1 ELSE 0 END), 0) as avg_dressing_score,
        SUM(CASE WHEN a.behavior_grade = 'Excellent' THEN 4 WHEN a.behavior_grade = 'Good' THEN 3 WHEN a.behavior_grade = 'Fair' THEN 2 WHEN a.behavior_grade = 'Poor' THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN a.behavior_grade IS NOT NULL THEN 1 ELSE 0 END), 0) as avg_behavior_score
      FROM attendance a
      WHERE a.class_id = ? AND a.madrasah_id = ?${semesterFilter}
    `, params);

    // Get exam statistics (join through students to filter by class)
    const [examStats] = await pool.query(`
      SELECT
        COUNT(*) as total_exams,
        AVG(ep.score) as avg_score,
        MAX(ep.score) as highest_score,
        MIN(ep.score) as lowest_score
      FROM exam_performance ep
      INNER JOIN students s ON ep.student_id = s.id
      WHERE s.class_id = ? AND s.madrasah_id = ?
    `, [classId, madrasahId]);

    // Get high-risk students (low attendance < 70%, poor grades, low exam scores)
    const [highRiskStudents] = await pool.query(`
      SELECT
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        COUNT(DISTINCT a.date) as total_days,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_days,
        (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT a.date), 0) * 100) as attendance_rate,
        AVG(CASE WHEN a.dressing_grade = 'Excellent' THEN 4 WHEN a.dressing_grade = 'Good' THEN 3 WHEN a.dressing_grade = 'Fair' THEN 2 WHEN a.dressing_grade = 'Poor' THEN 1 ELSE NULL END) as avg_dressing,
        AVG(CASE WHEN a.behavior_grade = 'Excellent' THEN 4 WHEN a.behavior_grade = 'Good' THEN 3 WHEN a.behavior_grade = 'Fair' THEN 2 WHEN a.behavior_grade = 'Poor' THEN 1 ELSE NULL END) as avg_behavior,
        (SELECT AVG(ep.score) FROM exam_performance ep WHERE ep.student_id = s.id AND ep.madrasah_id = ?) as avg_exam_score
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.class_id = ? AND a.madrasah_id = ?${semesterFilter}
      WHERE s.class_id = ? AND s.madrasah_id = ?
      GROUP BY s.id
      HAVING
        attendance_rate < 70
        OR avg_dressing < 2.5
        OR avg_behavior < 2.5
        OR avg_exam_score < 50
      ORDER BY attendance_rate ASC, avg_exam_score ASC
    `, semester_id
      ? [madrasahId, classId, madrasahId, semester_id, classId, madrasahId]
      : [madrasahId, classId, madrasahId, classId, madrasahId]
    );

    res.json({
      classStats: classStats[0],
      examStats: examStats[0],
      highRiskStudents
    });
  } catch (error) {
    console.error('KPI error:', error);
    res.status(500).json({ error: 'Failed to fetch class KPIs' });
  }
});

// Get attendance performance for a class (scoped to madrasah)
router.get('/classes/:classId/attendance-performance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.student_id, sem.name as semester_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE a.class_id = ? AND a.madrasah_id = ?
    `;
    const params = [classId, madrasahId];

    if (semester_id) {
      query += ' AND a.semester_id = ?';
      params.push(semester_id);
    }

    query += ' ORDER BY a.date DESC';

    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance performance' });
  }
});

// Get exam performance for a class (scoped to madrasah)
router.get('/classes/:classId/exam-performance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const [records] = await pool.query(
      `SELECT ep.*, s.first_name, s.last_name, s.student_id
       FROM exam_performance ep
       JOIN students s ON ep.student_id = s.id
       WHERE s.class_id = ? AND s.madrasah_id = ?
       ORDER BY ep.exam_date DESC`,
      [classId, madrasahId]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam performance' });
  }
});

// Get student reports/summary for a class (scoped to madrasah)
router.get('/classes/:classId/student-reports', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId, subject } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Build query with filters
    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        COUNT(DISTINCT ep.subject) as subject_count,
        COUNT(ep.id) as total_exams,
        SUM(CASE WHEN ep.is_absent = FALSE THEN 1 ELSE 0 END) as exams_taken,
        SUM(CASE WHEN ep.is_absent = TRUE THEN 1 ELSE 0 END) as exams_absent,
        SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) as total_score,
        SUM(ep.max_score) as total_max_score,
        GROUP_CONCAT(DISTINCT ep.subject ORDER BY ep.subject SEPARATOR ', ') as subjects,
        CASE 
          WHEN SUM(ep.max_score) > 0 THEN (SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) / SUM(ep.max_score)) * 100
          ELSE 0
        END as overall_percentage
      FROM students s
      LEFT JOIN exam_performance ep ON s.id = ep.student_id AND ep.madrasah_id = ?
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
    `;
    
    const queryParams = [madrasahId, classId];

    if (sessionId) {
      query += ` AND sem.session_id = ?`;
      queryParams.push(sessionId);
    }

    if (semesterId) {
      query += ` AND ep.semester_id = ?`;
      queryParams.push(semesterId);
    }

    if (subject) {
      query += ` AND ep.subject = ?`;
      queryParams.push(subject);
    }

    query += ` GROUP BY s.id ORDER BY overall_percentage DESC`;

    const [reports] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousPercentage = null;
    let studentsAtCurrentRank = 0;
    
    const formattedReports = reports.map((report, index) => {
      const percentage = report.overall_percentage ? parseFloat(report.overall_percentage).toFixed(2) : '0.00';
      
      // If this is a different percentage than the previous student, update rank
      if (previousPercentage !== null && percentage !== previousPercentage) {
        currentRank += studentsAtCurrentRank;
        studentsAtCurrentRank = 0;
      }
      
      studentsAtCurrentRank++;
      previousPercentage = percentage;
      
      return {
        ...report,
        rank: currentRank, // Same rank for students with same percentage
        overall_percentage: percentage,
        total_score: report.total_score ? parseFloat(report.total_score).toFixed(2) : '0.00',
        total_max_score: report.total_max_score ? parseFloat(report.total_max_score).toFixed(2) : '0.00',
        subject_count: parseInt(report.subject_count) || 0,
        total_exams: parseInt(report.total_exams) || 0,
        exams_taken: parseInt(report.exams_taken) || 0,
        exams_absent: parseInt(report.exams_absent) || 0
      };
    });

    res.json(formattedReports);
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({ error: 'Failed to fetch student reports' });
  }
});

// Get attendance rankings for a class (scoped to madrasah)
router.get('/classes/:classId/attendance-rankings', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Build query with filters
    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        c.name as class_name,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.present = TRUE THEN 1 ELSE 0 END) as days_present,
        SUM(CASE WHEN a.present = FALSE THEN 1 ELSE 0 END) as days_absent,
        CASE 
          WHEN COUNT(a.id) > 0 THEN (SUM(CASE WHEN a.present = TRUE THEN 1 ELSE 0 END) / COUNT(a.id)) * 100
          ELSE 0
        END as attendance_rate
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
    `;
    
    const queryParams = [madrasahId, classId];

    if (sessionId) {
      query += ` AND sem.session_id = ?`;
      queryParams.push(sessionId);
    }

    if (semesterId) {
      query += ` AND a.semester_id = ?`;
      queryParams.push(semesterId);
    }

    query += ` GROUP BY s.id ORDER BY attendance_rate DESC`;

    const [rankings] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousRate = null;
    let studentsAtCurrentRank = 0;
    
    const formattedRankings = rankings.map((student) => {
      const rate = student.attendance_rate ? parseFloat(student.attendance_rate).toFixed(2) : '0.00';
      
      // If this is a different rate than the previous student, update rank
      if (previousRate !== null && rate !== previousRate) {
        currentRank += studentsAtCurrentRank;
        studentsAtCurrentRank = 0;
      }
      
      studentsAtCurrentRank++;
      previousRate = rate;
      
      return {
        ...student,
        rank: currentRank,
        attendance_rate: rate,
        total_days: parseInt(student.total_days) || 0,
        days_present: parseInt(student.days_present) || 0,
        days_absent: parseInt(student.days_absent) || 0
      };
    });

    res.json(formattedRankings);
  } catch (error) {
    console.error('Get attendance rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance rankings' });
  }
});

// Get dressing rankings for a class (scoped to madrasah)
router.get('/classes/:classId/dressing-rankings', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Build query with filters (Excellent=4, Good=3, Fair=2, Poor=1)
    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        c.name as class_name,
        COUNT(a.id) as total_records,
        AVG(
          CASE a.dressing_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_dressing_score,
        SUM(CASE WHEN a.dressing_grade = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN a.dressing_grade = 'Good' THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN a.dressing_grade = 'Fair' THEN 1 ELSE 0 END) as fair_count,
        SUM(CASE WHEN a.dressing_grade = 'Poor' THEN 1 ELSE 0 END) as poor_count
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.dressing_grade IS NOT NULL
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
    `;
    
    const queryParams = [madrasahId, classId];

    if (sessionId) {
      query += ` AND sem.session_id = ?`;
      queryParams.push(sessionId);
    }

    if (semesterId) {
      query += ` AND a.semester_id = ?`;
      queryParams.push(semesterId);
    }

    query += ` GROUP BY s.id ORDER BY avg_dressing_score DESC`;

    const [rankings] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousScore = null;
    let studentsAtCurrentRank = 0;
    
    const formattedRankings = rankings.map((student) => {
      const score = student.avg_dressing_score ? parseFloat(student.avg_dressing_score).toFixed(2) : null;
      
      // If this is a different score than the previous student, update rank
      if (previousScore !== null && score !== previousScore) {
        currentRank += studentsAtCurrentRank;
        studentsAtCurrentRank = 0;
      }
      
      studentsAtCurrentRank++;
      previousScore = score;
      
      // Convert score back to grade label
      let gradeLabel = 'N/A';
      if (score !== null) {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 3.5) gradeLabel = 'Excellent';
        else if (scoreNum >= 2.5) gradeLabel = 'Good';
        else if (scoreNum >= 1.5) gradeLabel = 'Fair';
        else gradeLabel = 'Poor';
      }
      
      return {
        ...student,
        rank: score !== null ? currentRank : null,
        avg_dressing_score: score,
        avg_dressing_grade: gradeLabel,
        total_records: parseInt(student.total_records) || 0,
        excellent_count: parseInt(student.excellent_count) || 0,
        good_count: parseInt(student.good_count) || 0,
        fair_count: parseInt(student.fair_count) || 0,
        poor_count: parseInt(student.poor_count) || 0
      };
    });

    res.json(formattedRankings);
  } catch (error) {
    console.error('Get dressing rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch dressing rankings' });
  }
});

// Get behavior rankings for a class (scoped to madrasah)
router.get('/classes/:classId/behavior-rankings', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { sessionId, semesterId } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Build query with filters (Excellent=4, Good=3, Fair=2, Poor=1)
    let query = `
      SELECT 
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        c.name as class_name,
        COUNT(a.id) as total_records,
        AVG(
          CASE a.behavior_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_behavior_score,
        SUM(CASE WHEN a.behavior_grade = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN a.behavior_grade = 'Good' THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN a.behavior_grade = 'Fair' THEN 1 ELSE 0 END) as fair_count,
        SUM(CASE WHEN a.behavior_grade = 'Poor' THEN 1 ELSE 0 END) as poor_count
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.behavior_grade IS NOT NULL
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.class_id = ? AND s.deleted_at IS NULL
    `;
    
    const queryParams = [madrasahId, classId];

    if (sessionId) {
      query += ` AND sem.session_id = ?`;
      queryParams.push(sessionId);
    }

    if (semesterId) {
      query += ` AND a.semester_id = ?`;
      queryParams.push(semesterId);
    }

    query += ` GROUP BY s.id ORDER BY avg_behavior_score DESC`;

    const [rankings] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousScore = null;
    let studentsAtCurrentRank = 0;
    
    const formattedRankings = rankings.map((student) => {
      const score = student.avg_behavior_score ? parseFloat(student.avg_behavior_score).toFixed(2) : null;
      
      // If this is a different score than the previous student, update rank
      if (previousScore !== null && score !== previousScore) {
        currentRank += studentsAtCurrentRank;
        studentsAtCurrentRank = 0;
      }
      
      studentsAtCurrentRank++;
      previousScore = score;
      
      // Convert score back to grade label
      let gradeLabel = 'N/A';
      if (score !== null) {
        const scoreNum = parseFloat(score);
        if (scoreNum >= 3.5) gradeLabel = 'Excellent';
        else if (scoreNum >= 2.5) gradeLabel = 'Good';
        else if (scoreNum >= 1.5) gradeLabel = 'Fair';
        else gradeLabel = 'Poor';
      }
      
      return {
        ...student,
        rank: score !== null ? currentRank : null,
        avg_behavior_score: score,
        avg_behavior_grade: gradeLabel,
        total_records: parseInt(student.total_records) || 0,
        excellent_count: parseInt(student.excellent_count) || 0,
        good_count: parseInt(student.good_count) || 0,
        fair_count: parseInt(student.fair_count) || 0,
        poor_count: parseInt(student.poor_count) || 0
      };
    });

    res.json(formattedRankings);
  } catch (error) {
    console.error('Get behavior rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch behavior rankings' });
  }
});

// Get all rankings for a specific student (madrasah-wide)
router.get('/students/:id/all-rankings', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { sessionId, semesterId } = req.query;

    // Verify student belongs to this madrasah
    const [studentCheck] = await pool.query(
      'SELECT id, student_id, first_name, last_name, class_id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (studentCheck.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentCheck[0];

    // Get exam ranking (madrasah-wide)
    let examQuery = `
      SELECT 
        s.id,
        s.student_id,
        CASE 
          WHEN SUM(ep.max_score) > 0 THEN (SUM(CASE WHEN ep.is_absent = FALSE THEN ep.score ELSE 0 END) / SUM(ep.max_score)) * 100
          ELSE 0
        END as overall_percentage
      FROM students s
      LEFT JOIN exam_performance ep ON s.id = ep.student_id AND ep.madrasah_id = ?
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
    `;
    const examParams = [madrasahId, madrasahId];

    if (sessionId) {
      examQuery += ` AND sem.session_id = ?`;
      examParams.push(sessionId);
    }
    if (semesterId) {
      examQuery += ` AND ep.semester_id = ?`;
      examParams.push(semesterId);
    }

    examQuery += ` GROUP BY s.id ORDER BY overall_percentage DESC`;
    const [examRankings] = await pool.query(examQuery, examParams);

    // Apply tie-aware ranking for exams
    let examRankArray = [];
    let examCurrentRank = 1;
    let examPreviousPercentage = null;
    let examStudentsAtCurrentRank = 0;
    let totalExamStudents = 0;
    
    examRankings.forEach((student) => {
      const percentage = student.overall_percentage ? parseFloat(student.overall_percentage).toFixed(2) : '0.00';
      
      if (parseFloat(percentage) > 0) totalExamStudents++;
      
      if (examPreviousPercentage !== null && percentage !== examPreviousPercentage) {
        examCurrentRank += examStudentsAtCurrentRank;
        examStudentsAtCurrentRank = 0;
      }
      
      examStudentsAtCurrentRank++;
      examPreviousPercentage = percentage;
      
      examRankArray.push({
        ...student,
        rank: examCurrentRank
      });
    });

    // Find student's exam rank
    let examRank = null;
    let examPercentage = null;
    examRankArray.forEach((r) => {
      if (r.id === parseInt(id)) {
        examRank = r.rank;
        examPercentage = parseFloat(r.overall_percentage).toFixed(2);
      }
    });

    // Get attendance ranking (madrasah-wide)
    let attendanceQuery = `
      SELECT 
        s.id,
        CASE 
          WHEN COUNT(a.id) > 0 THEN (SUM(CASE WHEN a.present = TRUE THEN 1 ELSE 0 END) / COUNT(a.id)) * 100
          ELSE 0
        END as attendance_rate
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
    `;
    const attendanceParams = [madrasahId, madrasahId];

    if (sessionId) {
      attendanceQuery += ` AND sem.session_id = ?`;
      attendanceParams.push(sessionId);
    }
    if (semesterId) {
      attendanceQuery += ` AND a.semester_id = ?`;
      attendanceParams.push(semesterId);
    }

    attendanceQuery += ` GROUP BY s.id ORDER BY attendance_rate DESC`;
    const [attendanceRankings] = await pool.query(attendanceQuery, attendanceParams);

    // Apply tie-aware ranking for attendance
    let attendanceRankArray = [];
    let attendanceCurrentRank = 1;
    let attendancePreviousRate = null;
    let attendanceStudentsAtCurrentRank = 0;
    
    attendanceRankings.forEach((student) => {
      const rate = student.attendance_rate ? parseFloat(student.attendance_rate).toFixed(2) : '0.00';
      
      if (attendancePreviousRate !== null && rate !== attendancePreviousRate) {
        attendanceCurrentRank += attendanceStudentsAtCurrentRank;
        attendanceStudentsAtCurrentRank = 0;
      }
      
      attendanceStudentsAtCurrentRank++;
      attendancePreviousRate = rate;
      
      attendanceRankArray.push({
        ...student,
        rank: attendanceCurrentRank
      });
    });

    let attendanceRank = null;
    let attendanceRate = null;
    let totalAttendanceStudents = attendanceRankArray.length;
    attendanceRankArray.forEach((r) => {
      if (r.id === parseInt(id)) {
        attendanceRank = r.rank;
        attendanceRate = parseFloat(r.attendance_rate).toFixed(2);
      }
    });

    // Get dressing ranking (madrasah-wide)
    let dressingQuery = `
      SELECT 
        s.id,
        AVG(
          CASE a.dressing_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_dressing_score
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.dressing_grade IS NOT NULL
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
    `;
    const dressingParams = [madrasahId, madrasahId];

    if (sessionId) {
      dressingQuery += ` AND sem.session_id = ?`;
      dressingParams.push(sessionId);
    }
    if (semesterId) {
      dressingQuery += ` AND a.semester_id = ?`;
      dressingParams.push(semesterId);
    }

    dressingQuery += ` GROUP BY s.id HAVING avg_dressing_score IS NOT NULL ORDER BY avg_dressing_score DESC`;
    const [dressingRankings] = await pool.query(dressingQuery, dressingParams);

    // Apply tie-aware ranking for dressing
    let dressingRankArray = [];
    let dressingCurrentRank = 1;
    let dressingPreviousScore = null;
    let dressingStudentsAtCurrentRank = 0;
    
    dressingRankings.forEach((student) => {
      const score = student.avg_dressing_score ? parseFloat(student.avg_dressing_score).toFixed(2) : '0.00';
      
      if (dressingPreviousScore !== null && score !== dressingPreviousScore) {
        dressingCurrentRank += dressingStudentsAtCurrentRank;
        dressingStudentsAtCurrentRank = 0;
      }
      
      dressingStudentsAtCurrentRank++;
      dressingPreviousScore = score;
      
      dressingRankArray.push({
        ...student,
        rank: dressingCurrentRank
      });
    });

    let dressingRank = null;
    let dressingScore = null;
    let totalDressingStudents = dressingRankArray.length;
    dressingRankArray.forEach((r) => {
      if (r.id === parseInt(id)) {
        dressingRank = r.rank;
        dressingScore = parseFloat(r.avg_dressing_score).toFixed(2);
      }
    });

    // Get behavior ranking (madrasah-wide)
    let behaviorQuery = `
      SELECT 
        s.id,
        AVG(
          CASE a.behavior_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_behavior_score
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.behavior_grade IS NOT NULL
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
    `;
    const behaviorParams = [madrasahId, madrasahId];

    if (sessionId) {
      behaviorQuery += ` AND sem.session_id = ?`;
      behaviorParams.push(sessionId);
    }
    if (semesterId) {
      behaviorQuery += ` AND a.semester_id = ?`;
      behaviorParams.push(semesterId);
    }

    behaviorQuery += ` GROUP BY s.id HAVING avg_behavior_score IS NOT NULL ORDER BY avg_behavior_score DESC`;
    const [behaviorRankings] = await pool.query(behaviorQuery, behaviorParams);

    // Apply tie-aware ranking for behavior
    let behaviorRankArray = [];
    let behaviorCurrentRank = 1;
    let behaviorPreviousScore = null;
    let behaviorStudentsAtCurrentRank = 0;
    
    behaviorRankings.forEach((student) => {
      const score = student.avg_behavior_score ? parseFloat(student.avg_behavior_score).toFixed(2) : '0.00';
      
      if (behaviorPreviousScore !== null && score !== behaviorPreviousScore) {
        behaviorCurrentRank += behaviorStudentsAtCurrentRank;
        behaviorStudentsAtCurrentRank = 0;
      }
      
      behaviorStudentsAtCurrentRank++;
      behaviorPreviousScore = score;
      
      behaviorRankArray.push({
        ...student,
        rank: behaviorCurrentRank
      });
    });

    let behaviorRank = null;
    let behaviorScore = null;
    let totalBehaviorStudents = behaviorRankArray.length;
    behaviorRankArray.forEach((r) => {
      if (r.id === parseInt(id)) {
        behaviorRank = r.rank;
        behaviorScore = parseFloat(r.avg_behavior_score).toFixed(2);
      }
    });

    res.json({
      student: {
        id: student.id,
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        class_id: student.class_id
      },
      rankings: {
        exam: {
          rank: examRank,
          percentage: examPercentage,
          total_students: totalExamStudents
        },
        attendance: {
          rank: attendanceRank,
          rate: attendanceRate,
          total_students: totalAttendanceStudents
        },
        dressing: {
          rank: dressingRank,
          score: dressingScore,
          total_students: totalDressingStudents
        },
        behavior: {
          rank: behaviorRank,
          score: behaviorScore,
          total_students: totalBehaviorStudents
        }
      }
    });
  } catch (error) {
    console.error('Get all rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch student rankings' });
  }
});

// Get student report (scoped to madrasah)
router.get('/students/:id/report', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { semester_id } = req.query;

    // Get student info (scoped to madrasah)
    const [students] = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = ? AND s.madrasah_id = ?`,
      [id, madrasahId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get attendance records (scoped to madrasah)
    let attendanceQuery = 'SELECT * FROM attendance WHERE student_id = ? AND madrasah_id = ?';
    const attendanceParams = [id, madrasahId];

    if (semester_id) {
      attendanceQuery += ' AND semester_id = ?';
      attendanceParams.push(semester_id);
    }

    attendanceQuery += ' ORDER BY date DESC';

    const [attendance] = await pool.query(attendanceQuery, attendanceParams);

    // Get exam performance (scoped to madrasah)
    let examQuery = 'SELECT * FROM exam_performance WHERE student_id = ? AND madrasah_id = ?';
    const examParams = [id, madrasahId];

    if (semester_id) {
      examQuery += ' AND semester_id = ?';
      examParams.push(semester_id);
    }

    examQuery += ' ORDER BY exam_date DESC';

    const [exams] = await pool.query(examQuery, examParams);

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.present).length;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0';

    const dressingGrades = attendance.filter(a => a.dressing_grade).map(a => a.dressing_grade);
    const behaviorGrades = attendance.filter(a => a.behavior_grade).map(a => a.behavior_grade);

    // Calculate average dressing and behavior scores
    const gradeToNumber = (grade) => {
      switch (grade) {
        case 'Excellent': return 4;
        case 'Good': return 3;
        case 'Fair': return 2;
        case 'Poor': return 1;
        default: return 0;
      }
    };

    const dressingScores = dressingGrades.map(gradeToNumber);
    const behaviorScores = behaviorGrades.map(gradeToNumber);

    const avgDressing = dressingScores.length > 0
      ? dressingScores.reduce((a, b) => a + b, 0) / dressingScores.length
      : null;
    const avgBehavior = behaviorScores.length > 0
      ? behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length
      : null;

    // Calculate class position based on average exam scores
    let classPosition = null;
    let totalStudents = null;
    const student = students[0];
    
    if (student.class_id) {
      // Build query with optional semester filter
      let rankQuery = `
        SELECT 
          s.id,
          s.student_id,
          AVG(CASE WHEN ep.is_absent = 0 AND ep.score IS NOT NULL 
              THEN (ep.score / ep.max_score * 100) 
              ELSE NULL END) as avg_score
         FROM students s
         LEFT JOIN exam_performance ep ON s.id = ep.student_id
         WHERE s.class_id = ? AND s.madrasah_id = ?`;
      
      const rankParams = [student.class_id, madrasahId];
      
      if (semester_id) {
        rankQuery += ' AND ep.semester_id = ?';
        rankParams.push(semester_id);
      }
      
      rankQuery += `
         GROUP BY s.id, s.student_id
         HAVING avg_score IS NOT NULL
         ORDER BY avg_score DESC`;
      
      const [classRankings] = await pool.query(rankQuery, rankParams);
      
      totalStudents = classRankings.length;
      const studentRank = classRankings.findIndex(r => r.id === parseInt(id));
      if (studentRank !== -1) {
        classPosition = studentRank + 1;
      }
    }

    res.json({
      student: student,
      attendance: {
        records: attendance,
        totalDays,
        presentDays,
        attendanceRate,
        dressingGrades,
        behaviorGrades
      },
      dressingBehavior: {
        avgDressing,
        avgBehavior
      },
      exams,
      classPosition: {
        position: classPosition,
        totalStudents: totalStudents
      }
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Update student overall comment (scoped to madrasah)
router.put('/students/:id/comment', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { notes } = req.body;

    await pool.query(
      'UPDATE students SET notes = ? WHERE id = ? AND madrasah_id = ?',
      [notes, id, madrasahId]
    );
    res.json({ message: 'Comment updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Get madrasah profile (scoped to current madrasah)
router.get('/profile', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [madrasahs] = await pool.query(
      `SELECT id, name, slug, logo_url, street, city, region, country, phone, email,
       institution_type, verification_status, trial_ends_at, created_at,
       pricing_plan, subscription_status, current_period_end, stripe_customer_id
       FROM madrasahs WHERE id = ?`,
      [madrasahId]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    // Get usage counts (exclude soft-deleted)
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );
    const [teacherCount] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE madrasah_id = ? AND role = ? AND deleted_at IS NULL',
      [madrasahId, 'teacher']
    );
    const [classCount] = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );

    const profile = {
      ...madrasahs[0],
      usage: {
        students: studentCount[0].count,
        teachers: teacherCount[0].count,
        classes: classCount[0].count
      }
    };

    res.json(profile);
  } catch (error) {
    console.error('Failed to fetch madrasah profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Analytics Dashboard - School-wide insights (available to all plans for Insights overview)
router.get('/analytics', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { semester_id, class_id, gender } = req.query;

    // Get date ranges for comparison
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Build filters
    let attendanceFilters = '';
    let studentFilters = '';
    let examFilters = '';
    const attendanceParams = [];
    const studentParams = [];
    const examParams = [];

    if (semester_id) {
      attendanceFilters += ' AND a.semester_id = ?';
      attendanceParams.push(semester_id);
      examFilters += ' AND ep.semester_id = ?';
      examParams.push(semester_id);
    }

    if (class_id) {
      attendanceFilters += ' AND a.class_id = ?';
      attendanceParams.push(class_id);
      studentFilters += ' AND s.class_id = ?';
      studentParams.push(class_id);
    }

    if (gender) {
      studentFilters += ' AND s.gender = ?';
      studentParams.push(gender);
    }

    // 1. Overall attendance stats (with optional class/gender filters via student join)
    let overallStatsQuery = `
      SELECT
        COUNT(DISTINCT a.student_id) as students_with_attendance,
        COUNT(*) as total_records,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as total_present,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as attendance_rate
      FROM attendance a
    `;
    const overallStatsParams = [madrasahId];

    if (gender) {
      overallStatsQuery += ' JOIN students s ON a.student_id = s.id';
    }
    overallStatsQuery += ` WHERE a.madrasah_id = ?${attendanceFilters}`;
    overallStatsParams.push(...attendanceParams);

    if (gender) {
      overallStatsQuery += ' AND s.gender = ?';
      overallStatsParams.push(gender);
    }

    const [overallStats] = await pool.query(overallStatsQuery, overallStatsParams);

    // 2. This week's absences
    let thisWeekQuery = `SELECT COUNT(*) as absent_count FROM attendance a`;
    const thisWeekParams = [madrasahId, thisWeekStart.toISOString().split('T')[0]];
    if (gender) thisWeekQuery += ' JOIN students s ON a.student_id = s.id';
    thisWeekQuery += ` WHERE a.madrasah_id = ? AND a.present = 0 AND a.date >= ?${attendanceFilters}`;
    thisWeekParams.push(...attendanceParams);
    if (gender) {
      thisWeekQuery += ' AND s.gender = ?';
      thisWeekParams.push(gender);
    }
    const [thisWeekAbsences] = await pool.query(thisWeekQuery, thisWeekParams);

    // 3. Last week's absences (for trend comparison)
    let lastWeekQuery = `SELECT COUNT(*) as absent_count FROM attendance a`;
    const lastWeekParams = [madrasahId, lastWeekStart.toISOString().split('T')[0], lastWeekEnd.toISOString().split('T')[0]];
    if (gender) lastWeekQuery += ' JOIN students s ON a.student_id = s.id';
    lastWeekQuery += ` WHERE a.madrasah_id = ? AND a.present = 0 AND a.date >= ? AND a.date <= ?${attendanceFilters}`;
    lastWeekParams.push(...attendanceParams);
    if (gender) {
      lastWeekQuery += ' AND s.gender = ?';
      lastWeekParams.push(gender);
    }
    const [lastWeekAbsences] = await pool.query(lastWeekQuery, lastWeekParams);

    // 4. Students needing attention (below 70% attendance)
    let atRiskQuery = `
      SELECT
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        s.gender,
        c.name as class_name,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_days,
        ROUND(SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id), 0) * 100, 1) as attendance_rate
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?${attendanceFilters}
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL${studentFilters}
      GROUP BY s.id
      HAVING attendance_rate < 70 OR attendance_rate IS NULL
      ORDER BY attendance_rate ASC
      LIMIT 10
    `;
    const atRiskParams = [madrasahId, ...attendanceParams, madrasahId, ...studentParams];
    const [atRiskStudents] = await pool.query(atRiskQuery, atRiskParams);

    // 5. Attendance by class (for comparison bars) - skip if filtering by specific class
    let classAttendance = [];
    if (!class_id) {
      let classAttQuery = `
        SELECT
          c.id,
          c.name as class_name,
          COUNT(a.id) as total_records,
          SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
          ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as attendance_rate
        FROM classes c
        LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ?
      `;
      const classAttParams = [madrasahId];

      // Add semester filter to attendance join
      if (semester_id) {
        classAttQuery = classAttQuery.replace(
          'LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ?',
          'LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ? AND a.semester_id = ?'
        );
        classAttParams.push(semester_id);
      }

      // Join students for gender filter
      if (gender) {
        classAttQuery += ' LEFT JOIN students s ON a.student_id = s.id';
      }

      classAttQuery += ' WHERE c.madrasah_id = ? AND c.deleted_at IS NULL';
      classAttParams.push(madrasahId);

      if (gender) {
        classAttQuery += ' AND (s.gender = ? OR a.id IS NULL)';
        classAttParams.push(gender);
      }

      classAttQuery += ' GROUP BY c.id ORDER BY attendance_rate DESC';
      [classAttendance] = await pool.query(classAttQuery, classAttParams);
    }

    // 6. Students with 3+ absences this month
    let freqAbsQuery = `
      SELECT
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        s.gender,
        c.name as class_name,
        COUNT(*) as absence_count
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE a.madrasah_id = ? AND a.present = 0 AND a.date >= ?${attendanceFilters}${studentFilters}
      GROUP BY s.id
      HAVING absence_count >= 3
      ORDER BY absence_count DESC
      LIMIT 5
    `;
    const freqAbsParams = [madrasahId, thisMonthStart.toISOString().split('T')[0], ...attendanceParams, ...studentParams];
    const [frequentAbsences] = await pool.query(freqAbsQuery, freqAbsParams);

    // 7. Recent attendance trend (last 4 weeks)
    let trendQuery = `
      SELECT
        YEARWEEK(a.date, 1) as year_week,
        MIN(a.date) as week_start,
        COUNT(*) as total_records,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as attendance_rate
      FROM attendance a
    `;
    const trendParams = [madrasahId];
    if (gender) trendQuery += ' JOIN students s ON a.student_id = s.id';
    trendQuery += ` WHERE a.madrasah_id = ? AND a.date >= DATE_SUB(NOW(), INTERVAL 4 WEEK)${attendanceFilters}`;
    trendParams.push(...attendanceParams);
    if (gender) {
      trendQuery += ' AND s.gender = ?';
      trendParams.push(gender);
    }
    trendQuery += ' GROUP BY YEARWEEK(a.date, 1) ORDER BY year_week ASC';
    const [weeklyTrend] = await pool.query(trendQuery, trendParams);

    // 8. Classes not taking attendance recently (last 7 days)
    const [classesWithoutRecentAttendance] = await pool.query(`
      SELECT
        c.id,
        c.name as class_name,
        MAX(a.date) as last_attendance_date,
        DATEDIFF(NOW(), MAX(a.date)) as days_since_attendance
      FROM classes c
      LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ?
      WHERE c.madrasah_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id
      HAVING last_attendance_date IS NULL OR days_since_attendance > 7
      ORDER BY days_since_attendance DESC
    `, [madrasahId, madrasahId]);

    // 9. Exam performance summary
    let examQuery = `
      SELECT
        COUNT(DISTINCT ep.student_id) as students_with_exams,
        COUNT(*) as total_exam_records,
        ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage,
        ROUND(SUM(CASE WHEN ep.score / ep.max_score >= 0.5 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 1) as pass_rate,
        COUNT(DISTINCT ep.subject) as subjects_count
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      WHERE ep.madrasah_id = ? AND ep.is_absent = 0
    `;
    const examSummaryParams = [madrasahId];
    if (semester_id) {
      examQuery += ' AND ep.semester_id = ?';
      examSummaryParams.push(semester_id);
    }
    if (class_id) {
      examQuery += ' AND s.class_id = ?';
      examSummaryParams.push(class_id);
    }
    if (gender) {
      examQuery += ' AND s.gender = ?';
      examSummaryParams.push(gender);
    }
    const [examSummary] = await pool.query(examQuery, examSummaryParams);

    // 10. Exam performance by subject (top 5)
    let subjectExamQuery = `
      SELECT
        ep.subject,
        COUNT(*) as exam_count,
        ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage,
        ROUND(SUM(CASE WHEN ep.score / ep.max_score >= 0.5 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 1) as pass_rate
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      WHERE ep.madrasah_id = ? AND ep.is_absent = 0
    `;
    const subjectExamParams = [madrasahId];
    if (semester_id) {
      subjectExamQuery += ' AND ep.semester_id = ?';
      subjectExamParams.push(semester_id);
    }
    if (class_id) {
      subjectExamQuery += ' AND s.class_id = ?';
      subjectExamParams.push(class_id);
    }
    if (gender) {
      subjectExamQuery += ' AND s.gender = ?';
      subjectExamParams.push(gender);
    }
    subjectExamQuery += ' GROUP BY ep.subject ORDER BY avg_percentage DESC LIMIT 10';
    const [examBySubject] = await pool.query(subjectExamQuery, subjectExamParams);

    // 11. Students struggling academically (avg < 50%)
    let strugglingQuery = `
      SELECT
        s.id,
        s.student_id,
        s.first_name,
        s.last_name,
        s.gender,
        c.name as class_name,
        ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage,
        COUNT(*) as exam_count
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE ep.madrasah_id = ? AND ep.is_absent = 0
    `;
    const strugglingParams = [madrasahId];
    if (semester_id) {
      strugglingQuery += ' AND ep.semester_id = ?';
      strugglingParams.push(semester_id);
    }
    if (class_id) {
      strugglingQuery += ' AND s.class_id = ?';
      strugglingParams.push(class_id);
    }
    if (gender) {
      strugglingQuery += ' AND s.gender = ?';
      strugglingParams.push(gender);
    }
    strugglingQuery += ' GROUP BY s.id HAVING avg_percentage < 50 ORDER BY avg_percentage ASC LIMIT 10';
    const [strugglingStudents] = await pool.query(strugglingQuery, strugglingParams);

    // 12. Gender breakdown (if not filtered by gender)
    let genderBreakdown = null;
    if (!gender) {
      const [genderAttendance] = await pool.query(`
        SELECT
          s.gender,
          COUNT(DISTINCT s.id) as student_count,
          ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as attendance_rate
        FROM students s
        LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ?${attendanceFilters}
        WHERE s.madrasah_id = ? AND s.deleted_at IS NULL${class_id ? ' AND s.class_id = ?' : ''}
        GROUP BY s.gender
      `, class_id
        ? [madrasahId, ...attendanceParams, madrasahId, class_id]
        : [madrasahId, ...attendanceParams, madrasahId]
      );

      const [genderExams] = await pool.query(`
        SELECT
          s.gender,
          ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage
        FROM exam_performance ep
        JOIN students s ON ep.student_id = s.id
        WHERE ep.madrasah_id = ? AND ep.is_absent = 0${semester_id ? ' AND ep.semester_id = ?' : ''}${class_id ? ' AND s.class_id = ?' : ''}
        GROUP BY s.gender
      `, [madrasahId, ...(semester_id ? [semester_id] : []), ...(class_id ? [class_id] : [])]);

      genderBreakdown = {
        attendance: genderAttendance,
        exams: genderExams
      };
    }

    // Calculate trends
    const thisWeekAbsentCount = thisWeekAbsences[0]?.absent_count || 0;
    const lastWeekAbsentCount = lastWeekAbsences[0]?.absent_count || 0;
    const absenceTrend = lastWeekAbsentCount > 0
      ? Math.round(((thisWeekAbsentCount - lastWeekAbsentCount) / lastWeekAbsentCount) * 100)
      : 0;

    // Determine attendance status label
    const attendanceRate = overallStats[0]?.attendance_rate || 0;
    let attendanceStatus = 'needs-attention';
    let attendanceLabel = 'Needs Improvement';
    if (attendanceRate >= 90) {
      attendanceStatus = 'excellent';
      attendanceLabel = 'Excellent';
    } else if (attendanceRate >= 80) {
      attendanceStatus = 'good';
      attendanceLabel = 'Good';
    } else if (attendanceRate >= 70) {
      attendanceStatus = 'fair';
      attendanceLabel = 'Fair';
    }

    // Exam performance status
    const avgExamPercentage = examSummary[0]?.avg_percentage || 0;
    let examStatus = 'needs-attention';
    let examLabel = 'Needs Improvement';
    if (avgExamPercentage >= 80) {
      examStatus = 'excellent';
      examLabel = 'Excellent';
    } else if (avgExamPercentage >= 65) {
      examStatus = 'good';
      examLabel = 'Good';
    } else if (avgExamPercentage >= 50) {
      examStatus = 'fair';
      examLabel = 'Fair';
    }

    res.json({
      summary: {
        // Attendance
        overallAttendanceRate: attendanceRate,
        attendanceStatus,
        attendanceLabel,
        totalStudentsTracked: overallStats[0]?.students_with_attendance || 0,
        absencesThisWeek: thisWeekAbsentCount,
        absenceTrend,
        studentsNeedingAttention: atRiskStudents.length,
        // Exams
        avgExamPercentage,
        examStatus,
        examLabel,
        examPassRate: examSummary[0]?.pass_rate || 0,
        studentsWithExams: examSummary[0]?.students_with_exams || 0,
        subjectsCount: examSummary[0]?.subjects_count || 0,
        studentsStruggling: strugglingStudents.length
      },
      atRiskStudents,
      classComparison: classAttendance,
      frequentAbsences,
      weeklyTrend,
      classesWithoutRecentAttendance,
      examBySubject,
      strugglingStudents,
      genderBreakdown
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
