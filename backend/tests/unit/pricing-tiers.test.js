import { describe, it, expect } from '@jest/globals';
import {
  getPricingTier,
  getTierLookupKeySuffix,
  TIER_PRICES,
  TIER_PRICES_DISPLAY,
} from '../../src/config/pricing-tiers.js';

describe('getPricingTier', () => {
  it('returns Tier 3 for emerging economies', () => {
    expect(getPricingTier('Nigeria')).toBe(3);
    expect(getPricingTier('Pakistan')).toBe(3);
    expect(getPricingTier('Bangladesh')).toBe(3);
    expect(getPricingTier('India')).toBe(3);
    expect(getPricingTier('Kenya')).toBe(3);
    expect(getPricingTier('Egypt')).toBe(3);
    expect(getPricingTier('Somalia')).toBe(3);
    expect(getPricingTier('Ghana')).toBe(3);
    expect(getPricingTier('Afghanistan')).toBe(3);
    expect(getPricingTier('Palestine')).toBe(3);
  });

  it('returns Tier 2 for mid-range economies', () => {
    expect(getPricingTier('Malaysia')).toBe(2);
    expect(getPricingTier('Turkey')).toBe(2);
    expect(getPricingTier('South Africa')).toBe(2);
    expect(getPricingTier('Brazil')).toBe(2);
    expect(getPricingTier('Indonesia')).toBe(2);
    expect(getPricingTier('Morocco')).toBe(2);
    expect(getPricingTier('Jordan')).toBe(2);
  });

  it('returns Tier 1 for unknown/western countries', () => {
    expect(getPricingTier('United States')).toBe(1);
    expect(getPricingTier('United Kingdom')).toBe(1);
    expect(getPricingTier('New Zealand')).toBe(1);
    expect(getPricingTier('Australia')).toBe(1);
    expect(getPricingTier('Canada')).toBe(1);
    expect(getPricingTier('Germany')).toBe(1);
  });

  it('is case-insensitive', () => {
    expect(getPricingTier('nigeria')).toBe(3);
    expect(getPricingTier('NIGERIA')).toBe(3);
    expect(getPricingTier('Nigeria')).toBe(3);
    expect(getPricingTier('malaysia')).toBe(2);
    expect(getPricingTier('MALAYSIA')).toBe(2);
  });

  it('trims whitespace', () => {
    expect(getPricingTier('  Nigeria  ')).toBe(3);
    expect(getPricingTier('  Malaysia  ')).toBe(2);
  });

  it('returns Tier 1 for null/undefined/empty', () => {
    expect(getPricingTier(null)).toBe(1);
    expect(getPricingTier(undefined)).toBe(1);
    expect(getPricingTier('')).toBe(1);
  });

  it('handles country name variants', () => {
    expect(getPricingTier('Bosnia')).toBe(2);
    expect(getPricingTier('Bosnia and Herzegovina')).toBe(2);
    expect(getPricingTier('Gambia')).toBe(3);
    expect(getPricingTier('The Gambia')).toBe(3);
    expect(getPricingTier('DR Congo')).toBe(3);
    expect(getPricingTier('Democratic Republic of the Congo')).toBe(3);
    expect(getPricingTier('Ivory Coast')).toBe(3);
    expect(getPricingTier("Cote d'Ivoire")).toBe(3);
  });
});

describe('getTierLookupKeySuffix', () => {
  it('returns empty string for Tier 1', () => {
    expect(getTierLookupKeySuffix(1)).toBe('');
  });

  it('returns _t2 for Tier 2', () => {
    expect(getTierLookupKeySuffix(2)).toBe('_t2');
  });

  it('returns _t3 for Tier 3', () => {
    expect(getTierLookupKeySuffix(3)).toBe('_t3');
  });

  it('returns empty string for unknown tiers', () => {
    expect(getTierLookupKeySuffix(0)).toBe('');
    expect(getTierLookupKeySuffix(4)).toBe('');
    expect(getTierLookupKeySuffix(null)).toBe('');
  });
});

describe('TIER_PRICES (cents)', () => {
  it('has all three tiers', () => {
    expect(TIER_PRICES[1]).toBeDefined();
    expect(TIER_PRICES[2]).toBeDefined();
    expect(TIER_PRICES[3]).toBeDefined();
  });

  it('has solo, standard, plus for each tier', () => {
    for (const tier of [1, 2, 3]) {
      expect(TIER_PRICES[tier].solo).toBeDefined();
      expect(TIER_PRICES[tier].standard).toBeDefined();
      expect(TIER_PRICES[tier].plus).toBeDefined();
    }
  });

  it('has monthly and annual for each plan', () => {
    for (const tier of [1, 2, 3]) {
      for (const plan of ['solo', 'standard', 'plus']) {
        expect(TIER_PRICES[tier][plan].monthly).toBeGreaterThan(0);
        expect(TIER_PRICES[tier][plan].annual).toBeGreaterThan(0);
      }
    }
  });

  it('annual is cheaper per month than monthly', () => {
    for (const tier of [1, 2, 3]) {
      for (const plan of ['solo', 'standard', 'plus']) {
        const monthlyTotal = TIER_PRICES[tier][plan].monthly * 12;
        expect(TIER_PRICES[tier][plan].annual).toBeLessThan(monthlyTotal);
      }
    }
  });

  it('lower tiers are cheaper', () => {
    for (const plan of ['solo', 'standard', 'plus']) {
      expect(TIER_PRICES[3][plan].monthly).toBeLessThan(TIER_PRICES[2][plan].monthly);
      expect(TIER_PRICES[2][plan].monthly).toBeLessThan(TIER_PRICES[1][plan].monthly);
    }
  });

  it('Tier 1 prices are correct', () => {
    expect(TIER_PRICES[1].solo.monthly).toBe(500);
    expect(TIER_PRICES[1].standard.monthly).toBe(1200);
    expect(TIER_PRICES[1].plus.monthly).toBe(2900);
  });
});

describe('TIER_PRICES_DISPLAY (dollars)', () => {
  it('matches TIER_PRICES divided by 100', () => {
    for (const tier of [1, 2, 3]) {
      for (const plan of ['solo', 'standard', 'plus']) {
        expect(TIER_PRICES_DISPLAY[tier][plan].monthly).toBe(TIER_PRICES[tier][plan].monthly / 100);
        expect(TIER_PRICES_DISPLAY[tier][plan].annual).toBe(TIER_PRICES[tier][plan].annual / 100);
      }
    }
  });
});
