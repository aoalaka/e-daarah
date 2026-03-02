# Solo Routes - Exact Code Extraction

Complete SQL queries and route handler logic extracted from the codebase for `solo.routes.js` creation.

---

## ADMIN ROUTES (`/backend/src/routes/admin.routes.js`)

### 1. GET /classes - MISSING ENDPOINT
**Note:** There is NO GET /classes (list all classes) endpoint in admin.routes.js. Only POST, PUT, DELETE, and specific endpoints like GET /classes/:classId/teachers exist.

If needed, you must CREATE this endpoint. Suggested implementation:
```javascript
router.get('/classes', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const [classes] = await pool.query(
      'SELECT * FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL ORDER BY name ASC',
      [madrasahId]
    );
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});
```

---

### 2. POST /classes (Create Class)
**Lines 462-474**

```javascript
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
```

---

### 3. PUT /classes/:id (Update Class)
**Lines 477-501**

```javascript
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
```

---

### 4. DELETE /classes/:id (Delete Class)
**Lines 504-528**

```javascript
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
```

---

### 5. GET /students (List Students)
**Lines 730-745**

```javascript
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
```

---

### 6. POST /students (Create Student)
**Lines 748-798**

```javascript
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
```

---

### 7. PUT /students/:id (Update Student)
**Lines 848-906**

```javascript
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
```

---

### 8. DELETE /students/:id (Delete Student)
**Lines 946-958**

```javascript
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
```

---

### 9. GET /fee-summary (Fee Summary Per Student)
**Lines 2465-2505**

```javascript
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
```

---

### 10. GET /fee-payments (List Fee Payments)
**Lines 2391-2416**

```javascript
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
```

---

### 11. POST /fee-payments (Record Fee Payment)
**Lines 2419-2446**

```javascript
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
```

---

### 12. DELETE /fee-payments/:id (Void Fee Payment)
**Lines 2449-2462**

```javascript
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
```

---

### 13. PUT /students/:id/fee (Update Student Expected Fee)
**Lines 827-845**

```javascript
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
```

---

### 14. PUT /students/bulk-fee (Bulk Update Expected Fees)
**Lines 801-824**

```javascript
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
```

---

### 15. GET /profile (Madrasah Profile)
**Lines 2283-2327**

```javascript
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
```

---

### 16. PUT /settings (Update Madrasah Settings)
**Lines 2330-2384**

```javascript
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
```

---

## ATTENDANCE ROUTES (`/backend/src/routes/attendance.routes.js`)

### 17. POST / (Record Attendance)
**Lines 10-45**

```javascript
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
```

---

### 18. GET /class/:classId (Get Attendance for Class)
**Lines 86-115**

```javascript
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
```

---

## TEACHER ROUTES (`/backend/src/routes/teacher.routes.js`)

### 19. GET /quran/surahs (Get All Surahs)
**Lines 1384-1386**

```javascript
router.get('/quran/surahs', (req, res) => {
  res.json(SURAHS);
});
```

---

### 20. GET /quran/student/:studentId/position (Get Student Qur'an Position)
**Lines 1389-1429**

```javascript
router.get('/quran/student/:studentId/position', async (req, res) => {
  try {
    const { studentId } = req.params;
    const madrasahId = req.madrasahId;

    const [rows] = await pool.query(
      `SELECT * FROM quran_student_position WHERE student_id = ? AND madrasah_id = ?`,
      [studentId, madrasahId]
    );

    if (rows.length === 0) {
      return res.json({ isNew: true, hifz: null, tilawah: null, revision: null });
    }

    const pos = rows[0];
    res.json({
      isNew: false,
      hifz: pos.current_surah_number ? {
        surah_number: pos.current_surah_number,
        surah_name: pos.current_surah_name,
        juz: pos.current_juz,
        ayah: pos.current_ayah
      } : null,
      tilawah: pos.tilawah_surah_number ? {
        surah_number: pos.tilawah_surah_number,
        surah_name: pos.tilawah_surah_name,
        juz: pos.tilawah_juz,
        ayah: pos.tilawah_ayah
      } : null,
      revision: pos.revision_surah_number ? {
        surah_number: pos.revision_surah_number,
        surah_name: pos.revision_surah_name,
        juz: pos.revision_juz,
        ayah: pos.revision_ayah
      } : null
    });
  } catch (error) {
    console.error('Get student position error:', error);
    res.status(500).json({ error: 'Failed to fetch student position' });
  }
});
```

---

### 21. GET /quran/student/:studentId/history (Get Recent Qur'an History)
**Lines 1432-1453**

```javascript
router.get('/quran/student/:studentId/history', async (req, res) => {
  try {
    const { studentId } = req.params;
    const madrasahId = req.madrasahId;
    const limit = parseInt(req.query.limit) || 10;

    const [records] = await pool.query(
      `SELECT qp.*, s.first_name, s.last_name
       FROM quran_progress qp
       JOIN students s ON qp.student_id = s.id
       WHERE qp.student_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
       ORDER BY qp.date DESC, qp.created_at DESC
       LIMIT ?`,
      [studentId, madrasahId, limit]
    );

    res.json(records);
  } catch (error) {
    console.error('Get student quran history error:', error);
    res.status(500).json({ error: 'Failed to fetch student history' });
  }
});
```

---

### 22. GET /classes/:classId/quran-positions (Get Class Qur'an Positions)
**Lines 1456-1488**

```javascript
router.get('/classes/:classId/quran-positions', async (req, res) => {
  try {
    const { classId } = req.params;
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;

    // Verify teacher is assigned
    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

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
    console.error('Get quran positions error:', error);
    res.status(500).json({ error: 'Failed to fetch quran positions' });
  }
});
```

---

### 23. GET /classes/:classId/quran-progress (Get Class Qur'an Progress)
**Lines 1491-1531**

```javascript
router.get('/classes/:classId/quran-progress', async (req, res) => {
  try {
    const { classId } = req.params;
    const { semester_id, student_id } = req.query;
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;

    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [classId, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    let query = `
      SELECT qp.*, s.first_name, s.last_name, s.student_id as student_code
      FROM quran_progress qp
      JOIN students s ON qp.student_id = s.id
      WHERE qp.class_id = ? AND qp.madrasah_id = ? AND qp.deleted_at IS NULL
    `;
    const params = [classId, madrasahId];

    if (semester_id) {
      query += ' AND qp.semester_id = ?';
      params.push(semester_id);
    }
    if (student_id) {
      query += ' AND qp.student_id = ?';
      params.push(student_id);
    }

    query += ' ORDER BY qp.date DESC, qp.created_at DESC';

    const [records] = await pool.query(query, params);
    res.json(records);
  } catch (error) {
    console.error('Get quran progress error:', error);
    res.status(500).json({ error: 'Failed to fetch quran progress' });
  }
});
```

---

### 24. POST /quran/record (Record Qur'an Session)
**Lines 1535-1649**

```javascript
router.post('/quran/record', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const teacherId = req.user.id;
    const {
      student_id, class_id, semester_id, date,
      type,          // 'hifz', 'tilawah', or 'revision'
      surah_number, surah_name, juz,
      ayah_from, ayah_to,
      grade, passed, notes
    } = req.body;

    if (!student_id || !class_id || !semester_id || !date || !type || !surah_number || !surah_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate type
    if (!['hifz', 'tilawah', 'revision'].includes(type)) {
      return res.status(400).json({ error: 'Invalid session type. Must be hifdh, tilawah, or revision.' });
    }

    // Validate surah number
    const surah = SURAHS.find(s => s.n === parseInt(surah_number));
    if (!surah) {
      return res.status(400).json({ error: 'Invalid surah number' });
    }

    // Validate ayah range is required
    if (!ayah_from || !ayah_to) {
      return res.status(400).json({ error: 'Ayah From and Ayah To are required' });
    }

    const ayahFromInt = parseInt(ayah_from);
    const ayahToInt = parseInt(ayah_to);

    if (isNaN(ayahFromInt) || isNaN(ayahToInt) || ayahFromInt < 1 || ayahToInt < 1) {
      return res.status(400).json({ error: 'Ayah values must be positive numbers' });
    }

    if (ayahFromInt > surah.ayahs || ayahToInt > surah.ayahs) {
      return res.status(400).json({ error: `${surah.name} has ${surah.ayahs} ayahs. Values cannot exceed this.` });
    }

    if (ayahFromInt > ayahToInt) {
      return res.status(400).json({ error: 'Ayah From cannot be greater than Ayah To' });
    }

    // Validate date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(date) > today) {
      return res.status(400).json({ error: 'Date cannot be in the future' });
    }

    // Verify teacher is assigned to this class
    const [assignment] = await pool.query(
      'SELECT * FROM class_teachers WHERE class_id = ? AND user_id = ?',
      [class_id, teacherId]
    );
    if (assignment.length === 0) {
      return res.status(403).json({ error: 'Not assigned to this class' });
    }

    // Insert progress record
    const [result] = await pool.query(
      `INSERT INTO quran_progress (madrasah_id, student_id, class_id, semester_id, user_id, date, type, surah_number, surah_name, juz, ayah_from, ayah_to, grade, passed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, student_id, class_id, semester_id, teacherId, date, type, surah_number, surah_name, juz || surah.juz, ayahFromInt, ayahToInt, grade || 'Good', passed !== undefined ? passed : true, notes || null]
    );

    // Update student position if student passed
    if (passed !== false) {
      const posJuz = juz || surah.juz;
      if (type === 'hifz') {
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, current_surah_number, current_surah_name, current_juz, current_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            current_surah_number = VALUES(current_surah_number),
            current_surah_name = VALUES(current_surah_name),
            current_juz = VALUES(current_juz),
            current_ayah = VALUES(current_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      } else if (type === 'tilawah') {
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, tilawah_surah_number, tilawah_surah_name, tilawah_juz, tilawah_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            tilawah_surah_number = VALUES(tilawah_surah_number),
            tilawah_surah_name = VALUES(tilawah_surah_name),
            tilawah_juz = VALUES(tilawah_juz),
            tilawah_ayah = VALUES(tilawah_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      } else if (type === 'revision') {
        await pool.query(`
          INSERT INTO quran_student_position (madrasah_id, student_id, revision_surah_number, revision_surah_name, revision_juz, revision_ayah)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            revision_surah_number = VALUES(revision_surah_number),
            revision_surah_name = VALUES(revision_surah_name),
            revision_juz = VALUES(revision_juz),
            revision_ayah = VALUES(revision_ayah),
            last_updated = CURRENT_TIMESTAMP
        `, [madrasahId, student_id, surah_number, surah_name, posJuz, ayahToInt]);
      }
    }

    res.status(201).json({ id: result.insertId, message: passed !== false ? 'Passed — position updated' : 'Repeat — come back next time' });
  } catch (error) {
    console.error('Record quran progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});
```

---

### 25. DELETE /quran-progress/:id (Delete Qur'an Record)
**Lines 1652-1667**

```javascript
router.delete('/quran-progress/:id', requireActiveSubscription, async (req, res) => {
  try {
    const { id } = req.params;
    const madrasahId = req.madrasahId;

    await pool.query(
      'UPDATE quran_progress SET deleted_at = NOW() WHERE id = ? AND madrasah_id = ?',
      [id, madrasahId]
    );

    res.json({ message: 'Record deleted' });
  } catch (error) {
    console.error('Delete quran progress error:', error);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});
```

---

### 26. GET /classes/:classId/exam-performance (Get Exam Performance)
**Lines 826-874**

```javascript
router.get('/classes/:classId/exam-performance', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { semesterId, subject } = req.query;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let query = `
      SELECT ep.*, s.first_name, s.last_name, s.student_id,
             sem.name as semester_name, sess.name as session_name
      FROM exam_performance ep
      INNER JOIN students s ON ep.student_id = s.id
      LEFT JOIN semesters sem ON ep.semester_id = sem.id
      LEFT JOIN sessions sess ON sem.session_id = sess.id
      WHERE s.class_id = ? AND s.madrasah_id = ? AND ep.deleted_at IS NULL`;

    const params = [classId, madrasahId];

    if (semesterId) {
      query += ' AND ep.semester_id = ?';
      params.push(semesterId);
    }

    if (subject) {
      query += ' AND ep.subject = ?';
      params.push(subject);
    }

    query += ' ORDER BY ep.exam_date DESC, s.last_name';

    const [performance] = await pool.query(query, params);

    res.json(performance);
  } catch (error) {
    console.error('Fetch exam performance error:', error);
    res.status(500).json({ error: 'Failed to fetch exam performance' });
  }
});
```

---

### 27. POST /classes/:classId/exam-performance/bulk (Bulk Record Exam Performance)
**Lines 877-978**

```javascript
router.post('/classes/:classId/exam-performance/bulk', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId } = req.params;
    const { session_id, semester_id, subject, exam_date, max_score, students } = req.body;

    // Verify access
    const [access] = await pool.query(
      `SELECT ct.* FROM class_teachers ct
       INNER JOIN classes c ON ct.class_id = c.id
       WHERE ct.class_id = ? AND ct.user_id = ? AND c.madrasah_id = ?`,
      [classId, req.user.id, madrasahId]
    );

    if (access.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate required fields
    if (!session_id || !semester_id || !subject || !exam_date || !max_score || !students || !Array.isArray(students)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate max_score
    const maxScoreNum = parseFloat(max_score);
    if (isNaN(maxScoreNum) || maxScoreNum <= 0 || maxScoreNum > 1000) {
      return res.status(400).json({ error: 'Max score must be between 1 and 1000' });
    }

    // Validate exam_date (not in future)
    const examDate = new Date(exam_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (examDate > today) {
      return res.status(400).json({ error: 'Exam date cannot be in the future' });
    }

    // Validate students array
    if (students.length === 0) {
      return res.status(400).json({ error: 'At least one student is required' });
    }

    // Validate each student's data
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const { student_id, score, is_absent, absence_reason } = student;

      if (!student_id) {
        return res.status(400).json({ error: `Student ID missing for student at index ${i}` });
      }

      if (!is_absent) {
        // Validate score if student is not absent
        if (score === null || score === undefined || score === '') {
          return res.status(400).json({ error: `Score required for ${student.student_name || 'student ' + (i + 1)}` });
        }
        const scoreNum = parseFloat(score);
        if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScoreNum) {
          return res.status(400).json({ error: `Invalid score for ${student.student_name || 'student ' + (i + 1)}. Must be between 0 and ${maxScoreNum}` });
        }
      } else {
        // Validate absence_reason if student is absent
        if (!absence_reason) {
          return res.status(400).json({ error: `Absence reason required for ${student.student_name || 'student ' + (i + 1)}` });
        }
        const validReasons = ['Sick', 'Parent Request', 'School Not Notified', 'Other'];
        if (!validReasons.includes(absence_reason)) {
          return res.status(400).json({ error: `Invalid absence reason for ${student.student_name || 'student ' + (i + 1)}` });
        }
      }
    }

    // Insert exam records for all students
    for (const student of students) {
      const { student_id, score, is_absent, absence_reason, notes } = student;

      await pool.query(
        `INSERT INTO exam_performance
         (madrasah_id, student_id, semester_id, user_id, subject, exam_date, max_score, score, is_absent, absence_reason, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          madrasahId,
          student_id,
          semester_id,
          req.user.id,
          subject,
          exam_date,
          max_score,
          is_absent ? null : (score || 0),
          is_absent || false,
          is_absent ? absence_reason : null,
          notes || null
        ]
      );
    }

    res.json({ message: 'Exam performance recorded successfully for all students' });
  } catch (error) {
    console.error('Bulk exam performance error:', error);
    res.status(500).json({ error: 'Failed to record exam performance' });
  }
});
```

---

### 28. PUT /exam-performance/batch (Update Multiple Exam Records)
**Lines 981-1093**

```javascript
router.put('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids, semester_id, subject, exam_date, max_score } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const placeholders = record_ids.map(() => '?').join(',');
    const query = `SELECT id FROM exam_performance WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`;
    const params = [...record_ids, req.user.id, madrasahId];

    const [records] = await pool.query(query, params);

    if (records.length !== record_ids.length) {
      return res.status(403).json({ error: `Not authorized to edit some records. Found ${records.length} of ${record_ids.length} records.` });
    }

    // Validate inputs
    if (semester_id) {
      const [semester] = await pool.query(
        'SELECT id FROM semesters WHERE id = ? AND deleted_at IS NULL',
        [semester_id]
      );
      if (semester.length === 0) {
        return res.status(400).json({ error: 'Invalid semester' });
      }
    }

    if (max_score) {
      const maxScoreNum = parseFloat(max_score);
      if (isNaN(maxScoreNum) || maxScoreNum <= 0 || maxScoreNum > 1000) {
        return res.status(400).json({ error: 'Max score must be between 1 and 1000' });
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (semester_id) {
      updates.push('semester_id = ?');
      values.push(semester_id);
    }
    if (subject) {
      updates.push('subject = ?');
      values.push(subject);
    }
    if (exam_date) {
      updates.push('exam_date = ?');
      values.push(exam_date);
    }
    if (max_score) {
      updates.push('max_score = ?');
      values.push(max_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');

    // Build the update query with proper IN clause
    const updatePlaceholders = record_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE exam_performance SET ${updates.join(', ')} WHERE id IN (${updatePlaceholders})`,
      [...values, ...record_ids]
    );

    res.json({ message: 'Exam batch updated successfully' });
  } catch (error) {
    console.error('Update exam batch error:', error);
    res.status(500).json({ error: 'Failed to update exam batch' });
  }
});
```

---

### 29. DELETE /exam-performance/batch (Delete Multiple Exam Records)
**Lines 1096-1126**

```javascript
router.delete('/exam-performance/batch', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { record_ids } = req.body;

    if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
      return res.status(400).json({ error: 'Record IDs are required' });
    }

    // Verify all records belong to this teacher and madrasah
    const placeholders = record_ids.map(() => '?').join(',');
    const [records] = await pool.query(
      `SELECT id FROM exam_performance
       WHERE id IN (${placeholders}) AND user_id = ? AND madrasah_id = ?`,
      [...record_ids, req.user.id, madrasahId]
    );

    if (records.length !== record_ids.length) {
      return res.status(403).json({ error: 'Not authorized to delete some records' });
    }

    // Delete all records
    const deletePlaceholders = record_ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM exam_performance WHERE id IN (${deletePlaceholders})`, record_ids);

    res.json({ message: `${record_ids.length} exam records deleted successfully` });
  } catch (error) {
    console.error('Delete exam batch error:', error);
    res.status(500).json({ error: 'Failed to delete exam batch' });
  }
});
```

---

### 30. PUT /exam-performance/:id (Update Individual Exam Record)
**Lines 1129-1183**

```javascript
router.put('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;
    const { score, is_absent, absence_reason, notes } = req.body;

    // Verify access - teacher can only edit their own records in their madrasah
    const [record] = await pool.query(
      `SELECT ep.*, ep.max_score
       FROM exam_performance ep
       WHERE ep.id = ? AND ep.user_id = ? AND ep.madrasah_id = ?`,
      [id, req.user.id, madrasahId]
    );

    if (record.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this record' });
    }

    const maxScore = record[0].max_score;

    // Validate data
    if (!is_absent) {
      if (score === null || score === undefined || score === '') {
        return res.status(400).json({ error: 'Score is required when student is not absent' });
      }
      const scoreNum = parseFloat(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
        return res.status(400).json({ error: `Score must be between 0 and ${maxScore}` });
      }
    } else {
      if (!absence_reason) {
        return res.status(400).json({ error: 'Absence reason is required' });
      }
    }

    // Update record
    await pool.query(
      `UPDATE exam_performance
       SET score = ?, is_absent = ?, absence_reason = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        is_absent ? null : (score || 0),
        is_absent || false,
        is_absent ? absence_reason : null,
        notes || null,
        id
      ]
    );

    res.json({ message: 'Exam performance updated successfully' });
  } catch (error) {
    console.error('Update exam performance error:', error);
    res.status(500).json({ error: 'Failed to update exam performance' });
  }
});
```

---

### 31. DELETE /exam-performance/:id (Delete Individual Exam Record)
**Lines 1186-1211**

```javascript
router.delete('/exam-performance/:id', requireActiveSubscription, async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { id } = req.params;

    // Verify access - teacher can only delete their own records in their madrasah
    const [record] = await pool.query(
      `SELECT ep.id
       FROM exam_performance ep
       WHERE ep.id = ? AND ep.user_id = ? AND ep.madrasah_id = ?`,
      [id, req.user.id, madrasahId]
    );

    if (record.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this record' });
    }

    // Delete record
    await pool.query('DELETE FROM exam_performance WHERE id = ?', [id]);

    res.json({ message: 'Exam performance deleted successfully' });
  } catch (error) {
    console.error('Delete exam performance error:', error);
    res.status(500).json({ error: 'Failed to delete exam performance' });
  }
});
```

---

## KEY HELPER FUNCTIONS & IMPORTS

### From admin.routes.js (top of file)
```javascript
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
```

### From attendance.routes.js (top of file)
```javascript
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken, requireRole('teacher'));
```

### From teacher.routes.js (top of file)
```javascript
import express from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireActiveSubscription } from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// All routes require authentication and teacher role
router.use(authenticateToken, requireRole('teacher'));
```

---

## SESSIONS AND SEMESTERS ENDPOINTS

### GET /sessions (List Sessions)
**admin.routes.js, Lines 25-36**

```javascript
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
```

---

### GET /semesters (List Semesters)
**admin.routes.js, Lines 106-121**

```javascript
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
```

---

## NOTES

- All routes use **tenant isolation** via `madrasahId` extracted from the authenticated request
- Soft deletes are used throughout (e.g., `deleted_at IS NULL` checks)
- Database queries use **parameterized queries** to prevent SQL injection
- JSON fields like `school_days` are serialized/deserialized using `JSON.stringify()` and `JSON.parse()`
- Phone numbers are normalized using the `normalizePhone()` utility function
- Validation errors are caught and returned before database operations
- All error responses use appropriate HTTP status codes (400 for validation, 403 for authorization, 404 for not found, 500 for server errors)
