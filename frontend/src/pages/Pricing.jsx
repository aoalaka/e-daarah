import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { getPricingTier, TIER_PRICES } from '../config/pricing-tiers';
import './Pricing.css';

function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [tier, setTier] = useState(1);

  // Try to detect country from timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      // Map common timezones to countries for auto-detection
      const tzCountryMap = {
        'Africa/Lagos': 'Nigeria', 'Africa/Abuja': 'Nigeria',
        'Asia/Karachi': 'Pakistan', 'Asia/Dhaka': 'Bangladesh',
        'Africa/Cairo': 'Egypt', 'Africa/Nairobi': 'Kenya',
        'Africa/Dar_es_Salaam': 'Tanzania', 'Asia/Kolkata': 'India',
        'Asia/Calcutta': 'India', 'Africa/Accra': 'Ghana',
        'Africa/Dakar': 'Senegal', 'Africa/Mogadishu': 'Somalia',
        'Africa/Addis_Ababa': 'Ethiopia', 'Africa/Kampala': 'Uganda',
        'Asia/Colombo': 'Sri Lanka', 'Asia/Kathmandu': 'Nepal',
        'Asia/Kabul': 'Afghanistan', 'Asia/Aden': 'Yemen',
        'Asia/Kuala_Lumpur': 'Malaysia', 'Asia/Istanbul': 'Turkey',
        'Europe/Istanbul': 'Turkey', 'Africa/Johannesburg': 'South Africa',
        'America/Sao_Paulo': 'Brazil', 'America/Mexico_City': 'Mexico',
        'Asia/Jakarta': 'Indonesia', 'Africa/Casablanca': 'Morocco',
        'Africa/Tunis': 'Tunisia', 'Africa/Algiers': 'Algeria',
        'Asia/Bangkok': 'Thailand', 'Asia/Manila': 'Philippines',
        'America/Bogota': 'Colombia', 'America/Buenos_Aires': 'Argentina',
        'America/Santiago': 'Chile', 'America/Lima': 'Peru',
        'Asia/Amman': 'Jordan', 'Asia/Beirut': 'Lebanon',
        'Asia/Baghdad': 'Iraq', 'Asia/Phnom_Penh': 'Cambodia',
      };
      const country = tzCountryMap[tz];
      if (country) setTier(getPricingTier(country));
    } catch {}
  }, []);

  const tierPrices = TIER_PRICES[tier];

  const plans = {
    solo: {
      name: 'Solo',
      description: 'For individual teachers managing their own classes',
      monthly: tierPrices.solo.monthly,
      annual: tierPrices.solo.annual,
      features: [
        'Up to 75 students',
        'Up to 5 classes',
        'Attendance recording',
        'Exam recording',
        "Qur'an progress tracking",
        'Fee tracking (manual)',
        'Online student enrollment',
        'Simple dashboard',
        'SMS credits (add-on)',
        'Email support'
      ],
      notIncluded: [
        'Multiple teachers',
        'Teacher availability',
        'Academic planner',
        'Auto fee schedules',
        'Auto monthly fee reminders',
        'Reports & rankings',
        'Parent portal',
        'CSV/Excel exports'
      ]
    },
    standard: {
      name: 'Standard',
      description: 'For small madrasahs and weekend schools',
      monthly: tierPrices.standard.monthly,
      annual: tierPrices.standard.annual,
      features: [
        'Up to 100 students',
        'Up to 20 teachers',
        'Up to 10 classes',
        'Attendance & conduct grading',
        'Academic planner & school days',
        "Qur'an progress tracking",
        'Exam recording & tie-aware ranking',
        'Fee tracking (manual or auto schedules)',
        'Online student enrollment',
        'Student promotion tool',
        'Teacher availability tracking',
        'Quick Insights report',
        'Auto monthly fee reminders',
        'SMS credits (add-on)',
        'Email support (48hr)'
      ],
      notIncluded: [
        'Parent portal',
        'Holidays & schedule overrides',
        'Advanced reports & rankings',
        'CSV/Excel exports',
        'PDF report cards',
        'Bulk uploads',
        'Priority support'
      ]
    },
    plus: {
      name: 'Plus',
      description: 'For larger institutions and daily schools',
      monthly: tierPrices.plus.monthly,
      annual: tierPrices.plus.annual,
      features: [
        'Up to 500 students',
        'Up to 50 teachers',
        'Unlimited classes',
        'Everything in Standard',
        'Online student enrollment',
        'Planner-aware availability',
        'Holidays & schedule overrides',
        'Parent portal access',
        'Advanced reports & rankings',
        'CSV/Excel exports',
        'PDF report cards',
        'Bulk student upload',
        'Email notifications',
        '25 free SMS credits',
        'Priority support (24hr)'
      ],
      notIncluded: []
    }
  };

  const getPrice = (plan) => {
    return billingCycle === 'monthly' ? plan.monthly : plan.annual;
  };

  const getPriceLabel = () => {
    return billingCycle === 'monthly' ? '/month' : '/year';
  };

  const getSavings = (plan) => {
    if (billingCycle === 'annual') {
      const monthlyCost = plan.monthly * 12;
      const annualCost = plan.annual;
      return monthlyCost - annualCost;
    }
    return 0;
  };

  return (
    <div className="pricing-page">
      <SEO
        title="Pricing — Free Qur'an Tracker + School Plans from $5/mo"
        description="Free Qur'an tracking for up to 75 students. Solo plan from $5/mo, Standard from $12/mo, Plus from $29/mo. 14-day free trial on paid plans, no credit card needed."
      />
      {/* Header */}
      <header className="pricing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="E-Daarah" className="logo-img" />
          <span className="logo-text">E-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pricing-main">
        <h1 className="pricing-title">Simple Pricing for School Management</h1>
        <p className="pricing-subtitle">
          Start with a 14-day free trial. No credit card required.<br />
          <span className="pricing-note">All prices in USD{tier > 1 ? ' — regional pricing applied' : ''}</span>
        </p>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual
            <span className="save-badge">Save 2 months</span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="plans-grid five-cols">
          {/* Free Plan */}
          <div className="plan-card">
            <div className="plan-header">
              <h2 className="plan-name">Free</h2>
              <p className="plan-description">Qur'an tracking for hifdh circles and tilawah classes</p>
            </div>
            <div className="plan-price">
              <span className="amount">$0</span>
              <span className="period">forever</span>
            </div>
            <button
              className="plan-btn"
              onClick={() => navigate('/register?type=quran_focused')}
            >
              Get Started Free
            </button>
            <ul className="plan-features">
              <li className="feature included">
                <span className="check">✓</span>
                Up to 75 students
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Qur'an progress tracking
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Hifdh, Tilawah &amp; Muraja'ah
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Session history &amp; grades
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Cloud backup
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                No trial, no expiry
              </li>
              <li className="feature not-included">
                <span className="x">×</span>
                Classes &amp; attendance
              </li>
              <li className="feature not-included">
                <span className="x">×</span>
                Exams &amp; rankings
              </li>
              <li className="feature not-included">
                <span className="x">×</span>
                Fee tracking
              </li>
              <li className="feature not-included">
                <span className="x">×</span>
                SMS &amp; notifications
              </li>
            </ul>
          </div>

          {/* Solo Plan */}
          <div className="plan-card">
            <div className="plan-header">
              <h2 className="plan-name">{plans.solo.name}</h2>
              <p className="plan-description">{plans.solo.description}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">{getPrice(plans.solo)}</span>
              <span className="period">{getPriceLabel()} USD</span>
            </div>
            {billingCycle === 'annual' && (
              <p className="savings">Save ${getSavings(plans.solo)}/year</p>
            )}
            <button
              className="plan-btn"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
            </button>
            <ul className="plan-features">
              {plans.solo.features.map((feature, i) => (
                <li key={i} className="feature included">
                  <span className="check">✓</span>
                  {feature}
                </li>
              ))}
              {plans.solo.notIncluded.map((feature, i) => (
                <li key={i} className="feature not-included">
                  <span className="x">×</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Standard Plan */}
          <div className="plan-card">
            <div className="plan-header">
              <h2 className="plan-name">{plans.standard.name}</h2>
              <p className="plan-description">{plans.standard.description}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">{getPrice(plans.standard)}</span>
              <span className="period">{getPriceLabel()} USD</span>
            </div>
            {billingCycle === 'annual' && (
              <p className="savings">Save ${getSavings(plans.standard)}/year</p>
            )}
            <button
              className="plan-btn"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
            </button>
            <ul className="plan-features">
              {plans.standard.features.map((feature, i) => (
                <li key={i} className="feature included">
                  <span className="check">✓</span>
                  {feature}
                </li>
              ))}
              {plans.standard.notIncluded.map((feature, i) => (
                <li key={i} className="feature not-included">
                  <span className="x">×</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Plus Plan */}
          <div className="plan-card featured">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-header">
              <h2 className="plan-name">{plans.plus.name}</h2>
              <p className="plan-description">{plans.plus.description}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">{getPrice(plans.plus)}</span>
              <span className="period">{getPriceLabel()} USD</span>
            </div>
            {billingCycle === 'annual' && (
              <p className="savings">Save ${getSavings(plans.plus)}/year</p>
            )}
            <button
              className="plan-btn primary"
              onClick={() => navigate('/register')}
            >
              Start Free Trial
            </button>
            <ul className="plan-features">
              {plans.plus.features.map((feature, i) => (
                <li key={i} className="feature included">
                  <span className="check">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Enterprise Plan */}
          <div className="plan-card">
            <div className="plan-header">
              <h2 className="plan-name">Enterprise</h2>
              <p className="plan-description">For large organizations with custom needs</p>
            </div>
            <div className="plan-price">
              <span className="amount custom">Custom</span>
            </div>
            <a
              href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry"
              className="plan-btn"
            >
              Contact Us
            </a>
            <ul className="plan-features">
              <li className="feature included">
                <span className="check">✓</span>
                Unlimited students
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Unlimited teachers
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Unlimited classes
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Everything in Plus
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Custom integrations
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                Dedicated account manager
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                SLA guarantee
              </li>
              <li className="feature included">
                <span className="check">✓</span>
                On-premise option
              </li>
            </ul>
          </div>
        </div>

        {/* Regional Discount */}
        {/* <div className="regional-discount">
          <p className="discount-text">
            <strong>50% off Plus ANNUAL PLAN for schools in Australia & New Zealand</strong>
          </p>
          <p className="discount-subtext">
            Contact us at <a href="mailto:support@e-daarah.com?subject=NZ/AU%20Plus%20Discount%20Request">support@e-daarah.com</a> for your coupon code.
          </p>
        </div> */}

        {/* SMS Add-on */}
        <section className="sms-addon">
          <h2>SMS Add-on</h2>
          <p className="sms-addon-subtitle">
            Send fee reminders and announcements directly to parents' phones. Plus plan and above includes <strong>25 free SMS credits</strong> to get you started. Need more? Buy credits as you need them — no subscription required.
          </p>
          <div className="sms-packs-grid">
            <div className="sms-pack">
              <span className="sms-pack-credits">50</span>
              <span className="sms-pack-label">credits</span>
              <span className="sms-pack-price">$3</span>
              <span className="sms-pack-unit">$0.06 / credit</span>
            </div>
            <div className="sms-pack">
              <span className="sms-pack-credits">200</span>
              <span className="sms-pack-label">credits</span>
              <span className="sms-pack-price">$10</span>
              <span className="sms-pack-unit">$0.05 / credit</span>
            </div>
            <div className="sms-pack popular">
              <span className="sms-pack-badge">Best Value</span>
              <span className="sms-pack-credits">500</span>
              <span className="sms-pack-label">credits</span>
              <span className="sms-pack-price">$20</span>
              <span className="sms-pack-unit">$0.04 / credit</span>
            </div>
            <div className="sms-pack">
              <span className="sms-pack-credits">1,000</span>
              <span className="sms-pack-label">credits</span>
              <span className="sms-pack-price">$35</span>
              <span className="sms-pack-unit">$0.035 / credit</span>
            </div>
          </div>
          <p className="sms-addon-note">Plus plan and above includes 25 free SMS credits. 1 credit = 1 SMS segment. Additional credits never expire. Prices in USD.</p>
        </section>

        {/* FAQ Section */}
        <section className="pricing-faq">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-item">
            <h3>Can I change plans later?</h3>
            <p>Yes, you can upgrade or downgrade anytime. Changes take effect on your next billing cycle.</p>
          </div>

          <div className="faq-item">
            <h3>What happens after the trial?</h3>
            <p>After 14 days, you can choose a plan to continue. Your data is safe - we don&apos;t delete anything if you need more time to decide.</p>
          </div>

          <div className="faq-item">
            <h3>Do you offer refunds?</h3>
            <p>Yes, we offer a 30-day money-back guarantee if you&apos;re not satisfied.</p>
          </div>

          <div className="faq-item">
            <h3>Can I get a discount for multiple madrasahs?</h3>
            <p>Contact us for custom pricing if you manage multiple institutions.</p>
          </div>

          <div className="faq-item">
            <h3>How does the SMS add-on work?</h3>
            <p>Plus plan and above starts with 25 free SMS credits. Each SMS uses 1 credit per segment (most short messages = 1 segment). Credits never expire. Need more? Buy a credit pack from your dashboard — no extra subscription required.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pricing-footer">
        <p>&copy; {new Date().getFullYear()} E-Daarah. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Pricing;
