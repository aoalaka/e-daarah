import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken, requireRole('teacher'));

// Record attendance (with tenant isolation)
router.post('/', async (req, res) => {
  try {
    const madrasahId = req.user.madrasahId;
    const { student_id, class_id, date, present, dressing_grade, behavior_grade, notes } = req.body;

    // Verify student belongs to this madrasah
    const [students] = await pool.query(
      'SELECT id FROM students WHERE id = ? AND madrasah_id = ?',
      [student_id, madrasahId]
    );
    if (students.length === 0) {
      return res.status(403).json({ error: 'Student not found in your madrasah' });
    }

    // Verify class belongs to this madrasah
    const [classes] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [class_id, madrasahId]
    );
    if (classes.length === 0) {
      return res.status(403).json({ error: 'Class not found in your madrasah' });
    }

    const [result] = await pool.query(
      `INSERT INTO attendance
       (student_id, class_id, user_id, madrasah_id, date, present, dressing_grade, behavior_grade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, class_id, req.user.id, madrasahId, date, present, dressing_grade, behavior_grade, notes]
    );

    res.status(201).json({ id: result.insertId, message: 'Attendance recorded' });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Record exam performance (with tenant isolation)
router.post('/exam-performance', async (req, res) => {
  try {
    const madrasahId = req.user.madrasahId;
    const { student_id, semester_id, subject, score, max_score } = req.body;

    // Verify student belongs to this madrasah
    const [students] = await pool.query(
      'SELECT id FROM students WHERE id = ? AND madrasah_id = ?',
      [student_id, madrasahId]
    );
    if (students.length === 0) {
      return res.status(403).json({ error: 'Student not found in your madrasah' });
    }

    // Verify semester belongs to this madrasah
    const [semesters] = await pool.query(
      'SELECT id FROM sessions WHERE id = ? AND madrasah_id = ?',
      [semester_id, madrasahId]
    );
    if (semesters.length === 0) {
      return res.status(403).json({ error: 'Semester not found in your madrasah' });
    }

    const [result] = await pool.query(
      `INSERT INTO exam_performance
       (student_id, semester_id, user_id, madrasah_id, subject, score, max_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student_id, semester_id, req.user.id, madrasahId, subject, score, max_score]
    );

    res.status(201).json({ id: result.insertId, message: 'Performance recorded' });
  } catch (error) {
    console.error('Error recording performance:', error);
    res.status(500).json({ error: 'Failed to record performance' });
  }
});

// Get attendance for a class (with tenant isolation)
router.get('/class/:classId', async (req, res) => {
  try {
    const madrasahId = req.user.madrasahId;
    const { classId } = req.params;
    const { date } = req.query;

    // Verify class belongs to this madrasah
    const [classes] = await pool.query(
      'SELECT id FROM classes WHERE id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    if (classes.length === 0) {
      return res.status(403).json({ error: 'Class not found in your madrasah' });
    }

    const [attendance] = await pool.query(
      `SELECT a.*, s.first_name, s.last_name
       FROM attendance a
       INNER JOIN students s ON a.student_id = s.id
       WHERE a.class_id = ? AND a.madrasah_id = ? ${date ? 'AND a.date = ?' : ''}
       ORDER BY a.date DESC, s.first_name, s.last_name`,
      date ? [classId, madrasahId, date] : [classId, madrasahId]
    );

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

export default router;
