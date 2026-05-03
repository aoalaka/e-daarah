import { useState, useRef, useEffect } from 'react';

/**
 * Verified badge — shown next to madrasah names that have been
 * manually verified by the E-Daarah team. Click/tap reveals a small
 * popover explaining what verification means.
 *
 * Props:
 *   size  – icon diameter in px (default 18)
 */
export default function VerifiedBadge({ size = 18 }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        title="Verified by E-Daarah — click to learn more"
        aria-label="Verified by E-Daarah — click to learn more"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          lineHeight: 0,
        }}
      >
        <svg
          className="verified-badge"
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
        >
          <circle cx="10" cy="10" r="10" fill="#1d9bf0" />
          <path
            d="M6 10.4 8.5 13 14 7"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 8,
            width: 260,
            maxWidth: 'calc(100vw - 32px)',
            background: '#0f172a',
            color: '#fff',
            padding: '12px 14px',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.45,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
            <svg width={14} height={14} viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#1d9bf0" />
              <path d="M6 10.4 8.5 13 14 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Verified by E-Daarah</span>
          </div>
          <div style={{ color: '#cbd5e1', fontSize: 12 }}>
            The E-Daarah team has confirmed this is a genuine madrasah. Parents and the public can use this badge to recognise authentic schools on our platform.
          </div>
          {/* Arrow */}
          <span
            style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 12,
              height: 12,
              background: '#0f172a',
            }}
          />
        </div>
      )}
    </span>
  );
}
