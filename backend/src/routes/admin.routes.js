import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateTeacher, validateStudent, validateSession, validateSemester, validateClass } from '../utils/validation.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken, requireRole('admin'));

// Get all sessions (scoped to madrasah)
router.get('/sessions', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE madrasah_id = ? ORDER BY start_date DESC',
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

// Delete session (scoped to madrasah)
router.delete('/sessions/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query('DELETE FROM sessions WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
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
       WHERE sess.madrasah_id = ?
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

    // Verify session belongs to this madrasah and get session dates
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

    await pool.query('DELETE FROM semesters WHERE id = ?', [id]);
    res.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete semester' });
  }
});

// Create class (scoped to madrasah)
router.post('/classes', async (req, res) => {
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
       WHERE madrasah_id = ? AND role = 'teacher'
       ORDER BY last_name, first_name`,
      [madrasahId]
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Create teacher (scoped to madrasah - admin creates, teacher sets password later)
router.post('/teachers', async (req, res) => {
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

    // Validate input
    const validationErrors = validateTeacher({ first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country }, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Verify teacher belongs to this madrasah
    const [check] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND madrasah_id = ? AND role = 'teacher'",
      [id, madrasahId]
    );
    if (check.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await pool.query(
      'UPDATE users SET first_name = ?, last_name = ?, staff_id = ?, email = ?, phone = ?, phone_country_code = ?, street = ?, city = ?, state = ?, country = ? WHERE id = ? AND madrasah_id = ?',
      [first_name, last_name, staff_id, email, phone, phone_country_code, street, city, state, country, id, madrasahId]
    );
    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// Delete teacher (scoped to madrasah)
router.delete('/teachers/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query(
      "DELETE FROM users WHERE id = ? AND madrasah_id = ? AND role = 'teacher'",
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
       WHERE s.madrasah_id = ?
       ORDER BY s.last_name, s.first_name`,
      [madrasahId]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Create student (scoped to madrasah)
router.post('/students', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes } = req.body;

    // Validate input
    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code
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
       next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, first_name, last_name, student_id, gender, email, class_id || null,
       student_phone, student_phone_country_code, street, city, state, country, date_of_birth,
       next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes]
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
            next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes } = req.body;

    // Validate input
    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code
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
       class_id = ?, date_of_birth = ?, next_of_kin_name = ?, next_of_kin_relationship = ?,
       next_of_kin_phone = ?, next_of_kin_phone_country_code = ?, notes = ? WHERE id = ? AND madrasah_id = ?`,
      [first_name, last_name, student_id, gender, email,
       student_phone, student_phone_country_code, street, city, state, country,
       class_id || null, date_of_birth,
       next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_phone_country_code, notes, id, madrasahId]
    );
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Failed to update student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// Delete student (scoped to madrasah)
router.delete('/students/:id', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    await pool.query('DELETE FROM students WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
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
       institution_type, verification_status, trial_ends_at, created_at
       FROM madrasahs WHERE id = ?`,
      [madrasahId]
    );

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    // Get usage counts
    const [studentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE madrasah_id = ?',
      [madrasahId]
    );
    const [teacherCount] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE madrasah_id = ? AND role = ?',
      [madrasahId, 'teacher']
    );
    const [classCount] = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ?',
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

export default router;
