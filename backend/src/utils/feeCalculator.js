import pool from '../config/database.js';

/**
 * Calculate auto fees for all students in a madrasah (or filtered by class).
 * Shared by admin fee-auto-calculate endpoint and SMS fee-reminder-preview.
 * Returns array of { student_id, first_name, last_name, student_id_code, class_id, class_name,
 *   parent_guardian_phone, parent_guardian_name, student_phone, total_fee, total_paid, balance,
 *   status, billing_cycle, schedule_amount, fee_note }
 */
export async function calculateAutoFees(madrasahId, { classId = null, fromDate = null, toDate = null } = {}) {
  // Get madrasah settings
  const [madrasahRows] = await pool.query(
    'SELECT fee_tracking_mode, fee_prorate_mid_period FROM madrasahs WHERE id = ?',
    [madrasahId]
  );
  if (madrasahRows.length === 0 || madrasahRows[0].fee_tracking_mode !== 'auto') {
    return [];
  }
  const prorate = !!madrasahRows[0].fee_prorate_mid_period;

  // Resolve session: if period dates given, find the session containing those dates; else active session
  let session;
  if (fromDate) {
    const [dateSession] = await pool.query(
      'SELECT id, name, start_date, end_date FROM sessions WHERE madrasah_id = ? AND start_date <= ? AND end_date >= ? AND deleted_at IS NULL',
      [madrasahId, fromDate, fromDate]
    );
    session = dateSession[0];
  }
  if (!session) {
    const [activeSessions] = await pool.query(
      'SELECT id, name, start_date, end_date FROM sessions WHERE madrasah_id = ? AND is_active = 1 AND deleted_at IS NULL',
      [madrasahId]
    );
    session = activeSessions[0];
  }
  if (!session) return [];

  const [sessionSemesters] = await pool.query(
    'SELECT id, name, start_date, end_date FROM semesters WHERE session_id = ? AND deleted_at IS NULL ORDER BY start_date',
    [session.id]
  );

  // Get holidays for this session
  const [holidays] = await pool.query(
    'SELECT start_date, end_date FROM academic_holidays WHERE madrasah_id = ? AND session_id = ? AND deleted_at IS NULL',
    [madrasahId, session.id]
  );

  // Get all active fee schedules
  const [schedules] = await pool.query(
    'SELECT * FROM fee_schedules WHERE madrasah_id = ? AND is_active = 1',
    [madrasahId]
  );
  if (schedules.length === 0) return [];

  // Get students with enrollment dates + contact info
  let studentSql = `SELECT s.id, s.first_name, s.last_name, s.student_id as student_id_code,
     s.class_id, s.enrollment_date, s.expected_fee, s.fee_note,
     s.parent_guardian_phone, s.parent_guardian_phone_country_code,
     s.parent_guardian_name, s.student_phone, s.student_phone_country_code,
     c.name as class_name, c.school_days
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.madrasah_id = ? AND s.deleted_at IS NULL AND s.class_id IS NOT NULL`;
  const studentParams = [madrasahId];
  if (classId) { studentSql += ' AND s.class_id = ?'; studentParams.push(classId); }
  studentSql += ' ORDER BY s.last_name, s.first_name';

  const [students] = await pool.query(studentSql, studentParams);

  // Get payments for all these students
  const studentIds = students.map(s => s.id);
  let paymentsMap = {};
  if (studentIds.length > 0) {
    const placeholders = studentIds.map(() => '?').join(',');
    let paymentSql = `SELECT student_id, COALESCE(SUM(amount_paid), 0) as total_paid
       FROM fee_payments WHERE madrasah_id = ? AND student_id IN (${placeholders}) AND deleted_at IS NULL`;
    const paymentParams = [madrasahId, ...studentIds];
    if (fromDate) { paymentSql += ' AND payment_date >= ?'; paymentParams.push(fromDate); }
    if (toDate) { paymentSql += ' AND payment_date <= ?'; paymentParams.push(toDate); }
    paymentSql += ' GROUP BY student_id';
    const [payments] = await pool.query(paymentSql, paymentParams);
    payments.forEach(p => { paymentsMap[p.student_id] = parseFloat(p.total_paid); });
  }

  // Helper: count school days in a date range for a class (excluding holidays)
  const countSchoolDays = (startDate, endDate, schoolDaysJson) => {
    let schoolDays;
    try { schoolDays = typeof schoolDaysJson === 'string' ? JSON.parse(schoolDaysJson) : schoolDaysJson; }
    catch { schoolDays = []; }
    if (!schoolDays || schoolDays.length === 0) return 0;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const schoolDayIndices = new Set(schoolDays.map(d => dayNames.indexOf(d)).filter(i => i >= 0));

    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (!schoolDayIndices.has(d.getDay())) continue;
      const dateStr = d.toISOString().split('T')[0];
      const isHoliday = holidays.some(h => {
        const hStart = new Date(h.start_date).toISOString().split('T')[0];
        const hEnd = new Date(h.end_date).toISOString().split('T')[0];
        return dateStr >= hStart && dateStr <= hEnd;
      });
      if (!isHoliday) count++;
    }
    return count;
  };

  // Effective period for fee calculation (scoped by fromDate/toDate if provided, capped at today)
  const today = new Date().toISOString().split('T')[0];
  const periodCalcStart = fromDate && new Date(fromDate) > new Date(session.start_date) ? fromDate : session.start_date;
  let periodCalcEndRaw = toDate && new Date(toDate) < new Date(session.end_date) ? toDate : session.end_date;
  // Never calculate fees beyond today — future periods haven't occurred yet
  const periodCalcEnd = new Date(periodCalcEndRaw) > new Date(today) ? today : periodCalcEndRaw;

  // Calculate fee for each student
  return students.map(student => {
    const studentSchedule = schedules.find(s => s.student_id === student.id);
    const classSchedule = schedules.find(s => s.class_id === student.class_id && !s.student_id);
    const defaultSchedule = schedules.find(s => !s.class_id && !s.student_id);
    const schedule = studentSchedule || classSchedule || defaultSchedule;

    if (!schedule) {
      return {
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        student_id_code: student.student_id_code,
        class_id: student.class_id,
        class_name: student.class_name || '',
        parent_guardian_phone: student.parent_guardian_phone,
        parent_guardian_name: student.parent_guardian_name,
        student_phone: student.student_phone,
        total_fee: 0,
        total_paid: paymentsMap[student.id] || 0,
        balance: -(paymentsMap[student.id] || 0),
        fee_note: 'No fee schedule',
        status: 'no_schedule',
        billing_cycle: null,
        schedule_amount: 0
      };
    }

    const amount = parseFloat(schedule.amount);
    let totalFee = 0;
    // enrollment_date reflects when students were imported into the platform, not their
    // actual school start date. Disable enrollment-based fee skipping entirely — all
    // current students are charged for the full period being viewed.
    const enrollDate = null;

    switch (schedule.billing_cycle) {
      case 'per_session': {
        if (fromDate || toDate) {
          // Period-scoped: prorate session fee to visible period
          const totalDays = countSchoolDays(session.start_date, session.end_date, student.school_days);
          const effectiveStart = (prorate && enrollDate && enrollDate > new Date(periodCalcStart)) ? enrollDate : new Date(periodCalcStart);
          const periodDays = countSchoolDays(effectiveStart, periodCalcEnd, student.school_days);
          totalFee = totalDays > 0 ? Math.round((amount * periodDays / totalDays) * 100) / 100 : amount;
        } else if (prorate && enrollDate && enrollDate > new Date(session.start_date)) {
          const totalDays = countSchoolDays(session.start_date, session.end_date, student.school_days);
          const remainingDays = countSchoolDays(enrollDate, session.end_date, student.school_days);
          totalFee = totalDays > 0 ? Math.round((amount * remainingDays / totalDays) * 100) / 100 : amount;
        } else {
          totalFee = amount;
        }
        break;
      }
      case 'per_semester': {
        const relevantSemesters = (fromDate || toDate)
          ? sessionSemesters.filter(sem => new Date(sem.start_date) <= new Date(periodCalcEnd) && new Date(sem.end_date) >= new Date(periodCalcStart))
          : sessionSemesters;
        for (const sem of relevantSemesters) {
          if (prorate && enrollDate && enrollDate > new Date(sem.start_date)) {
            if (enrollDate > new Date(sem.end_date)) continue;
            const totalDays = countSchoolDays(sem.start_date, sem.end_date, student.school_days);
            const remainingDays = countSchoolDays(enrollDate, sem.end_date, student.school_days);
            totalFee += totalDays > 0 ? Math.round((amount * remainingDays / totalDays) * 100) / 100 : amount;
          } else {
            if (!enrollDate || enrollDate <= new Date(sem.end_date)) {
              totalFee += amount;
            }
          }
        }
        break;
      }
      case 'monthly': {
        const periodStart = new Date(periodCalcStart);
        const periodEnd = new Date(periodCalcEnd);
        let current = new Date(periodStart);

        while (current <= periodEnd) {
          const monthStart = new Date(current);
          const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          const effectiveEnd = monthEnd > periodEnd ? periodEnd : monthEnd;

          if (enrollDate && enrollDate > effectiveEnd) {
            current.setMonth(current.getMonth() + 1, 1);
            continue;
          }
          if (prorate && enrollDate && enrollDate > monthStart) {
            const totalDays = countSchoolDays(monthStart, effectiveEnd, student.school_days);
            const remainingDays = countSchoolDays(enrollDate, effectiveEnd, student.school_days);
            totalFee += totalDays > 0 ? Math.round((amount * remainingDays / totalDays) * 100) / 100 : amount;
          } else {
            totalFee += amount;
          }
          current.setMonth(current.getMonth() + 1, 1);
        }
        break;
      }
      case 'weekly': {
        const periodStart = new Date(periodCalcStart);
        const periodEnd = new Date(periodCalcEnd);
        let weekStart = new Date(periodStart);

        while (weekStart <= periodEnd) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const effectiveEnd = weekEnd > periodEnd ? periodEnd : weekEnd;

          if (enrollDate && enrollDate > effectiveEnd) {
            weekStart.setDate(weekStart.getDate() + 7);
            continue;
          }
          if (prorate && enrollDate && enrollDate > weekStart) {
            const totalDays = countSchoolDays(weekStart, effectiveEnd, student.school_days);
            const remainingDays = countSchoolDays(enrollDate, effectiveEnd, student.school_days);
            totalFee += totalDays > 0 ? Math.round((amount * remainingDays / totalDays) * 100) / 100 : amount;
          } else {
            totalFee += amount;
          }
          weekStart.setDate(weekStart.getDate() + 7);
        }
        break;
      }
    }

    totalFee = Math.round(totalFee * 100) / 100;
    const totalPaid = paymentsMap[student.id] || 0;
    const balance = totalFee - totalPaid;

    return {
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      student_id_code: student.student_id_code,
      class_id: student.class_id,
      class_name: student.class_name || '',
      parent_guardian_phone: student.parent_guardian_phone,
      parent_guardian_phone_country_code: student.parent_guardian_phone_country_code,
      parent_guardian_name: student.parent_guardian_name,
      student_phone: student.student_phone,
      student_phone_country_code: student.student_phone_country_code,
      total_fee: totalFee,
      total_paid: totalPaid,
      balance,
      fee_note: schedule.description || `${schedule.billing_cycle} @ ${amount}`,
      status: totalPaid >= totalFee ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
      billing_cycle: schedule.billing_cycle,
      schedule_amount: amount
    };
  });
}
