import { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const MadrasahContext = createContext(null);

export function MadrasahProvider({ children }) {
  const { madrasahSlug } = useParams();
  const navigate = useNavigate();
  const [madrasah, setMadrasah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMadrasah = async () => {
      if (!madrasahSlug) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/auth/madrasah/${madrasahSlug}`);
        setMadrasah(response.data);
        setError(null);
      } catch (err) {
        console.error('Madrasah lookup failed:', err);
        if (err.response?.status === 429) {
          setError('Too many requests. Please wait a moment and refresh the page.');
        } else {
          setError('Madrasah not found');
          navigate('/', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMadrasah();
  }, [madrasahSlug, navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    if (error.includes('Too many requests')) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ marginBottom: '8px', color: '#374151' }}>Too Many Requests</h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Please wait a moment and try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return null; // Will redirect for other errors
  }

  return (
    <MadrasahContext.Provider value={{ madrasah, madrasahSlug }}>
      {children}
    </MadrasahContext.Provider>
  );
}

export function useMadrasah() {
  const context = useContext(MadrasahContext);
  if (!context) {
    throw new Error('useMadrasah must be used within MadrasahProvider');
  }
  return context;
}
