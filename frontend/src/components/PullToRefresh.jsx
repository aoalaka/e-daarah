import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * PullToRefresh wrapper — adds swipe-down-to-reload for PWA standalone mode.
 * Only activates when the page is scrolled to the top and in standalone display mode.
 */
export default function PullToRefresh({ children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const threshold = 80;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const handleTouchStart = useCallback((e) => {
    if (!isStandalone || refreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [isStandalone, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling.current || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      const dampened = Math.min(diff * 0.4, threshold * 1.5);
      setPullDistance(dampened);
      setPulling(true);
    } else {
      isPulling.current = false;
      setPulling(false);
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current || refreshing) return;
    isPulling.current = false;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.6);
      setPulling(false);
      setTimeout(() => window.location.reload(), 600);
    } else {
      setPulling(false);
      setPullDistance(0);
    }
  }, [pullDistance, refreshing]);

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
  const pastThreshold = pullDistance >= threshold;

  return (
    <>
      {(pulling || refreshing) && pullDistance > 10 && (
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
          transition: pulling ? 'none' : 'padding-top 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `rotate(${progress * 360}deg)`,
            opacity: Math.min(progress * 1.5, 1),
            transition: pulling ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            animation: refreshing ? 'ptr-spin 0.6s linear infinite' : 'none',
          }}>
            {pastThreshold && !refreshing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={refreshing ? '#2d6a4f' : '#6b7280'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                <path d="M21 3v6h-6" />
              </svg>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
      {children}
    </>
  );
}
