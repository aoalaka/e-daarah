import { useNavigate, Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="logo-img" />
          <span className="logo-text">e-daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <p className="hero-arabic">نظام إدارة المدارس الدينية</p>
        <h1 className="hero-title">Run Your Madrasah with Clarity</h1>
        <p className="hero-subtitle">
          Track attendance, record exams, and keep parents informed — all in one place.
        </p>

        <div className="hero-actions">
          <button onClick={() => navigate('/register')} className="btn primary">
            Start Free Trial
          </button>
          <button onClick={() => navigate('/demo')} className="btn secondary">
            View Demo
          </button>
        </div>
      </section>

      {/* Finder */}
      <section className="finder">
        <p className="finder-label">Already have an account?</p>
        <button onClick={() => navigate('/signin')} className="btn primary finder-btn">
          Sign In
        </button>
      </section>

      {/* Features */}
      <section className="features">
        <h2 className="section-title">Built for Islamic Schools</h2>

        <div className="feature-list">
          <div className="feature">
            <h3>Daily Attendance</h3>
            <p>Mark attendance and grade dressing and behavior in one step</p>
          </div>
          <div className="feature">
            <h3>Parent Access</h3>
            <p>Parents log in to see their child's attendance and grades</p>
          </div>
          <div className="feature">
            <h3>Exam Records</h3>
            <p>Record scores for Quran memorization, Islamic studies, and more</p>
          </div>
          <div className="feature">
            <h3>Role-Based Portals</h3>
            <p>Admins, teachers, and parents each get their own dashboard</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <h2 className="section-title">Simple Pricing</h2>
        <p className="section-subtitle">14-day free trial. No credit card needed.</p>

        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Standard</h3>
            <div className="price">$12<span>/month</span></div>
            <ul>
              <li>Up to 100 students</li>
              <li>Up to 20 teachers</li>
              <li>Attendance &amp; grading</li>
              <li>Tie-aware student ranking</li>
              <li>Exam recording</li>
              <li>Email support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn secondary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card featured">
            <h3>Plus</h3>
            <div className="price">$29<span>/month</span></div>
            <ul>
              <li>Up to 500 students</li>
              <li>Up to 50 teachers</li>
              <li>Everything in Standard</li>
              <li>Parent portal access</li>
              <li>Reports &amp; data exports</li>
              <li>Priority support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn primary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card">
            <h3>Enterprise</h3>
            <div className="price">Custom</div>
            <ul>
              <li>Unlimited students</li>
              <li>Unlimited teachers</li>
              <li>Custom integrations</li>
              <li>Dedicated support</li>
              <li>SLA guarantee</li>
            </ul>
            <a href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry" className="btn secondary enterprise-btn">
              Contact Us
            </a>
          </div>
        </div>

        <p className="pricing-cta">
          <Link to="/pricing" className="pricing-link">See full plan comparison →</Link>
        </p>

        <div className="regional-discount">
          <p className="discount-text">
            <strong>50% off the Plus plan for schools in Australia &amp; New Zealand</strong>
          </p>
          <p className="discount-subtext">
            Email <a href="mailto:support@e-daarah.com?subject=NZ/AU%20Plus%20Discount%20Request">support@e-daarah.com</a> to get your coupon code.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/e-daarah-whitebg-logo.png" alt="e-daarah" className="footer-logo-img" />
              <span className="footer-logo-text">e-daarah</span>
            </div>
            <p>نظام إدارة المدارس الدينية</p>
          </div>
          <div className="footer-links">
            <Link to="/signin">Sign In</Link>
            <Link to="/demo">Demo</Link>
            <Link to="/register">Register</Link>
            <Link to="/help">Help</Link>
          </div>
          <div className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="mailto:support@e-daarah.com">Contact</a>
          </div>
        </div>
        <p className="copyright">© 2026 e-daarah</p>
      </footer>
    </div>
  );
}

export default Landing;
