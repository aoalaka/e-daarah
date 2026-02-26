import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <SEO
        title="e-Daarah — School Management for Madrasahs & Islamic Schools"
        description="Simple admin system for madrasahs, Islamic schools, and weekend programs. Track attendance, record exams, grade conduct, and keep parents informed."
      />

      {/* Header */}
      <header className="landing-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="logo-img" />
          <span className="logo-text">e-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/demo" className="nav-link">Demo</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
            <p className="hero-arabic">نظام إدارة المدارس الدينية</p>
            <h1 className="hero-title">Run Your Madrasah<br />with Clarity</h1>
            <p className="hero-subtitle">
              The simple admin system for madrasahs, weekend schools, and community
              learning centers. Track attendance, record exams, manage fees, and keep
              parents informed.
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate('/register')} className="btn primary">
                Start Free Trial
              </button>
              <button onClick={() => navigate('/demo')} className="btn secondary">
                View Demo
              </button>
            </div>
            <p className="hero-signin">Already have an account? <Link to="/signin">Sign in</Link></p>
          </div>
          <div className="hero-preview">
            <picture>
              <source media="(max-width: 480px)" srcSet="/mobile-attendance-taking-preview.jpeg" />
              <img src="/dashboard-preview.png" alt="e-Daarah admin dashboard" className="hero-preview-img" />
            </picture>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-inner">
          <p className="section-label">How It Works</p>
          <h2 className="section-heading">Get started in minutes</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h3>Register Your School</h3>
              <p>Create your madrasah profile, add classes, and invite teachers.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Set Up Your Schedule</h3>
              <p>Configure school days, holidays, and semester dates.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>Start Teaching</h3>
              <p>Take attendance, track Qur'an progress, and record exams from day one.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-inner">
          <p className="section-label">Features</p>
          <h2 className="section-heading">Everything your school needs</h2>

          <div className="feature-grid main">
            <div className="feature-card">
              <h3>Daily Attendance</h3>
              <p>Mark attendance, grade dressing, behavior, and punctuality — all in one step. Bulk-save for the whole class.</p>
            </div>
            <div className="feature-card">
              <h3>Qur'an Progress Tracking</h3>
              <p>Track hifdh, tilawah, and revision progress per student. Record surahs, ayahs, grades, and pass/fail status.</p>
            </div>
            <div className="feature-card">
              <h3>Parent Portal</h3>
              <p>Parents log in to view their child's attendance rate, conduct grades, exam results, and teacher comments.</p>
            </div>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <h3>Academic Planner</h3>
              <p>Set flexible school days, manage holidays and closures, and schedule temporary overrides like Ramadan timetables.</p>
            </div>
            <div className="feature-card">
              <h3>Exam Recording</h3>
              <p>Record scores for any subject with tie-aware ranking. View class-wide and per-student performance reports.</p>
            </div>
            <div className="feature-card">
              <h3>Student Promotion</h3>
              <p>Promote or retain students between classes at the end of each session with a simple bulk tool.</p>
            </div>
            <div className="feature-card">
              <h3>Fee Tracking</h3>
              <p>Create fee templates, assign them to classes or students, and record payments. Track balances in any currency.</p>
            </div>
            <div className="feature-card">
              <h3>Role-Based Access</h3>
              <p>Admins, teachers, and parents each get their own secure portal with appropriate permissions.</p>
            </div>
            <div className="feature-card">
              <h3>Reports &amp; Exports</h3>
              <p>Generate detailed student reports, class performance summaries, and export data as CSV or PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="section-inner">
          <p className="section-label">Trusted</p>
          <h2 className="section-heading">Used by madrasahs in New Zealand and beyond</h2>
          <div className="proof-grid">
            <div className="proof-card">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-detail">Tauranga, New Zealand</span>
              <span className="proof-tag">Pilot Partner</span>
            </div>
            <div className="proof-card">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-detail">Palmerston North, NZ</span>
            </div>
            <div className="proof-card">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-detail">Ibadan, Nigeria</span>
            </div>
          </div>
          <p className="proof-cta">Interested in a demo for your madrasah? <a href="mailto:support@e-daarah.com?subject=Demo%20Request">Get in touch</a></p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <div className="section-inner">
          <p className="section-label">Pricing</p>
          <h2 className="section-heading">Simple, transparent pricing</h2>
          <p className="section-desc">14-day free trial. No credit card required. All prices in USD.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <h3>Standard</h3>
              <div className="price">$12<span>/mo</span></div>
              <p>Up to 100 students</p>
              <button onClick={() => navigate('/register')} className="btn secondary">Start Trial</button>
            </div>
            <div className="price-card featured">
              <h3>Plus</h3>
              <div className="price">$29<span>/mo</span></div>
              <p>Up to 500 students</p>
              <button onClick={() => navigate('/register')} className="btn primary">Start Trial</button>
            </div>
            <div className="price-card">
              <h3>Enterprise</h3>
              <div className="price">Custom</div>
              <p>Unlimited students</p>
              <a href="mailto:support@e-daarah.com?subject=Enterprise%20Plan%20Inquiry" className="btn secondary">Contact Us</a>
            </div>
          </div>
          <p className="pricing-more"><Link to="/pricing">Compare all plans →</Link></p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="section-inner">
          <h2>Ready to simplify your school management?</h2>
          <p>Join madrasahs across New Zealand and Nigeria already using e-Daarah.</p>
          <div className="cta-actions">
            <button onClick={() => navigate('/register')} className="btn primary">Start Your Free Trial</button>
            <button onClick={() => navigate('/demo')} className="btn secondary">View Live Demo</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="footer-logo-img" />
              <span className="footer-logo-text">e-Daarah</span>
            </div>
            <p className="footer-tagline">نظام إدارة المدارس الدينية</p>
            <p className="footer-sub">Designed for madrasahs. Ready for any school.</p>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/demo">Demo</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/register">Register</Link>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <Link to="/help">Help Center</Link>
              <a href="mailto:support@e-daarah.com">Contact</a>
              <Link to="/signin">Sign In</Link>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 e-Daarah. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
