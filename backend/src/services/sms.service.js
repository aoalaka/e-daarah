import twilio from 'twilio';

let client = null;

const getClient = () => {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

/**
 * Send an SMS message via Twilio
 * @param {string} to - Phone number in E.164 format (e.g., +64211234567)
 * @param {string} body - Message text
 * @returns {Promise<{sid: string, status: string}>}
 */
export const sendSMS = async (to, body) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
  }

  const twilioClient = getClient();
  const message = await twilioClient.messages.create({
    to: formatPhoneNumber(to),
    from: process.env.TWILIO_PHONE_NUMBER,
    body
  });

  return {
    sid: message.sid,
    status: message.status
  };
};

/**
 * Format phone number to E.164 format
 * If already starts with +, return as-is
 * Otherwise prepend the default country code
 */
export const formatPhoneNumber = (phone, countryCode = '') => {
  if (!phone) return null;

  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Already E.164
  if (cleaned.startsWith('+')) return cleaned;

  // Has country code prefix without +
  if (countryCode) {
    const code = countryCode.replace('+', '');
    if (!cleaned.startsWith(code)) {
      // Remove leading 0 if present
      if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
      return `+${code}${cleaned}`;
    }
    return `+${cleaned}`;
  }

  // Fallback: return with + prefix
  return `+${cleaned}`;
};

/**
 * Calculate credits needed for a message
 * We charge 1 credit per message regardless of segments
 */
export const calculateCredits = (messageBody) => {
  return 1;
};

/**
 * Check if Twilio is configured
 */
export const isSmsConfigured = () => {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
};

export default { sendSMS, formatPhoneNumber, calculateCredits, isSmsConfigured };
