import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

const getClient = () => {
  if (!client && accountSid && authToken) {
    client = twilio(accountSid, authToken);
  }
  return client;
};

/**
 * Send an SMS message via Twilio
 * @param {string} to - Phone number in E.164 format (e.g., +64211234567)
 * @param {string} body - Message text (max 1600 chars, each 160-char segment = 1 credit)
 * @returns {Promise<{sid: string, status: string}>}
 */
export const sendSMS = async (to, body) => {
  const twilioClient = getClient();

  if (!twilioClient) {
    throw new Error('Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
  }

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  }

  const message = await twilioClient.messages.create({
    body,
    from: fromNumber,
    to: formatPhoneNumber(to)
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
 * Each SMS segment is 160 chars (GSM) or 70 chars (Unicode)
 * We charge 1 credit per message regardless of segments
 */
export const calculateCredits = (messageBody) => {
  return 1;
};

/**
 * Check if Twilio is configured
 */
export const isTwilioConfigured = () => {
  return !!(accountSid && authToken && fromNumber);
};

export default { sendSMS, formatPhoneNumber, calculateCredits, isTwilioConfigured };
