import { useNavigate, Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './Landing.css';

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <SEO
        title="e-Daarah — Attendance & Admin for Madrasahs"
        description="Stop losing track of who showed up. e-Daarah replaces paper registers with a simple system madrasah teachers actually use. Attendance, reports, and parent updates — all in one place."
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
            <h1 className="hero-title">Stop Losing Track<br />of Your Students</h1>
            <p className="hero-subtitle">
              Paper registers get lost. Parents owe fees but there's no clear record
              to show them. And everyone keeps asking "was my child there today?" —
              e-Daarah replaces all of that with one simple system.
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
          <h2 className="section-heading">Taking attendance shouldn't be hard</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h3>Add Your Classes</h3>
              <p>Register your madrasah, create classes, and add your students. Takes about 10 minutes.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Teachers Take Attendance</h3>
              <p>Each teacher opens their class, taps present or absent, and saves. Done in under a minute.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>Everyone Stays Informed</h3>
              <p>Parents see attendance instantly. Admins see who's falling behind. No chasing, no phone calls.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="section-inner">
          <p className="section-label">More than just attendance</p>
          <h2 className="section-heading">Once attendance is sorted, everything else gets easier</h2>

          <div className="feature-grid">
            <div className="feature-card">
              <h3>Attendance in One Tap</h3>
              <p>Teachers mark the whole class in under a minute. Grade dressing, behavior, and punctuality at the same time. No paper needed.</p>
            </div>
            <div className="feature-card">
              <h3>Know Who's Falling Behind</h3>
              <p>See which students are missing too many days before it becomes a problem. Get alerts, not surprises.</p>
            </div>
            <div className="feature-card">
              <h3>Fee Records Parents Can See</h3>
              <p>Parents see exactly what they owe and what they've paid — no arguments. You see who's behind at a glance, so you can follow up before it piles up.</p>
            </div>
            <div className="feature-card">
              <h3>Parents Stay in the Loop</h3>
              <p>Parents log in and see their child's attendance, conduct, and results. No more "was my child there?" messages.</p>
            </div>
            <div className="feature-card">
              <h3>Qur'an Progress</h3>
              <p>Track hifdh, tilawah, and revision per student. Know exactly where each child is in their memorisation journey.</p>
            </div>
            <div className="feature-card">
              <h3>Exam Results &amp; Rankings</h3>
              <p>Record scores, generate rankings, and see class performance at a glance. End-of-term reports in seconds, not weekends.</p>
            </div>
            <div className="feature-card">
              <h3>Year-End Promotions</h3>
              <p>Move students between classes at the end of each session. Bulk promote, retain, or mark as graduated.</p>
            </div>
            <div className="feature-card">
              <h3>Separate Logins</h3>
              <p>Admins manage everything. Teachers see only their classes. Parents see only their children. Everyone gets what they need.</p>
            </div>
            <div className="feature-card">
              <h3>Reports &amp; Exports</h3>
              <p>Download attendance records, student reports, and exam results as CSV or PDF. Ready for your committee meetings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof — uncomment when we have more users
      <section className="social-proof">
        <p className="section-label">Trusted by madrasahs in New Zealand and beyond</p>
        <div className="marquee">
          <div className="marquee-track">
            <div className="marquee-item">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-detail">Tauranga, New Zealand</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-detail">Palmerston North, NZ</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-detail">Ibadan, Nigeria</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Tauranga Masjid Madrasah</span>
              <span className="proof-detail">Tauranga, New Zealand</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">MMA Madrasah</span>
              <span className="proof-detail">Palmerston North, NZ</span>
            </div>
            <span className="marquee-dot">·</span>
            <div className="marquee-item">
              <span className="proof-name">Al-Modrasatu Ath-Thaqafiyyah</span>
              <span className="proof-detail">Ibadan, Nigeria</span>
            </div>
            <span className="marquee-dot">·</span>
          </div>
        </div>
        <p className="proof-cta">Interested in a demo? <a href="mailto:support@e-daarah.com?subject=Demo%20Request">Get in touch</a></p>
      </section>
      */}

      {/* Pricing */}
      <section id="pricing" className="pricing">
        <div className="section-inner">
          <p className="section-label">Pricing</p>
          <h2 className="section-heading">Simple, transparent pricing</h2>
          <p className="section-desc">14-day free trial. No credit card required. All prices in USD.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <h3>Solo</h3>
              <div className="price"><span className="price-currency">USD</span> $5<span>/mo</span></div>
              <p>Up to 30 students</p>
              <button onClick={() => navigate('/register')} className="btn secondary">Start Trial</button>
            </div>
            <div className="price-card">
              <h3>Standard</h3>
              <div className="price"><span className="price-currency">USD</span> $12<span>/mo</span></div>
              <p>Up to 100 students</p>
              <button onClick={() => navigate('/register')} className="btn secondary">Start Trial</button>
            </div>
            <div className="price-card featured">
              <h3>Plus</h3>
              <div className="price"><span className="price-currency">USD</span> $29<span>/mo</span></div>
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
          <h2>Try it free for 14 days</h2>
          <p>Set up your madrasah in 10 minutes. No credit card required.</p>
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
            <p className="footer-sub">Attendance and admin for madrasahs.</p>
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
