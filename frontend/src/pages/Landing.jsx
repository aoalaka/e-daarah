import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <SEO
        title="e-daarah — School Management for Madrasahs & Islamic Schools"
        description="Simple admin system for madrasahs, Islamic schools, and weekend programs. Track attendance, record exams, grade conduct, and keep parents informed."
      />
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
          The simple admin system for madrasahs, weekend schools, and community learning centers.
          Track attendance, record exams, and keep parents informed.
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
        <h2 className="section-title">Built for Islamic Schools. Ready for Any School.</h2>

        <div className="feature-list">
          <div className="feature">
            <h3>Daily Attendance</h3>
            <p>Mark attendance, grade dressing, behavior, and punctuality — all in one step. Bulk-save for the whole class.</p>
          </div>
          <div className="feature">
            <h3>Qur'an Progress Tracking</h3>
            <p>Track hifz, tilawah, and revision progress per student. Record surahs, ayahs, grades, and pass/fail status.</p>
          </div>
          <div className="feature">
            <h3>Academic Planner</h3>
            <p>Set flexible school days, manage holidays and closures, and schedule temporary overrides like Ramadan timetables.</p>
          </div>
          <div className="feature">
            <h3>Exam Recording</h3>
            <p>Record scores for any subject with tie-aware ranking. View class-wide and per-student performance reports.</p>
          </div>
          <div className="feature">
            <h3>Parent Portal</h3>
            <p>Parents log in to view their child's attendance rate, conduct grades, exam results, and teacher comments.</p>
          </div>
          <div className="feature">
            <h3>Student Promotion</h3>
            <p>Promote or retain students between classes at the end of each session with a simple bulk tool.</p>
          </div>
          <div className="feature">
            <h3>Role-Based Access</h3>
            <p>Admins, teachers, and parents each get their own secure portal with appropriate permissions.</p>
          </div>
          <div className="feature">
            <h3>Reports &amp; Exports</h3>
            <p>Generate detailed student reports, class performance summaries, and export data as CSV or PDF.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <h2 className="section-title">Simple Pricing</h2>
        <p className="section-subtitle">14-day free trial. No credit card needed.<br /><br /><span style={{color:'#888',fontSize:'13px'}}>All prices in USD</span></p>

        <div className="pricing-cards">
          <div className="pricing-card">
            <h3>Standard</h3>
            <div className="price">$12<span>/month USD</span></div>
            <ul>
              <li>Up to 100 students</li>
              <li>Up to 20 teachers</li>
              <li>Attendance &amp; conduct grading</li>
              <li>Academic planner &amp; school days</li>
              <li>Qur'an progress tracking</li>
              <li>Exam recording &amp; ranking</li>
              <li>Student promotion</li>
              <li>Email support</li>
            </ul>
            <button onClick={() => navigate('/register')} className="btn secondary">
              Start Trial
            </button>
          </div>

          <div className="pricing-card featured">
            <h3>Plus</h3>
            <div className="price">$29<span>/month USD</span></div>
            <ul>
              <li>Up to 500 students</li>
              <li>Up to 50 teachers</li>
              <li>Everything in Standard</li>
              <li>Parent portal access</li>
              <li>Reports, CSV &amp; PDF exports</li>
              <li>Holidays &amp; schedule overrides</li>
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
              <li>Everything in Plus</li>
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
            <strong>50% off the Plus ANNUAL PLAN for schools in Australia &amp; New Zealand</strong>
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
            <p style={{ marginTop: 4 }}>{'نظام إدارة المدارس الدينية'}</p>
            <p style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Designed for madrasahs. Ready for any school.</p>
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
