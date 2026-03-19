import { useState, useEffect, useRef } from 'react';
import { SURAHS } from '../data/surahs';
import './SurahPickerModal.css';

function SurahPickerModal({ isOpen, onClose, onSelect, currentSurahNumber }) {
  const [search, setSearch] = useState('');
  const listRef = useRef(null);
  const currentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      // Scroll to current surah after render
      setTimeout(() => {
        if (currentRef.current) {
          currentRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }, 50);
    }
  }, [isOpen, currentSurahNumber]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = search.trim()
    ? SURAHS.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.n).includes(search)
      )
    : SURAHS;

  // Group by juz
  const grouped = {};
  filtered.forEach(s => {
    if (!grouped[s.juz]) grouped[s.juz] = [];
    grouped[s.juz].push(s);
  });

  return (
    <div className="spm-overlay" onClick={onClose}>
      <div className="spm-sheet" onClick={e => e.stopPropagation()}>
        <div className="spm-header">
          <h3>Select Surah</h3>
          <button className="spm-close" onClick={onClose}>&times;</button>
        </div>
        <div className="spm-search">
          <input
            type="text"
            placeholder="Search by name or number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="spm-list" ref={listRef}>
          {Object.entries(grouped).map(([juz, surahs]) => (
            <div key={juz}>
              <div className="spm-juz-header">Juz {juz}</div>
              {surahs.map(s => (
                <button
                  key={s.n}
                  ref={s.n === currentSurahNumber ? currentRef : null}
                  className={`spm-item${s.n === currentSurahNumber ? ' current' : ''}`}
                  onClick={() => { onSelect(s); onClose(); }}
                >
                  <span className="spm-number">{s.n}</span>
                  <span className="spm-name">{s.name}</span>
                  <span className="spm-ayahs">{s.ayahs} ayahs</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="spm-empty">No surahs found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SurahPickerModal;
