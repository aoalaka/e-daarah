import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth.service';
import SEO from '../components/SEO';
import './Demo.css';

const DEMO_PLANS = [
  {
    slug: 'solo-demo',
    name: 'Solo',
    school: 'Ustadh Idris Classes',
    price: '$5/mo',
    description: 'For individual teachers managing their own classes',
    stats: { students: 6, teachers: 0, classes: 2 },
    features: ['Attendance tracking', "Qur'an progress", 'Fee tracking', 'Simple dashboard'],
    isSolo: true,
    color: '#5c6bc0'
  },
  {
    slug: 'standard-demo',
    name: 'Standard',
    school: 'Al-Noor Weekend School',
    price: '$12/mo',
    description: 'Perfect for small weekend schools',
    stats: { students: 8, teachers: 1, classes: 2 },
    features: ['Attendance tracking', 'Behavior & dressing grades', 'Exam records', 'Student ranking'],
    color: '#2d6a4f'
  },
  {
    slug: 'plus-demo',
    name: 'Plus',
    school: 'Baitul Ilm Academy',
    price: '$29/mo',
    description: 'For growing full-time madrasahs',
    stats: { students: 16, teachers: 3, classes: 4 },
    features: ['Everything in Standard', 'Parent portal', 'Advanced reports', 'Multiple teachers', 'Priority support'],
    featured: true,
    color: '#1a1a1a'
  },
  {
    slug: 'enterprise-demo',
    name: 'Enterprise',
    school: 'Darul Uloom Al-Hikmah',
    price: 'Custom',
    description: 'Large institutions with multiple programs',
    stats: { students: 24, teachers: 4, classes: 6 },
    features: ['Everything in Plus', 'Unlimited everything', 'Custom integrations', 'Dedicated support', 'SLA guarantee'],
    color: '#333'
  }
];

function Demo() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const handleDemoLogin = async (slug, role) => {
    setLoading(`${slug}-${role}`);
    setError('');

    try {
      const data = await authService.demoLogin(slug, role);
      const madrasah = authService.getMadrasah();
      let path;
      if (role === 'admin' && madrasah?.pricingPlan === 'solo') {
        path = `/${slug}/solo`;
      } else {
        path = role === 'admin' ? `/${slug}/admin` : `/${slug}/teacher`;
      }
      navigate(path);
    } catch (err) {
      setError('Failed to start demo. Please try again.');
      console.error('Demo login error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="demo-page">
      <SEO
        title="Try the Demo — e-Daarah"
        description="Explore e-Daarah with a fully-loaded demo. See attendance tracking, exam recording, and parent reports in action. No account needed."
      />
      <header className="demo-header">
        <Link to="/" className="logo">
          <img src="/e-daarah-whitebg-logo.png" alt="e-Daarah" className="logo-img" />
          <span className="logo-text">e-Daarah</span>
        </Link>
        <nav className="header-nav">
          <Link to="/pricing" className="nav-link">Pricing</Link>
          <Link to="/signin" className="nav-link">Sign In</Link>
          <Link to="/register" className="nav-link primary">Get Started</Link>
        </nav>
      </header>

      <section className="demo-hero">
        <h1>Try e-Daarah</h1>
        <p>Explore a fully-loaded demo with real data. No account needed.</p>
      </section>

      {error && <div className="demo-error">{error}</div>}

      <section className="demo-cards">
        {DEMO_PLANS.map((plan) => (
          <div key={plan.slug} className={`demo-card ${plan.featured ? 'featured' : ''}`}>
            <div className="demo-card-header">
              <span className="plan-badge" style={{ background: plan.color }}>{plan.name}</span>
              <span className="plan-price">{plan.price}</span>
            </div>

            <h2 className="demo-school-name">{plan.school}</h2>
            <p className="demo-card-desc">{plan.description}</p>

            <div className="demo-stats">
              <div className="stat">
                <span className="stat-value">{plan.stats.students}</span>
                <span className="stat-label">Students</span>
              </div>
              <div className="stat">
                <span className="stat-value">{plan.stats.teachers}</span>
                <span className="stat-label">Teachers</span>
              </div>
              <div className="stat">
                <span className="stat-value">{plan.stats.classes}</span>
                <span className="stat-label">Classes</span>
              </div>
            </div>

            <ul className="demo-features">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <div className="demo-actions">
              {plan.isSolo ? (
                <button
                  onClick={() => handleDemoLogin(plan.slug, 'admin')}
                  disabled={loading !== null}
                  className="demo-btn admin"
                  style={{ width: '100%' }}
                >
                  {loading === `${plan.slug}-admin` ? 'Loading...' : 'Try Solo Dashboard'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleDemoLogin(plan.slug, 'admin')}
                    disabled={loading !== null}
                    className="demo-btn admin"
                  >
                    {loading === `${plan.slug}-admin` ? 'Loading...' : 'Try as Admin'}
                  </button>
                  <button
                    onClick={() => handleDemoLogin(plan.slug, 'teacher')}
                    disabled={loading !== null}
                    className="demo-btn teacher"
                  >
                    {loading === `${plan.slug}-teacher` ? 'Loading...' : 'Try as Teacher'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="demo-info">
        <p>Explore the demo freely. Data resets regularly for a fresh experience.</p>
        <p>Ready to start? <Link to="/register">Create your madrasah →</Link></p>
      </section>

      <footer className="demo-footer">
        <p>© 2026 e-Daarah</p>
      </footer>
    </div>
  );
}

export default Demo;
