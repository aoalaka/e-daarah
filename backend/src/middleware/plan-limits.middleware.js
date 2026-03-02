import pool from '../config/database.js';

// Plan limits configuration
const PLAN_LIMITS = {
  trial: { maxStudents: 500, maxTeachers: 50, maxClasses: Infinity },
  solo: { maxStudents: 50, maxTeachers: 0, maxClasses: 5 },
  standard: { maxStudents: 100, maxTeachers: 20, maxClasses: 10 },
  plus: { maxStudents: 500, maxTeachers: 50, maxClasses: Infinity },
  enterprise: { maxStudents: Infinity, maxTeachers: Infinity, maxClasses: Infinity }
};

// Plus-only features (available on Plus, Enterprise, and active Trial)
const PLUS_FEATURES = [
  'csv_export',
  'excel_export',
  'pdf_reports',
  'bulk_upload',
  'advanced_reports',      // Attendance, Exam, Student Rankings, Individual report tabs
  'parent_access_codes',   // Parent portal access code generation
  'email_notifications'    // Email notifications (future)
];

// Enterprise-only features (Plus + these extras)
const ENTERPRISE_FEATURES = [
  'custom_integrations',
  'dedicated_account_manager',
  'sla_guarantee',
  'on_premise'
];

/**
 * Get madrasah subscription info and current usage
 */
const getMadrasahUsage = async (madrasahId) => {
  const [[madrasah]] = await pool.query(
    `SELECT pricing_plan, subscription_status, trial_ends_at
     FROM madrasahs WHERE id = ? AND deleted_at IS NULL`,
    [madrasahId]
  );

  if (!madrasah) {
    return null;
  }

  const [[studentCount]] = await pool.query(
    'SELECT COUNT(*) as count FROM students WHERE madrasah_id = ? AND deleted_at IS NULL',
    [madrasahId]
  );

  const [[teacherCount]] = await pool.query(
    'SELECT COUNT(*) as count FROM users WHERE madrasah_id = ? AND role = "teacher" AND deleted_at IS NULL',
    [madrasahId]
  );

  const [[classCount]] = await pool.query(
    'SELECT COUNT(*) as count FROM classes WHERE madrasah_id = ? AND deleted_at IS NULL',
    [madrasahId]
  );

  return {
    plan: madrasah.pricing_plan || 'trial',
    status: madrasah.subscription_status || 'trialing',
    trialEndsAt: madrasah.trial_ends_at,
    usage: {
      students: studentCount.count,
      teachers: teacherCount.count,
      classes: classCount.count
    }
  };
};

/**
 * Check if trial has expired
 */
const isTrialExpired = (trialEndsAt, status) => {
  if (status !== 'trialing') return false;
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
};

/**
 * Check if subscription is active (includes active trial)
 */
const isSubscriptionActive = (status, trialEndsAt) => {
  if (status === 'active') return true;
  if (status === 'trialing' && !isTrialExpired(trialEndsAt, status)) return true;
  return false;
};

/**
 * Middleware to check subscription status before allowing write operations
 * Blocks expired trials and canceled subscriptions
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const madrasahId = req.madrasahId;
    if (!madrasahId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const usage = await getMadrasahUsage(madrasahId);
    if (!usage) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    // Check if subscription is active
    if (!isSubscriptionActive(usage.status, usage.trialEndsAt)) {
      // Trial expired or subscription canceled
      if (usage.status === 'trialing' && isTrialExpired(usage.trialEndsAt, usage.status)) {
        return res.status(403).json({
          error: 'Trial expired',
          code: 'TRIAL_EXPIRED',
          message: 'Your trial has expired. Please subscribe to continue using e-Daarah.'
        });
      }

      if (usage.status === 'canceled' || usage.status === 'expired') {
        return res.status(403).json({
          error: 'Subscription inactive',
          code: 'SUBSCRIPTION_INACTIVE',
          message: 'Your subscription is no longer active. Please subscribe to continue.'
        });
      }

      if (usage.status === 'past_due') {
        return res.status(403).json({
          error: 'Payment past due',
          code: 'PAYMENT_PAST_DUE',
          message: 'Your payment is past due. Please update your payment method to continue.'
        });
      }
    }

    // Attach usage info to request for downstream use
    req.subscriptionInfo = usage;
    next();
  } catch (error) {
    console.error('[Plan Limits] Error checking subscription:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};

/**
 * Middleware to enforce student limit based on plan
 */
export const enforceStudentLimit = async (req, res, next) => {
  try {
    const madrasahId = req.madrasahId;
    const usage = req.subscriptionInfo || await getMadrasahUsage(madrasahId);

    if (!usage) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const limits = PLAN_LIMITS[usage.plan] || PLAN_LIMITS.trial;
    const addCount = req.body.students?.length || 1; // For bulk uploads

    if (usage.usage.students + addCount > limits.maxStudents) {
      return res.status(403).json({
        error: 'Student limit reached',
        code: 'STUDENT_LIMIT_REACHED',
        message: `Your ${usage.plan} plan allows up to ${limits.maxStudents} students. You currently have ${usage.usage.students}.`,
        current: usage.usage.students,
        limit: limits.maxStudents,
        plan: usage.plan
      });
    }

    next();
  } catch (error) {
    console.error('[Plan Limits] Error enforcing student limit:', error);
    res.status(500).json({ error: 'Failed to verify plan limits' });
  }
};

/**
 * Middleware to enforce teacher limit based on plan
 */
export const enforceTeacherLimit = async (req, res, next) => {
  try {
    const madrasahId = req.madrasahId;
    const usage = req.subscriptionInfo || await getMadrasahUsage(madrasahId);

    if (!usage) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const limits = PLAN_LIMITS[usage.plan] || PLAN_LIMITS.trial;

    if (usage.usage.teachers >= limits.maxTeachers) {
      return res.status(403).json({
        error: 'Teacher limit reached',
        code: 'TEACHER_LIMIT_REACHED',
        message: `Your ${usage.plan} plan allows up to ${limits.maxTeachers} teachers. You currently have ${usage.usage.teachers}.`,
        current: usage.usage.teachers,
        limit: limits.maxTeachers,
        plan: usage.plan
      });
    }

    next();
  } catch (error) {
    console.error('[Plan Limits] Error enforcing teacher limit:', error);
    res.status(500).json({ error: 'Failed to verify plan limits' });
  }
};

/**
 * Middleware to enforce class limit based on plan
 */
export const enforceClassLimit = async (req, res, next) => {
  try {
    const madrasahId = req.madrasahId;
    const usage = req.subscriptionInfo || await getMadrasahUsage(madrasahId);

    if (!usage) {
      return res.status(404).json({ error: 'Madrasah not found' });
    }

    const limits = PLAN_LIMITS[usage.plan] || PLAN_LIMITS.trial;

    if (usage.usage.classes >= limits.maxClasses) {
      return res.status(403).json({
        error: 'Class limit reached',
        code: 'CLASS_LIMIT_REACHED',
        message: `Your ${usage.plan} plan allows up to ${limits.maxClasses} classes. You currently have ${usage.usage.classes}.`,
        current: usage.usage.classes,
        limit: limits.maxClasses,
        plan: usage.plan
      });
    }

    next();
  } catch (error) {
    console.error('[Plan Limits] Error enforcing class limit:', error);
    res.status(500).json({ error: 'Failed to verify plan limits' });
  }
};

/**
 * Middleware to require Plus plan for certain features
 * Note: Trialing users get full Plus access during their trial period
 */
export const requirePlusPlan = (feature) => {
  return async (req, res, next) => {
    try {
      const madrasahId = req.madrasahId;
      const usage = req.subscriptionInfo || await getMadrasahUsage(madrasahId);

      if (!usage) {
        return res.status(404).json({ error: 'Madrasah not found' });
      }

      // Plus and enterprise have access to all features
      if (usage.plan === 'plus' || usage.plan === 'enterprise') {
        return next();
      }

      // Trialing users get full Plus access during their active trial
      if (usage.status === 'trialing' && !isTrialExpired(usage.trialEndsAt, usage.status)) {
        return next();
      }

      return res.status(403).json({
        error: 'Feature not available',
        code: 'UPGRADE_REQUIRED',
        message: `${feature} is available on the Plus plan. Please upgrade to access this feature.`,
        feature: feature,
        currentPlan: usage.plan,
        requiredPlan: 'plus'
      });
    } catch (error) {
      console.error('[Plan Limits] Error checking feature access:', error);
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
};

/**
 * Get plan limits for a given plan
 */
export const getPlanLimits = (plan) => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
};

export { PLAN_LIMITS, PLUS_FEATURES, ENTERPRISE_FEATURES };
