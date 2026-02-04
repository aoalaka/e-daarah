import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './SessionTimeout.css';

const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

function SessionTimeout({ onLogout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const navigate = useNavigate();
  const countdownRef = useRef(null);

  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('madrasah');

    if (onLogout) {
      onLogout();
    }

    navigate('/login', {
      state: { message: 'Your session has expired due to inactivity. Please log in again.' }
    });
  }, [navigate, onLogout]);

  const checkSession = useCallback(async () => {
    try {
      const response = await api.get('/auth/session-info');
      const { remainingInactivitySeconds, willExpireFromInactivity } = response.data;

      if (willExpireFromInactivity) {
        setRemainingSeconds(remainingInactivitySeconds);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    } catch (err) {
      // If we get a session timeout error, log out
      if (err.response?.data?.code === 'SESSION_TIMEOUT') {
        handleSessionExpired();
      }
    }
  }, [handleSessionExpired]);

  const handleExtendSession = async () => {
    try {
      // Any API call will extend the session (middleware updates last_activity)
      await api.get('/auth/session-info');
      setShowWarning(false);
    } catch (err) {
      console.error('Failed to extend session:', err);
    }
  };

  const handleLogoutNow = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('madrasah');

    if (onLogout) {
      onLogout();
    }

    navigate('/login');
  };

  // Check session periodically
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initial check after a short delay to avoid synchronous setState
    const initialTimeout = setTimeout(checkSession, 100);
    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkSession]);

  // Countdown timer when warning is shown
  useEffect(() => {
    if (showWarning && remainingSeconds > 0) {
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleSessionExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [showWarning, remainingSeconds, handleSessionExpired]);

  if (!showWarning) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h3>Session Expiring</h3>
        <p>Your session will expire due to inactivity in:</p>
        <div className="session-timeout-countdown">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <p className="session-timeout-subtext">
          Click "Stay Logged In" to continue your session.
        </p>
        <div className="session-timeout-actions">
          <button
            className="session-timeout-btn-primary"
            onClick={handleExtendSession}
          >
            Stay Logged In
          </button>
          <button
            className="session-timeout-btn-secondary"
            onClick={handleLogoutNow}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeout;
