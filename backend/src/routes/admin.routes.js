import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateTeacher, validateStudent, validateSession, validateSemester, validateClass, normalizePhone } from '../utils/validation.js';
import { calculateAutoFees } from '../utils/feeCalculator.js';
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
    const { name, grade_level, school_days, description, cohort_id } = req.body;

    // Verify class belongs to this madrasah
    const [check] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Validate cohort_id belongs to this madrasah if provided
    if (cohort_id != null) {
      const [cohortCheck] = await pool.query(
        'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
        [cohort_id, madrasahId]
      );
      if (cohortCheck.length === 0) {
        return res.status(400).json({ error: 'Cohort not found' });
      }
    }

    await pool.query(
      'UPDATE classes SET name = ?, grade_level = ?, school_days = ?, description = ?, cohort_id = ? WHERE id = ? AND madrasah_id = ?',
      [name, grade_level, JSON.stringify(school_days), description, cohort_id ?? null, id, madrasahId]
    );
    res.json({ id: parseInt(id), name, grade_level, school_days, description, cohort_id: cohort_id ?? null });
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
      `SELECT s.*, c.name as class_name,
       EXISTS (
         SELECT 1 FROM student_promotions sp
         WHERE sp.student_id = s.id AND sp.madrasah_id = s.madrasah_id
           AND sp.promotion_type = 'dropped_out'
           AND s.class_id IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM student_promotions sp2
             WHERE sp2.student_id = sp.student_id AND sp2.madrasah_id = sp.madrasah_id
               AND sp2.promotion_type IN ('promoted', 'transferred', 'repeated')
               AND sp2.created_at > sp.created_at
           )
       ) as is_dropout
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

// Generate next student ID for a madrasah
const getNextStudentId = async (madrasahId) => {
  const [[{ maxId }]] = await pool.query(
    `SELECT MAX(CAST(student_id AS UNSIGNED)) as maxId
     FROM students WHERE madrasah_id = ? AND student_id REGEXP '^[0-9]+$' AND deleted_at IS NULL`,
    [madrasahId]
  );
  return String((maxId || 0) + 1).padStart(5, '0');
};

router.get('/next-student-id', async (req, res) => {
  try {
    const nextId = await getNextStudentId(req.madrasahId);
    res.json({ student_id: nextId });
  } catch (error) {
    console.error('Failed to generate student ID:', error);
    res.status(500).json({ error: 'Failed to generate student ID' });
  }
});

// Create student (scoped to madrasah)
router.post('/students', requireActiveSubscription, enforceStudentLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth, enrollment_date,
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
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth, enrollment_date,
       parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
       expected_fee, fee_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, first_name, last_name, student_id, gender, email, class_id || null,
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth, enrollment_date || null,
       parent_guardian_name, parent_guardian_relationship,
       normalizePhone(parent_guardian_phone, parent_guardian_phone_country_code),
       parent_guardian_phone_country_code, notes,
       expected_fee != null && expected_fee !== '' ? parseFloat(expected_fee) : null, fee_note || null]
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

// Bulk update enrollment dates for students (must be before /students/:id)
router.put('/students/bulk-enrollment-date', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { enrollment_date, student_ids } = req.body;

    if (!enrollment_date) {
      return res.status(400).json({ error: 'Enrollment date is required' });
    }

    let sql, params;
    if (student_ids && student_ids.length > 0) {
      const placeholders = student_ids.map(() => '?').join(',');
      sql = `UPDATE students SET enrollment_date = ? WHERE madrasah_id = ? AND id IN (${placeholders}) AND deleted_at IS NULL`;
      params = [enrollment_date, madrasahId, ...student_ids];
    } else {
      sql = 'UPDATE students SET enrollment_date = ? WHERE madrasah_id = ? AND deleted_at IS NULL';
      params = [enrollment_date, madrasahId];
    }

    const [result] = await pool.query(sql, params);
    res.json({ message: `Updated enrollment date for ${result.affectedRows} students`, count: result.affectedRows });
  } catch (error) {
    console.error('Failed to bulk update enrollment dates:', error);
    res.status(500).json({ error: 'Failed to update enrollment dates' });
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
      [expected_fee != null && expected_fee !== '' ? parseFloat(expected_fee) || 0 : null, fee_note || null, id, madrasahId]
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
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth, enrollment_date,
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
       class_id = ?, date_of_birth = ?, enrollment_date = ?, parent_guardian_name = ?, parent_guardian_relationship = ?,
       parent_guardian_phone = ?, parent_guardian_phone_country_code = ?, notes = ?,
       expected_fee = ?, fee_note = ? WHERE id = ? AND madrasah_id = ?`,
      [first_name, last_name, student_id, gender, email,
       student_phone, student_phone_country_code, street, city, state, country,
       class_id || null, date_of_birth, enrollment_date || null,
       parent_guardian_name, parent_guardian_relationship,
       normalizePhone(parent_guardian_phone, parent_guardian_phone_country_code),
       parent_guardian_phone_country_code, notes,
       expected_fee != null && expected_fee !== '' ? parseFloat(expected_fee) || 0 : null, fee_note || null, id, madrasahId]
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
    const { semester_id, cohort_period_id, date_from, date_to } = req.query;

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

    if (cohort_period_id) {
      semesterFilter += ' AND a.cohort_period_id = ?';
      params.push(cohort_period_id);
    } else if (semester_id) {
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
    if (cohort_period_id) {
      examStatsFilter = ' AND ep.cohort_period_id = ?';
      examStatsParams.push(cohort_period_id);
    } else if (semester_id) {
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
    if (cohort_period_id) highRiskParams.push(cohort_period_id);
    else if (semester_id) highRiskParams.push(semester_id);
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
    const { semester_id, cohort_period_id, date_from, date_to } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.student_id,
             sem.name as semester_name, cp.name as cohort_period_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      LEFT JOIN semesters sem ON a.semester_id = sem.id
      LEFT JOIN cohort_periods cp ON a.cohort_period_id = cp.id
      WHERE a.class_id = ? AND a.madrasah_id = ?
    `;
    const params = [classId, madrasahId];

    if (cohort_period_id) {
      query += ' AND a.cohort_period_id = ?';
      params.push(cohort_period_id);
    } else if (semester_id) {
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
    const { semester_id, cohort_period_id, subject } = req.query;

    // Verify class belongs to this madrasah
    const [classCheck] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classCheck.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    let query = `SELECT ep.*, s.first_name, s.last_name, s.student_id,
                        sem.name as semester_name, sess.name as session_name,
                        cp.name as cohort_period_name
                 FROM exam_performance ep
                 JOIN students s ON ep.student_id = s.id
                 LEFT JOIN semesters sem ON ep.semester_id = sem.id
                 LEFT JOIN sessions sess ON sem.session_id = sess.id
                 LEFT JOIN cohort_periods cp ON ep.cohort_period_id = cp.id
                 WHERE s.class_id = ? AND s.madrasah_id = ? AND ep.deleted_at IS NULL`;
    const queryParams = [classId, madrasahId];

    if (cohort_period_id) {
      query += ' AND ep.cohort_period_id = ?';
      queryParams.push(cohort_period_id);
    } else if (semester_id) {
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
    const { sessionId, semesterId, cohortPeriodId, subject } = req.query;

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

    if (cohortPeriodId) {
      query += ` AND ep.cohort_period_id = ?`;
      queryParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        query += ` AND sem.session_id = ?`;
        queryParams.push(sessionId);
      }
      if (semesterId) {
        query += ` AND ep.semester_id = ?`;
        queryParams.push(semesterId);
      }
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
    const { sessionId, semesterId, cohortPeriodId } = req.query;

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

    if (cohortPeriodId) {
      query += ` AND a.cohort_period_id = ?`;
      queryParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        query += ` AND sem.session_id = ?`;
        queryParams.push(sessionId);
      }
      if (semesterId) {
        query += ` AND a.semester_id = ?`;
        queryParams.push(semesterId);
      }
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
    const { sessionId, semesterId, cohortPeriodId } = req.query;

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

    if (cohortPeriodId) {
      query += ` AND a.cohort_period_id = ?`;
      queryParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        query += ` AND sem.session_id = ?`;
        queryParams.push(sessionId);
      }
      if (semesterId) {
        query += ` AND a.semester_id = ?`;
        queryParams.push(semesterId);
      }
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
    const { sessionId, semesterId, cohortPeriodId } = req.query;

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

    if (cohortPeriodId) {
      query += ` AND a.cohort_period_id = ?`;
      queryParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        query += ` AND sem.session_id = ?`;
        queryParams.push(sessionId);
      }
      if (semesterId) {
        query += ` AND a.semester_id = ?`;
        queryParams.push(semesterId);
      }
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
    const { sessionId, semesterId, cohortPeriodId } = req.query;

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

    if (cohortPeriodId) {
      query += ` AND a.cohort_period_id = ?`;
      queryParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        query += ` AND sem.session_id = ?`;
        queryParams.push(sessionId);
      }
      if (semesterId) {
        query += ` AND a.semester_id = ?`;
        queryParams.push(semesterId);
      }
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
    const { sessionId, semesterId, cohortPeriodId } = req.query;

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

    if (cohortPeriodId) {
      examQuery += ` AND ep.cohort_period_id = ?`;
      examParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        examQuery += ` AND sem.session_id = ?`;
        examParams.push(sessionId);
      }
      if (semesterId) {
        examQuery += ` AND ep.semester_id = ?`;
        examParams.push(semesterId);
      }
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

    if (cohortPeriodId) {
      attendanceQuery += ` AND a.cohort_period_id = ?`;
      attendanceParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        attendanceQuery += ` AND sem.session_id = ?`;
        attendanceParams.push(sessionId);
      }
      if (semesterId) {
        attendanceQuery += ` AND a.semester_id = ?`;
        attendanceParams.push(semesterId);
      }
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

    if (cohortPeriodId) {
      dressingQuery += ` AND a.cohort_period_id = ?`;
      dressingParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        dressingQuery += ` AND sem.session_id = ?`;
        dressingParams.push(sessionId);
      }
      if (semesterId) {
        dressingQuery += ` AND a.semester_id = ?`;
        dressingParams.push(semesterId);
      }
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

    if (cohortPeriodId) {
      behaviorQuery += ` AND a.cohort_period_id = ?`;
      behaviorParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        behaviorQuery += ` AND sem.session_id = ?`;
        behaviorParams.push(sessionId);
      }
      if (semesterId) {
        behaviorQuery += ` AND a.semester_id = ?`;
        behaviorParams.push(semesterId);
      }
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

    if (cohortPeriodId) {
      punctualityQuery += ` AND a.cohort_period_id = ?`;
      punctualityParams.push(cohortPeriodId);
    } else {
      if (sessionId) {
        punctualityQuery += ` AND sem.session_id = ?`;
        punctualityParams.push(sessionId);
      }
      if (semesterId) {
        punctualityQuery += ` AND a.semester_id = ?`;
        punctualityParams.push(semesterId);
      }
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
    const { semester_id, cohort_period_id } = req.query;

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

    if (cohort_period_id) {
      attendanceQuery += ' AND cohort_period_id = ?';
      attendanceParams.push(cohort_period_id);
    } else if (semester_id) {
      attendanceQuery += ' AND semester_id = ?';
      attendanceParams.push(semester_id);
    }

    attendanceQuery += ' ORDER BY date DESC';

    const [attendance] = await pool.query(attendanceQuery, attendanceParams);

    // Get exam performance (scoped to madrasah)
    let examQuery = 'SELECT * FROM exam_performance WHERE student_id = ? AND madrasah_id = ?';
    const examParams = [id, madrasahId];

    if (cohort_period_id) {
      examQuery += ' AND cohort_period_id = ?';
      examParams.push(cohort_period_id);
    } else if (semester_id) {
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
      // Build query with optional period filter
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

      if (cohort_period_id) {
        rankQuery += ' AND ep.cohort_period_id = ?';
        rankParams.push(cohort_period_id);
      } else if (semester_id) {
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

    // Check if optional columns exist
    let hasAvailabilityCol = true;
    try {
      await pool.query('SELECT availability_planner_aware FROM madrasahs LIMIT 0');
    } catch {
      hasAvailabilityCol = false;
    }
    let hasTimingCol = true;
    try {
      await pool.query('SELECT auto_fee_reminder_timing FROM madrasahs LIMIT 0');
    } catch {
      hasTimingCol = false;
    }

    const [madrasahs] = await pool.query(
      `SELECT id, name, slug, logo_url, street, city, region, country, phone, email,
       institution_type, verification_status, trial_ends_at, created_at,
       pricing_plan, subscription_status, current_period_end, stripe_customer_id,
       enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_learning_tracker, enable_fee_tracking, currency,
       fee_tracking_mode, fee_prorate_mid_period,
       auto_fee_reminder_enabled, auto_fee_reminder_message, auto_fee_reminder_day, auto_fee_reminder_last_sent
       ${hasTimingCol ? ', auto_fee_reminder_timing' : ''}
       ${hasAvailabilityCol ? ', availability_planner_aware' : ''}
       , COALESCE(scheduling_mode, 'academic') as scheduling_mode
       , COALESCE(setup_complete, 0) as setup_complete
       , COALESCE(course_tracking_mode, 'student_progress') as course_tracking_mode
       , auto_attendance_alert_enabled, auto_attendance_alert_period, auto_attendance_alert_threshold, auto_attendance_alert_message, auto_attendance_alert_last_sent
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
    const { enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_learning_tracker, enable_fee_tracking, currency, fee_tracking_mode, fee_prorate_mid_period, availability_planner_aware, course_tracking_mode } = req.body;

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
    if (typeof enable_learning_tracker === 'boolean') {
      updates.push('enable_learning_tracker = ?');
      params.push(enable_learning_tracker);
    }
    if (typeof course_tracking_mode === 'string' && ['student_progress', 'class_coverage'].includes(course_tracking_mode)) {
      updates.push('course_tracking_mode = ?');
      params.push(course_tracking_mode);
    }
    if (typeof enable_fee_tracking === 'boolean') {
      updates.push('enable_fee_tracking = ?');
      params.push(enable_fee_tracking);
    }
    if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) {
      updates.push('currency = ?');
      params.push(currency);
    }
    if (typeof fee_tracking_mode === 'string' && ['manual', 'auto'].includes(fee_tracking_mode)) {
      // If switching to auto, verify planner data exists
      if (fee_tracking_mode === 'auto') {
        const [activeSessions] = await pool.query(
          'SELECT id FROM sessions WHERE madrasah_id = ? AND is_active = 1 AND deleted_at IS NULL',
          [madrasahId]
        );
        if (activeSessions.length === 0) {
          return res.status(400).json({ error: 'Cannot enable auto fee tracking without an active session. Please set up your planner first.' });
        }
      }
      updates.push('fee_tracking_mode = ?');
      params.push(fee_tracking_mode);
    }
    if (typeof fee_prorate_mid_period === 'boolean') {
      updates.push('fee_prorate_mid_period = ?');
      params.push(fee_prorate_mid_period);
    }
    // Auto fee reminder settings
    if (typeof req.body.auto_fee_reminder_enabled === 'boolean') {
      updates.push('auto_fee_reminder_enabled = ?');
      params.push(req.body.auto_fee_reminder_enabled);
    }
    if (typeof req.body.auto_fee_reminder_message === 'string') {
      updates.push('auto_fee_reminder_message = ?');
      params.push(req.body.auto_fee_reminder_message.substring(0, 1600));
    }
    if (typeof req.body.auto_fee_reminder_day === 'number' && req.body.auto_fee_reminder_day >= 1 && req.body.auto_fee_reminder_day <= 28) {
      updates.push('auto_fee_reminder_day = ?');
      params.push(req.body.auto_fee_reminder_day);
    }
    if (req.body.auto_fee_reminder_timing === 'day_of_month' || req.body.auto_fee_reminder_timing === 'semester_start') {
      try {
        await pool.query('SELECT auto_fee_reminder_timing FROM madrasahs LIMIT 0');
        updates.push('auto_fee_reminder_timing = ?');
        params.push(req.body.auto_fee_reminder_timing);
      } catch {}
    }

    // Auto attendance alert settings
    if (typeof req.body.auto_attendance_alert_enabled === 'boolean') {
      updates.push('auto_attendance_alert_enabled = ?');
      params.push(req.body.auto_attendance_alert_enabled);
    }
    if (typeof req.body.auto_attendance_alert_period === 'string'
        && ['weekly', 'monthly', 'semester', 'cohort_period'].includes(req.body.auto_attendance_alert_period)) {
      updates.push('auto_attendance_alert_period = ?');
      params.push(req.body.auto_attendance_alert_period);
    }
    if (typeof req.body.auto_attendance_alert_threshold === 'number'
        && req.body.auto_attendance_alert_threshold >= 1 && req.body.auto_attendance_alert_threshold <= 30) {
      updates.push('auto_attendance_alert_threshold = ?');
      params.push(req.body.auto_attendance_alert_threshold);
    }
    if (typeof req.body.auto_attendance_alert_message === 'string') {
      updates.push('auto_attendance_alert_message = ?');
      params.push(req.body.auto_attendance_alert_message.substring(0, 1600));
    }

    if (typeof availability_planner_aware === 'boolean') {
      try {
        await pool.query('SELECT availability_planner_aware FROM madrasahs LIMIT 0');
        updates.push('availability_planner_aware = ?');
        params.push(availability_planner_aware);
      } catch {}
    }

    if (typeof req.body.scheduling_mode === 'string' && ['academic', 'cohort'].includes(req.body.scheduling_mode)) {
      updates.push('scheduling_mode = ?');
      params.push(req.body.scheduling_mode);
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
    let settingsCols = 'enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_learning_tracker, enable_fee_tracking, currency, fee_tracking_mode, fee_prorate_mid_period, auto_fee_reminder_enabled, auto_fee_reminder_message, auto_fee_reminder_day, auto_fee_reminder_last_sent, COALESCE(scheduling_mode, \'academic\') as scheduling_mode, auto_attendance_alert_enabled, auto_attendance_alert_period, auto_attendance_alert_threshold, auto_attendance_alert_message, auto_attendance_alert_last_sent';
    try {
      await pool.query('SELECT auto_fee_reminder_timing FROM madrasahs LIMIT 0');
      settingsCols += ', auto_fee_reminder_timing';
    } catch {}
    try {
      await pool.query('SELECT availability_planner_aware FROM madrasahs LIMIT 0');
      settingsCols += ', availability_planner_aware';
    } catch {}
    const [updated] = await pool.query(
      `SELECT ${settingsCols} FROM madrasahs WHERE id = ?`,
      [madrasahId]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// FEE SCHEDULES (Auto Fee Tracking)
// ============================================

// List fee schedules
router.get('/fee-schedules', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_id } = req.query;

    let sql = `SELECT fs.*, c.name as class_name,
       CONCAT(s.first_name, ' ', s.last_name) as student_name
       FROM fee_schedules fs
       LEFT JOIN classes c ON c.id = fs.class_id
       LEFT JOIN students s ON s.id = fs.student_id
       WHERE fs.madrasah_id = ?`;
    const params = [madrasahId];

    if (class_id) { sql += ' AND fs.class_id = ?'; params.push(class_id); }

    sql += ' ORDER BY fs.class_id, fs.student_id, fs.created_at DESC';
    const [schedules] = await pool.query(sql, params);
    res.json(schedules.map(s => ({ ...s, amount: parseFloat(s.amount) })));
  } catch (error) {
    console.error('Failed to fetch fee schedules:', error);
    res.status(500).json({ error: 'Failed to fetch fee schedules' });
  }
});

// Create fee schedule
router.post('/fee-schedules', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_id, student_id, billing_cycle, amount, description } = req.body;

    if (!amount || parseFloat(amount) < 0) return res.status(400).json({ error: 'Amount must be 0 or greater' });
    if (!['weekly', 'monthly', 'per_semester', 'per_session'].includes(billing_cycle)) {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    // Verify class belongs to madrasah
    if (class_id) {
      const [classCheck] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ?', [class_id, madrasahId]);
      if (classCheck.length === 0) return res.status(400).json({ error: 'Invalid class' });
    }

    // Verify student belongs to madrasah
    if (student_id) {
      const [stuCheck] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [student_id, madrasahId]);
      if (stuCheck.length === 0) return res.status(400).json({ error: 'Invalid student' });
    }

    const [result] = await pool.query(
      `INSERT INTO fee_schedules (madrasah_id, class_id, student_id, billing_cycle, amount, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [madrasahId, class_id || null, student_id || null, billing_cycle, parseFloat(amount), description || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Fee schedule created' });
  } catch (error) {
    console.error('Failed to create fee schedule:', error);
    res.status(500).json({ error: 'Failed to create fee schedule' });
  }
});

// Update fee schedule
router.put('/fee-schedules/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { billing_cycle, amount, description, is_active } = req.body;

    const [check] = await pool.query('SELECT id FROM fee_schedules WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Fee schedule not found' });

    const updates = [];
    const params = [];

    if (billing_cycle && ['weekly', 'monthly', 'per_semester', 'per_session'].includes(billing_cycle)) {
      updates.push('billing_cycle = ?'); params.push(billing_cycle);
    }
    if (amount !== undefined) {
      updates.push('amount = ?'); params.push(parseFloat(amount));
    }
    if (description !== undefined) {
      updates.push('description = ?'); params.push(description || null);
    }
    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?'); params.push(is_active);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(id, madrasahId);
    await pool.query(`UPDATE fee_schedules SET ${updates.join(', ')} WHERE id = ? AND madrasah_id = ?`, params);
    res.json({ message: 'Fee schedule updated' });
  } catch (error) {
    console.error('Failed to update fee schedule:', error);
    res.status(500).json({ error: 'Failed to update fee schedule' });
  }
});

// Delete fee schedule
router.delete('/fee-schedules/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query('DELETE FROM fee_schedules WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    res.json({ message: 'Fee schedule deleted' });
  } catch (error) {
    console.error('Failed to delete fee schedule:', error);
    res.status(500).json({ error: 'Failed to delete fee schedule' });
  }
});

// Auto fee calculation - compute expected fees based on planner data and fee schedules
router.get('/fee-auto-calculate', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_id, from, to } = req.query;

    // Check mode before calling helper
    const [madrasahRows] = await pool.query(
      'SELECT fee_tracking_mode FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    if (madrasahRows.length === 0 || madrasahRows[0].fee_tracking_mode !== 'auto') {
      return res.status(400).json({ error: 'Auto fee tracking is not enabled' });
    }

    const results = await calculateAutoFees(madrasahId, { classId: class_id || null, fromDate: from || null, toDate: to || null });

    // Map to existing response format (student_name instead of first_name/last_name)
    const mapped = results.map(r => ({
      student_id: r.student_id,
      student_name: `${r.first_name} ${r.last_name}`,
      class_name: r.class_name,
      total_fee: r.total_fee,
      total_paid: r.total_paid,
      balance: r.balance,
      fee_note: r.fee_note,
      status: r.status,
      billing_cycle: r.billing_cycle,
      schedule_amount: r.schedule_amount
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Failed to calculate auto fees:', error);
    res.status(500).json({ error: 'Failed to calculate fees' });
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
    const { class_id, from, to } = req.query;

    let paymentDateFilter = '';
    const paymentDateParams = [];
    if (from) { paymentDateFilter += ' AND fp.payment_date >= ?'; paymentDateParams.push(from); }
    if (to) { paymentDateFilter += ' AND fp.payment_date <= ?'; paymentDateParams.push(to); }

    let sql = `SELECT s.id as student_id, s.first_name, s.last_name, s.expected_fee, s.fee_note,
       c.name as class_name,
       COALESCE(SUM(fp.amount_paid), 0) as total_paid
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.madrasah_id = s.madrasah_id AND fp.deleted_at IS NULL${paymentDateFilter}
       WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee IS NOT NULL`;
    const params = [...paymentDateParams, madrasahId];

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

// Fee collection report (for meetings/presentations)
router.get('/fee-report', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { period, semester_id, session_id } = req.query;
    // period: 'semester' (default), 'session', 'all'

    // Determine fee tracking mode
    const [madrasahRows] = await pool.query(
      'SELECT fee_tracking_mode, currency, name FROM madrasahs WHERE id = ?', [madrasahId]
    );
    const mode = madrasahRows[0]?.fee_tracking_mode || 'manual';
    const madrasahName = madrasahRows[0]?.name || '';

    // Resolve the period and its date range
    let periodName = 'All Time';
    let periodStart = null;
    let periodEnd = null;
    let resolvedSessionId = null;
    let paymentDateFilter = '';
    const paymentDateParams = [];

    if (period === 'all') {
      // No date filtering
    } else if (period === 'session') {
      // Use specified session or active session
      let sessionRow;
      if (session_id) {
        const [rows] = await pool.query(
          'SELECT id, name, start_date, end_date FROM sessions WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
          [session_id, madrasahId]
        );
        sessionRow = rows[0];
      } else {
        const [rows] = await pool.query(
          'SELECT id, name, start_date, end_date FROM sessions WHERE madrasah_id = ? AND is_active = 1 AND deleted_at IS NULL',
          [madrasahId]
        );
        sessionRow = rows[0];
      }
      if (sessionRow) {
        periodName = sessionRow.name;
        periodStart = sessionRow.start_date;
        periodEnd = sessionRow.end_date;
        resolvedSessionId = sessionRow.id;
        paymentDateFilter = ' AND fp.payment_date >= ? AND fp.payment_date <= ?';
        paymentDateParams.push(sessionRow.start_date, sessionRow.end_date);
      }
    } else {
      // Default: semester scope
      let semesterRow;
      if (semester_id) {
        const [rows] = await pool.query(
          `SELECT sem.id, sem.name, sem.start_date, sem.end_date, ses.name as session_name, ses.id as session_id
           FROM semesters sem JOIN sessions ses ON ses.id = sem.session_id
           WHERE sem.id = ? AND ses.madrasah_id = ? AND sem.deleted_at IS NULL`,
          [semester_id, madrasahId]
        );
        semesterRow = rows[0];
      } else {
        const [rows] = await pool.query(
          `SELECT sem.id, sem.name, sem.start_date, sem.end_date, ses.name as session_name, ses.id as session_id
           FROM semesters sem JOIN sessions ses ON ses.id = sem.session_id
           WHERE ses.madrasah_id = ? AND sem.is_active = 1 AND sem.deleted_at IS NULL`,
          [madrasahId]
        );
        semesterRow = rows[0];
      }
      if (semesterRow) {
        periodName = `${semesterRow.name} (${semesterRow.session_name})`;
        periodStart = semesterRow.start_date;
        periodEnd = semesterRow.end_date;
        resolvedSessionId = semesterRow.session_id;
        paymentDateFilter = ' AND fp.payment_date >= ? AND fp.payment_date <= ?';
        paymentDateParams.push(semesterRow.start_date, semesterRow.end_date);
      }
    }

    let studentData = [];

    if (mode === 'auto') {
      // Use shared auto calculator with period dates for proper fee scoping
      const autoOpts = {};
      if (periodStart) autoOpts.fromDate = periodStart;
      if (periodEnd) autoOpts.toDate = periodEnd;
      studentData = await calculateAutoFees(madrasahId, autoOpts);
    } else {
      // Manual mode — query expected fees, filter payments to period
      const [rows] = await pool.query(
        `SELECT s.id as student_id, s.first_name, s.last_name, s.expected_fee,
           s.class_id, c.name as class_name,
           COALESCE(SUM(fp.amount_paid), 0) as total_paid
         FROM students s
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.madrasah_id = s.madrasah_id AND fp.deleted_at IS NULL${paymentDateFilter}
         WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee IS NOT NULL
         GROUP BY s.id ORDER BY s.last_name, s.first_name`,
        [...paymentDateParams, madrasahId]
      );
      studentData = rows.map(row => {
        const totalFee = parseFloat(row.expected_fee);
        const totalPaid = parseFloat(row.total_paid);
        return {
          student_id: row.student_id,
          first_name: row.first_name,
          last_name: row.last_name,
          class_id: row.class_id,
          class_name: row.class_name || 'Unassigned',
          total_fee: totalFee,
          total_paid: totalPaid,
          balance: totalFee - totalPaid,
          status: totalPaid >= totalFee ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
        };
      });
    }

    // Overall totals
    const totalExpected = studentData.reduce((s, r) => s + (r.total_fee || 0), 0);
    const totalCollected = studentData.reduce((s, r) => s + (r.total_paid || 0), 0);
    const totalOutstanding = studentData.reduce((s, r) => s + Math.max((r.balance || 0), 0), 0);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    // Status counts
    const statusCounts = {
      paid: studentData.filter(s => s.status === 'paid').length,
      partial: studentData.filter(s => s.status === 'partial').length,
      unpaid: studentData.filter(s => s.status === 'unpaid').length,
      total: studentData.length
    };

    // Per-class breakdown
    const classMap = {};
    for (const s of studentData) {
      const key = s.class_name || 'Unassigned';
      if (!classMap[key]) classMap[key] = { class_name: key, student_count: 0, total_expected: 0, total_collected: 0, outstanding: 0, paid: 0, partial: 0, unpaid: 0 };
      classMap[key].student_count++;
      classMap[key].total_expected += s.total_fee || 0;
      classMap[key].total_collected += s.total_paid || 0;
      classMap[key].outstanding += Math.max(s.balance || 0, 0);
      classMap[key][s.status]++;
    }
    const classBreakdown = Object.values(classMap).map(c => ({
      ...c,
      collection_rate: c.total_expected > 0 ? Math.round((c.total_collected / c.total_expected) * 100) : 0
    })).sort((a, b) => a.class_name.localeCompare(b.class_name));

    // Monthly collection trend (within period or last 6 months)
    let trendSql = `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month,
            SUM(amount_paid) as total
     FROM fee_payments
     WHERE madrasah_id = ? AND deleted_at IS NULL`;
    const trendParams = [madrasahId];
    if (periodStart && periodEnd) {
      trendSql += ' AND payment_date >= ? AND payment_date <= ?';
      trendParams.push(periodStart, periodEnd);
    } else {
      trendSql += ' AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    }
    trendSql += ` GROUP BY DATE_FORMAT(payment_date, '%Y-%m') ORDER BY month ASC`;
    const [monthlyRows] = await pool.query(trendSql, trendParams);
    const monthlyTrend = monthlyRows.map(r => ({
      month: r.month,
      total: parseFloat(r.total)
    }));

    res.json({
      overview: { totalExpected, totalCollected, totalOutstanding, collectionRate },
      statusCounts,
      classBreakdown,
      monthlyTrend,
      mode,
      period: {
        type: period || 'semester',
        name: periodName,
        startDate: periodStart,
        endDate: periodEnd
      },
      madrasahName,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to generate fee report:', error);
    res.status(500).json({ error: 'Failed to generate fee report' });
  }
});

// Analytics Dashboard - School-wide insights (available to all plans for Insights overview)
router.get('/analytics', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { semester_id, cohort_period_id, class_id, gender, today: clientToday } = req.query;

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

    if (cohort_period_id) {
      attendanceFilters += ' AND a.cohort_period_id = ?';
      attendanceParams.push(cohort_period_id);
      examFilters += ' AND ep.cohort_period_id = ?';
      examParams.push(cohort_period_id);
    } else if (semester_id) {
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

      // Add period filter to attendance join
      if (cohort_period_id) {
        classAttQuery = classAttQuery.replace(
          'LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ?',
          'LEFT JOIN attendance a ON c.id = a.class_id AND a.madrasah_id = ? AND a.cohort_period_id = ?'
        );
        classAttParams.push(cohort_period_id);
      } else if (semester_id) {
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
    if (cohort_period_id) {
      examQuery += ' AND ep.cohort_period_id = ?';
      examSummaryParams.push(cohort_period_id);
    } else if (semester_id) {
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
    if (cohort_period_id) {
      subjectExamQuery += ' AND ep.cohort_period_id = ?';
      subjectExamParams.push(cohort_period_id);
    } else if (semester_id) {
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
    if (cohort_period_id) {
      examByClassQuery += ' AND ep.cohort_period_id = ?';
      examByClassParams.push(cohort_period_id);
    } else if (semester_id) {
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
    // Scope to active period to avoid cross-period noise
    let effectiveSemesterId = semester_id;
    let effectiveCohortPeriodId = cohort_period_id;
    if (!effectiveCohortPeriodId && !effectiveSemesterId) {
      // Try to detect mode from madrasah settings
      const [[mSettings]] = await pool.query(
        'SELECT COALESCE(scheduling_mode, \'academic\') as scheduling_mode FROM madrasahs WHERE id = ?',
        [madrasahId]
      );
      if (mSettings?.scheduling_mode === 'cohort') {
        const [activePeriod] = await pool.query(
          `SELECT cp.id FROM cohort_periods cp
           JOIN cohorts c ON cp.cohort_id = c.id
           WHERE c.madrasah_id = ? AND cp.is_active = 1 AND cp.deleted_at IS NULL
           LIMIT 1`,
          [madrasahId]
        );
        if (activePeriod.length > 0) effectiveCohortPeriodId = activePeriod[0].id;
      } else {
        const [activeSem] = await pool.query(
          `SELECT sem.id FROM semesters sem
           JOIN sessions sess ON sem.session_id = sess.id
           WHERE sess.madrasah_id = ? AND sem.is_active = 1 AND sem.deleted_at IS NULL AND sess.deleted_at IS NULL
           LIMIT 1`,
          [madrasahId]
        );
        if (activeSem.length > 0) effectiveSemesterId = activeSem[0].id;
      }
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
    if (effectiveCohortPeriodId) {
      strugglingQuery += ' AND ep.cohort_period_id = ?';
      strugglingParams.push(effectiveCohortPeriodId);
    } else if (effectiveSemesterId) {
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

    // 11c. Dropout students (currently dropped out — have a dropout record but no later reassignment)
    const [dropoutStudents] = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, c.name as class_name,
             MAX(sp.created_at) as dropped_at
      FROM student_promotions sp
      JOIN students s ON sp.student_id = s.id
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE sp.madrasah_id = ? AND sp.promotion_type = 'dropped_out'
        AND s.deleted_at IS NULL
        AND s.class_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM student_promotions sp2
          WHERE sp2.student_id = sp.student_id AND sp2.madrasah_id = sp.madrasah_id
            AND sp2.promotion_type IN ('promoted', 'transferred', 'repeated')
            AND sp2.created_at > sp.created_at
        )
      GROUP BY s.id, s.first_name, s.last_name, c.name
      ORDER BY dropped_at DESC
    `, [madrasahId]);
    const dropoutCount = dropoutStudents.length;

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
      if (effectiveCohortPeriodId) {
        poorBehaviorQuery += ' AND a.cohort_period_id = ?';
        poorBehaviorParams.push(effectiveCohortPeriodId);
      } else if (effectiveSemesterId) {
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

      const genderExamPeriodClause = cohort_period_id ? ' AND ep.cohort_period_id = ?' : (semester_id ? ' AND ep.semester_id = ?' : '');
      const genderExamPeriodParam = cohort_period_id || semester_id;
      const [genderExams] = await pool.query(`
        SELECT
          s.gender,
          ROUND(AVG(ep.score / ep.max_score * 100), 1) as avg_percentage
        FROM exam_performance ep
        JOIN students s ON ep.student_id = s.id
        WHERE ep.madrasah_id = ? AND ep.is_absent = 0${genderExamPeriodClause}${class_id ? ' AND s.class_id = ?' : ''}
        GROUP BY s.gender
      `, [madrasahId, ...(genderExamPeriodParam ? [genderExamPeriodParam] : []), ...(class_id ? [class_id] : [])]);

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

    // 13. Top Performer - best exam score this period
    const topPerfPeriodClause = cohort_period_id ? 'AND ep.cohort_period_id = ?' : (semester_id ? 'AND ep.semester_id = ?' : '');
    const topPerfPeriodParam = cohort_period_id || semester_id;
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
        ${topPerfPeriodClause}
        AND ep.is_absent = 0
        AND ep.score IS NOT NULL
      ORDER BY percentage DESC
      LIMIT 1
    `, topPerfPeriodParam ? [madrasahId, topPerfPeriodParam] : [madrasahId]);

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

    // 15. Month-over-Month Comparison (filtered by active period if selected)
    let momFilter = '';
    const momParams = [madrasahId];
    if (cohort_period_id) {
      momFilter = ' AND a.cohort_period_id = ?';
      momParams.push(cohort_period_id);
    } else if (semester_id) {
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
    if (cohort_period_id) momParamsLast.push(cohort_period_id);
    else if (semester_id) momParamsLast.push(semester_id);
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
      dropoutStudents,
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
        AND (a.target_madrasah_id IS NULL OR a.target_madrasah_id = ?)
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [madrasahId, JSON.stringify(madrasah?.pricing_plan || 'trial'), madrasahId]);

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

// ── Teacher Availability (Admin view) ──

// Get all teacher availability for a date range
router.get('/teacher-availability', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const [rows] = await pool.query(
      `SELECT ta.id, ta.teacher_id, ta.date, ta.status, ta.reason,
              u.first_name, u.last_name
       FROM teacher_availability ta
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.madrasah_id = ? AND ta.date BETWEEN ? AND ?
       ORDER BY ta.date, u.first_name`,
      [madrasahId, start_date, end_date]
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch teacher availability:', error);
    res.status(500).json({ error: 'Failed to fetch teacher availability' });
  }
});

// Get upcoming unavailable teachers (next 7 days) - for overview
router.get('/teacher-availability/upcoming', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const today = new Date();
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + 14);

    const startDate = today.toISOString().split('T')[0];
    const endDate = upcoming.toISOString().split('T')[0];

    const [rows] = await pool.query(
      `SELECT ta.teacher_id, ta.date, ta.status, ta.reason,
              u.first_name, u.last_name
       FROM teacher_availability ta
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.madrasah_id = ? AND ta.status = 'unavailable'
         AND ta.date BETWEEN ? AND ?
       ORDER BY ta.date, u.first_name`,
      [madrasahId, startDate, endDate]
    );

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch upcoming availability:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming availability' });
  }
});

// ─── Student Applications ───

// List all applications
router.get('/student-applications', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const status = req.query.status || 'pending';
    const [rows] = await pool.query(
      `SELECT * FROM student_applications
       WHERE madrasah_id = ? AND status = ?
       ORDER BY created_at DESC`,
      [madrasahId, status]
    );
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Count pending applications
router.get('/student-applications/count', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) as count FROM student_applications WHERE madrasah_id = ? AND status = ?',
      [madrasahId, 'pending']
    );
    res.json({ count });
  } catch (error) {
    console.error('Failed to count applications:', error);
    res.status(500).json({ error: 'Failed to count applications' });
  }
});

// Approve application — creates a student record
router.post('/student-applications/:id/approve', requireActiveSubscription, enforceStudentLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const applicationId = req.params.id;
    let { student_id, class_id, expected_fee, fee_note } = req.body;

    // Auto-generate student_id if not provided
    if (!student_id) {
      student_id = await getNextStudentId(madrasahId);
    }

    // Get the application
    const [apps] = await pool.query(
      'SELECT * FROM student_applications WHERE id = ? AND madrasah_id = ? AND status = ?',
      [applicationId, madrasahId, 'pending']
    );
    if (apps.length === 0) {
      return res.status(404).json({ error: 'Application not found or already processed' });
    }
    const app = apps[0];

    // Validate class if provided
    if (class_id) {
      const [classCheck] = await pool.query(
        'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
        [class_id, madrasahId]
      );
      if (classCheck.length === 0) {
        return res.status(400).json({ error: 'Invalid class' });
      }
    }

    // Create the student
    const [result] = await pool.query(
      `INSERT INTO students (madrasah_id, first_name, last_name, student_id, gender, email, class_id,
         student_phone, student_phone_country_code, street, city, state, country, date_of_birth,
         parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code,
         notes, expected_fee, fee_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, app.first_name, app.last_name, student_id, app.gender, app.email, class_id || null,
       app.phone, app.phone_country_code, app.street, app.city, app.state, app.country, app.date_of_birth,
       app.parent_guardian_name, app.parent_guardian_relationship,
       app.parent_guardian_phone, app.parent_guardian_phone_country_code,
       app.notes, expected_fee != null && expected_fee !== '' ? parseFloat(expected_fee) : null, fee_note || null]
    );

    // Mark application as approved
    await pool.query(
      'UPDATE student_applications SET status = ? WHERE id = ?',
      ['approved', applicationId]
    );

    res.json({ message: 'Application approved', studentId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Student ID already exists in this madrasah' });
    }
    console.error('Failed to approve application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject application
router.post('/student-applications/:id/reject', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const applicationId = req.params.id;

    const [result] = await pool.query(
      'UPDATE student_applications SET status = ?, rejected_at = NOW() WHERE id = ? AND madrasah_id = ? AND status = ?',
      ['rejected', applicationId, madrasahId, 'pending']
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found or already processed' });
    }
    res.json({ message: 'Application rejected' });
  } catch (error) {
    console.error('Failed to reject application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Delete an application (manual cleanup)
router.delete('/student-applications/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [result] = await pool.query(
      'DELETE FROM student_applications WHERE id = ? AND madrasah_id = ?',
      [req.params.id, madrasahId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('Failed to delete application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// ============================================
// COHORT SCHEDULING
// ============================================

// List cohorts
router.get('/cohorts', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [cohorts] = await pool.query(
      `SELECT c.*, COUNT(cl.id) as class_count
       FROM cohorts c
       LEFT JOIN classes cl ON cl.cohort_id = c.id AND cl.deleted_at IS NULL
       WHERE c.madrasah_id = ? AND c.deleted_at IS NULL
       GROUP BY c.id
       ORDER BY c.start_date DESC`,
      [madrasahId]
    );
    res.json(cohorts);
  } catch (error) {
    console.error('Failed to fetch cohorts:', error);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

// Get single cohort with periods
router.get('/cohorts/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [[cohort]] = await pool.query(
      'SELECT * FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.id, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [periods] = await pool.query(
      'SELECT * FROM cohort_periods WHERE cohort_id = ? AND deleted_at IS NULL ORDER BY start_date ASC',
      [req.params.id]
    );
    const [classes] = await pool.query(
      'SELECT id, name, grade_level FROM classes WHERE cohort_id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.id, madrasahId]
    );
    res.json({ ...cohort, periods, classes });
  } catch (error) {
    console.error('Failed to fetch cohort:', error);
    res.status(500).json({ error: 'Failed to fetch cohort' });
  }
});

// Create cohort
router.post('/cohorts', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'name, start_date and end_date are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO cohorts (madrasah_id, name, start_date, end_date, is_active, default_school_days) VALUES (?, ?, ?, ?, ?, ?)',
      [madrasahId, name, start_date, end_date, is_active || false, default_school_days ? JSON.stringify(default_school_days) : null]
    );
    res.status(201).json({ id: result.insertId, madrasah_id: madrasahId, name, start_date, end_date, is_active: is_active || false, default_school_days });
  } catch (error) {
    console.error('Failed to create cohort:', error);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

// Update cohort
router.put('/cohorts/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;

    const [check] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [id, madrasahId]
    );
    if (check.length === 0) return res.status(404).json({ error: 'Cohort not found' });

    await pool.query(
      'UPDATE cohorts SET name = ?, start_date = ?, end_date = ?, is_active = ?, default_school_days = ? WHERE id = ? AND madrasah_id = ?',
      [name, start_date, end_date, is_active, default_school_days ? JSON.stringify(default_school_days) : null, id, madrasahId]
    );
    res.json({ id: parseInt(id), name, start_date, end_date, is_active, default_school_days });
  } catch (error) {
    console.error('Failed to update cohort:', error);
    res.status(500).json({ error: 'Failed to update cohort' });
  }
});

// Delete cohort (soft delete)
router.delete('/cohorts/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    await pool.query(
      'UPDATE cohorts SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.id, madrasahId]
    );
    // Unassign classes from this cohort
    await pool.query('UPDATE classes SET cohort_id = NULL WHERE cohort_id = ? AND madrasah_id = ?', [req.params.id, madrasahId]);
    res.json({ message: 'Cohort deleted' });
  } catch (error) {
    console.error('Failed to delete cohort:', error);
    res.status(500).json({ error: 'Failed to delete cohort' });
  }
});

// List periods for a cohort
router.get('/cohorts/:cohortId/periods', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    // Verify cohort belongs to this madrasah
    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [periods] = await pool.query(
      'SELECT * FROM cohort_periods WHERE cohort_id = ? AND deleted_at IS NULL ORDER BY start_date ASC',
      [req.params.cohortId]
    );
    res.json(periods);
  } catch (error) {
    console.error('Failed to fetch cohort periods:', error);
    res.status(500).json({ error: 'Failed to fetch cohort periods' });
  }
});

// Create period for a cohort
router.post('/cohorts/:cohortId/periods', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, start_date, end_date, is_active } = req.body;
    if (!name || !start_date || !end_date) {
      return res.status(400).json({ error: 'name, start_date and end_date are required' });
    }
    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [result] = await pool.query(
      'INSERT INTO cohort_periods (cohort_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
      [req.params.cohortId, name, start_date, end_date, is_active || false]
    );
    res.status(201).json({ id: result.insertId, cohort_id: parseInt(req.params.cohortId), name, start_date, end_date, is_active: is_active || false });
  } catch (error) {
    console.error('Failed to create cohort period:', error);
    res.status(500).json({ error: 'Failed to create cohort period' });
  }
});

// Update cohort period
router.put('/cohort-periods/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, start_date, end_date, is_active } = req.body;

    // Verify period belongs to a cohort in this madrasah
    const [[period]] = await pool.query(
      `SELECT cp.id FROM cohort_periods cp
       JOIN cohorts c ON cp.cohort_id = c.id
       WHERE cp.id = ? AND c.madrasah_id = ? AND cp.deleted_at IS NULL`,
      [id, madrasahId]
    );
    if (!period) return res.status(404).json({ error: 'Period not found' });

    await pool.query(
      'UPDATE cohort_periods SET name = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
      [name, start_date, end_date, is_active, id]
    );
    res.json({ id: parseInt(id), name, start_date, end_date, is_active });
  } catch (error) {
    console.error('Failed to update cohort period:', error);
    res.status(500).json({ error: 'Failed to update cohort period' });
  }
});

// Delete cohort period
router.delete('/cohort-periods/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [[period]] = await pool.query(
      `SELECT cp.id FROM cohort_periods cp
       JOIN cohorts c ON cp.cohort_id = c.id
       WHERE cp.id = ? AND c.madrasah_id = ? AND cp.deleted_at IS NULL`,
      [req.params.id, madrasahId]
    );
    if (!period) return res.status(404).json({ error: 'Period not found' });

    await pool.query('UPDATE cohort_periods SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ message: 'Period deleted' });
  } catch (error) {
    console.error('Failed to delete cohort period:', error);
    res.status(500).json({ error: 'Failed to delete cohort period' });
  }
});

// List holidays for a cohort
router.get('/cohorts/:cohortId/holidays', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [holidays] = await pool.query(
      'SELECT * FROM academic_holidays WHERE cohort_id = ? AND deleted_at IS NULL ORDER BY start_date ASC',
      [req.params.cohortId]
    );
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cohort holidays' });
  }
});

// Create holiday for a cohort
router.post('/cohorts/:cohortId/holidays', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { title, start_date, end_date, description } = req.body;
    if (!title || !start_date || !end_date) return res.status(400).json({ error: 'title, start_date and end_date are required' });

    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [result] = await pool.query(
      'INSERT INTO academic_holidays (madrasah_id, session_id, cohort_id, title, start_date, end_date, description) VALUES (?, NULL, ?, ?, ?, ?, ?)',
      [madrasahId, req.params.cohortId, title, start_date, end_date, description || null]
    );
    res.status(201).json({ id: result.insertId, cohort_id: parseInt(req.params.cohortId), title, start_date, end_date, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create cohort holiday' });
  }
});

// List schedule overrides for a cohort
router.get('/cohorts/:cohortId/schedule-overrides', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const [overrides] = await pool.query(
      'SELECT * FROM schedule_overrides WHERE cohort_id = ? AND deleted_at IS NULL ORDER BY start_date ASC',
      [req.params.cohortId]
    );
    res.json(overrides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cohort schedule overrides' });
  }
});

// Create schedule override for a cohort
router.post('/cohorts/:cohortId/schedule-overrides', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { title, start_date, end_date, is_school_day, reason } = req.body;
    if (!start_date || !end_date || is_school_day === undefined) return res.status(400).json({ error: 'start_date, end_date and is_school_day are required' });

    const [[cohort]] = await pool.query(
      'SELECT id FROM cohorts WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.cohortId, madrasahId]
    );
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    const overrideTitle = title || (is_school_day ? 'School day' : 'Non-school day');
    const [result] = await pool.query(
      'INSERT INTO schedule_overrides (madrasah_id, session_id, cohort_id, title, start_date, end_date, is_school_day, reason) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)',
      [madrasahId, req.params.cohortId, overrideTitle, start_date, end_date, is_school_day, reason || null]
    );
    res.status(201).json({ id: result.insertId, cohort_id: parseInt(req.params.cohortId), title: overrideTitle, start_date, end_date, is_school_day, reason });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create cohort schedule override' });
  }
});

// =====================================================
// Learning Tracker — Course CRUD (admin)
// =====================================================

// GET /admin/courses — list all courses for this madrasah
router.get('/courses', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [courses] = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM course_units cu WHERE cu.course_id = c.id AND cu.deleted_at IS NULL) as unit_count
       FROM courses c
       WHERE c.madrasah_id = ? AND c.deleted_at IS NULL
       ORDER BY c.display_order ASC, c.name ASC`,
      [madrasahId]
    );

    if (courses.length === 0) return res.json([]);

    const courseIds = courses.map(c => c.id);
    const [links] = await pool.query(
      `SELECT cc.course_id, cc.class_id, cl.name as class_name
       FROM course_classes cc
       JOIN classes cl ON cl.id = cc.class_id
       WHERE cc.course_id IN (?) AND cl.deleted_at IS NULL`,
      [courseIds]
    );

    const byCourse = {};
    for (const l of links) {
      if (!byCourse[l.course_id]) byCourse[l.course_id] = [];
      byCourse[l.course_id].push({ id: l.class_id, name: l.class_name });
    }

    const enriched = courses.map(c => ({
      ...c,
      classes: byCourse[c.id] || [],
      class_ids: (byCourse[c.id] || []).map(x => x.id),
      class_name: (byCourse[c.id] || []).map(x => x.name).join(', '),
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /admin/courses — create a course
router.post('/courses', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_ids, name, description, colour } = req.body;
    const classIds = Array.isArray(class_ids) ? class_ids.map(Number).filter(Boolean) : [];

    if (classIds.length === 0 || !name?.trim()) {
      return res.status(400).json({ error: 'At least one class and a name are required' });
    }

    // Verify all classes belong to this madrasah
    const [validClasses] = await pool.query(
      'SELECT id FROM classes WHERE id IN (?) AND madrasah_id = ? AND deleted_at IS NULL',
      [classIds, madrasahId]
    );
    if (validClasses.length !== classIds.length) {
      return res.status(404).json({ error: 'One or more classes not found' });
    }

    const primaryClassId = classIds[0];
    const [result] = await pool.query(
      'INSERT INTO courses (madrasah_id, class_id, name, description, colour) VALUES (?, ?, ?, ?, ?)',
      [madrasahId, primaryClassId, name.trim(), description || null, colour || null]
    );
    const courseId = result.insertId;

    const linkRows = classIds.map(cid => [courseId, cid, madrasahId]);
    await pool.query(
      'INSERT INTO course_classes (course_id, class_id, madrasah_id) VALUES ?',
      [linkRows]
    );

    const [[course]] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.status(201).json({ ...course, class_ids: classIds });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /admin/courses/:courseId — update a course
router.put('/courses/:courseId', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId } = req.params;
    const { name, description, colour, is_active, class_ids } = req.body;

    const [[existing]] = await pool.query('SELECT id FROM courses WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [courseId, madrasahId]);
    if (!existing) return res.status(404).json({ error: 'Course not found' });

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    if (colour !== undefined) { updates.push('colour = ?'); params.push(colour || null); }
    if (typeof is_active === 'boolean') { updates.push('is_active = ?'); params.push(is_active); }

    // Handle class assignment changes
    if (Array.isArray(class_ids)) {
      const cleanIds = class_ids.map(Number).filter(Boolean);
      if (cleanIds.length === 0) {
        return res.status(400).json({ error: 'At least one class is required' });
      }
      const [validClasses] = await pool.query(
        'SELECT id FROM classes WHERE id IN (?) AND madrasah_id = ? AND deleted_at IS NULL',
        [cleanIds, madrasahId]
      );
      if (validClasses.length !== cleanIds.length) {
        return res.status(404).json({ error: 'One or more classes not found' });
      }

      await pool.query('DELETE FROM course_classes WHERE course_id = ?', [courseId]);
      const linkRows = cleanIds.map(cid => [courseId, cid, madrasahId]);
      await pool.query(
        'INSERT INTO course_classes (course_id, class_id, madrasah_id) VALUES ?',
        [linkRows]
      );
      // Keep legacy class_id pointing at the first selected class
      updates.push('class_id = ?');
      params.push(cleanIds[0]);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(courseId);
    await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);
    const [[course]] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /admin/courses/:courseId — soft delete a course
router.delete('/courses/:courseId', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId } = req.params;

    const [[existing]] = await pool.query('SELECT id FROM courses WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [courseId, madrasahId]);
    if (!existing) return res.status(404).json({ error: 'Course not found' });

    await pool.query('UPDATE courses SET deleted_at = NOW() WHERE id = ?', [courseId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

// GET /admin/courses/:courseId/units — list units for a course
router.get('/courses/:courseId/units', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId } = req.params;

    const [[course]] = await pool.query('SELECT id FROM courses WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [courseId, madrasahId]);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const [units] = await pool.query(
      'SELECT * FROM course_units WHERE course_id = ? AND deleted_at IS NULL ORDER BY display_order ASC, id ASC',
      [courseId]
    );
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course units' });
  }
});

// POST /admin/courses/:courseId/units — add a unit
router.post('/courses/:courseId/units', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId } = req.params;
    const { title, description } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

    const [[course]] = await pool.query('SELECT id FROM courses WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [courseId, madrasahId]);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Auto-increment display_order
    const [[maxOrder]] = await pool.query('SELECT COALESCE(MAX(display_order), 0) as max_order FROM course_units WHERE course_id = ? AND deleted_at IS NULL', [courseId]);
    const displayOrder = maxOrder.max_order + 1;

    const [result] = await pool.query(
      'INSERT INTO course_units (course_id, madrasah_id, title, description, display_order) VALUES (?, ?, ?, ?, ?)',
      [courseId, madrasahId, title.trim(), description || null, displayOrder]
    );
    const [[unit]] = await pool.query('SELECT * FROM course_units WHERE id = ?', [result.insertId]);
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

// PUT /admin/courses/:courseId/units/:unitId — update a unit
router.put('/courses/:courseId/units/:unitId', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId, unitId } = req.params;
    const { title, description, display_order } = req.body;

    const [[unit]] = await pool.query('SELECT id FROM course_units WHERE id = ? AND course_id = ? AND madrasah_id = ? AND deleted_at IS NULL', [unitId, courseId, madrasahId]);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    params.push(unitId);
    await pool.query(`UPDATE course_units SET ${updates.join(', ')} WHERE id = ?`, params);
    const [[updated]] = await pool.query('SELECT * FROM course_units WHERE id = ?', [unitId]);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// DELETE /admin/courses/:courseId/units/:unitId — soft delete a unit
router.delete('/courses/:courseId/units/:unitId', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId, unitId } = req.params;

    const [[unit]] = await pool.query('SELECT id FROM course_units WHERE id = ? AND course_id = ? AND madrasah_id = ? AND deleted_at IS NULL', [unitId, courseId, madrasahId]);
    if (!unit) return res.status(404).json({ error: 'Unit not found' });

    await pool.query('UPDATE course_units SET deleted_at = NOW() WHERE id = ?', [unitId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// GET /admin/courses/:courseId/report?class_id=X
// Returns: per-unit coverage stats and per-student progress matrix for a course in a class
router.get('/courses/:courseId/report', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { courseId } = req.params;
    const { class_id } = req.query;
    if (!class_id) return res.status(400).json({ error: 'class_id is required' });

    const [[course]] = await pool.query(
      `SELECT c.id, c.name, c.colour FROM courses c
       JOIN course_classes cc ON cc.course_id = c.id
       WHERE c.id = ? AND cc.class_id = ? AND c.madrasah_id = ? AND c.deleted_at IS NULL`,
      [courseId, class_id, madrasahId]
    );
    if (!course) return res.status(404).json({ error: 'Course not found for this class' });

    const [units] = await pool.query(
      'SELECT id, title, display_order FROM course_units WHERE course_id = ? AND deleted_at IS NULL ORDER BY display_order ASC, id ASC',
      [courseId]
    );

    const [students] = await pool.query(
      `SELECT id, first_name, last_name FROM students
       WHERE class_id = ? AND madrasah_id = ? AND deleted_at IS NULL
       ORDER BY first_name ASC, last_name ASC`,
      [class_id, madrasahId]
    );

    const [records] = await pool.query(
      `SELECT cp.unit_id, cp.student_id, cp.date, cp.grade, cp.passed,
              u.first_name as recorder_first, u.last_name as recorder_last
       FROM course_progress cp
       LEFT JOIN users u ON u.id = cp.recorded_by
       WHERE cp.course_id = ? AND cp.class_id = ? AND cp.madrasah_id = ? AND cp.deleted_at IS NULL
       ORDER BY cp.date DESC`,
      [courseId, class_id, madrasahId]
    );

    // Also pull class-level coverage records (when madrasah is in class_coverage mode)
    const [coverageRecords] = await pool.query(
      `SELECT cuc.unit_id, cuc.date,
              u.first_name as recorder_first, u.last_name as recorder_last
       FROM course_unit_coverage cuc
       LEFT JOIN users u ON u.id = cuc.recorded_by
       WHERE cuc.course_id = ? AND cuc.class_id = ? AND cuc.madrasah_id = ? AND cuc.deleted_at IS NULL
       ORDER BY cuc.date DESC`,
      [courseId, class_id, madrasahId]
    );

    // Per-unit coverage summary
    const totalStudents = students.length;
    const unitStats = units.map(u => {
      const unitRecords = records.filter(r => r.unit_id === u.id);
      const unitCoverage = coverageRecords.filter(r => r.unit_id === u.id);
      const uniqueStudents = new Set(unitRecords.map(r => r.student_id));
      const passCount = unitRecords.filter(r => r.passed).length;

      // Pick most recent record from either source
      const lastProgress = unitRecords[0];
      const lastCoverage = unitCoverage[0];
      let lastRecord = null;
      if (lastProgress && lastCoverage) {
        lastRecord = new Date(lastProgress.date) > new Date(lastCoverage.date) ? lastProgress : lastCoverage;
      } else {
        lastRecord = lastProgress || lastCoverage;
      }

      // "Taught" = either we have any per-student records OR any class-coverage records
      const wasTaught = unitRecords.length > 0 || unitCoverage.length > 0;

      return {
        ...u,
        students_recorded: uniqueStudents.size,
        coverage_pct: totalStudents > 0 ? Math.round((uniqueStudents.size / totalStudents) * 100) : 0,
        total_records: unitRecords.length,
        coverage_records: unitCoverage.length,
        was_taught: wasTaught,
        pass_count: passCount,
        last_recorded_date: lastRecord?.date || null,
        last_recorded_by: lastRecord ? `${lastRecord.recorder_first || ''} ${lastRecord.recorder_last || ''}`.trim() || null : null,
      };
    });

    // Per-student matrix: for each student, which units they've passed
    const studentMatrix = students.map(s => {
      const studentRecords = records.filter(r => r.student_id === s.id);
      const passedUnitIds = new Set(studentRecords.filter(r => r.passed).map(r => r.unit_id));
      return {
        ...s,
        passed_unit_ids: Array.from(passedUnitIds),
        passed_count: passedUnitIds.size,
        total_records: studentRecords.length,
      };
    });

    // Class current position = the furthest unit either taught or with student records
    let classCurrentUnit = null;
    for (const u of unitStats) {
      if (u.was_taught) {
        if (!classCurrentUnit || u.display_order > classCurrentUnit.display_order) {
          classCurrentUnit = { id: u.id, title: u.title, display_order: u.display_order };
        }
      }
    }

    res.json({
      course,
      units,
      total_students: totalStudents,
      unit_stats: unitStats,
      student_matrix: studentMatrix,
      class_current_unit: classCurrentUnit,
    });
  } catch (error) {
    console.error('Course report error:', error);
    res.status(500).json({ error: 'Failed to fetch course report' });
  }
});

// POST /admin/onboarding/complete — save wizard answers and mark setup as done
router.post('/onboarding/complete', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const {
      scheduling_mode,
      enable_learning_tracker,
      enable_fee_tracking,
      enable_grade_tracking,
      currency,
      fee_tracking_mode,
      fee_prorate_mid_period,
      availability_planner_aware,
    } = req.body;

    const fields = [];
    const values = [];

    if (scheduling_mode !== undefined) {
      fields.push('scheduling_mode = ?');
      values.push(scheduling_mode);
    }
    if (enable_learning_tracker !== undefined) {
      fields.push('enable_learning_tracker = ?');
      values.push(enable_learning_tracker ? 1 : 0);
    }
    if (enable_fee_tracking !== undefined) {
      fields.push('enable_fee_tracking = ?');
      values.push(enable_fee_tracking ? 1 : 0);
    }
    if (enable_grade_tracking !== undefined) {
      const gradeVal = enable_grade_tracking ? 1 : 0;
      fields.push('enable_dressing_grade = ?', 'enable_behavior_grade = ?', 'enable_punctuality_grade = ?');
      values.push(gradeVal, gradeVal, gradeVal);
    }
    if (currency !== undefined) {
      fields.push('currency = ?');
      values.push(currency);
    }
    if (fee_tracking_mode !== undefined && ['manual', 'auto'].includes(fee_tracking_mode)) {
      fields.push('fee_tracking_mode = ?');
      values.push(fee_tracking_mode);
    }
    if (fee_prorate_mid_period !== undefined) {
      fields.push('fee_prorate_mid_period = ?');
      values.push(fee_prorate_mid_period ? 1 : 0);
    }
    if (availability_planner_aware !== undefined) {
      fields.push('availability_planner_aware = ?');
      values.push(availability_planner_aware ? 1 : 0);
    }

    fields.push('setup_complete = 1');
    values.push(madrasahId);

    await pool.query(
      `UPDATE madrasahs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to save onboarding settings' });
  }
});

// GET /admin/fee-report/families — fee summary grouped by family (same parent phone)
// Optional query: ?class_id=X
router.get('/fee-report/families', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { class_id } = req.query;

    const [madrasahRow] = await pool.query(
      'SELECT enable_fee_tracking, currency FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const madrasahInfo = madrasahRow[0] || {};
    const currency = madrasahInfo.currency || 'USD';

    if (!madrasahInfo.enable_fee_tracking) {
      return res.json({ currency, families: [], grandTotal: 0, grandPaid: 0, grandBalance: 0 });
    }

    // Fetch all active students (optionally filtered by class)
    const studentParams = [madrasahId];
    let studentWhere = 's.madrasah_id = ? AND s.deleted_at IS NULL';
    if (class_id) {
      studentWhere += ' AND s.class_id = ?';
      studentParams.push(class_id);
    }
    const [students] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.student_id as student_code,
              s.expected_fee, s.class_id, s.parent_guardian_name,
              s.parent_guardian_phone, s.parent_guardian_phone_country_code,
              c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ${studentWhere}
       ORDER BY s.parent_guardian_phone, s.first_name`,
      studentParams
    );

    if (students.length === 0) {
      return res.json({ currency, families: [], grandTotal: 0, grandPaid: 0, grandBalance: 0 });
    }

    const studentIds = students.map(s => s.id);

    // Total paid per student
    const [payments] = await pool.query(
      `SELECT student_id, SUM(amount_paid) as total_paid
       FROM fee_payments WHERE madrasah_id = ? AND deleted_at IS NULL AND student_id IN (?)
       GROUP BY student_id`,
      [madrasahId, studentIds]
    );
    const paidMap = {};
    for (const p of payments) paidMap[p.student_id] = parseFloat(p.total_paid);

    // Recent payments per student (up to 10 each)
    const [recentPayments] = await pool.query(
      `SELECT student_id, amount_paid, payment_date, payment_method, payment_label, period_label, reference_note
       FROM fee_payments
       WHERE madrasah_id = ? AND deleted_at IS NULL AND student_id IN (?)
       ORDER BY payment_date DESC, created_at DESC`,
      [madrasahId, studentIds]
    );
    const recentMap = {};
    for (const p of recentPayments) {
      if (!recentMap[p.student_id]) recentMap[p.student_id] = [];
      if (recentMap[p.student_id].length < 10) {
        recentMap[p.student_id].push({
          date: p.payment_date,
          amount: parseFloat(p.amount_paid),
          label: p.payment_label,
          period: p.period_label,
          method: p.payment_method,
          reference: p.reference_note,
        });
      }
    }

    // Group students into families by (normalised phone + country code)
    // Students with no phone get their own pseudo-family
    const familyMap = {};
    for (const s of students) {
      const phone = s.parent_guardian_phone || '';
      const cc = s.parent_guardian_phone_country_code || '';
      const key = phone ? `${cc}|${phone}` : `solo|${s.id}`;
      if (!familyMap[key]) {
        familyMap[key] = {
          guardianName: s.parent_guardian_name || null,
          guardianPhone: phone ? `${cc} ${phone}` : null,
          children: [],
        };
      }
      const totalOwed = parseFloat(s.expected_fee) || 0;
      const totalPaid = paidMap[s.id] || 0;
      const totalBalance = totalOwed - totalPaid;
      familyMap[key].children.push({
        studentDbId: s.id,
        studentCode: s.student_code,
        studentName: `${s.first_name} ${s.last_name}`,
        className: s.class_name || '',
        totalOwed,
        totalPaid,
        totalBalance,
        status: totalOwed === 0 ? 'none' : totalPaid >= totalOwed ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
        recentPayments: recentMap[s.id] || [],
      });
    }

    const families = Object.values(familyMap).map(f => {
      const grandTotal = f.children.reduce((s, c) => s + c.totalOwed, 0);
      const grandPaid = f.children.reduce((s, c) => s + c.totalPaid, 0);
      return { ...f, grandTotal, grandPaid, grandBalance: grandTotal - grandPaid };
    });

    // Sort: families with outstanding balance first
    families.sort((a, b) => b.grandBalance - a.grandBalance);

    const grandTotal = families.reduce((s, f) => s + f.grandTotal, 0);
    const grandPaid = families.reduce((s, f) => s + f.grandPaid, 0);

    res.json({ currency, families, grandTotal, grandPaid, grandBalance: grandTotal - grandPaid });
  } catch (error) {
    console.error('Fee family report error:', error);
    res.status(500).json({ error: 'Failed to generate fee report' });
  }
});

export default router;


