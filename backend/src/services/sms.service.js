import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'us-east-1';
const senderId = process.env.SMS_SENDER_ID || 'e-Daarah';

let client = null;

const getClient = () => {
  if (!client) {
    // AWS SDK v3 auto-reads AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION from env
    client = new SNSClient({ region });
  }
  return client;
};

/**
 * Send an SMS message via AWS SNS
 * @param {string} to - Phone number in E.164 format (e.g., +64211234567)
 * @param {string} body - Message text
 * @returns {Promise<{sid: string, status: string}>}
 */
export const sendSMS = async (to, body) => {
  const sns = getClient();

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS SMS is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION.');
  }

  const command = new PublishCommand({
    PhoneNumber: formatPhoneNumber(to),
    Message: body,
    MessageAttributes: {
      'AWS.SNS.SMS.SenderID': {
        DataType: 'String',
        StringValue: senderId
      },
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  });

  const result = await sns.send(command);

  return {
    sid: result.MessageId || '',
    status: result.$metadata?.httpStatusCode === 200 ? 'sent' : 'queued'
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
 * Check if AWS SNS is configured
 */
export const isSmsConfigured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
};

export default { sendSMS, formatPhoneNumber, calculateCredits, isSmsConfigured };
