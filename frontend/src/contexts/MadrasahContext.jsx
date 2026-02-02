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
        setError('Madrasah not found');
        navigate('/', { replace: true });
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
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return null; // Will redirect
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
