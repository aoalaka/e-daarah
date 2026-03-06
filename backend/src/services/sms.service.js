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
 * Calculate credits needed for a message based on SMS segments.
 * GSM-7: 160 chars (1 segment), 153 chars/segment (multi-part)
 * UCS-2: 70 chars (1 segment), 67 chars/segment (multi-part)
 * 1 credit = 1 segment
 */
export const calculateCredits = (messageBody) => {
  if (!messageBody) return 1;
  const isUcs2 = /[^\x00-\x7F\u00A0\u00A1\u00A3-\u00A5\u00A7\u00BF\u00C4-\u00C6\u00C9\u00D1\u00D6\u00D8\u00DC\u00DF-\u00E6\u00E8-\u00F2\u00F4\u00F6\u00F8-\u00FC\u0393\u0394\u0398\u039B\u039E\u03A0\u03A3\u03A6\u03A8\u03A9]/.test(messageBody);
  const len = messageBody.length;
  if (isUcs2) {
    return len <= 70 ? 1 : Math.ceil(len / 67);
  }
  return len <= 160 ? 1 : Math.ceil(len / 153);
};

/**
 * Check if Twilio is configured
 */
export const isSmsConfigured = () => {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
};

export default { sendSMS, formatPhoneNumber, calculateCredits, isSmsConfigured };
