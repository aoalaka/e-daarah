import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// GET /api/public/schools — List verified madrasahs (public directory)
router.get('/schools', async (req, res) => {
  try {
    const [madrasahs] = await pool.execute(`
      SELECT
        m.slug,
        m.name,
        m.city,
        m.region,
        m.country,
        m.institution_type,
        m.enable_quran_tracking,
        (SELECT COUNT(*) FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE c.madrasah_id = m.id AND s.deleted_at IS NULL) as student_count,
        (SELECT COUNT(*) FROM classes c
         WHERE c.madrasah_id = m.id AND c.deleted_at IS NULL) as class_count
      FROM madrasahs m
      WHERE m.is_active = TRUE
        AND m.verification_status = 'verified'
        AND m.pricing_plan != 'trial'
        AND m.slug NOT LIKE '%-demo'
      ORDER BY m.name ASC
    `);

    res.json(madrasahs);
  } catch (error) {
    console.error('Error fetching public schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// GET /api/public/schools/:slug — Single madrasah public profile
router.get('/schools/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [madrasahs] = await pool.execute(`
      SELECT
        m.slug,
        m.name,
        m.city,
        m.region,
        m.country,
        m.institution_type,
        m.enable_quran_tracking,
        m.enable_fee_tracking,
        m.created_at,
        (SELECT COUNT(*) FROM students s
         JOIN classes c ON s.class_id = c.id
         WHERE c.madrasah_id = m.id AND s.deleted_at IS NULL) as student_count,
        (SELECT COUNT(*) FROM classes c
         WHERE c.madrasah_id = m.id AND c.deleted_at IS NULL) as class_count,
        (SELECT COUNT(*) FROM users u
         WHERE u.madrasah_id = m.id AND u.role = 'teacher' AND u.is_active = TRUE) as teacher_count
      FROM madrasahs m
      WHERE m.slug = ?
        AND m.is_active = TRUE
        AND m.verification_status = 'verified'
        AND m.pricing_plan != 'trial'
        AND m.slug NOT LIKE '%-demo'
    `, [slug]);

    if (madrasahs.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(madrasahs[0]);
  } catch (error) {
    console.error('Error fetching school profile:', error);
    res.status(500).json({ error: 'Failed to fetch school profile' });
  }
});

// GET /api/public/schools-sitemap — Slugs for dynamic sitemap
router.get('/schools-sitemap', async (req, res) => {
  try {
    const [slugs] = await pool.execute(`
      SELECT slug FROM madrasahs
      WHERE is_active = TRUE
        AND verification_status = 'verified'
        AND pricing_plan != 'trial'
        AND slug NOT LIKE '%-demo'
      ORDER BY name ASC
    `);

    res.json(slugs.map(s => s.slug));
  } catch (error) {
    console.error('Error fetching schools sitemap:', error);
    res.status(500).json({ error: 'Failed to fetch sitemap data' });
  }
});

export default router;
