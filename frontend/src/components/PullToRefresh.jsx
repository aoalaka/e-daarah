import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * PullToRefresh wrapper — adds swipe-down-to-reload for PWA standalone mode.
 * Only activates when the page is scrolled to the top and in standalone display mode.
 */
export default function PullToRefresh({ children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const threshold = 80;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const handleTouchStart = useCallback((e) => {
    if (!isStandalone) return;
    // Only start pull if scrolled to top
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isStandalone]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      // Dampen the pull distance
      const dampened = Math.min(diff * 0.4, threshold * 1.5);
      setPullDistance(dampened);
      setPulling(true);
    } else {
      isPulling.current = false;
      setPulling(false);
      setPullDistance(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    if (pullDistance >= threshold) {
      window.location.reload();
    }
    isPulling.current = false;
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance]);

  useEffect(() => {
    if (!isStandalone) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isStandalone, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isStandalone) return children;

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <>
      {pulling && pullDistance > 10 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: `${Math.max(pullDistance - 10, 0)}px`,
          pointerEvents: 'none',
          transition: pulling ? 'none' : 'padding-top 0.2s ease',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${progress * 360}deg)`,
            opacity: Math.min(progress * 1.5, 1),
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
              <path d="M21 3v6h-6" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
