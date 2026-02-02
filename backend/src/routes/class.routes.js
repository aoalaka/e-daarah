import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Get all classes (scoped to madrasah)
router.get('/', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [classes] = await pool.query(
      'SELECT * FROM classes WHERE madrasah_id = ?',
      [madrasahId]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// Get class students (scoped to madrasah)
router.get('/:classId/students', async (req, res) => {
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

    const [students] = await pool.query(
      'SELECT * FROM students WHERE class_id = ? AND madrasah_id = ?',
      [classId, madrasahId]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

export default router;
