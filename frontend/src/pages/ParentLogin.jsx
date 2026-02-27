import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useMadrasah } from '../contexts/MadrasahContext';
import './Login.css';

const COUNTRY_CODES = [
  { code: '+64', label: 'NZ +64' },
  { code: '+61', label: 'AU +61' },
  { code: '+234', label: 'NG +234' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+92', label: 'PK +92' },
  { code: '+27', label: 'ZA +27' },
  { code: '+60', label: 'MY +60' },
  { code: '+62', label: 'ID +62' },
];

function ParentLogin() {
  const { madrasahSlug } = useParams();
  const { madrasah } = useMadrasah();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+64');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    if (mode === 'register' && pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await authService.parentRegister(madrasahSlug, phone, phoneCountryCode, pin, name);
      } else {
        await authService.parentLogin(madrasahSlug, phone, phoneCountryCode, pin);
      }
      navigate(`/${madrasahSlug}/parent`);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{madrasah?.name || 'Parent Portal'}</h1>
          <p>{mode === 'register' ? 'Set up your parent account' : 'View your children\'s reports and fees'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Your Name (optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Fatima Ali"
                autoComplete="name"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                style={{ width: '110px', flexShrink: 0 }}
              >
                {COUNTRY_CODES.map(cc => (
                  <option key={cc.code} value={cc.code}>{cc.label}</option>
                ))}
              </select>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="Phone number"
                required
                autoComplete="tel"
                style={{ flex: 1 }}
              />
            </div>
            <small style={{ color: '#737373', marginTop: '4px', display: 'block' }}>
              Use the phone number your school has on file
            </small>
          </div>

          <div className="field">
            <label htmlFor="pin">{mode === 'register' ? 'Choose a 6-digit PIN' : 'PIN'}</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              maxLength="6"
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label htmlFor="confirmPin">Confirm PIN</label>
              <input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Re-enter your PIN"
                maxLength="6"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading
              ? (mode === 'register' ? 'Setting up...' : 'Signing in...')
              : (mode === 'register' ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', margin: '16px 0', fontSize: '14px', color: '#525252' }}>
          {mode === 'login' ? (
            <span>First time? <button type="button" onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: '#0a0a0a', fontWeight: 500, cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}>Set up your account</button></span>
          ) : (
            <span>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', color: '#0a0a0a', fontWeight: 500, cursor: 'pointer', padding: 0, fontSize: 'inherit', textDecoration: 'underline' }}>Sign in</button></span>
          )}
        </div>

        <div className="login-links">
          <Link to={`/${madrasahSlug}/login`}>Teacher/Admin Login</Link>
          <span className="divider">|</span>
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

export default ParentLogin;
