import { useState, useEffect, useCallback, useRef } from 'react';
import './GuidedTour.css';

function GuidedTour({ steps, isOpen, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);

  const step = steps[currentStep];

  // Track mobile/desktop
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Desktop: spotlight positioning
  const calculatePosition = useCallback(() => {
    if (!step || isMobile) return;

    const el = document.querySelector(step.target);
    const isVisible = el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
    if (!isVisible) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        onComplete();
      }
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const padding = 6;
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        const tooltipEl = tooltipRef.current;
        const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 300;
        const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 160;
        const gap = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let placement = 'bottom';
        let top = rect.bottom + gap;
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;

        if (top + tooltipHeight > vh - 20) {
          placement = 'top';
          top = rect.top - gap - tooltipHeight;
        }

        if (top < 20) {
          placement = 'right';
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;

          if (left + tooltipWidth > vw - 20) {
            placement = 'left';
            left = rect.left - gap - tooltipWidth;
          }
        }

        left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));
        top = Math.max(16, Math.min(top, vh - tooltipHeight - 16));

        setTooltipPos({ top, left, placement });
        setReady(true);
      }, 50);
    });
  }, [step, currentStep, steps.length, onComplete, isMobile]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setReady(false);
      return;
    }
    if (!isMobile) {
      setReady(false);
      calculatePosition();
    }
  }, [isOpen, currentStep, calculatePosition, isMobile]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleResize = () => {
      setReady(false);
      calculatePosition();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition, isMobile]);

  // Recalculate after tooltip renders
  useEffect(() => {
    if (isOpen && !isMobile && tooltipRef.current && !ready) {
      calculatePosition();
    }
  }, [isOpen, isMobile, ready, calculatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handleBack();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen || !step) return null;

  // Mobile: full-screen slideshow
  if (isMobile) {
    return (
      <div className="tour-mobile-overlay">
        <div className="tour-mobile-card">
          <button className="tour-mobile-skip" onClick={onSkip}>Skip</button>

          <div className="tour-mobile-icon">
            {step.icon || (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            )}
          </div>

          <h3 className="tour-mobile-title">{step.title}</h3>
          <p className="tour-mobile-content">{step.content}</p>

          {/* Progress dots */}
          <div className="tour-mobile-dots">
            {steps.map((_, i) => (
              <span key={i} className={`tour-mobile-dot ${i === currentStep ? 'active' : ''}`} />
            ))}
          </div>

          <div className="tour-mobile-actions">
            {currentStep > 0 && (
              <button className="tour-mobile-btn tour-mobile-btn--back" onClick={handleBack}>
                Back
              </button>
            )}
            <button className="tour-mobile-btn tour-mobile-btn--next" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop: spotlight tour
  return (
    <div className="guided-tour-overlay">
      {targetRect && (
        <div
          className="guided-tour-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      <div className="guided-tour-backdrop" onClick={onSkip} />

      <div
        ref={tooltipRef}
        className={`guided-tour-tooltip guided-tour-tooltip--${tooltipPos.placement} ${ready ? 'visible' : ''}`}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="guided-tour-tooltip-header">
          <span className="guided-tour-step-count">
            {currentStep + 1} of {steps.length}
          </span>
          <button className="guided-tour-skip" onClick={onSkip}>
            Skip
          </button>
        </div>
        <h4 className="guided-tour-title">{step.title}</h4>
        <p className="guided-tour-content">{step.content}</p>
        <div className="guided-tour-actions">
          {currentStep > 0 && (
            <button className="guided-tour-btn guided-tour-btn--back" onClick={handleBack}>
              Back
            </button>
          )}
          <button className="guided-tour-btn guided-tour-btn--next" onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuidedTour;
