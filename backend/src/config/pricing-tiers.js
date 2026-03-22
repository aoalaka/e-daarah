/**
 * Regional pricing tiers based on country.
 * Country names must match the free-text values stored in madrasahs.country.
 * Unknown countries default to Tier 1 (full price).
 */

// Tier 2 — mid-range economies
const TIER_2_COUNTRIES = [
  'Malaysia', 'Turkey', 'South Africa', 'Brazil', 'Mexico', 'Indonesia',
  'Morocco', 'Tunisia', 'Algeria', 'Thailand', 'Philippines', 'Colombia',
  'Argentina', 'Chile', 'Peru', 'Jordan', 'Lebanon', 'Iraq', 'Libya',
  'China', 'Russia', 'Poland', 'Romania', 'Hungary', 'Czech Republic',
  'Croatia', 'Bulgaria', 'Serbia', 'Bosnia', 'Bosnia and Herzegovina',
  'Albania', 'Kosovo', 'North Macedonia'
];

// Tier 3 — emerging economies
const TIER_3_COUNTRIES = [
  'Nigeria', 'Pakistan', 'Bangladesh', 'Egypt', 'Kenya', 'Tanzania',
  'India', 'Ghana', 'Senegal', 'Somalia', 'Ethiopia', 'Uganda',
  'Sudan', 'South Sudan', 'Niger', 'Mali', 'Chad', 'Cameroon',
  'Gambia', 'The Gambia', 'Sierra Leone', 'Guinea', 'Burkina Faso',
  'Benin', 'Togo', 'Ivory Coast', "Cote d'Ivoire", 'Mozambique',
  'Madagascar', 'Malawi', 'Zimbabwe', 'Zambia', 'Rwanda', 'Burundi',
  'DR Congo', 'Democratic Republic of the Congo', 'Congo',
  'Sri Lanka', 'Nepal', 'Myanmar', 'Afghanistan', 'Yemen', 'Palestine',
  'Syria', 'Uzbekistan', 'Tajikistan', 'Kyrgyzstan', 'Turkmenistan',
  'Cambodia', 'Laos'
];

// Normalize for case-insensitive matching
const tier2Set = new Set(TIER_2_COUNTRIES.map(c => c.toLowerCase()));
const tier3Set = new Set(TIER_3_COUNTRIES.map(c => c.toLowerCase()));

export function getPricingTier(country) {
  if (!country) return 1;
  const normalized = country.trim().toLowerCase();
  if (tier3Set.has(normalized)) return 3;
  if (tier2Set.has(normalized)) return 2;
  return 1;
}

// Stripe lookup key suffixes per tier
// Tier 1 = no suffix (current keys), Tier 2 = _t2, Tier 3 = _t3
export function getTierLookupKeySuffix(tier) {
  if (tier === 2) return '_t2';
  if (tier === 3) return '_t3';
  return '';
}

// Prices displayed on the pricing page (cents)
export const TIER_PRICES = {
  1: {
    solo:     { monthly: 500,  annual: 5000 },
    standard: { monthly: 1200, annual: 12000 },
    plus:     { monthly: 2900, annual: 29000 },
  },
  2: {
    solo:     { monthly: 300,  annual: 3000 },
    standard: { monthly: 700,  annual: 7000 },
    plus:     { monthly: 1500, annual: 15000 },
  },
  3: {
    solo:     { monthly: 200,  annual: 2000 },
    standard: { monthly: 400,  annual: 4000 },
    plus:     { monthly: 900,  annual: 9000 },
  },
};

// For frontend consumption (dollars not cents)
export const TIER_PRICES_DISPLAY = {
  1: {
    solo:     { monthly: 5,  annual: 50 },
    standard: { monthly: 12, annual: 120 },
    plus:     { monthly: 29, annual: 290 },
  },
  2: {
    solo:     { monthly: 3,  annual: 30 },
    standard: { monthly: 7,  annual: 70 },
    plus:     { monthly: 15, annual: 150 },
  },
  3: {
    solo:     { monthly: 2,  annual: 20 },
    standard: { monthly: 4,  annual: 40 },
    plus:     { monthly: 9,  annual: 90 },
  },
};

export { TIER_2_COUNTRIES, TIER_3_COUNTRIES };
