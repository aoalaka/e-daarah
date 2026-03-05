import express from 'express';
import Stripe from 'stripe';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireActiveSubscription } from '../middleware/plan-limits.middleware.js';
import { sendSMS, formatPhoneNumber, calculateCredits, isSmsConfigured } from '../services/sms.service.js';
import { sendSmsFailureAlert } from '../services/email.service.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// All routes require authentication + active subscription
router.use(authenticateToken, requireRole('admin'), requireActiveSubscription);

// SMS Credit Packs
const SMS_PACKS = [
  { id: 'sms_50', credits: 50, price_cents: 300, label: '50 SMS', description: '$3.00' },
  { id: 'sms_200', credits: 200, price_cents: 1000, label: '200 SMS', description: '$10.00' },
  { id: 'sms_500', credits: 500, price_cents: 2000, label: '500 SMS', description: '$20.00' },
  { id: 'sms_1000', credits: 1000, price_cents: 3500, label: '1000 SMS', description: '$35.00' },
];

const SMS_PACKS_NZD = [
  { id: 'sms_50_nzd', credits: 50, price_cents: 500, label: '50 SMS', description: 'NZ$5.00' },
  { id: 'sms_200_nzd', credits: 200, price_cents: 1700, label: '200 SMS', description: 'NZ$17.00' },
  { id: 'sms_500_nzd', credits: 500, price_cents: 3500, label: '500 SMS', description: 'NZ$35.00' },
  { id: 'sms_1000_nzd', credits: 1000, price_cents: 5900, label: '1000 SMS', description: 'NZ$59.00' },
];

// ─── GET /sms/status — Credit balance + config ──────────────────
router.get('/status', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [credits] = await pool.query(
      'SELECT balance, total_purchased, total_used FROM sms_credits WHERE madrasah_id = ?',
      [madrasahId]
    );

    const [recentMessages] = await pool.query(
      'SELECT COUNT(*) as sent_this_month FROM sms_messages WHERE madrasah_id = ? AND created_at >= DATE_FORMAT(NOW(), "%Y-%m-01")',
      [madrasahId]
    );

    // Return currency-appropriate packs
    const [madrasah] = await pool.query('SELECT currency FROM madrasahs WHERE id = ?', [madrasahId]);
    const isNZD = (madrasah[0]?.currency || 'USD').toUpperCase() === 'NZD';

    res.json({
      balance: credits[0]?.balance || 0,
      totalPurchased: credits[0]?.total_purchased || 0,
      totalUsed: credits[0]?.total_used || 0,
      sentThisMonth: recentMessages[0].sent_this_month,
      smsConfigured: isSmsConfigured(),
      packs: isNZD ? SMS_PACKS_NZD : SMS_PACKS,
      currency: isNZD ? 'NZD' : 'USD'
    });
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({ error: 'Failed to get SMS status' });
  }
});

// ─── POST /sms/purchase — Create Stripe checkout for SMS credits ─
router.post('/purchase', async (req, res) => {
  try {
    const { packId } = req.body;
    const madrasahId = req.madrasahId;

    // Find pack from either USD or NZD list
    let pack = SMS_PACKS.find(p => p.id === packId) || SMS_PACKS_NZD.find(p => p.id === packId);
    if (!pack) {
      return res.status(400).json({ error: 'Invalid SMS pack' });
    }

    // Get or create Stripe customer
    const [madrasah] = await pool.query(
      'SELECT id, name, email, stripe_customer_id, currency FROM madrasahs WHERE id = ?',
      [madrasahId]
    );

    if (madrasah.length === 0) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    let customerId = madrasah[0].stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: madrasah[0].email,
        name: madrasah[0].name,
        metadata: { madrasah_id: madrasahId.toString() }
      });
      customerId = customer.id;
      await pool.query('UPDATE madrasahs SET stripe_customer_id = ? WHERE id = ?', [customerId, madrasahId]);
    }

    // Determine currency from madrasah settings
    const isNZD = (madrasah[0].currency || 'USD').toUpperCase() === 'NZD';
    const currency = isNZD ? 'nzd' : 'usd';

    // Build checkout session params
    const sessionParams = {
      customer: customerId,
      ...(isNZD ? { payment_method_types: ['card', 'nz_bank_account'] } : {}),
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: `SMS Credits — ${pack.label}`,
            description: `${pack.credits} SMS messages for fee reminders and notifications`
          },
          unit_amount: pack.price_cents
        },
        quantity: 1
      }],
      metadata: {
        madrasah_id: madrasahId.toString(),
        pack_id: pack.id,
        credits: pack.credits.toString(),
        type: 'sms_credit_purchase'
      },
      success_url: `${process.env.FRONTEND_URL || process.env.CORS_ORIGIN}/dashboard?tab=sms&purchase=success`,
      cancel_url: `${process.env.FRONTEND_URL || process.env.CORS_ORIGIN}/dashboard?tab=sms&purchase=cancelled`
    };

    // Create one-time checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    // Record pending purchase
    await pool.query(
      `INSERT INTO sms_credit_purchases (madrasah_id, credits, amount_cents, currency, stripe_checkout_session_id, status, purchased_by)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [madrasahId, pack.credits, pack.price_cents, currency, session.id, req.user.id]
    );

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('SMS purchase error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// ─── POST /sms/send — Send SMS to individual recipient ──────────
router.post('/send', async (req, res) => {
  try {
    const { studentId, phone, message, messageType = 'custom' } = req.body;
    const madrasahId = req.madrasahId;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    if (message.length > 1600) {
      return res.status(400).json({ error: 'Message is too long (max 1600 characters)' });
    }

    // Get madrasah name for message personalization
    const [madrasahRows] = await pool.query(
      'SELECT name FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const madrasahName = madrasahRows[0]?.name || '';

    // Replace {madrasah_name} in message
    const finalMessage = message.replace(/\{madrasah_name\}/gi, madrasahName);

    // Check credit balance
    const [credits] = await pool.query(
      'SELECT balance FROM sms_credits WHERE madrasah_id = ?',
      [madrasahId]
    );

    const creditsNeeded = calculateCredits(message);
    const currentBalance = credits[0]?.balance || 0;

    if (currentBalance < creditsNeeded) {
      return res.status(400).json({
        error: 'Insufficient SMS credits',
        balance: currentBalance,
        needed: creditsNeeded
      });
    }

    // Get country code if sending to a student
    let countryCode = '';
    if (studentId) {
      const [student] = await pool.query(
        'SELECT parent_guardian_phone_country_code FROM students WHERE id = ? AND madrasah_id = ?',
        [studentId, madrasahId]
      );
      if (student[0]?.parent_guardian_phone_country_code) {
        countryCode = student[0].parent_guardian_phone_country_code;
      }
    }

    const formattedPhone = formatPhoneNumber(phone, countryCode);

    // Send via Twilio
    let smsResult;
    try {
      smsResult = await sendSMS(formattedPhone, finalMessage);
    } catch (smsError) {
      // Log the failed message
      await pool.query(
        `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, error_message, credits_used, sent_by)
         VALUES (?, ?, ?, ?, ?, 'failed', ?, 0, ?)`,
        [madrasahId, studentId || null, formattedPhone, finalMessage, messageType, smsError.message, req.user.id]
      );

      // Alert platform admin
      sendSmsFailureAlert(madrasahName || 'Unknown', 1, 1, [
        { student: studentId ? `Student #${studentId}` : phone, error: smsError.message }
      ]).catch(err => console.error('Failed to send SMS failure alert email:', err));

      return res.status(500).json({ error: `SMS failed: ${smsError.message}` });
    }

    // Deduct credits
    await pool.query(
      `UPDATE sms_credits SET balance = balance - ?, total_used = total_used + ? WHERE madrasah_id = ?`,
      [creditsNeeded, creditsNeeded, madrasahId]
    );

    // Log the message
    await pool.query(
      `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, provider_message_id, credits_used, sent_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [madrasahId, studentId || null, formattedPhone, finalMessage, messageType, smsResult.status, smsResult.sid, creditsNeeded, req.user.id]
    );

    res.json({
      success: true,
      sid: smsResult.sid,
      status: smsResult.status,
      creditsUsed: creditsNeeded,
      balanceRemaining: currentBalance - creditsNeeded
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// ─── POST /sms/send-bulk — Send fee reminders to multiple students ─
router.post('/send-bulk', async (req, res) => {
  try {
    const { studentIds, message, messageType = 'fee_reminder', sendTo = 'parent' } = req.body;
    const madrasahId = req.madrasahId;

    if (!studentIds?.length || !message) {
      return res.status(400).json({ error: 'Student IDs and message are required' });
    }

    if (message.length > 1600) {
      return res.status(400).json({ error: 'Message is too long (max 1600 characters)' });
    }

    // Get madrasah name for message personalization
    const [madrasahRows] = await pool.query(
      'SELECT name FROM madrasahs WHERE id = ?',
      [madrasahId]
    );
    const madrasahName = madrasahRows[0]?.name || '';

    // Get students with phone numbers
    const [students] = await pool.query(
      `SELECT id, first_name, last_name, parent_guardian_phone, parent_guardian_phone_country_code,
              student_phone, student_phone_country_code, expected_fee
       FROM students
       WHERE id IN (?) AND madrasah_id = ? AND deleted_at IS NULL`,
      [studentIds, madrasahId]
    );

    // Filter to students with phone numbers based on sendTo target
    const getPhone = (s) => sendTo === 'student' ? s.student_phone : s.parent_guardian_phone;
    const getCountryCode = (s) => sendTo === 'student' ? (s.student_phone_country_code || '') : (s.parent_guardian_phone_country_code || '');
    const sendable = students.filter(s => getPhone(s));
    const noPhone = students.filter(s => !getPhone(s));
    const targetLabel = sendTo === 'student' ? 'student' : 'parent';

    if (sendable.length === 0) {
      return res.status(400).json({ error: `None of the selected students have a ${targetLabel} phone number` });
    }

    // Check credits
    const creditsNeeded = sendable.length;
    const [credits] = await pool.query(
      'SELECT balance FROM sms_credits WHERE madrasah_id = ?',
      [madrasahId]
    );
    const currentBalance = credits[0]?.balance || 0;

    if (currentBalance < creditsNeeded) {
      return res.status(400).json({
        error: `Insufficient credits. Need ${creditsNeeded}, have ${currentBalance}.`,
        balance: currentBalance,
        needed: creditsNeeded
      });
    }

    // Send messages
    const results = { sent: 0, failed: 0, skipped: noPhone.length, errors: [] };

    for (const student of sendable) {
      const formattedPhone = formatPhoneNumber(
        getPhone(student),
        getCountryCode(student)
      );

      // Personalize message with student name and madrasah name
      const personalizedMsg = message
        .replace(/\{student_name\}/gi, `${student.first_name} ${student.last_name}`)
        .replace(/\{first_name\}/gi, student.first_name)
        .replace(/\{last_name\}/gi, student.last_name)
        .replace(/\{expected_fee\}/gi, student.expected_fee ? `$${Number(student.expected_fee).toFixed(2)}` : 'N/A')
        .replace(/\{madrasah_name\}/gi, madrasahName);

      try {
        const smsResult = await sendSMS(formattedPhone, personalizedMsg);

        await pool.query(
          `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, provider_message_id, credits_used, sent_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [madrasahId, student.id, formattedPhone, personalizedMsg, messageType, smsResult.status, smsResult.sid, req.user.id]
        );

        results.sent++;
      } catch (smsError) {
        await pool.query(
          `INSERT INTO sms_messages (madrasah_id, student_id, to_phone, message_body, message_type, status, error_message, credits_used, sent_by)
           VALUES (?, ?, ?, ?, ?, 'failed', ?, 0, ?)`,
          [madrasahId, student.id, formattedPhone, personalizedMsg, messageType, smsError.message, req.user.id]
        );
        results.failed++;
        results.errors.push({ student: `${student.first_name} ${student.last_name}`, error: smsError.message });
      }
    }

    // Deduct credits (only for sent messages)
    if (results.sent > 0) {
      await pool.query(
        `UPDATE sms_credits SET balance = balance - ?, total_used = total_used + ? WHERE madrasah_id = ?`,
        [results.sent, results.sent, madrasahId]
      );
    }

    // Alert platform admin if there were failures
    if (results.failed > 0) {
      sendSmsFailureAlert(madrasahName || 'Unknown', results.failed, sendable.length, results.errors)
        .catch(err => console.error('Failed to send SMS failure alert email:', err));
    }

    res.json({
      success: true,
      ...results,
      balanceRemaining: currentBalance - results.sent
    });
  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.status(500).json({ error: 'Failed to send bulk SMS' });
  }
});

// ─── GET /sms/history — Message log with pagination ──────────────
router.get('/history', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { page = 1, limit = 25, type, status } = req.query;
    const offset = (page - 1) * limit;

    let where = 'sm.madrasah_id = ?';
    const params = [madrasahId];

    if (type) {
      where += ' AND sm.message_type = ?';
      params.push(type);
    }
    if (status) {
      where += ' AND sm.status = ?';
      params.push(status);
    }

    const [messages] = await pool.query(
      `SELECT sm.*, s.first_name, s.last_name, s.student_id as student_code
       FROM sms_messages sm
       LEFT JOIN students s ON sm.student_id = s.id
       WHERE ${where}
       ORDER BY sm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM sms_messages sm WHERE ${where}`,
      params
    );

    res.json({
      messages,
      total: countResult[0].total,
      page: parseInt(page),
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error('SMS history error:', error);
    res.status(500).json({ error: 'Failed to get SMS history' });
  }
});

// ─── GET /sms/purchases — Credit purchase history ────────────────
router.get('/purchases', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;

    const [purchases] = await pool.query(
      `SELECT * FROM sms_credit_purchases WHERE madrasah_id = ? AND status != 'pending' ORDER BY created_at DESC LIMIT 50`,
      [madrasahId]
    );

    res.json({ purchases });
  } catch (error) {
    console.error('SMS purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchase history' });
  }
});

// ─── GET /sms/fee-reminder-preview — Preview fee reminder for students with balance ─
router.get('/fee-reminder-preview', async (req, res) => {
  try {
    const madrasahId = req.madrasahId;
    const { classId, sendTo = 'parent' } = req.query;

    // Build phone filter based on target
    const phoneCol = sendTo === 'student' ? 's.student_phone' : 's.parent_guardian_phone';
    let where = `s.madrasah_id = ? AND s.deleted_at IS NULL AND s.expected_fee > 0 AND ${phoneCol} IS NOT NULL`;
    const params = [madrasahId];

    if (classId) {
      where += ' AND s.class_id = ?';
      params.push(classId);
    }

    const [students] = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.student_id, s.parent_guardian_phone,
              s.parent_guardian_name, s.student_phone, s.expected_fee, s.class_id, c.name as class_name,
              COALESCE((SELECT SUM(fp.amount_paid) FROM fee_payments fp WHERE fp.student_id = s.id AND fp.deleted_at IS NULL), 0) as total_paid
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE ${where}
       HAVING (s.expected_fee - total_paid) > 0
       ORDER BY s.first_name, s.last_name`,
      params
    );

    const enriched = students.map(s => ({
      ...s,
      balance: Number(s.expected_fee) - Number(s.total_paid),
      status: Number(s.total_paid) >= Number(s.expected_fee) ? 'paid' : Number(s.total_paid) > 0 ? 'partial' : 'unpaid'
    }));

    res.json({ students: enriched });
  } catch (error) {
    console.error('Fee reminder preview error:', error);
    res.status(500).json({ error: 'Failed to get fee reminder preview' });
  }
});

export default router;
