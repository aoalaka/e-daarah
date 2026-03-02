import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { validateStudent, normalizePhone } from '../utils/validation.js';
import {
  requireActiveSubscription,
  enforceStudentLimit,
  enforceClassLimit
} from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken, requireRole('admin'));

// ============================================
// DASHBOARD OVERVIEW
// ============================================

router.get('/dashboard', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const today = new Date().toISOString().slice(0, 10);

    const [[studentCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM students WHERE madrasah_id = ? AND deleted_at IS NULL', [madrasahId]
    );
    const [[classCount]] = await pool.query(
      'SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL', [madrasahId]
    );

    // Today's attendance summary
    const [attendanceToday] = await pool.query(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN present = 1 THEN 1 ELSE 0 END) as present,
       SUM(CASE WHEN present = 0 THEN 1 ELSE 0 END) as absent
       FROM attendance WHERE madrasah_id = ? AND date = ?`,
      [madrasahId, today]
    );

    // Fee summary
    const [[feeTotals]] = await pool.query(
      `SELECT COALESCE(SUM(s.expected_fee), 0) as total_expected,
       COALESCE((SELECT SUM(fp.amount_paid) FROM fee_payments fp WHERE fp.madrasah_id = ? AND fp.deleted_at IS NULL), 0) as total_paid
       FROM students s WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee IS NOT NULL`,
      [madrasahId, madrasahId]
    );

    res.json({
      students: studentCount.count,
      classes: classCount.count,
      attendance: attendanceToday[0] || { total: 0, present: 0, absent: 0 },
      fees: {
        total_expected: parseFloat(feeTotals.total_expected),
        total_paid: parseFloat(feeTotals.total_paid)
      }
    });
  } catch (error) {
    console.error('Solo dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================
// SESSIONS & SEMESTERS
// ============================================

router.get('/sessions', async (req, res) => {
  try {
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE madrasah_id = ? AND deleted_at IS NULL ORDER BY start_date DESC',
      [req.madrasahId]
    );
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/sessions', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;

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

router.put('/sessions/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { name, start_date, end_date, is_active, default_school_days } = req.body;

    const [check] = await pool.query('SELECT id FROM sessions WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Session not found' });

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

router.delete('/sessions/:id', requireActiveSubscription, async (req, res) => {
  try {
    await pool.query('UPDATE sessions SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [req.params.id, req.madrasahId]);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

router.get('/semesters', async (req, res) => {
  try {
    const [semesters] = await pool.query(
      `SELECT s.*, sess.name as session_name
       FROM semesters s
       LEFT JOIN sessions sess ON s.session_id = sess.id
       WHERE sess.madrasah_id = ? AND s.deleted_at IS NULL AND sess.deleted_at IS NULL
       ORDER BY s.start_date DESC`,
      [req.madrasahId]
    );
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
});

router.post('/semesters', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { session_id, name, start_date, end_date, is_active } = req.body;

    if (!session_id || !name || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields: session_id, name, start_date, end_date' });
    }

    const [sessionCheck] = await pool.query('SELECT id FROM sessions WHERE id = ? AND madrasah_id = ?', [session_id, madrasahId]);
    if (sessionCheck.length === 0) return res.status(400).json({ error: 'Invalid session' });

    if (is_active) {
      await pool.query(
        'UPDATE semesters SET is_active = false WHERE session_id IN (SELECT id FROM sessions WHERE madrasah_id = ?)',
        [madrasahId]
      );
    }

    const [result] = await pool.query(
      'INSERT INTO semesters (session_id, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
      [session_id, name, start_date, end_date, is_active || false]
    );
    res.status(201).json({ id: result.insertId, session_id, name, start_date, end_date, is_active });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create semester' });
  }
});

// ============================================
// CLASSES
// ============================================

router.get('/classes', async (req, res) => {
  try {
    const [classes] = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.deleted_at IS NULL) as student_count
       FROM classes c WHERE c.madrasah_id = ? AND c.deleted_at IS NULL ORDER BY c.name`,
      [req.madrasahId]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.post('/classes', requireActiveSubscription, enforceClassLimit, async (req, res) => {
  try {
    const { name, grade_level, school_days, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO classes (madrasah_id, name, grade_level, school_days, description) VALUES (?, ?, ?, ?, ?)',
      [req.madrasahId, name, grade_level, JSON.stringify(school_days), description]
    );
    res.status(201).json({ id: result.insertId, name, grade_level, school_days, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

router.put('/classes/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade_level, school_days, description } = req.body;

    const [check] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [id, req.madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Class not found' });

    await pool.query(
      'UPDATE classes SET name = ?, grade_level = ?, school_days = ?, description = ? WHERE id = ? AND madrasah_id = ?',
      [name, grade_level, JSON.stringify(school_days), description, id, req.madrasahId]
    );
    res.json({ id: parseInt(id), name, grade_level, school_days, description });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
});

router.delete('/classes/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const [check] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [id, req.madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Class not found' });

    await pool.query('UPDATE classes SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?', [id, req.madrasahId]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// ============================================
// STUDENTS
// ============================================

router.get('/students', async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT s.*, c.name as class_name
       FROM students s LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.madrasah_id = ? AND s.deleted_at IS NULL
       ORDER BY s.last_name, s.first_name`,
      [req.madrasahId]
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

router.post('/students', requireActiveSubscription, enforceStudentLimit, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
            expected_fee, fee_note } = req.body;

    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code
    }, false);
    if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors[0] });

    if (class_id) {
      const [classCheck] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ?', [class_id, madrasahId]);
      if (classCheck.length === 0) return res.status(400).json({ error: 'Invalid class' });
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
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Student ID already exists in this madrasah' });
    console.error('Failed to create student:', error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.put('/students/bulk-fee', requireActiveSubscription, async (req, res) => {
  try {
    const { student_ids, expected_fee, fee_note } = req.body;
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) return res.status(400).json({ error: 'Select at least one student' });
    if (expected_fee == null || parseFloat(expected_fee) < 0) return res.status(400).json({ error: 'Expected fee must be 0 or greater' });

    const placeholders = student_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE students SET expected_fee = ?, fee_note = ? WHERE id IN (${placeholders}) AND madrasah_id = ? AND deleted_at IS NULL`,
      [parseFloat(expected_fee), fee_note || null, ...student_ids, req.madrasahId]
    );
    res.json({ message: `Expected fee updated for ${student_ids.length} student(s)` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fees' });
  }
});

router.put('/students/:id/fee', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const { expected_fee, fee_note } = req.body;

    const [check] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [id, req.madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Student not found' });

    await pool.query(
      'UPDATE students SET expected_fee = ?, fee_note = ? WHERE id = ? AND madrasah_id = ?',
      [expected_fee != null ? parseFloat(expected_fee) : null, fee_note || null, id, req.madrasahId]
    );
    res.json({ message: 'Fee updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update fee' });
  }
});

router.put('/students/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { first_name, last_name, student_id, gender, email, class_id, date_of_birth,
            student_phone, student_phone_country_code, street, city, state, country,
            parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code, notes,
            expected_fee, fee_note } = req.body;

    const validationErrors = validateStudent({
      first_name, last_name, student_id, gender, email, phone: student_phone, phone_country_code: student_phone_country_code,
      street, city, state, country, date_of_birth,
      parent_guardian_name, parent_guardian_relationship, parent_guardian_phone, parent_guardian_phone_country_code
    }, true);
    if (validationErrors.length > 0) return res.status(400).json({ error: validationErrors[0] });

    const [check] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ?', [id, madrasahId]);
    if (check.length === 0) return res.status(404).json({ error: 'Student not found' });

    if (class_id) {
      const [classCheck] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ?', [class_id, madrasahId]);
      if (classCheck.length === 0) return res.status(400).json({ error: 'Invalid class' });
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

router.delete('/students/:id', requireActiveSubscription, async (req, res) => {
  try {
    await pool.query(
      'UPDATE students SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL',
      [req.params.id, req.madrasahId]
    );
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// ============================================
// ATTENDANCE
// ============================================

router.post('/attendance', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { student_id, class_id, date, present, dressing_grade, behavior_grade, notes } = req.body;

    const [students] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ?', [student_id, madrasahId]);
    if (students.length === 0) return res.status(403).json({ error: 'Student not found in your madrasah' });

    const [classes] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ?', [class_id, madrasahId]);
    if (classes.length === 0) return res.status(403).json({ error: 'Class not found in your madrasah' });

    const [result] = await pool.query(
      `INSERT INTO attendance (student_id, class_id, user_id, madrasah_id, date, present, dressing_grade, behavior_grade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, class_id, req.user.id, madrasahId, date, present, dressing_grade, behavior_grade, notes]
    );
    res.status(201).json({ id: result.insertId, message: 'Attendance recorded' });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.get('/attendance/class/:classId', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { date } = req.query;

    const [classes] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ?', [classId, madrasahId]);
    if (classes.length === 0) return res.status(403).json({ error: 'Class not found in your madrasah' });

    const [attendance] = await pool.query(
      `SELECT a.*, s.first_name, s.last_name
       FROM attendance a INNER JOIN students s ON a.student_id = s.id
       WHERE a.class_id = ? AND a.madrasah_id = ? ${date ? 'AND a.date = ?' : ''}
       ORDER BY a.date DESC, s.first_name, s.last_name`,
      date ? [classId, madrasahId, date] : [classId, madrasahId]
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// ============================================
// QUR'AN TRACKING
// ============================================

const SURAHS = [
  {n:1,name:'Al-Fatiha',juz:1,ayahs:7},{n:2,name:'Al-Baqarah',juz:1,ayahs:286},{n:3,name:"Ali 'Imran",juz:3,ayahs:200},
  {n:4,name:'An-Nisa',juz:4,ayahs:176},{n:5,name:"Al-Ma'idah",juz:6,ayahs:120},{n:6,name:"Al-An'am",juz:7,ayahs:165},
  {n:7,name:"Al-A'raf",juz:8,ayahs:206},{n:8,name:'Al-Anfal',juz:9,ayahs:75},{n:9,name:'At-Tawbah',juz:10,ayahs:129},
  {n:10,name:'Yunus',juz:11,ayahs:109},{n:11,name:'Hud',juz:11,ayahs:123},{n:12,name:'Yusuf',juz:12,ayahs:111},
  {n:13,name:"Ar-Ra'd",juz:13,ayahs:43},{n:14,name:'Ibrahim',juz:13,ayahs:52},{n:15,name:'Al-Hijr',juz:14,ayahs:99},
  {n:16,name:'An-Nahl',juz:14,ayahs:128},{n:17,name:"Al-Isra'",juz:15,ayahs:111},{n:18,name:'Al-Kahf',juz:15,ayahs:110},
  {n:19,name:'Maryam',juz:16,ayahs:98},{n:20,name:'Ta-Ha',juz:16,ayahs:135},{n:21,name:"Al-Anbiya'",juz:17,ayahs:112},
  {n:22,name:'Al-Hajj',juz:17,ayahs:78},{n:23,name:"Al-Mu'minun",juz:18,ayahs:118},{n:24,name:'An-Nur',juz:18,ayahs:64},
  {n:25,name:'Al-Furqan',juz:18,ayahs:77},{n:26,name:"Ash-Shu'ara'",juz:19,ayahs:227},{n:27,name:'An-Naml',juz:19,ayahs:93},
  {n:28,name:'Al-Qasas',juz:20,ayahs:88},{n:29,name:"Al-'Ankabut",juz:20,ayahs:69},{n:30,name:'Ar-Rum',juz:21,ayahs:60},
  {n:31,name:'Luqman',juz:21,ayahs:34},{n:32,name:'As-Sajdah',juz:21,ayahs:30},{n:33,name:'Al-Ahzab',juz:21,ayahs:73},
  {n:34,name:"Saba'",juz:22,ayahs:54},{n:35,name:'Fatir',juz:22,ayahs:45},{n:36,name:'Ya-Sin',juz:22,ayahs:83},
  {n:37,name:'As-Saffat',juz:23,ayahs:182},{n:38,name:'Sad',juz:23,ayahs:88},{n:39,name:'Az-Zumar',juz:23,ayahs:75},
  {n:40,name:'Ghafir',juz:24,ayahs:85},{n:41,name:'Fussilat',juz:24,ayahs:54},{n:42,name:'Ash-Shura',juz:25,ayahs:53},
  {n:43,name:'Az-Zukhruf',juz:25,ayahs:89},{n:44,name:'Ad-Dukhan',juz:25,ayahs:59},{n:45,name:'Al-Jathiyah',juz:25,ayahs:37},
  {n:46,name:'Al-Ahqaf',juz:26,ayahs:35},{n:47,name:'Muhammad',juz:26,ayahs:38},{n:48,name:'Al-Fath',juz:26,ayahs:29},
  {n:49,name:'Al-Hujurat',juz:26,ayahs:18},{n:50,name:'Qaf',juz:26,ayahs:45},{n:51,name:'Adh-Dhariyat',juz:26,ayahs:60},
  {n:52,name:'At-Tur',juz:27,ayahs:49},{n:53,name:'An-Najm',juz:27,ayahs:62},{n:54,name:'Al-Qamar',juz:27,ayahs:55},
  {n:55,name:'Ar-Rahman',juz:27,ayahs:78},{n:56,name:"Al-Waqi'ah",juz:27,ayahs:96},{n:57,name:'Al-Hadid',juz:27,ayahs:29},
  {n:58,name:'Al-Mujadilah',juz:28,ayahs:22},{n:59,name:'Al-Hashr',juz:28,ayahs:24},{n:60,name:'Al-Mumtahanah',juz:28,ayahs:13},
  {n:61,name:'As-Saff',juz:28,ayahs:14},{n:62,name:"Al-Jumu'ah",juz:28,ayahs:11},{n:63,name:'Al-Munafiqun',juz:28,ayahs:11},
  {n:64,name:'At-Taghabun',juz:28,ayahs:18},{n:65,name:'At-Talaq',juz:28,ayahs:12},{n:66,name:'At-Tahrim',juz:28,ayahs:12},
  {n:67,name:'Al-Mulk',juz:29,ayahs:30},{n:68,name:'Al-Qalam',juz:29,ayahs:52},{n:69,name:'Al-Haqqah',juz:29,ayahs:52},
  {n:70,name:"Al-Ma'arij",juz:29,ayahs:44},{n:71,name:'Nuh',juz:29,ayahs:28},{n:72,name:'Al-Jinn',juz:29,ayahs:28},
  {n:73,name:'Al-Muzzammil',juz:29,ayahs:20},{n:74,name:'Al-Muddaththir',juz:29,ayahs:56},{n:75,name:'Al-Qiyamah',juz:29,ayahs:40},
  {n:76,name:'Al-Insan',juz:29,ayahs:31},{n:77,name:'Al-Mursalat',juz:29,ayahs:50},{n:78,name:"An-Naba'",juz:30,ayahs:40},
  {n:79,name:"An-Nazi'at",juz:30,ayahs:46},{n:80,name:'Abasa',juz:30,ayahs:42},{n:81,name:'At-Takwir',juz:30,ayahs:29},
  {n:82,name:'Al-Infitar',juz:30,ayahs:19},{n:83,name:'Al-Mutaffifin',juz:30,ayahs:36},{n:84,name:'Al-Inshiqaq',juz:30,ayahs:25},
  {n:85,name:'Al-Buruj',juz:30,ayahs:22},{n:86,name:'At-Tariq',juz:30,ayahs:17},{n:87,name:"Al-A'la",juz:30,ayahs:19},
  {n:88,name:'Al-Ghashiyah',juz:30,ayahs:26},{n:89,name:'Al-Fajr',juz:30,ayahs:30},{n:90,name:'Al-Balad',juz:30,ayahs:20},
  {n:91,name:'Ash-Shams',juz:30,ayahs:15},{n:92,name:'Al-Layl',juz:30,ayahs:21},{n:93,name:'Ad-Duha',juz:30,ayahs:11},
  {n:94,name:'Ash-Sharh',juz:30,ayahs:8},{n:95,name:'At-Tin',juz:30,ayahs:8},{n:96,name:"Al-'Alaq",juz:30,ayahs:19},
  {n:97,name:'Al-Qadr',juz:30,ayahs:5},{n:98,name:'Al-Bayyinah',juz:30,ayahs:8},{n:99,name:'Az-Zalzalah',juz:30,ayahs:8},
  {n:100,name:"Al-'Adiyat",juz:30,ayahs:11},{n:101,name:"Al-Qari'ah",juz:30,ayahs:11},{n:102,name:'At-Takathur',juz:30,ayahs:8},
  {n:103,name:"Al-'Asr",juz:30,ayahs:3},{n:104,name:'Al-Humazah',juz:30,ayahs:9},{n:105,name:'Al-Fil',juz:30,ayahs:5},
  {n:106,name:'Quraysh',juz:30,ayahs:4},{n:107,name:"Al-Ma'un",juz:30,ayahs:7},{n:108,name:'Al-Kawthar',juz:30,ayahs:3},
  {n:109,name:'Al-Kafirun',juz:30,ayahs:6},{n:110,name:'An-Nasr',juz:30,ayahs:3},{n:111,name:'Al-Masad',juz:30,ayahs:5},
  {n:112,name:'Al-Ikhlas',juz:30,ayahs:4},{n:113,name:'Al-Falaq',juz:30,ayahs:5},{n:114,name:'An-Nas',juz:30,ayahs:6}
];

router.get('/quran/surahs', (req, res) => {
  res.json(SURAHS);
});

router.get('/quran/student/:studentId/position', async (req, res) => {
  try {
    const { studentId } = req.params;
    const [rows] = await pool.query('SELECT * FROM quran_student_position WHERE student_id = ? AND madrasah_id = ?', [studentId, req.madrasahId]);

    if (rows.length === 0) return res.json({ isNew: true, hifz: null, tilawah: null, revision: null });

    const pos = rows[0];
    res.json({
      isNew: false,
      hifz: pos.current_surah_number ? { surah_number: pos.current_surah_number, surah_name: pos.current_surah_name, juz: pos.current_juz, ayah: pos.current_ayah } : null,
      tilawah: pos.tilawah_surah_number ? { surah_number: pos.tilawah_surah_number, surah_name: pos.tilawah_surah_name, juz: pos.tilawah_juz, ayah: pos.tilawah_ayah } : null,
      revision: pos.revision_surah_number ? { surah_number: pos.revision_surah_number, surah_name: pos.revision_surah_name, juz: pos.revision_juz, ayah: pos.revision_ayah } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student position' });
  }
});

router.get('/quran/student/:studentId/history', async (req, res) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const [records] = await pool.query(
      `SELECT qp.*, s.first_name, s.last_name FROM quran_progress qp
       JOIN students s ON qp.student_id = s.id
       WHERE qp.student_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
       ORDER BY qp.date DESC, qp.created_at DESC LIMIT ?`,
      [studentId, req.madrasahId, limit]
    );
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student history' });
  }
});

router.get('/classes/:classId/quran-positions', async (req, res) => {
  try {
    const { classId } = req.params;
    const madrasahId = req.madrasahId;

    // Solo user doesn't need class_teachers check — they own all classes
    const [classCheck] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [classId, madrasahId]);
    if (classCheck.length === 0) return res.status(404).json({ error: 'Class not found' });

    const [students] = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.student_id as student_code,
        qsp.current_surah_number, qsp.current_surah_name, qsp.current_juz, qsp.current_ayah,
        qsp.tilawah_surah_number, qsp.tilawah_surah_name, qsp.tilawah_juz, qsp.tilawah_ayah,
        qsp.revision_surah_number, qsp.revision_surah_name, qsp.revision_juz, qsp.revision_ayah,
        qsp.total_surahs_completed, qsp.total_juz_completed, qsp.last_updated
      FROM students s
      LEFT JOIN quran_student_position qsp ON s.id = qsp.student_id AND qsp.madrasah_id = ?
      WHERE s.class_id = ? AND s.madrasah_id = ? AND s.deleted_at IS NULL
      ORDER BY s.first_name ASC
    `, [madrasahId, classId, madrasahId]);

    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quran positions' });
  }
});

router.get('/classes/:classId/quran-progress', async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester_id, student_id } = req.query;
    const madrasahId = req.madrasahId;

    let query = `
      SELECT qp.*, s.first_name, s.last_name, s.student_id as student_code
      FROM quran_progress qp JOIN students s ON qp.student_id = s.id
      WHERE qp.class_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL`;
    const params = [classId, madrasahId];

    if (semester_id) { query += ' AND qp.semester_id = ?'; params.push(semester_id); }
    if (student_id) { query += ' AND qp.student_id = ?'; params.push(student_id); }

    query += ' ORDER BY qp.date DESC, qp.created_at DESC';
    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quran progress' });
  }
});

router.post('/quran/record', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const userId = req.user.id;
    const { student_id, class_id, semester_id, date, type, surah_number, surah_name, juz, ayah_from, ayah_to, grade, passed, notes } = req.body;

    if (!student_id || !class_id || !semester_id || !date || !type || !surah_number || !surah_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['hifz', 'tilawah', 'revision'].includes(type)) {
      return res.status(400).json({ error: 'Invalid session type' });
    }

    const surah = SURAHS.find(s => s.n === parseInt(surah_number));
    if (!surah) return res.status(400).json({ error: 'Invalid surah number' });
    if (!ayah_from || !ayah_to) return res.status(400).json({ error: 'Ayah From and Ayah To are required' });

    const ayahFromInt = parseInt(ayah_from);
    const ayahToInt = parseInt(ayah_to);
    if (isNaN(ayahFromInt) || isNaN(ayahToInt) || ayahFromInt < 1 || ayahToInt < 1) return res.status(400).json({ error: 'Ayah values must be positive numbers' });
    if (ayahFromInt > surah.ayahs || ayahToInt > surah.ayahs) return res.status(400).json({ error: `${surah.name} has ${surah.ayahs} ayahs` });
    if (ayahFromInt > ayahToInt) return res.status(400).json({ error: 'Ayah From cannot be greater than Ayah To' });

    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (new Date(date) > today) return res.status(400).json({ error: 'Date cannot be in the future' });

    // Solo user owns all classes — no class_teachers check needed
    const [classCheck] = await pool.query('SELECT id FROM classes WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [class_id, madrasahId]);
    if (classCheck.length === 0) return res.status(404).json({ error: 'Class not found' });

    const [result] = await pool.query(
      `INSERT INTO quran_progress (madrasah_id, student_id, class_id, semester_id, user_id, date, type, surah_number, surah_name, juz, ayah_from, ayah_to, grade, passed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, student_id, class_id, semester_id, userId, date, type, surah_number, surah_name, juz || surah.juz, ayahFromInt, ayahToInt, grade || 'Good', passed !== undefined ? passed : true, notes || null]
    );

    // Update student position if passed
    if (passed !== false) {
      const posJuz = juz || surah.juz;
      if (type === 'hifz') {
        await pool.query(`INSERT INTO quran_student_position (madrasah_id, student_id, current_surah_number, current_surah_name, current_juz, current_ayah) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE current_surah_number = VALUES(current_surah_number), current_surah_name = VALUES(current_surah_name), current_juz = VALUES(current_juz), current_ayah = VALUES(current_ayah), last_updated = CURRENT_TIMESTAMP`, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      } else if (type === 'tilawah') {
        await pool.query(`INSERT INTO quran_student_position (madrasah_id, student_id, tilawah_surah_number, tilawah_surah_name, tilawah_juz, tilawah_ayah) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE tilawah_surah_number = VALUES(tilawah_surah_number), tilawah_surah_name = VALUES(tilawah_surah_name), tilawah_juz = VALUES(tilawah_juz), tilawah_ayah = VALUES(tilawah_ayah), last_updated = CURRENT_TIMESTAMP`, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      } else if (type === 'revision') {
        await pool.query(`INSERT INTO quran_student_position (madrasah_id, student_id, revision_surah_number, revision_surah_name, revision_juz, revision_ayah) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE revision_surah_number = VALUES(revision_surah_number), revision_surah_name = VALUES(revision_surah_name), revision_juz = VALUES(revision_juz), revision_ayah = VALUES(revision_ayah), last_updated = CURRENT_TIMESTAMP`, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      }
    }

    res.status(201).json({ id: result.insertId, message: passed !== false ? 'Passed — position updated' : 'Repeat — come back next time' });
  } catch (error) {
    console.error('Record quran progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

router.delete('/quran-progress/:id', requireActiveSubscription, async (req, res) => {
  try {
    await pool.query('UPDATE quran_progress SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?', [req.params.id, req.madrasahId]);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ============================================
// EXAM PERFORMANCE
// ============================================

router.get('/classes/:classId/exam-performance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semesterId, subject } = req.query;

    let query = `
      SELECT ep.*, s.first_name, s.last_name, s.student_id,
             sem.name as semester_name, sess.name as session_name
      FROM exam_performance ep
      INNER JOIN students s ON ep.student_id = s.id
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      LEFT JOIN sessions sess ON sem.session_id = sess.id
      WHERE s.class_id = ? AND s.madrasah_id = ? AND ep.deleted_at IS NULL`;
    const params = [classId, madrasahId];

    if (semesterId) { query += ' AND ep.semester_id = ?'; params.push(semesterId); }
    if (subject) { query += ' AND ep.subject = ?'; params.push(subject); }
    query += ' ORDER BY ep.exam_date DESC, s.last_name';

    const [performance] = await pool.query(query, params);
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam performance' });
  }
});

router.post('/classes/:classId/exam-performance/bulk', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { session_id, semester_id, subject, exam_date, max_score, students } = req.body;

    if (!session_id || !semester_id || !subject || !exam_date || !max_score || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const maxScoreNum = parseFloat(max_score);
    if (isNaN(maxScoreNum) || maxScoreNum <= 0 || maxScoreNum > 1000) return res.status(400).json({ error: 'Max score must be between 1 and 1000' });

    const examDate = new Date(exam_date);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (examDate > today) return res.status(400).json({ error: 'Exam date cannot be in the future' });
    if (students.length === 0) return res.status(400).json({ error: 'At least one student is required' });

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (!student.student_id) return res.status(400).json({ error: `Student ID missing at index ${i}` });
      if (!student.is_absent) {
        if (student.score === null || student.score === undefined || student.score === '') return res.status(400).json({ error: `Score required for ${student.student_name || 'student ' + (i + 1)}` });
        const scoreNum = parseFloat(student.score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScoreNum) return res.status(400).json({ error: `Invalid score for ${student.student_name || 'student ' + (i + 1)}` });
      } else {
        if (!student.absence_reason) return res.status(400).json({ error: `Absence reason required for ${student.student_name || 'student ' + (i + 1)}` });
      }
    }

    for (const student of students) {
      await pool.query(
        `INSERT INTO exam_performance (madrasah_id, student_id, semester_id, user_id, subject, exam_date, max_score, score, is_absent, absence_reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [madrasahId, student.student_id, semester_id, req.user.id, subject, exam_date, max_score,
         student.is_absent ? null : (student.score || 0), student.is_absent || false,
         student.is_absent ? student.absence_reason : null, student.notes || null]
      );
    }
    res.json({ message: 'Exam performance recorded successfully for all students' });
  } catch (error) {
    console.error('Bulk exam performance error:', error);
    res.status(500).json({ error: 'Failed to record exam performance' });
  }
});

router.put('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids, semester_id, subject, exam_date, max_score } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) return res.status(400).json({ error: 'Record IDs are required' });

    const placeholders = record_ids.map(() => '?').join(',');
    const [records] = await pool.query(`SELECT id FROM exam_performance WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`, [...record_ids, req.user.id, madrasahId]);
    if (records.length !== record_ids.length) return res.status(403).json({ error: 'Not authorized to edit some records' });

    const updates = [];
    const values = [];
    if (semester_id) { updates.push('semester_id = ?'); values.push(semester_id); }
    if (subject) { updates.push('subject = ?'); values.push(subject); }
    if (exam_date) { updates.push('exam_date = ?'); values.push(exam_date); }
    if (max_score) { updates.push('max_score = ?'); values.push(max_score); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = NOW()');
    const updatePlaceholders = record_ids.map(() => '?').join(',');
    await pool.query(`UPDATE exam_performance SET ${updates.join(', ')} WHERE id IN (${updatePlaceholders})`, [...values, ...record_ids]);
    res.json({ message: 'Exam batch updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam batch' });
  }
});

router.delete('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  try {
    const { record_ids } = req.body;
    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) return res.status(400).json({ error: 'Record IDs are required' });

    const placeholders = record_ids.map(() => '?').join(',');
    const [records] = await pool.query(`SELECT id FROM exam_performance WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`, [...record_ids, req.user.id, req.madrasahId]);
    if (records.length !== record_ids.length) return res.status(403).json({ error: 'Not authorized to delete some records' });

    await pool.query(`DELETE FROM exam_performance WHERE id IN (${placeholders})`, record_ids);
    res.json({ message: `${record_ids.length} exam records deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam batch' });
  }
});

router.put('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, is_absent, absence_reason, notes } = req.body;

    const [record] = await pool.query('SELECT *, max_score FROM exam_performance WHERE id = ? AND user_id = ? AND madrasah_id = ?', [id, req.user.id, req.madrasahId]);
    if (record.length === 0) return res.status(403).json({ error: 'Not authorized to edit this record' });

    const maxScore = record[0].max_score;
    if (!is_absent) {
      if (score === null || score === undefined || score === '') return res.status(400).json({ error: 'Score is required when student is not absent' });
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) return res.status(400).json({ error: `Score must be between 0 and ${maxScore}` });
    } else {
      if (!absence_reason) return res.status(400).json({ error: 'Absence reason is required' });
    }

    await pool.query(
      'UPDATE exam_performance SET score = ?, is_absent = ?, absence_reason = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      [is_absent ? null : (score || 0), is_absent || false, is_absent ? absence_reason : null, notes || null, id]
    );
    res.json({ message: 'Exam performance updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam performance' });
  }
});

router.delete('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const [record] = await pool.query('SELECT id FROM exam_performance WHERE id = ? AND user_id = ? AND madrasah_id = ?', [id, req.user.id, req.madrasahId]);
    if (record.length === 0) return res.status(403).json({ error: 'Not authorized to delete this record' });

    await pool.query('DELETE FROM exam_performance WHERE id = ?', [id]);
    res.json({ message: 'Exam performance deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam performance' });
  }
});

// ============================================
// FEE TRACKING
// ============================================

router.get('/fee-payments', async (req, res) => {
  try {
    const { student_id, class_id, from, to } = req.query;

    let sql = `SELECT fp.id, fp.student_id, fp.amount_paid, fp.payment_date,
       fp.payment_method, fp.reference_note, fp.payment_label, fp.period_label, fp.created_at,
       CONCAT(s.first_name, ' ', s.last_name) as student_name
       FROM fee_payments fp JOIN students s ON s.id = fp.student_id
       WHERE fp.madrasah_id = ? AND fp.deleted_at IS NULL`;
    const params = [req.madrasahId];

    if (student_id) { sql += ' AND fp.student_id = ?'; params.push(student_id); }
    if (from) { sql += ' AND fp.payment_date >= ?'; params.push(from); }
    if (to) { sql += ' AND fp.payment_date <= ?'; params.push(to); }
    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }

    sql += ' ORDER BY fp.payment_date DESC, fp.created_at DESC';
    const [payments] = await pool.query(sql, params);
    res.json(payments.map(p => ({ ...p, amount_paid: parseFloat(p.amount_paid) })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee payments' });
  }
});

router.post('/fee-payments', requireActiveSubscription, async (req, res) => {
  try {
    const { student_id, amount_paid, payment_date, payment_method, reference_note, payment_label } = req.body;
    if (!student_id) return res.status(400).json({ error: 'Student is required' });
    if (!amount_paid || parseFloat(amount_paid) <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (!payment_date) return res.status(400).json({ error: 'Payment date is required' });

    const [stu] = await pool.query('SELECT id FROM students WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [student_id, req.madrasahId]);
    if (stu.length === 0) return res.status(404).json({ error: 'Student not found' });

    const method = ['cash', 'bank_transfer', 'online', 'other'].includes(payment_method) ? payment_method : 'cash';
    const [result] = await pool.query(
      `INSERT INTO fee_payments (madrasah_id, student_id, amount_paid, payment_date, payment_method, reference_note, payment_label, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.madrasahId, student_id, parseFloat(amount_paid), payment_date, method, reference_note || null, payment_label || null, req.user.id]
    );
    res.status(201).json({ id: result.insertId, message: 'Payment recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

router.delete('/fee-payments/:id', requireActiveSubscription, async (req, res) => {
  try {
    await pool.query('UPDATE fee_payments SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ? AND deleted_at IS NULL', [req.params.id, req.madrasahId]);
    res.json({ message: 'Payment voided successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to void payment' });
  }
});

router.get('/fee-summary', async (req, res) => {
  try {
    const { class_id } = req.query;

    let sql = `SELECT s.id as student_id, s.first_name, s.last_name, s.expected_fee, s.fee_note,
       c.name as class_name,
       COALESCE(SUM(fp.amount_paid), 0) as total_paid
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.madrasah_id = s.madrasah_id AND fp.deleted_at IS NULL
       WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee IS NOT NULL`;
    const params = [req.madrasahId];

    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
    sql += ' GROUP BY s.id ORDER BY s.last_name, s.first_name';

    const [rows] = await pool.query(sql, params);
    const summary = rows.map(row => {
      const totalFee = parseFloat(row.expected_fee);
      const totalPaid = parseFloat(row.total_paid);
      return {
        student_id: row.student_id,
        student_name: `${row.first_name} ${row.last_name}`,
        class_name: row.class_name || '',
        total_fee: totalFee,
        total_paid: totalPaid,
        balance: totalFee - totalPaid,
        fee_note: row.fee_note,
        status: totalPaid >= totalFee ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      };
    });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fee summary' });
  }
});

// ============================================
// SETTINGS & PROFILE
// ============================================

router.get('/profile', async (req, res) => {
  try {
    const [madrasahs] = await pool.query(
      `SELECT id, name, slug, logo_url, street, city, region, country, phone, email,
       institution_type, verification_status, trial_ends_at, created_at,
       pricing_plan, subscription_status, current_period_end, stripe_customer_id,
       enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency
       FROM madrasahs WHERE id = ?`,
      [req.madrasahId]
    );
    if (madrasahs.length === 0) return res.status(404).json({ error: 'Madrasah not found' });

    const [[studentCount]] = await pool.query('SELECT COUNT(*) as count FROM students WHERE madrasah_id = ? AND deleted_at IS NULL', [req.madrasahId]);
    const [[classCount]] = await pool.query('SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL', [req.madrasahId]);

    res.json({ ...madrasahs[0], usage: { students: studentCount.count, teachers: 0, classes: classCount.count } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/settings', requireActiveSubscription, async (req, res) => {
  try {
    const { enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency } = req.body;

    const updates = [];
    const params = [];

    if (typeof enable_dressing_grade === 'boolean') { updates.push('enable_dressing_grade = ?'); params.push(enable_dressing_grade); }
    if (typeof enable_behavior_grade === 'boolean') { updates.push('enable_behavior_grade = ?'); params.push(enable_behavior_grade); }
    if (typeof enable_punctuality_grade === 'boolean') { updates.push('enable_punctuality_grade = ?'); params.push(enable_punctuality_grade); }
    if (typeof enable_quran_tracking === 'boolean') { updates.push('enable_quran_tracking = ?'); params.push(enable_quran_tracking); }
    if (typeof enable_fee_tracking === 'boolean') { updates.push('enable_fee_tracking = ?'); params.push(enable_fee_tracking); }
    if (typeof currency === 'string' && /^[A-Z]{3}$/.test(currency)) { updates.push('currency = ?'); params.push(currency); }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid settings provided' });

    params.push(req.madrasahId);
    await pool.query(`UPDATE madrasahs SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query(
      'SELECT enable_dressing_grade, enable_behavior_grade, enable_punctuality_grade, enable_quran_tracking, enable_fee_tracking, currency FROM madrasahs WHERE id = ?',
      [req.madrasahId]
    );
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
