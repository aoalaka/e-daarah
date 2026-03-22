/**
 * Regional pricing tiers — frontend copy.
 * Keep in sync with backend/src/config/pricing-tiers.js
 */

const TIER_2_COUNTRIES = [
  'Malaysia', 'Turkey', 'South Africa', 'Brazil', 'Mexico', 'Indonesia',
  'Morocco', 'Tunisia', 'Algeria', 'Thailand', 'Philippines', 'Colombia',
  'Argentina', 'Chile', 'Peru', 'Jordan', 'Lebanon', 'Iraq', 'Libya',
  'China', 'Russia', 'Poland', 'Romania', 'Hungary', 'Czech Republic',
  'Croatia', 'Bulgaria', 'Serbia', 'Bosnia', 'Bosnia and Herzegovina',
  'Albania', 'Kosovo', 'North Macedonia'
];

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

const tier2Set = new Set(TIER_2_COUNTRIES.map(c => c.toLowerCase()));
const tier3Set = new Set(TIER_3_COUNTRIES.map(c => c.toLowerCase()));

export function getPricingTier(country) {
  if (!country) return 1;
  const normalized = country.trim().toLowerCase();
  if (tier3Set.has(normalized)) return 3;
  if (tier2Set.has(normalized)) return 2;
  return 1;
}

export const TIER_PRICES = {
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

export const TIER_LABELS = {
  1: null,
  2: 'Regional pricing applied',
  3: 'Regional pricing applied',
};
