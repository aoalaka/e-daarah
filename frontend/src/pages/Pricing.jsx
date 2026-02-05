import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Pricing.css';

function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = {
    standard: {
      name: 'Standard',
      description: 'For small madrasahs and weekend schools',
      monthly: 12,
      annual: 120,
      features: [
        'Up to 75 students',
        'Up to 5 teachers',
        'Up to 5 classes',
        'Attendance tracking',
        'Exam recording',
        'Parent portal',
        'Email support (48hr)'
      ],
      notIncluded: [
        'CSV/Excel exports',
        'PDF report cards',
        'Bulk uploads',
        'Priority support'
      ]
    },
    plus: {
      name: 'Plus',
      description: 'For larger institutions and daily schools',
      monthly: 29,
      annual: 290,
      features: [
        'Up to 300 students',
        'Up to 20 teachers',
        'Up to 15 classes',
        'Everything in Standard',
        'CSV/Excel exports',
        'PDF report cards',
        'Bulk student upload',
        'Email notifications',
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
      {/* Header */}
      <header className="pricing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="logo-img" />
          <span className="logo-text">e-daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/demo/login" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="pricing-main">
        <h1 className="pricing-title">Simple, Transparent Pricing</h1>
        <p className="pricing-subtitle">
          Start with a 14-day free trial. No credit card required.
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
        <div className="plans-grid three-cols">
          {/* Standard Plan */}
          <div className="plan-card">
            <div className="plan-header">
              <h2 className="plan-name">{plans.standard.name}</h2>
              <p className="plan-description">{plans.standard.description}</p>
            </div>
            <div className="plan-price">
              <span className="currency">$</span>
              <span className="amount">{getPrice(plans.standard)}</span>
              <span className="period">{getPriceLabel()}</span>
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
              <span className="period">{getPriceLabel()}</span>
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
        <div className="regional-discount">
          <p className="discount-text">
            <strong>50% off Plus plan for schools in Australia & New Zealand</strong>
          </p>
          <p className="discount-subtext">
            Contact us at <a href="mailto:support@e-daarah.com?subject=NZ/AU%20Plus%20Discount%20Request">support@e-daarah.com</a> for your coupon code.
          </p>
        </div>

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
        </section>
      </main>

      {/* Footer */}
      <footer className="pricing-footer">
        <p>&copy; {new Date().getFullYear()} e-daarah. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Pricing;
