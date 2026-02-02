import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();
  const [madrasahUrl, setMadrasahUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const features = [
    {
      icon: '📋',
      title: 'Attendance Tracking',
      titleAr: 'تتبع الحضور',
      description: 'Daily attendance with behavior and dressing assessments'
    },
    {
      icon: '📊',
      title: 'Performance Reports',
      titleAr: 'تقارير الأداء',
      description: 'Comprehensive reports for parents and administrators'
    },
    {
      icon: '📖',
      title: 'Quran & Studies',
      titleAr: 'القرآن والدراسات',
      description: 'Track Quran memorization and Islamic studies progress'
    },
    {
      icon: '📈',
      title: 'Smart Analytics',
      titleAr: 'تحليلات ذكية',
      description: 'Identify students who need extra attention early'
    },
    {
      icon: '👥',
      title: 'Multi-User Access',
      titleAr: 'وصول متعدد',
      description: 'Separate portals for admins, teachers, and parents'
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      titleAr: 'آمن وخاص',
      description: 'Your madrasah data is protected and isolated'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      nameAr: 'البداية',
      price: '$29',
      period: '/month',
      description: 'For small madrasahs getting started',
      features: ['Up to 50 students', '3 teacher accounts', 'Basic reports', 'Email support'],
      highlighted: false
    },
    {
      name: 'Professional',
      nameAr: 'المحترف',
      price: '$79',
      period: '/month',
      description: 'For growing madrasahs',
      features: ['Up to 200 students', '10 teacher accounts', 'Advanced analytics', 'Priority support', 'Custom branding'],
      highlighted: true
    },
    {
      name: 'Enterprise',
      nameAr: 'المؤسسات',
      price: 'Custom',
      period: '',
      description: 'For large institutions',
      features: ['Unlimited students', 'Unlimited teachers', 'API access', 'Dedicated support', 'On-premise option'],
      highlighted: false
    }
  ];

  const handleFindMadrasah = async (e) => {
    e.preventDefault();
    if (!madrasahUrl.trim()) return;

    setSearching(true);
    setError('');

    const slug = madrasahUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');

    try {
      await api.get(`/auth/madrasah/${slug}`);
      navigate(`/${slug}/login`);
    } catch (err) {
      setError('Madrasah not found. Check the URL or register a new one.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <span className="logo-icon">🕌</span>
            <span className="logo-text">e-daarah</span>
          </Link>
          <nav className="header-nav">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <Link to="/demo/login" className="nav-link">Demo</Link>
            <Link to="/register" className="nav-btn primary">Get Started</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-badge">
            <span className="badge-text">نظام إدارة ذكي للمدارس</span>
          </div>

          <h1 className="hero-title">
            Smart Madrasah<br />Management System
          </h1>

          <p className="hero-arabic">
            إدارة مدرستك الدينية بذكاء وسهولة
          </p>

          <p className="hero-subtitle">
            The complete platform for Islamic schools to manage attendance,
            track student progress, and communicate with parents — all in one place.
          </p>

          <div className="hero-actions">
            <button onClick={() => navigate('/register')} className="hero-btn primary">
              Start Free Trial
              <span className="btn-arrow">→</span>
            </button>
            <button onClick={() => navigate('/demo/login')} className="hero-btn secondary">
              View Demo
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Madrasahs</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number">15,000+</span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Madrasah Finder */}
      <section className="finder-section">
        <div className="finder-container">
          <p className="finder-label">Already registered?</p>
          <form onSubmit={handleFindMadrasah} className="finder-form">
            <div className="finder-input-group">
              <span className="finder-prefix">e-daarah.com/</span>
              <input
                type="text"
                value={madrasahUrl}
                onChange={(e) => setMadrasahUrl(e.target.value)}
                placeholder="your-madrasah"
                className="finder-input"
              />
            </div>
            <button type="submit" className="finder-btn" disabled={searching}>
              {searching ? 'Finding...' : 'Go to Portal'}
            </button>
          </form>
          {error && <p className="finder-error">{error}</p>}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="features-container">
          <div className="section-header">
            <span className="section-tag">المميزات</span>
            <h2 className="section-title">Everything Your Madrasah Needs</h2>
            <p className="section-subtitle">
              Powerful tools designed specifically for Islamic education institutions
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-content">
                  <h3 className="feature-title">{feature.title}</h3>
                  <span className="feature-title-ar">{feature.titleAr}</span>
                  <p className="feature-description">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="how-container">
          <div className="section-header">
            <span className="section-tag">كيف يعمل</span>
            <h2 className="section-title">Get Started in Minutes</h2>
            <p className="section-subtitle">
              Simple setup process to get your madrasah online
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3 className="step-title">Register Your Madrasah</h3>
              <p className="step-description">
                Create your account and set up your madrasah profile with your custom URL
              </p>
            </div>
            <div className="step-connector"></div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3 className="step-title">Add Your Team</h3>
              <p className="step-description">
                Invite teachers and assign them to classes. Set up your semester schedule
              </p>
            </div>
            <div className="step-connector"></div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3 className="step-title">Enroll Students</h3>
              <p className="step-description">
                Add students individually or import in bulk. Parents get instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="pricing-container">
          <div className="section-header">
            <span className="section-tag">الأسعار</span>
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">
              Choose the plan that fits your madrasah. Start with a 14-day free trial.
            </p>
          </div>

          <div className="pricing-grid">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                {plan.highlighted && <div className="popular-badge">Most Popular</div>}
                <div className="plan-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <span className="plan-name-ar">{plan.nameAr}</span>
                </div>
                <div className="plan-price">
                  <span className="price">{plan.price}</span>
                  <span className="period">{plan.period}</span>
                </div>
                <p className="plan-description">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <span className="check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`plan-btn ${plan.highlighted ? 'primary' : 'secondary'}`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Transform Your Madrasah?</h2>
          <p className="cta-arabic">ابدأ رحلتك الرقمية اليوم</p>
          <p className="cta-subtitle">
            Join hundreds of madrasahs already using e-daarah to streamline their operations
          </p>
          <div className="cta-actions">
            <button onClick={() => navigate('/register')} className="cta-btn primary">
              Start Your Free Trial
            </button>
            <button onClick={() => navigate('/demo/login')} className="cta-btn secondary">
              Try Demo First
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="logo-icon">🕌</span>
              <span className="logo-text">e-daarah</span>
            </Link>
            <p className="footer-tagline">Smart Madrasah Management</p>
            <p className="footer-tagline-ar">نظام إدارة المدارس الذكي</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <Link to="/demo/login">Demo</Link>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#support">Support</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 e-daarah. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
