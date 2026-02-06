import { Link } from 'react-router-dom';
import './DemoBanner.css';

function DemoBanner() {
  // Check if user is in demo mode
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isDemo = user.isDemo;

  if (!isDemo) return null;

  return (
    <div className="demo-banner">
      <span className="demo-banner-text">
        🔍 You're exploring a demo account
      </span>
      <Link to="/register" className="demo-banner-cta">
        Register Your Madrasah →
      </Link>
    </div>
  );
}

export default DemoBanner;
