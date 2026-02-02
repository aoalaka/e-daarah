import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken, requireRole('teacher'));

// Record attendance
router.post('/', async (req, res) => {
  try {
    const { student_id, class_id, date, present, dressing_grade, behavior_grade, notes } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO attendance 
       (student_id, class_id, user_id, date, present, dressing_grade, behavior_grade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, class_id, req.user.id, date, present, dressing_grade, behavior_grade, notes]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Attendance recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Record exam performance
router.post('/exam-performance', async (req, res) => {
  try {
    const { student_id, semester_id, subject, score, max_score } = req.body;
    
    const [result] = await pool.query(
      `INSERT INTO exam_performance 
       (student_id, semester_id, user_id, subject, score, max_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [student_id, semester_id, req.user.id, subject, score, max_score]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Performance recorded' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record performance' });
  }
});

// Get attendance for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    
    const [attendance] = await pool.query(
      `SELECT a.*, s.name as student_name 
       FROM attendance a
       INNER JOIN students s ON a.student_id = s.id
       WHERE a.class_id = ? ${date ? 'AND a.date = ?' : ''}
       ORDER BY a.date DESC, s.name`,
      date ? [classId, date] : [classId]
    );
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

export default router;
