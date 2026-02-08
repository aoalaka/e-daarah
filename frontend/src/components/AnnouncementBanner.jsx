import { useState, useEffect } from 'react';
import api from '../services/api';
import './AnnouncementBanner.css';

function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/admin/announcements');
      setAnnouncements(response.data || []);
    } catch (error) {
      // Silently fail - announcements are non-critical
    }
  };

  const handleDismiss = async (id) => {
    setDismissed([...dismissed, id]);
    try {
      await api.post(`/admin/announcements/${id}/dismiss`);
    } catch (error) {
      // Already hidden from UI
    }
  };

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map(a => (
        <div key={a.id} className={`announcement-banner ${a.type}`}>
          <div className="announcement-banner-content">
            <span className="announcement-banner-icon">
              {a.type === 'warning' ? '⚠️' : a.type === 'success' ? '✅' : a.type === 'update' ? '🆕' : 'ℹ️'}
            </span>
            <div className="announcement-banner-text">
              <strong>{a.title}</strong>
              <span>{a.message}</span>
            </div>
          </div>
          <button
            className="announcement-banner-dismiss"
            onClick={() => handleDismiss(a.id)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}

export default AnnouncementBanner;
