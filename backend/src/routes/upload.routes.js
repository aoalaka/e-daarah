import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import { createReadStream } from 'fs';
import csvParser from 'csv-parser';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireActiveSubscription, requirePlusPlan, enforceStudentLimit } from '../middleware/plan-limits.middleware.js';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes require authentication and admin role
router.use(authenticateToken, requireRole('admin'));

// Generate a unique 3-digit student ID within a madrasah
async function generateStudentId(madrasahId) {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const studentId = Math.floor(100 + Math.random() * 900).toString();
    const [existing] = await pool.query(
      'SELECT id FROM students WHERE madrasah_id = ? AND student_id = ?',
      [madrasahId, studentId]
    );

    if (existing.length === 0) {
      return studentId;
    }
    attempts++;
  }

  throw new Error('Unable to generate unique student ID');
}

// Validate student data
function validateStudentData(row, rowIndex) {
  const errors = [];

  if (!row.first_name || row.first_name.trim() === '') {
    errors.push(`Row ${rowIndex}: First name is required`);
  }

  if (!row.last_name || row.last_name.trim() === '') {
    errors.push(`Row ${rowIndex}: Last name is required`);
  }

  if (!row.gender || !['Male', 'Female'].includes(row.gender)) {
    errors.push(`Row ${rowIndex}: Gender is required and must be either 'Male' or 'Female'`);
  }

  return errors;
}

// Parse CSV file
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Parse Excel file
function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(worksheet);
}

// Bulk upload students (scoped to madrasah) - Plus plan only
router.post('/students/bulk', requireActiveSubscription, requirePlusPlan('Bulk student upload'), upload.single('file'), async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { class_id } = req.body;

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

    let students = [];

    // Parse file based on type
    if (req.file.mimetype === 'text/csv') {
      students = await parseCSV(req.file.path);
    } else {
      students = parseExcel(req.file.path);
    }

    if (students.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    // Validate all rows first
    const validationErrors = [];
    students.forEach((student, index) => {
      const errors = validateStudentData(student, index + 2); // +2 for header row
      validationErrors.push(...errors);
    });

    if (validationErrors.length > 0) {
      console.error('Bulk upload validation errors:', validationErrors);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Insert students
    const results = {
      success: [],
      failed: []
    };

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        const studentId = await generateStudentId(madrasahId);

        await pool.query(
          `INSERT INTO students (
            madrasah_id, first_name, last_name, student_id, gender, email, phone, class_id,
            next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            madrasahId,
            student.first_name.trim(),
            student.last_name.trim(),
            studentId,
            student.gender.trim(),
            student.email?.trim() || null,
            student.phone?.trim() || null,
            class_id || null,
            student.next_of_kin_name?.trim() || null,
            student.next_of_kin_relationship?.trim() || null,
            student.next_of_kin_phone?.trim() || null,
            student.notes?.trim() || null
          ]
        );

        results.success.push({
          name: `${student.first_name} ${student.last_name}`,
          student_id: studentId
        });
      } catch (error) {
        results.failed.push({
          name: `${student.first_name} ${student.last_name}`,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk upload completed',
      total: students.length,
      successful: results.success.length,
      failed: results.failed.length,
      results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process bulk upload', details: error.message });
  }
});

// Download CSV template
router.get('/students/template', (req, res) => {
  const template = `first_name,last_name,gender,email,phone,next_of_kin_name,next_of_kin_relationship,next_of_kin_phone,notes
John,Doe,Male,john.doe@example.com,1234567890,Jane Doe,Mother,0987654321,Good student
Mary,Smith,Female,mary.smith@example.com,2345678901,Bob Smith,Father,8765432109,Needs extra support`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=student_upload_template.csv');
  res.send(template);
});

export default router;
