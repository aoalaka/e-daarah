import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateTeacher, validateStudent, validateSession, validateSemester, validateClass, normalizePhone } from '../utils/validation.js';
import {
  requireActiveSubscription,
  enforceStudentLimit,
  enforceTeacherLimit,
  enforceClassLimit,
  requirePlusPlan
} from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// Generate a random 6-digit numeric PIN for parent access
function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
router.post('/sessions', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;

    // If setting this session as active, deactivate all other sessions in THIS madrasah
    if (is_active) {
      await pool.query('UPDATE sessions SET is_active = false WHERE madrasah_id = ?', [madrasahId]);
    }

    const [result] = await pool.query(
      'INSERT INTO sessions (madrasah_id, name, start_date, end_date, is_active, default_school_days) VALUES (?, ?, ?, ?, ?, ?)',
      [madrasahId, name, start_date, end_date, is_active || false, default_school_days ? JSON.stringify(default_school_days) : null]
    );
    res.status(201).json({ id: result.insertId, name, start_date, end_date, is_active, default_school_days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session (scoped to madrasah)
router.put('/sessions/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;

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
      'UPDATE sessions SET name = ?, start_date = ?, end_date = ?, is_active = ?, default_school_days = ? WHERE id = ? AND madrasah_id = ?',
      [name, start_date, end_date, is_active, default_school_days ? JSON.stringify(default_school_days) : null, id, madrasahId]
    );
    res.json({ id, name, start_date, end_date, is_active, default_school_days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session (soft delete, scoped to madrasah)
router.delete('/sessions/:id', requireActiveSubscription, async (req, res) => {
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
router.post('/semesters', requireActiveSubscription, async (req, res) => {
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
router.put('/semesters/:id', requireActiveSubscription, async (req, res) => {
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
router.delete('/semesters/:id', requireActiveSubscription, async (req, res) => {
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

// ============ ACADEMIC HOLIDAYS ============

// GET holidays for a session
router.get('/sessions/:sessionId/holidays', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { sessionId } = req.params;
    const [holidays] = await pool.query(
      `SELECT * FROM academic_holidays WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL ORDER BY start_date ASC`,
      [madrasahId, sessionId]
    );
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// CREATE holiday
router.post('/sessions/:sessionId/holidays', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { sessionId } = req.params;
    const { title, start_date, end_date, description } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    // Verify session belongs to madrasah
    const [session] = await pool.query('SELECT id, start_date, end_date FROM sessions WHERE id = ? AND madrasah_id = ?', [sessionId, madrasahId]);
    if (session.length === 0) return res.status(404).json({ error: 'Session not found' });

    // Validate dates within session range
    if (new Date(start_date) < new Date(session[0].start_date) || new Date(end_date) > new Date(session[0].end_date)) {
      return res.status(400).json({ error: 'Holiday dates must be within session date range' });
    }

    const [result] = await pool.query(
      'INSERT INTO academic_holidays (madrasah_id, session_id, title, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [madrasahId, sessionId, title, start_date, end_date, description || null]
    );
    res.status(201).json({ id: result.insertId, madrasah_id: madrasahId, session_id: parseInt(sessionId), title, start_date, end_date, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create holiday' });
  }
});

// UPDATE holiday
router.put('/holidays/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { title, start_date, end_date, description } = req.body;

    const [check] = await pool.query('SELECT id FROM academic_holidays WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Holiday not found' });

    await pool.query(
      'UPDATE academic_holidays SET title = ?, start_date = ?, end_date = ?, description = ? WHERE id = ? AND madrasah_id = ?',
      [title, start_date, end_date, description || null, id, madrasahId]
    );
    res.json({ id: parseInt(id), title, start_date, end_date, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update holiday' });
  }
});

// DELETE holiday (soft delete)
router.delete('/holidays/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query('UPDATE academic_holidays SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    res.json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

// ============ SCHEDULE OVERRIDES ============

// GET schedule overrides for a session
router.get('/sessions/:sessionId/schedule-overrides', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { sessionId } = req.params;
    const [overrides] = await pool.query(
      `SELECT * FROM schedule_overrides WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL ORDER BY start_date ASC`,
      [madrasahId, sessionId]
    );
    res.json(overrides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule overrides' });
  }
});

// CREATE schedule override
router.post('/sessions/:sessionId/schedule-overrides', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { sessionId } = req.params;
    const { title, start_date, end_date, school_days } = req.body;

    if (!title || !start_date || !end_date || !school_days || !Array.isArray(school_days)) {
      return res.status(400).json({ error: 'Title, dates, and school_days array are required' });
    }

    // Verify session belongs to madrasah
    const [session] = await pool.query('SELECT id, start_date, end_date FROM sessions WHERE id = ? AND madrasah_id = ?', [sessionId, madrasahId]);
    if (session.length === 0) return res.status(404).json({ error: 'Session not found' });

    // Validate dates within session range
    if (new Date(start_date) < new Date(session[0].start_date) || new Date(end_date) > new Date(session[0].end_date)) {
      return res.status(400).json({ error: 'Override dates must be within session date range' });
    }

    const [result] = await pool.query(
      'INSERT INTO schedule_overrides (madrasah_id, session_id, title, start_date, end_date, school_days) VALUES (?, ?, ?, ?, ?, ?)',
      [madrasahId, sessionId, title, start_date, end_date, JSON.stringify(school_days)]
    );
    res.status(201).json({ id: result.insertId, madrasah_id: madrasahId, session_id: parseInt(sessionId), title, start_date, end_date, school_days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule override' });
  }
});

// UPDATE schedule override
router.put('/schedule-overrides/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { title, start_date, end_date, school_days } = req.body;

    const [check] = await pool.query('SELECT id FROM schedule_overrides WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Override not found' });

    await pool.query(
      'UPDATE schedule_overrides SET title = ?, start_date = ?, end_date = ?, school_days = ? WHERE id = ? AND madrasah_id = ?',
      [title, start_date, end_date, JSON.stringify(school_days), id, madrasahId]
    );
    res.json({ id: parseInt(id), title, start_date, end_date, school_days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule override' });
  }
});

// DELETE schedule override (soft delete)
router.delete('/schedule-overrides/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query('UPDATE schedule_overrides SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    res.json({ message: 'Override deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule override' });
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
router.put('/classes/:id', requireActiveSubscription, async (req, res) => {
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
router.delete('/classes/:id', requireActiveSubscription, async (req, res) => {
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
router.post('/classes/:classId/teachers', requireActiveSubscription, async (req, res) => {
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
router.delete('/classes/:classId/teachers/:teacherId', requireActiveSubscription, async (req, res) => {
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
router.put('/teachers/:id', requireActiveSubscription, async (req, res) => {
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
router.delete('/teachers/:id', requireActiveSubscription, async (req, res) => {
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
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
            expected_fee, fee_note } = req.body;

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
       parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
       expected_fee, fee_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, first_name, last_name, student_id, gender, email, class_id || null,
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth,
       parent_guardian_name, parent_guardian_relationship,
       normalizePhone(parent_guardian_phone, parent_guardian_phone_country_code),
       parent_guardian_phone_country_code, notes,
       expected_fee != null ? parseFloat(expected_fee) : null, fee_note || null]
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

// Bulk set expected fee for multiple students (must be before /students/:id)
router.put('/students/bulk-fee', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { student_ids, expected_fee, fee_note } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one student' });
    }
    if (expected_fee == null || parseFloat(expected_fee) < 0) {
      return res.status(400).json({ error: 'Expected fee must be 0 or greater' });
    }

    const placeholders = student_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE students SET expected_fee = ?, fee_note = ? WHERE id IN (${placeholders}) AND madrasah_id = ? AND deleted_at IS NULL`,
      [parseFloat(expected_fee), fee_note || null, ...student_ids, madrasahId]
    );

    res.json({ message: `Expected fee updated for ${student_ids.length} student(s)` });
  } catch (error) {
    console.error('Failed to bulk update fees:', error);
    res.status(500).json({ error: 'Failed to update fees' });
  }
});

// Update expected fee for a single student
router.put('/students/:id/fee', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { expected_fee, fee_note } = req.body;

    const [check] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Student not found' });

    await pool.query(
      'UPDATE students SET expected_fee = ?, fee_note = ? WHERE id = ? AND madrasah_id = ?',
      [expected_fee != null ? parseFloat(expected_fee) : null, fee_note || null, id, madrasahId]
    );
    res.json({ message: 'Fee updated' });
  } catch (error) {
    console.error('Failed to update student fee:', error);
    res.status(500).json({ error: 'Failed to update fee' });
  }
});

// Update student (scoped to madrasah)
router.put('/students/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
            expected_fee, fee_note } = req.body;

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
       parent_guardian_phone = ?, parent_guardian_phone_country_code = ?, notes = ?,
       expected_fee = ?, fee_note = ? WHERE id = ? AND madrasah_id = ?`,
      [first_name, last_name, student_id, gender, email,
       student_phone, student_phone_country_code, street, city, state, country,
       class_id || null, date_of_birth,
       parent_guardian_name, parent_guardian_relationship,
       normalizePhone(parent_guardian_phone, parent_guardian_phone_country_code),
       parent_guardian_phone_country_code, notes,
       expected_fee != null ? parseFloat(expected_fee) : null, fee_note || null, id, madrasahId]
    );
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Failed to update student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Update student class assignment (lightweight, scoped to madrasah)
router.patch('/students/:id/class', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { class_id } = req.body;

    // Verify student belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
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
      'UPDATE students SET class_id = ? WHERE id = ? AND madrasah_id = ?',
      [class_id || null, id, madrasahId]
    );
    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete student (soft delete, scoped to madrasah)
router.delete('/students/:id', requireActiveSubscription, async (req, res) => {
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

// Bulk delete students (soft delete, scoped to madrasah)
router.post('/students/bulk-delete', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No student IDs provided' });
    }

    const [result] = await pool.query(
      'UPDATE students SET deleted_at = NOW() WHERE id IN (?) AND madrasah_id = ? AND deleted_at IS NULL',
      [ids, madrasahId]
    );

    res.json({ message: `${result.affectedRows} student(s) deleted successfully`, deleted: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete students' });
  }
});

// Reset parent account — deletes parent_users row so parent can re-register with a new PIN
router.post('/students/:id/reset-parent-pin', requireActiveSubscription, requirePlusPlan('Parent portal'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;

    const [students] = await pool.query(
      'SELECT id, first_name, last_name, parent_guardian_phone, parent_guardian_phone_country_code FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (students.length === 0) return res.status(404).json({ error: 'Student not found' });

    const student = students[0];
    if (!student.parent_guardian_phone) {
      return res.status(400).json({ error: 'This student has no parent phone number on file' });
    }

    const phone = normalizePhone(student.parent_guardian_phone, student.parent_guardian_phone_country_code);

    const [result] = await pool.query(
      'DELETE FROM parent_users WHERE madrasah_id = ? AND phone = ? AND phone_country_code = ?',
      [madrasahId, phone, student.parent_guardian_phone_country_code]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No parent account found for this phone number. The parent may not have registered yet.' });
    }

    res.json({ message: 'Parent account reset. The parent can now set up a new PIN on the login page.' });
  } catch (error) {
    console.error('Failed to reset parent account:', error);
    res.status(500).json({ error: 'Failed to reset parent account' });
  }
});


// Get class KPIs with high-risk students (scoped to madrasah)
router.get('/classes/:classId/kpis', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semester_id, date_from, date_to } = req.query;

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
      semesterFilter += ' AND a.semester_id = ?';
      params.push(semester_id);
    }
    if (date_from) {
      semesterFilter += ' AND a.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      semesterFilter += ' AND a.date <= ?';
      params.push(date_to);
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
          NULLIF(SUM(CASE WHEN a.behavior_grade IS NOT NULL THEN 1 ELSE 0 END), 0) as avg_behavior_score,
        SUM(CASE WHEN a.punctuality_grade = 'Excellent' THEN 4 WHEN a.punctuality_grade = 'Good' THEN 3 WHEN a.punctuality_grade = 'Fair' THEN 2 WHEN a.punctuality_grade = 'Poor' THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN a.punctuality_grade IS NOT NULL THEN 1 ELSE 0 END), 0) as avg_punctuality_score
      FROM attendance a
      WHERE a.class_id = ? AND a.madrasah_id = ? AND a.deleted_at IS NULL${semesterFilter}
    `, params);

    // Get exam statistics (join through students to filter by class)
    const examStatsParams = [classId, madrasahId];
    let examStatsFilter = '';
    if (semester_id) {
      examStatsFilter = ' AND ep.semester_id = ?';
      examStatsParams.push(semester_id);
    }
    const [examStats] = await pool.query(`
      SELECT
        COUNT(*) as total_exams,
        AVG(ep.score) as avg_score,
        MAX(ep.score) as highest_score,
        MIN(ep.score) as lowest_score
      FROM exam_performance ep
      INNER JOIN students s ON ep.student_id = s.id
      WHERE s.class_id = ? AND s.madrasah_id = ? AND ep.deleted_at IS NULL${examStatsFilter}
    `, examStatsParams);

    // Get high-risk students (low attendance < 70% or poor grades below 2.5/4.0)
    // Only include students who have actual attendance data for the selected scope
    const highRiskParams = [classId, madrasahId];
    if (semester_id) highRiskParams.push(semester_id);
    if (date_from) highRiskParams.push(date_from);
    if (date_to) highRiskParams.push(date_to);
    highRiskParams.push(classId, madrasahId);

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
        AVG(CASE WHEN a.punctuality_grade = 'Excellent' THEN 4 WHEN a.punctuality_grade = 'Good' THEN 3 WHEN a.punctuality_grade = 'Fair' THEN 2 WHEN a.punctuality_grade = 'Poor' THEN 1 ELSE NULL END) as avg_punctuality
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.class_id = ? AND a.madrasah_id = ? AND a.deleted_at IS NULL${semesterFilter}
      WHERE s.class_id = ? AND s.madrasah_id = ? AND s.deleted_at IS NULL
      GROUP BY s.id
      HAVING COUNT(DISTINCT a.date) > 0 AND (
        attendance_rate < 70
        OR avg_dressing < 2.5
        OR avg_behavior < 2.5
        OR avg_punctuality < 2.5
      )
      ORDER BY attendance_rate ASC
    `, highRiskParams);

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
    const { semester_id, date_from, date_to } = req.query;

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
    if (date_from) {
      query += ' AND a.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND a.date <= ?';
      params.push(date_to);
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
    const { semester_id, subject } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    let query = `SELECT ep.*, s.first_name, s.last_name, s.student_id,
                        sem.name as semester_name, sess.name as session_name
                 FROM exam_performance ep
                 JOIN students s ON ep.student_id = s.id
                 LEFT JOIN semesters sem ON ep.semester_id = sem.id
                 LEFT JOIN sessions sess ON sem.session_id = sess.id
                 WHERE s.class_id = ? AND s.madrasah_id = ? AND ep.deleted_at IS NULL`;
    const queryParams = [classId, madrasahId];

    if (semester_id) {
      query += ' AND ep.semester_id = ?';
      queryParams.push(semester_id);
    }
    if (subject) {
      query += ' AND ep.subject = ?';
      queryParams.push(subject);
    }

    query += ' ORDER BY ep.exam_date DESC';
    const [records] = await pool.query(query, queryParams);
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

// Get punctuality rankings for a class (scoped to madrasah)
router.get('/classes/:classId/punctuality-rankings', async (req, res) => {
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
          CASE a.punctuality_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_punctuality_score,
        SUM(CASE WHEN a.punctuality_grade = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN a.punctuality_grade = 'Good' THEN 1 ELSE 0 END) as good_count,
        SUM(CASE WHEN a.punctuality_grade = 'Fair' THEN 1 ELSE 0 END) as fair_count,
        SUM(CASE WHEN a.punctuality_grade = 'Poor' THEN 1 ELSE 0 END) as poor_count
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.punctuality_grade IS NOT NULL
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

    query += ` GROUP BY s.id ORDER BY avg_punctuality_score DESC`;

    const [rankings] = await pool.query(query, queryParams);

    // Format the results and add rank (handle ties properly)
    let currentRank = 1;
    let previousScore = null;
    let studentsAtCurrentRank = 0;
    
    const formattedRankings = rankings.map((student) => {
      const score = student.avg_punctuality_score ? parseFloat(student.avg_punctuality_score).toFixed(2) : null;
      
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
        avg_punctuality_score: score,
        avg_punctuality_grade: gradeLabel,
        total_records: parseInt(student.total_records) || 0,
        excellent_count: parseInt(student.excellent_count) || 0,
        good_count: parseInt(student.good_count) || 0,
        fair_count: parseInt(student.fair_count) || 0,
        poor_count: parseInt(student.poor_count) || 0
      };
    });

    res.json(formattedRankings);
  } catch (error) {
    console.error('Get punctuality rankings error:', error);
    res.status(500).json({ error: 'Failed to fetch punctuality rankings' });
  }
});

// Get all rankings for a specific student (class-scoped)
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

    // Get exam ranking (class-scoped, total = students in class)
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
      WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
    `;
    const examParams = [madrasahId, madrasahId, student.class_id];

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
    const totalExamStudents = examRankings.length;
    
    examRankings.forEach((student) => {
      const percentage = student.overall_percentage ? parseFloat(student.overall_percentage).toFixed(2) : '0.00';
      
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
        // Only set rank if student has actual exam data (percentage > 0)
        if (parseFloat(r.overall_percentage) > 0) {
          examRank = r.rank;
          examPercentage = parseFloat(r.overall_percentage).toFixed(2);
        }
      }
    });

    // Get attendance ranking (class-scoped, total = students in class)
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
      WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
    `;
    const attendanceParams = [madrasahId, madrasahId, student.class_id];

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
        // Only set rank if student has actual attendance data (rate > 0)
        if (parseFloat(r.attendance_rate) > 0) {
          attendanceRank = r.rank;
          attendanceRate = parseFloat(r.attendance_rate).toFixed(2);
        }
      }
    });

    // Get dressing ranking (class-scoped, total = students present)
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
      WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
    `;
    const dressingParams = [madrasahId, madrasahId, student.class_id];

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
        // Only set rank if student has actual dressing data
        if (r.avg_dressing_score && parseFloat(r.avg_dressing_score) > 0) {
          dressingRank = r.rank;
          dressingScore = parseFloat(r.avg_dressing_score).toFixed(2);
        }
      }
    });

    // Get behavior ranking (class-scoped, total = students present)
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
      WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
    `;
    const behaviorParams = [madrasahId, madrasahId, student.class_id];

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
        // Only set rank if student has actual behavior data
        if (r.avg_behavior_score && parseFloat(r.avg_behavior_score) > 0) {
          behaviorRank = r.rank;
          behaviorScore = parseFloat(r.avg_behavior_score).toFixed(2);
        }
      }
    });

    // Get punctuality ranking (class-scoped, total = students present)
    let punctualityQuery = `
      SELECT 
        s.id,
        AVG(
          CASE a.punctuality_grade
            WHEN 'Excellent' THEN 4
            WHEN 'Good' THEN 3
            WHEN 'Fair' THEN 2
            WHEN 'Poor' THEN 1
            ELSE NULL
          END
        ) as avg_punctuality_score
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id AND a.madrasah_id = ? AND a.punctuality_grade IS NOT NULL
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      WHERE s.madrasah_id = ? AND s.class_id = ? AND s.deleted_at IS NULL
    `;
    const punctualityParams = [madrasahId, madrasahId, student.class_id];

    if (sessionId) {
      punctualityQuery += ` AND sem.session_id = ?`;
      punctualityParams.push(sessionId);
    }
    if (semesterId) {
      punctualityQuery += ` AND a.semester_id = ?`;
      punctualityParams.push(semesterId);
    }

    punctualityQuery += ` GROUP BY s.id HAVING avg_punctuality_score IS NOT NULL ORDER BY avg_punctuality_score DESC`;
    const [punctualityRankings] = await pool.query(punctualityQuery, punctualityParams);

    // Apply tie-aware ranking for punctuality
    let punctualityRankArray = [];
    let punctualityCurrentRank = 1;
    let punctualityPreviousScore = null;
    let punctualityStudentsAtCurrentRank = 0;
    
    punctualityRankings.forEach((student) => {
      const score = student.avg_punctuality_score ? parseFloat(student.avg_punctuality_score).toFixed(2) : '0.00';
      
      if (punctualityPreviousScore !== null && score !== punctualityPreviousScore) {
        punctualityCurrentRank += punctualityStudentsAtCurrentRank;
        punctualityStudentsAtCurrentRank = 0;
      }
      
      punctualityStudentsAtCurrentRank++;
      punctualityPreviousScore = score;
      
      punctualityRankArray.push({
        ...student,
        rank: punctualityCurrentRank
      });
    });

    let punctualityRank = null;
    let punctualityScore = null;
    let totalPunctualityStudents = punctualityRankArray.length;
    punctualityRankArray.forEach((r) => {
      if (r.id === parseInt(id)) {
        // Only set rank if student has actual punctuality data
        if (r.avg_punctuality_score && parseFloat(r.avg_punctuality_score) > 0) {
          punctualityRank = r.rank;
          punctualityScore = parseFloat(r.avg_punctuality_score).toFixed(2);
        }
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
        },
        punctuality: {
          rank: punctualityRank,
          score: punctualityScore,
          total_students: totalPunctualityStudents
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

    const punctualityGrades = attendance.filter(a => a.punctuality_grade).map(a => a.punctuality_grade);

    const dressingScores = dressingGrades.map(gradeToNumber);
    const behaviorScores = behaviorGrades.map(gradeToNumber);
    const punctualityScores = punctualityGrades.map(gradeToNumber);

    const avgDressing = dressingScores.length > 0
      ? dressingScores.reduce((a, b) => a + b, 0) / dressingScores.length
      : null;
    const avgBehavior = behaviorScores.length > 0
      ? behaviorScores.reduce((a, b) => a + b, 0) / behaviorScores.length
      : null;
    const avgPunctuality = punctualityScores.length > 0
      ? punctualityScores.reduce((a, b) => a + b, 0) / punctualityScores.length
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
        avgBehavior,
        avgPunctuality
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
router.put('/students/:id/comment', requireActiveSubscription, async (req, res) => {
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
       pricing_plan, subscription_status, current_period_end, stripe_customer_id,
       enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency
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

// Update madrasah feature settings
router.put('/settings', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency } = req.body;

    const updates = [];
    const params = [];

    if (typeof enable_dressing_grade === 'boolean') {
      updates.push('enable_dressing_grade = ?');
      params.push(enable_dressing_grade);
    }
    if (typeof enable_behavior_grade === 'boolean') {
      updates.push('enable_behavior_grade = ?');
      params.push(enable_behavior_grade);
    }
    if (typeof enable_punctuality_grade === 'boolean') {
      updates.push('enable_punctuality_grade = ?');
      params.push(enable_punctuality_grade);
    }
    if (typeof enable_quran_tracking === 'boolean') {
      updates.push('enable_quran_tracking = ?');
      params.push(enable_quran_tracking);
    }
    if (typeof enable_fee_tracking === 'boolean') {
      updates.push('enable_fee_tracking = ?');
      params.push(enable_fee_tracking);
    }
    if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) {
      updates.push('currency = ?');
      params.push(currency);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' });
    }

    params.push(madrasahId);
    await pool.query(
      `UPDATE madrasahs SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Return updated settings
    const [updated] = await pool.query(
      'SELECT enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency FROM madrasahs WHERE id = ?',
      [madrasahId]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// FEE TRACKING
// ============================================

// List fee payments
router.get('/fee-payments', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { student_id, class_id, from, to } = req.query;

    let sql = `SELECT fp.id, fp.student_id, fp.amount_paid, fp.payment_date,
       fp.payment_method, fp.reference_note, fp.payment_label, fp.period_label, fp.created_at,
       CONCAT(s.first_name, ' ', s.last_name) as student_name
       FROM fee_payments fp
       JOIN students s ON s.id = fp.student_id
       WHERE fp.madrasah_id = ? AND fp.deleted_at IS NULL`;
    const params = [madrasahId];

    if (student_id) { sql += ' AND fp.student_id = ?'; params.push(student_id); }
    if (from) { sql += ' AND fp.payment_date >= ?'; params.push(from); }
    if (to) { sql += ' AND fp.payment_date <= ?'; params.push(to); }
    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }

    sql += ' ORDER BY fp.payment_date DESC, fp.created_at DESC';
    const [payments] = await pool.query(sql, params);
    res.json(payments.map(p => ({ ...p, amount_paid: parseFloat(p.amount_paid) })));
  } catch (error) {
    console.error('Failed to fetch fee payments:', error);
    res.status(500).json({ error: 'Failed to fetch fee payments' });
  }
});

// Record fee payment
router.post('/fee-payments', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const userId = req.user.id;
    const { student_id, amount_paid, payment_date, payment_method, reference_note, payment_label } = req.body;

    if (!student_id) return res.status(400).json({ error: 'Student is required' });
    if (!amount_paid || parseFloat(amount_paid) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (!payment_date) return res.status(400).json({ error: 'Payment date is required' });

    // Verify student belongs to madrasah
    const [stu] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [student_id, madrasahId]);
    if (stu.length === 0) return res.status(404).json({ error: 'Student not found' });

    const method = ['cash', 'bank_transfer', 'online', 'other'].includes(payment_method) ? payment_method : 'cash';

    const [result] = await pool.query(
      `INSERT INTO fee_payments (madrasah_id, student_id, amount_paid, payment_date, payment_method, reference_note, payment_label, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, student_id, parseFloat(amount_paid), payment_date, method, reference_note || null, payment_label || null, userId]
    );

    res.status(201).json({ id: result.insertId, message: 'Payment recorded successfully' });
  } catch (error) {
    console.error('Failed to record fee payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Void fee payment
router.delete('/fee-payments/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query(
      'UPDATE fee_payments SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    res.json({ message: 'Payment voided successfully' });
  } catch (error) {
    console.error('Failed to void fee payment:', error);
    res.status(500).json({ error: 'Failed to void payment' });
  }
});

// Fee summary per student
router.get('/fee-summary', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_id } = req.query;

    let sql = `SELECT s.id as student_id, s.first_name, s.last_name, s.expected_fee, s.fee_note,
       c.name as class_name,
       COALESCE(SUM(fp.amount_paid), 0) as total_paid
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.madrasah_id = s.madrasah_id AND fp.deleted_at IS NULL
       WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee IS NOT NULL`;
    const params = [madrasahId];

    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }

    sql += ' GROUP BY s.id ORDER BY s.last_name, s.first_name';
    const [rows] = await pool.query(sql, params);

    const summary = rows.map(row => {
      const totalFee = parseFloat(row.expected_fee);
      const totalPaid = parseFloat(row.total_paid);
      const balance = totalFee - totalPaid;
      return {
        student_id: row.student_id,
        student_name: `${row.first_name} ${row.last_name}`,
        class_name: row.class_name || '',
        total_fee: totalFee,
        total_paid: totalPaid,
        balance,
        fee_note: row.fee_note,
        status: totalPaid >= totalFee ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('Failed to fetch fee summary:', error);
    res.status(500).json({ error: 'Failed to fetch fee summary' });
  }
});

// Analytics Dashboard - School-wide insights (available to all plans for Insights overview)
router.get('/analytics', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { semester_id, class_id, gender, today: clientToday } = req.query;

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
      HAVING attendance_rate < 70 AND COUNT(a.id) > 0
      ORDER BY attendance_rate ASC
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

    // 8. Attendance compliance — marked vs expected days per class (cumulative from semester start)
    const [complianceRaw] = await pool.query(`
      SELECT
        c.id,
        c.name as class_name,
        c.school_days as class_school_days,
        MAX(sess.default_school_days) as default_school_days,
        MIN(sem.start_date) as semester_start,
        MIN(sem.id) as semester_id
      FROM classes c
      JOIN sessions sess ON sess.madrasah_id = c.madrasah_id AND sess.deleted_at IS NULL
      JOIN semesters sem ON sem.session_id = sess.id
        AND sem.is_active = 1
        AND sem.start_date <= CURDATE()
        AND sem.deleted_at IS NULL
      WHERE c.madrasah_id = ?
        AND c.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL)
      GROUP BY c.id, c.name, c.school_days
    `, [madrasahId]);

    // Get marked days per class in the active semester
    const [markedDaysRaw] = complianceRaw.length > 0
      ? await pool.query(`
          SELECT a.class_id, COUNT(DISTINCT a.date) as marked_days
          FROM attendance a
          WHERE a.madrasah_id = ? AND a.deleted_at IS NULL
            AND a.semester_id = ?
            AND a.class_id IN (${complianceRaw.map(() => '?').join(',')})
          GROUP BY a.class_id
        `, [madrasahId, complianceRaw[0]?.semester_id, ...complianceRaw.map(r => r.id)])
      : [[]];
    const markedDaysMap = {};
    markedDaysRaw.forEach(r => { markedDaysMap[r.class_id] = r.marked_days; });

    // Fetch schedule overrides and holidays for accurate day counting
    const [scheduleOverrides] = await pool.query(
      `SELECT start_date, end_date, school_days FROM schedule_overrides
       WHERE madrasah_id = ? AND deleted_at IS NULL`,
      [madrasahId]
    );
    const [holidays] = await pool.query(
      `SELECT start_date, end_date FROM academic_holidays
       WHERE madrasah_id = ? AND deleted_at IS NULL`,
      [madrasahId]
    );

    // Helper: check if a date falls within any holiday
    const isHoliday = (d) => holidays.some(h => {
      const start = new Date(h.start_date); start.setHours(0,0,0,0);
      const end = new Date(h.end_date); end.setHours(0,0,0,0);
      return d >= start && d <= end;
    });

    // Helper: get override school_days for a date, or null
    const getOverrideDays = (d) => {
      for (const o of scheduleOverrides) {
        const start = new Date(o.start_date); start.setHours(0,0,0,0);
        const end = new Date(o.end_date); end.setHours(0,0,0,0);
        if (d >= start && d <= end) {
          const days = typeof o.school_days === 'string' ? JSON.parse(o.school_days) : o.school_days;
          return Array.isArray(days) ? days : null;
        }
      }
      return null;
    };

    // Compute expected days per class from semester start to today
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const attendanceCompliance = complianceRaw
      .map(row => {
        try {
          let baseSchoolDays = null;
          if (row.class_school_days) {
            baseSchoolDays = typeof row.class_school_days === 'string' ? JSON.parse(row.class_school_days) : row.class_school_days;
          } else if (row.default_school_days) {
            baseSchoolDays = typeof row.default_school_days === 'string' ? JSON.parse(row.default_school_days) : row.default_school_days;
          }

          if (!baseSchoolDays || baseSchoolDays.length === 0) {
            return { id: row.id, class_name: row.class_name, expected_days: 0, marked_days: 0, compliance_rate: null, missed_days: 0 };
          }

          const semStart = new Date(row.semester_start);
          semStart.setHours(0, 0, 0, 0);
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          const baseDayIndices = baseSchoolDays.map(d => dayNames.indexOf(d)).filter(i => i !== -1);

          // Count expected school days from semester start to today (inclusive)
          let expectedDays = 0;
          const cursor = new Date(semStart);
          while (cursor <= now) {
            if (!isHoliday(cursor)) {
              const overrideDays = getOverrideDays(cursor);
              if (overrideDays) {
                const overrideIndices = overrideDays.map(d => dayNames.indexOf(d)).filter(i => i !== -1);
                if (overrideIndices.includes(cursor.getDay())) {
                  expectedDays++;
                }
              } else {
                if (baseDayIndices.includes(cursor.getDay())) {
                  expectedDays++;
                }
              }
            }
            cursor.setDate(cursor.getDate() + 1);
          }

          const markedDays = markedDaysMap[row.id] || 0;
          const complianceRate = expectedDays > 0 ? Math.round(markedDays / expectedDays * 1000) / 10 : null;

          return {
            id: row.id,
            class_name: row.class_name,
            expected_days: expectedDays,
            marked_days: markedDays,
            compliance_rate: complianceRate,
            missed_days: Math.max(0, expectedDays - markedDays)
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (a.compliance_rate ?? 999) - (b.compliance_rate ?? 999));

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

    // 10b. Exam averages by class
    let examByClassQuery = `
      SELECT
        c.id as class_id,
        c.name as class_name,
        ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage,
        COUNT(DISTINCT ep.student_id) as students_with_exams
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE ep.madrasah_id = ? AND ep.is_absent = 0
    `;
    const examByClassParams = [madrasahId];
    if (semester_id) {
      examByClassQuery += ' AND ep.semester_id = ?';
      examByClassParams.push(semester_id);
    }
    if (gender) {
      examByClassQuery += ' AND s.gender = ?';
      examByClassParams.push(gender);
    }
    examByClassQuery += ' GROUP BY c.id, c.name ORDER BY avg_percentage DESC';
    const [examByClass] = await pool.query(examByClassQuery, examByClassParams);

    // 11. Students struggling academically (avg < 50%)
    // If no semester filter provided, scope to active semester to avoid cross-semester noise
    let effectiveSemesterId = semester_id;
    if (!effectiveSemesterId) {
      const [activeSem] = await pool.query(
        `SELECT sem.id FROM semesters sem
         JOIN sessions sess ON sem.session_id = sess.id
         WHERE sess.madrasah_id = ? AND sem.is_active = 1 AND sem.deleted_at IS NULL AND sess.deleted_at IS NULL
         LIMIT 1`,
        [madrasahId]
      );
      if (activeSem.length > 0) effectiveSemesterId = activeSem[0].id;
    }
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
      WHERE ep.madrasah_id = ? AND ep.is_absent = 0 AND ep.deleted_at IS NULL AND s.deleted_at IS NULL
    `;
    const strugglingParams = [madrasahId];
    if (effectiveSemesterId) {
      strugglingQuery += ' AND ep.semester_id = ?';
      strugglingParams.push(effectiveSemesterId);
    }
    if (class_id) {
      strugglingQuery += ' AND s.class_id = ?';
      strugglingParams.push(class_id);
    }
    if (gender) {
      strugglingQuery += ' AND s.gender = ?';
      strugglingParams.push(gender);
    }
    strugglingQuery += ' GROUP BY s.id HAVING avg_percentage < 50 ORDER BY avg_percentage ASC';
    const [strugglingStudents] = await pool.query(strugglingQuery, strugglingParams);

    // 11b. Total students count
    const [totalStudentsResult] = await pool.query(
      'SELECT COUNT(*) as total FROM students WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );
    const totalStudents = totalStudentsResult[0]?.total || 0;

    // 11c. Dropout count (students marked as dropped_out in promotion history)
    // Not filtered by semester — dropouts are cumulative for the madrasah
    const [dropoutResult] = await pool.query(
      'SELECT COUNT(DISTINCT sp.student_id) as total FROM student_promotions sp WHERE sp.madrasah_id = ? AND sp.promotion_type = ?',
      [madrasahId, 'dropped_out']
    );
    const dropoutCount = dropoutResult[0]?.total || 0;

    // 11d. Poor behaviour count (students with 3+ "Poor" behaviour ratings)
    const [madrasahSettings] = await pool.query(
      'SELECT enable_behavior_grade FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const behaviorEnabled = madrasahSettings[0]?.enable_behavior_grade !== 0;
    let poorBehaviorStudents = [];
    if (behaviorEnabled) {
      let poorBehaviorQuery = `
        SELECT s.id, s.first_name, s.last_name, c.name as class_name, COUNT(*) as poor_count
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE a.madrasah_id = ? AND a.behavior_grade = 'Poor' AND s.deleted_at IS NULL
      `;
      const poorBehaviorParams = [madrasahId];
      if (effectiveSemesterId) {
        poorBehaviorQuery += ' AND a.semester_id = ?';
        poorBehaviorParams.push(effectiveSemesterId);
      }
      if (class_id) {
        poorBehaviorQuery += ' AND s.class_id = ?';
        poorBehaviorParams.push(class_id);
      }
      poorBehaviorQuery += ' GROUP BY s.id HAVING poor_count >= 3 ORDER BY poor_count DESC';
      [poorBehaviorStudents] = await pool.query(poorBehaviorQuery, poorBehaviorParams);
    }

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
    const hasAttendanceData = (overallStats[0]?.total_records || 0) > 0;
    let attendanceStatus = 'needs-attention';
    let attendanceLabel = 'Needs Improvement';
    if (!hasAttendanceData) {
      attendanceStatus = 'no-data';
      attendanceLabel = 'No data yet';
    } else if (attendanceRate >= 90) {
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
    const hasExamData = (examSummary[0]?.students_with_exams || 0) > 0;
    let examStatus = 'needs-attention';
    let examLabel = 'Needs Improvement';
    if (!hasExamData) {
      examStatus = 'no-data';
      examLabel = 'No exams yet';
    } else if (avgExamPercentage >= 80) {
      examStatus = 'excellent';
      examLabel = 'Excellent';
    } else if (avgExamPercentage >= 65) {
      examStatus = 'good';
      examLabel = 'Good';
    } else if (avgExamPercentage >= 50) {
      examStatus = 'fair';
      examLabel = 'Fair';
    }

    // 10. Getting Started Progress - setup completion tracking
    const [totalClasses] = await pool.query(
      'SELECT COUNT(*) as total FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL',
      [madrasahId]
    );
    const [classesWithStudents] = await pool.query(
      'SELECT COUNT(DISTINCT c.id) as total FROM classes c INNER JOIN students s ON s.class_id = c.id WHERE c.madrasah_id = ? AND c.deleted_at IS NULL AND s.deleted_at IS NULL',
      [madrasahId]
    );
    const [classesWithAttendance] = await pool.query(
      'SELECT COUNT(DISTINCT class_id) as total FROM attendance WHERE madrasah_id = ?',
      [madrasahId]
    );

    // 11. This Week Summary - attendance for current week
    const [thisWeekSummary] = await pool.query(`
      SELECT
        COUNT(CASE WHEN a.present = 1 THEN 1 END) as present_count,
        COUNT(CASE WHEN a.present = 0 THEN 1 END) as absent_count,
        COUNT(*) as total_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate
      FROM attendance a
      WHERE a.madrasah_id = ?
        AND YEARWEEK(a.date, 1) = YEARWEEK(NOW(), 1)
    `, [madrasahId]);

    // 11b. Last Week Summary - for week-over-week comparison
    const [lastWeekSummary] = await pool.query(`
      SELECT
        COUNT(*) as total_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate
      FROM attendance a
      WHERE a.madrasah_id = ?
        AND YEARWEEK(a.date, 1) = YEARWEEK(NOW(), 1) - 1
    `, [madrasahId]);

    // 12. Perfect attendance weeks — weeks where every recorded student was present, per class
    // A "perfect week" = a calendar week where AVG(present) = 1 across all attendance records
    const [attendanceStreaks] = await pool.query(`
      SELECT c.id, c.name as class_name, COUNT(*) as streak_weeks
      FROM classes c
      JOIN (
        SELECT class_id, YEARWEEK(date, 1) as yw
        FROM attendance
        WHERE madrasah_id = ? AND date >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
        GROUP BY class_id, YEARWEEK(date, 1)
        HAVING AVG(present) = 1
      ) perfect_weeks ON c.id = perfect_weeks.class_id
      WHERE c.madrasah_id = ? AND c.deleted_at IS NULL
      GROUP BY c.id, c.name
      ORDER BY streak_weeks DESC
      LIMIT 3
    `, [madrasahId, madrasahId]);

    // 13. Top Performer - best exam score this semester
    const [topPerformer] = await pool.query(`
      SELECT
        s.first_name,
        s.last_name,
        ep.score,
        ep.max_score,
        ROUND((ep.score / ep.max_score * 100), 1) as percentage,
        ep.subject
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      WHERE ep.madrasah_id = ?
        ${semester_id ? 'AND ep.semester_id = ?' : ''}
        AND ep.is_absent = 0
        AND ep.score IS NOT NULL
      ORDER BY percentage DESC
      LIMIT 1
    `, semester_id ? [madrasahId, semester_id] : [madrasahId]);

    // 14. Quick Actions - pending tasks
    // Use client's local date if provided, otherwise fall back to server date
    const today = clientToday || new Date().toISOString().split('T')[0];

    // Check if today is actually a school day for ANY class
    // Priority: holidays > overrides > class school_days > session defaults
    const todayDate = new Date(today + 'T00:00:00');
    const todayDayName = dayNames[todayDate.getDay()];
    let todayIsSchoolDay = false;

    if (!isHoliday(todayDate)) {
      const todayOverride = getOverrideDays(todayDate);
      if (todayOverride) {
        // Override active — applies to all classes
        todayIsSchoolDay = todayOverride.includes(todayDayName);
      } else {
        // No override — check class-level school_days, then fall back to session default
        const [classesForToday] = await pool.query(
          `SELECT c.school_days FROM classes c
           WHERE c.madrasah_id = ? AND c.deleted_at IS NULL
           AND EXISTS (SELECT 1 FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL)`,
          [madrasahId]
        );
        const [sessionForToday] = await pool.query(
          `SELECT default_school_days FROM sessions
           WHERE madrasah_id = ? AND deleted_at IS NULL AND start_date <= ? AND end_date >= ?`,
          [madrasahId, today, today]
        );
        const sessionDays = sessionForToday.length > 0 && sessionForToday[0].default_school_days
          ? (typeof sessionForToday[0].default_school_days === 'string'
              ? JSON.parse(sessionForToday[0].default_school_days)
              : sessionForToday[0].default_school_days)
          : null;

        for (const cls of classesForToday) {
          let classDays = null;
          if (cls.school_days) {
            classDays = typeof cls.school_days === 'string' ? JSON.parse(cls.school_days) : cls.school_days;
          }
          // Use class-level if set, otherwise session default
          const effectiveDays = (Array.isArray(classDays) && classDays.length > 0) ? classDays : sessionDays;
          if (!effectiveDays || effectiveDays.length === 0) {
            // No config = any day is valid
            todayIsSchoolDay = true;
            break;
          }
          if (effectiveDays.includes(todayDayName)) {
            todayIsSchoolDay = true;
            break;
          }
        }
      }
    }

    const [todayAttendance] = await pool.query(
      'SELECT COUNT(*) as count FROM attendance WHERE madrasah_id = ? AND date = ?',
      [madrasahId, today]
    );

    // Count classes without any exam records in the active semester
    const [classesWithoutExams] = await pool.query(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM classes c
      JOIN sessions sess ON sess.madrasah_id = c.madrasah_id AND sess.deleted_at IS NULL
      JOIN semesters sem ON sem.session_id = sess.id
        AND sem.is_active = 1
        AND sem.deleted_at IS NULL
      WHERE c.madrasah_id = ?
        AND c.deleted_at IS NULL
        AND EXISTS (SELECT 1 FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM exam_performance ep
          JOIN students s ON ep.student_id = s.id
          WHERE s.class_id = c.id AND ep.semester_id = sem.id AND ep.deleted_at IS NULL
        )
    `, [madrasahId]);

    // Get active semester name
    const [activeSemester] = await pool.query(`
      SELECT sem.name
      FROM semesters sem
      JOIN sessions sess ON sem.session_id = sess.id
      WHERE sess.madrasah_id = ?
        AND sem.is_active = 1
        AND sem.deleted_at IS NULL
        AND sess.deleted_at IS NULL
      LIMIT 1
    `, [madrasahId]);

    // 15. Month-over-Month Comparison (filtered by semester if selected)
    let momFilter = '';
    const momParams = [madrasahId];
    if (semester_id) {
      momFilter = ' AND a.semester_id = ?';
      momParams.push(semester_id);
    }
    const [currentMonthAttendance] = await pool.query(`
      SELECT
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate,
        COUNT(*) as record_count
      FROM attendance a
      WHERE a.madrasah_id = ?
        AND YEAR(a.date) = YEAR(NOW())
        AND MONTH(a.date) = MONTH(NOW())${momFilter}
    `, momParams);
    const momParamsLast = [madrasahId];
    if (semester_id) momParamsLast.push(semester_id);
    const [lastMonthAttendance] = await pool.query(`
      SELECT
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) as rate,
        COUNT(*) as record_count
      FROM attendance a
      WHERE a.madrasah_id = ?
        AND YEAR(a.date) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
        AND MONTH(a.date) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))${momFilter}
    `, momParamsLast);

    const currentCount = currentMonthAttendance[0]?.record_count || 0;
    const lastCount = lastMonthAttendance[0]?.record_count || 0;
    const currentRate = currentCount >= 10 ? parseFloat(currentMonthAttendance[0].rate) || 0 : null;
    const lastRate = lastCount >= 10 ? parseFloat(lastMonthAttendance[0].rate) || 0 : null;
    // Only compute change if both months have enough records (>=10) to be meaningful
    const monthOverMonthChange = (currentRate !== null && lastRate !== null) ? Math.round((currentRate - lastRate) * 10) / 10 : null;

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
      attendanceCompliance,
      examBySubject,
      examByClass,
      strugglingStudents,
      genderBreakdown,
      // New insights
      gettingStarted: {
        totalClasses: totalClasses[0]?.total || 0,
        classesWithStudents: classesWithStudents[0]?.total || 0,
        classesWithAttendance: classesWithAttendance[0]?.total || 0
      },
      thisWeekSummary: {
        presentCount: thisWeekSummary[0]?.present_count || 0,
        absentCount: thisWeekSummary[0]?.absent_count || 0,
        rate: (thisWeekSummary[0]?.total_count || 0) > 0 ? parseFloat(thisWeekSummary[0].rate) || 0 : null,
        lastWeekRate: (lastWeekSummary[0]?.total_count || 0) > 0 ? parseFloat(lastWeekSummary[0].rate) || 0 : null
      },
      attendanceStreaks: attendanceStreaks || [],
      topPerformer: topPerformer[0] || null,
      quickActions: {
        attendanceMarkedToday: todayAttendance[0]?.count > 0,
        todayIsSchoolDay,
        classesWithoutExams: classesWithoutExams[0]?.count || 0,
        activeSemesterName: activeSemester[0]?.name || 'current semester'
      },
      monthOverMonth: {
        currentRate,
        lastRate,
        change: monthOverMonthChange
      },
      totalStudents,
      dropoutCount,
      poorBehaviorStudents,
      behaviorEnabled
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// =====================================================
// Platform Announcements (read-only for admins)
// =====================================================

// Get active announcements for this madrasah
router.get('/announcements', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    // Get madrasah plan to filter targeted announcements
    const [[madrasah]] = await pool.query(
      'SELECT pricing_plan FROM madrasahs WHERE id = ?',
      [madrasahId]
    );

    const [announcements] = await pool.query(`
      SELECT a.id, a.title, a.message, a.type, a.created_at
      FROM announcements a
      LEFT JOIN announcement_dismissals ad ON ad.announcement_id = a.id AND ad.madrasah_id = ?
      WHERE a.is_active = TRUE
        AND ad.id IS NULL
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_plans IS NULL OR JSON_CONTAINS(a.target_plans, ?))
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [madrasahId, JSON.stringify(madrasah?.pricing_plan || 'trial')]);

    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Dismiss announcement
router.post('/announcements/:id/dismiss', async (req, res) => {
  try {
    await pool.query(
      'INSERT IGNORE INTO announcement_dismissals (announcement_id, madrasah_id) VALUES (?, ?)',
      [req.params.id, req.madrasahId]
    );
    res.json({ message: 'Dismissed' });
  } catch (error) {
    console.error('Dismiss announcement error:', error);
    res.status(500).json({ error: 'Failed to dismiss announcement' });
  }
});

// =====================================================
// Support Tickets (madrasah admin)
// =====================================================

// List my tickets
router.get('/tickets', async (req, res) => {
  try {
    const [tickets] = await pool.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) as message_count,
        (SELECT tm.sender_type FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) as last_sender
      FROM support_tickets t
      WHERE t.madrasah_id = ?
      ORDER BY t.updated_at DESC
      LIMIT 20
    `, [req.madrasahId]);

    res.json(tickets);
  } catch (error) {
    console.error('List tickets error:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Create ticket
router.post('/tickets', async (req, res) => {
  try {
    const { subject, message, priority } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO support_tickets (madrasah_id, user_id, subject, priority) VALUES (?, ?, ?, ?)',
      [req.madrasahId, req.user.id, subject, priority || 'normal']
    );

    await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES (?, "user", ?, ?)',
      [result.insertId, req.user.id, message]
    );

    res.status(201).json({ id: result.insertId, message: 'Ticket created' });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get ticket with messages
router.get('/tickets/:id', async (req, res) => {
  try {
    const [[ticket]] = await pool.query(
      'SELECT * FROM support_tickets WHERE id = ? AND madrasah_id = ?',
      [req.params.id, req.madrasahId]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const [messages] = await pool.query(
      'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );

    res.json({ ticket, messages });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Reply to ticket
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify ticket belongs to this madrasah
    const [[ticket]] = await pool.query(
      'SELECT id FROM support_tickets WHERE id = ? AND madrasah_id = ?',
      [req.params.id, req.madrasahId]
    );
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await pool.query(
      'INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message) VALUES (?, "user", ?, ?)',
      [req.params.id, req.user.id, message]
    );

    // Re-open if it was resolved
    await pool.query(
      'UPDATE support_tickets SET status = "open" WHERE id = ? AND status = "resolved"',
      [req.params.id]
    );

    res.json({ message: 'Reply sent' });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// =====================================================
// Student Promotion / Rollover
// =====================================================

// GET students for promotion (grouped by class)
router.get('/promotion/students', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [students] = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.student_id, s.gender, s.class_id,
        c.name as class_name, c.grade_level
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id AND c.deleted_at IS NULL
      WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
      ORDER BY c.name ASC, s.first_name ASC
    `, [madrasahId]);

    const [classes] = await pool.query(
      'SELECT id, name, grade_level FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL ORDER BY name ASC',
      [madrasahId]
    );

    res.json({ students, classes });
  } catch (error) {
    console.error('Get promotion students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST bulk promote students
router.post('/promotion/promote', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const userId = req.user.id;
    const { promotions, session_id } = req.body;

    // promotions = [{ student_id, from_class_id, to_class_id, type, notes }]
    if (!promotions || !Array.isArray(promotions) || promotions.length === 0) {
      return res.status(400).json({ error: 'No promotions provided' });
    }

    let promoted = 0;
    let graduated = 0;

    for (const p of promotions) {
      const { student_id, from_class_id, to_class_id, type, notes } = p;

      if (!student_id || !type) continue;

      // Update student's class
      if (type === 'graduated' || type === 'dropped_out') {
        // Set class_id to NULL (graduated / dropped out / archived)
        await pool.query(
          'UPDATE students SET class_id = NULL, updated_at = NOW() WHERE id = ? AND madrasah_id = ?',
          [student_id, madrasahId]
        );
        graduated++;
      } else {
        // promoted, transferred, repeated — move to destination class
        if (!to_class_id) continue;
        await pool.query(
          'UPDATE students SET class_id = ?, updated_at = NOW() WHERE id = ? AND madrasah_id = ?',
          [to_class_id, student_id, madrasahId]
        );
        promoted++;
      }

      // Record the promotion history
      await pool.query(
        `INSERT INTO student_promotions (madrasah_id, student_id, from_class_id, to_class_id, session_id, promotion_type, notes, promoted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [madrasahId, student_id, from_class_id || null, (type === 'graduated' || type === 'dropped_out') ? null : (to_class_id || null), session_id || null, type, notes || null, userId]
      );
    }

    res.json({ message: `${promoted} moved, ${graduated} removed from class`, promoted, graduated });
  } catch (error) {
    console.error('Student status update error:', error);
    res.status(500).json({ error: 'Failed to update student status' });
  }
});

// GET promotion history
router.get('/promotion/history', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [history] = await pool.query(`
      SELECT sp.*,
        s.first_name, s.last_name, s.student_id as student_code,
        fc.name as from_class_name,
        tc.name as to_class_name,
        sess.name as session_name,
        u.first_name as promoted_by_first, u.last_name as promoted_by_last
      FROM student_promotions sp
      JOIN students s ON sp.student_id = s.id
      LEFT JOIN classes fc ON sp.from_class_id = fc.id
      LEFT JOIN classes tc ON sp.to_class_id = tc.id
      LEFT JOIN sessions sess ON sp.session_id = sess.id
      LEFT JOIN users u ON sp.promoted_by = u.id
      WHERE sp.madrasah_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 200
    `, [madrasahId]);

    res.json(history);
  } catch (error) {
    console.error('Get promotion history error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// =====================================================
// TEACHER PERFORMANCE (Plus only)
// =====================================================

// GET /admin/teacher-performance - Overview of all teachers with key metrics
router.get('/teacher-performance', requirePlusPlan('teacher_performance'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [teachers] = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.staff_id,
        u.email,
        u.last_login_at,
        (SELECT COUNT(*) FROM class_teachers ct
         JOIN classes c ON ct.class_id = c.id
         WHERE ct.user_id = u.id AND c.deleted_at IS NULL) AS classes_assigned,
        (SELECT COUNT(*) FROM attendance a
         WHERE a.user_id = u.id AND a.madrasah_id = ? AND a.deleted_at IS NULL) AS attendance_records,
        (SELECT COUNT(*) FROM exam_performance ep
         WHERE ep.user_id = u.id AND ep.madrasah_id = ? AND ep.deleted_at IS NULL) AS exam_records,
        GREATEST(
          COALESCE((SELECT MAX(a.date) FROM attendance a WHERE a.user_id = u.id AND a.madrasah_id = ? AND a.deleted_at IS NULL), '1970-01-01'),
          COALESCE((SELECT MAX(ep.exam_date) FROM exam_performance ep WHERE ep.user_id = u.id AND ep.madrasah_id = ? AND ep.deleted_at IS NULL), '1970-01-01'),
          COALESCE(u.last_login_at, '1970-01-01')
        ) AS last_activity
      FROM users u
      WHERE u.madrasah_id = ?
        AND u.role = 'teacher'
        AND u.deleted_at IS NULL
      ORDER BY u.first_name, u.last_name
    `, [madrasahId, madrasahId, madrasahId, madrasahId, madrasahId]);

    res.json({
      teachers: teachers.map(t => ({
        ...t,
        activity_status: (() => {
          const lastActivity = t.last_activity ? new Date(t.last_activity).toISOString().split('T')[0] : '1970-01-01';
          if (lastActivity === '1970-01-01') return 'No Records';
          const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
          return daysSince <= 14 ? 'Active' : 'Inactive';
        })()
      }))
    });
  } catch (error) {
    console.error('Teacher performance error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher performance data' });
  }
});

// GET /admin/teacher-performance/:teacherId - Detail view for a single teacher
router.get('/teacher-performance/:teacherId', requirePlusPlan('teacher_performance'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { teacherId } = req.params;

    // Verify teacher belongs to this madrasah
    const [teacherCheck] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND madrasah_id = ? AND role = ? AND deleted_at IS NULL',
      [teacherId, madrasahId, 'teacher']
    );
    if (teacherCheck.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // 1. Recording frequency - last 8 weeks
    const [recordingFrequency] = await pool.query(`
      SELECT
        YEARWEEK(a.date, 1) AS year_week,
        MIN(a.date) AS week_start,
        COUNT(*) AS records_count,
        COUNT(DISTINCT a.date) AS days_recorded
      FROM attendance a
      WHERE a.user_id = ?
        AND a.madrasah_id = ?
        AND a.deleted_at IS NULL
        AND a.date >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY YEARWEEK(a.date, 1)
      ORDER BY year_week ASC
    `, [teacherId, madrasahId]);

    // 2. Class attendance rates
    const [classAttendanceRates] = await pool.query(`
      SELECT
        c.id AS class_id,
        c.name AS class_name,
        COUNT(a.id) AS total_records,
        SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) AS present_count,
        ROUND(AVG(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100, 1) AS attendance_rate
      FROM class_teachers ct
      JOIN classes c ON ct.class_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN attendance a ON a.class_id = c.id
        AND a.madrasah_id = ?
        AND a.deleted_at IS NULL
      WHERE ct.user_id = ?
      GROUP BY c.id
      ORDER BY c.name
    `, [madrasahId, teacherId]);

    // 3. Exams by subject
    const [examsBySubject] = await pool.query(`
      SELECT
        ep.subject,
        COUNT(*) AS exam_count,
        COUNT(DISTINCT ep.student_id) AS students_examined
      FROM exam_performance ep
      WHERE ep.user_id = ?
        AND ep.madrasah_id = ?
        AND ep.deleted_at IS NULL
      GROUP BY ep.subject
      ORDER BY exam_count DESC
    `, [teacherId, madrasahId]);

    // 4. Average student scores by class and subject
    const [avgScoresByClassSubject] = await pool.query(`
      SELECT
        c.name AS class_name,
        ep.subject,
        COUNT(*) AS total_exams,
        ROUND(AVG(ep.score / ep.max_score * 100), 1) AS avg_percentage
      FROM exam_performance ep
      JOIN students s ON ep.student_id = s.id
      JOIN class_teachers ct ON ct.user_id = ? AND s.class_id = ct.class_id
      JOIN classes c ON ct.class_id = c.id AND c.deleted_at IS NULL
      WHERE ep.madrasah_id = ?
        AND ep.deleted_at IS NULL
        AND ep.is_absent = 0
        AND ep.score IS NOT NULL
      GROUP BY c.id, ep.subject
      ORDER BY c.name, ep.subject
    `, [teacherId, madrasahId]);

    res.json({
      recordingFrequency,
      classAttendanceRates,
      examsBySubject,
      avgScoresByClassSubject
    });
  } catch (error) {
    console.error('Teacher detail error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher details' });
  }
});

export default router;
