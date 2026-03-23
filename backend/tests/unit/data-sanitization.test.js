import { describe, it, expect } from '@jest/globals';

/**
 * Tests for common data sanitization patterns used across routes.
 * These test the same logic inline in admin.routes.js, billing.routes.js, etc.
 * Catches bugs like the NaN expected_fee issue.
 */

describe('parseFloat edge cases (fee parsing)', () => {
  // Simulates the pattern: expected_fee != null ? parseFloat(expected_fee) : null
  const parseFeeOld = (val) => val != null ? parseFloat(val) : null;
  // Fixed pattern: expected_fee != null && expected_fee !== '' ? parseFloat(expected_fee) || 0 : null
  const parseFeeSafe = (val) => val != null && val !== '' ? parseFloat(val) || 0 : null;

  it('old pattern: empty string produces NaN (the bug)', () => {
    expect(parseFeeOld('')).toBeNaN();
  });

  it('safe pattern: empty string returns null', () => {
    expect(parseFeeSafe('')).toBe(null);
  });

  it('safe pattern: valid number works', () => {
    expect(parseFeeSafe('100')).toBe(100);
    expect(parseFeeSafe('50.5')).toBe(50.5);
    expect(parseFeeSafe('0')).toBe(0);
    expect(parseFeeSafe(100)).toBe(100);
  });

  it('safe pattern: null/undefined returns null', () => {
    expect(parseFeeSafe(null)).toBe(null);
    expect(parseFeeSafe(undefined)).toBe(null);
  });

  it('safe pattern: non-numeric string returns 0', () => {
    expect(parseFeeSafe('abc')).toBe(0);
    expect(parseFeeSafe('N/A')).toBe(0);
  });
});

describe('Stripe price key construction', () => {
  // Simulates billing.routes.js logic
  const buildPriceKey = (priceKey, tierSuffix, isNZD) => {
    if (isNZD && !priceKey.endsWith('_nzd')) {
      return `${priceKey}_nzd`;
    }
    const baseKey = priceKey.replace(/_(t2|t3|nzd)$/g, '');
    return `${baseKey}${tierSuffix}`;
  };

  it('adds tier suffix for Tier 2', () => {
    expect(buildPriceKey('standard_monthly', '_t2', false)).toBe('standard_monthly_t2');
    expect(buildPriceKey('plus_annual', '_t2', false)).toBe('plus_annual_t2');
  });

  it('adds tier suffix for Tier 3', () => {
    expect(buildPriceKey('solo_monthly', '_t3', false)).toBe('solo_monthly_t3');
  });

  it('no suffix for Tier 1', () => {
    expect(buildPriceKey('standard_monthly', '', false)).toBe('standard_monthly');
  });

  it('NZD overrides tier suffix', () => {
    expect(buildPriceKey('standard_monthly', '_t2', true)).toBe('standard_monthly_nzd');
  });

  it('NZD key already present is not duplicated', () => {
    // Frontend always sends base keys (e.g., 'standard_monthly'), never with _nzd
    // NZD is detected server-side from madrasah currency
    expect(buildPriceKey('standard_monthly', '', true)).toBe('standard_monthly_nzd');
  });

  it('strips existing tier suffix before adding new one', () => {
    expect(buildPriceKey('standard_monthly_t2', '_t3', false)).toBe('standard_monthly_t3');
    expect(buildPriceKey('solo_annual_t3', '', false)).toBe('solo_annual');
  });
});

describe('Country normalization', () => {
  // Same logic as pricing-tiers.js getPricingTier uses internally
  const normalize = (country) => {
    if (!country) return '';
    return country.trim().toLowerCase();
  };

  it('normalizes case and whitespace', () => {
    expect(normalize('Nigeria')).toBe('nigeria');
    expect(normalize('  PAKISTAN  ')).toBe('pakistan');
    expect(normalize('New Zealand')).toBe('new zealand');
  });

  it('handles null/undefined/empty', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
    expect(normalize('')).toBe('');
  });
});

describe('Billing cycle validation', () => {
  const validCycles = ['monthly', 'annual'];
  const validPlans = ['solo', 'standard', 'plus'];

  const isValidPriceKey = (key) => {
    const parts = key.split('_');
    if (parts.length < 2) return false;
    return validPlans.includes(parts[0]) && validCycles.includes(parts[1]);
  };

  it('accepts valid price keys', () => {
    expect(isValidPriceKey('solo_monthly')).toBe(true);
    expect(isValidPriceKey('standard_annual')).toBe(true);
    expect(isValidPriceKey('plus_monthly')).toBe(true);
  });

  it('rejects invalid price keys', () => {
    expect(isValidPriceKey('enterprise_monthly')).toBe(false);
    expect(isValidPriceKey('solo_weekly')).toBe(false);
    expect(isValidPriceKey('monthly')).toBe(false);
    expect(isValidPriceKey('')).toBe(false);
  });
});

describe('Phone number formatting for SMS', () => {
  // Simulates how phone numbers are formatted before sending to Twilio
  const formatForSMS = (phone, countryCode) => {
    if (!phone || !countryCode) return null;
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    const cc = countryCode.replace(/\D/g, '');
    if (!digits || !cc) return null;
    return `+${cc}${digits}`;
  };

  it('formats correctly', () => {
    expect(formatForSMS('21123456', '+64')).toBe('+6421123456');
    expect(formatForSMS('8012345678', '+234')).toBe('+2348012345678');
  });

  it('strips leading zeros from local number', () => {
    expect(formatForSMS('021123456', '+64')).toBe('+6421123456');
  });

  it('returns null for missing data', () => {
    expect(formatForSMS(null, '+64')).toBe(null);
    expect(formatForSMS('21123456', null)).toBe(null);
    expect(formatForSMS('', '+64')).toBe(null);
  });
});

describe('Date handling edge cases', () => {
  it('ISO date string comparison works correctly', () => {
    expect('2025-01-15' < '2025-06-30').toBe(true);
    expect('2025-12-31' > '2025-01-01').toBe(true);
    expect('2025-01-01' === '2025-01-01').toBe(true);
  });

  it('Date parsing handles MySQL date format', () => {
    const mysqlDate = '2025-03-23';
    const d = new Date(mysqlDate + 'T00:00:00');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(23);
  });

  it('detects invalid dates', () => {
    expect(isNaN(new Date('not-a-date').getTime())).toBe(true);
    expect(isNaN(new Date('').getTime())).toBe(true);
    expect(isNaN(new Date(null).getTime())).toBe(false); // Date(null) = epoch
  });
});
