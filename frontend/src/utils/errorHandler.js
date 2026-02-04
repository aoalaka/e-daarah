import { toast } from 'sonner';

/**
 * Error codes that require special handling
 */
const PLAN_ERROR_CODES = [
  'STUDENT_LIMIT_REACHED',
  'TEACHER_LIMIT_REACHED',
  'CLASS_LIMIT_REACHED',
  'TRIAL_EXPIRED',
  'SUBSCRIPTION_INACTIVE',
  'PAYMENT_PAST_DUE',
  'UPGRADE_REQUIRED'
];

/**
 * Security-related error codes
 */
const SECURITY_ERROR_CODES = [
  'ACCOUNT_LOCKED',
  'SESSION_TIMEOUT'
];

/**
 * Handle API errors with special handling for plan limit errors
 * @param {Error} error - The error from axios
 * @param {string} fallbackMessage - Default message if no specific error
 * @param {Function} onUpgradeClick - Callback when user clicks upgrade
 * @returns {Object} - { handled: boolean, code: string|null }
 */
export function handleApiError(error, fallbackMessage = 'An error occurred', onUpgradeClick = null) {
  const data = error.response?.data;
  const code = data?.code;
  const message = data?.message || data?.error || fallbackMessage;

  // Check if this is a security-related error
  if (code && SECURITY_ERROR_CODES.includes(code)) {
    toast.error(message, {
      duration: 10000
    });
    return { handled: true, code, isSecurityError: true };
  }

  // Check if this is a plan-related error
  if (code && PLAN_ERROR_CODES.includes(code)) {
    // Show a more detailed toast with action
    toast.error(message, {
      duration: 8000,
      action: onUpgradeClick ? {
        label: 'Upgrade',
        onClick: onUpgradeClick
      } : undefined
    });

    return { handled: true, code };
  }

  // Regular error
  toast.error(message);
  return { handled: false, code: null };
}

/**
 * Check if an error is a plan limit error
 * @param {Error} error - The error from axios
 * @returns {boolean}
 */
export function isPlanLimitError(error) {
  const code = error.response?.data?.code;
  return code && PLAN_ERROR_CODES.includes(code);
}

/**
 * Get a user-friendly message for plan errors
 * @param {string} code - The error code
 * @param {Object} data - Additional error data
 * @returns {string}
 */
export function getPlanErrorMessage(code, data = {}) {
  switch (code) {
    case 'STUDENT_LIMIT_REACHED':
      return `You've reached your student limit (${data.current}/${data.limit}). Upgrade to add more students.`;
    case 'TEACHER_LIMIT_REACHED':
      return `You've reached your teacher limit (${data.current}/${data.limit}). Upgrade to add more teachers.`;
    case 'CLASS_LIMIT_REACHED':
      return `You've reached your class limit (${data.current}/${data.limit}). Upgrade to add more classes.`;
    case 'TRIAL_EXPIRED':
      return 'Your trial has expired. Subscribe to continue using e-daarah.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your subscription is not active. Please renew to continue.';
    case 'PAYMENT_PAST_DUE':
      return 'Your payment is past due. Please update your payment method.';
    case 'UPGRADE_REQUIRED':
      return `This feature requires a Plus plan. Upgrade to access ${data.feature || 'this feature'}.`;
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Check if an error is a security error (lockout, session timeout)
 * @param {Error} error - The error from axios
 * @returns {boolean}
 */
export function isSecurityError(error) {
  const code = error.response?.data?.code;
  return code && SECURITY_ERROR_CODES.includes(code);
}

/**
 * Check if account is locked from error response
 * @param {Error} error - The error from axios
 * @returns {{ locked: boolean, lockedUntil: Date|null, message: string|null }}
 */
export function getAccountLockInfo(error) {
  const data = error.response?.data;
  if (data?.code === 'ACCOUNT_LOCKED') {
    return {
      locked: true,
      lockedUntil: data.lockedUntil ? new Date(data.lockedUntil) : null,
      message: data.message
    };
  }
  return { locked: false, lockedUntil: null, message: null };
}

export default { handleApiError, isPlanLimitError, getPlanErrorMessage, isSecurityError, getAccountLockInfo };
