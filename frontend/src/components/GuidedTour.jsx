import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './GuidedTour.css';

function GuidedTour({ steps, isOpen, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [visibleSteps, setVisibleSteps] = useState([]);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);

  // Track mobile/desktop
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Filter steps to only those with visible targets
  useEffect(() => {
    if (!isOpen) {
      setVisibleSteps([]);
      setCurrentStep(0);
      setReady(false);
      return;
    }
    // Small delay to let DOM settle
    const timer = setTimeout(() => {
      const filtered = steps.filter(s => {
        const el = document.querySelector(s.target);
        return el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
      });
      setVisibleSteps(filtered);
      setCurrentStep(0);
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, steps]);

  const step = visibleSteps[currentStep];

  // Desktop: spotlight positioning
  const calculatePosition = useCallback(() => {
    if (!step || isMobile) return;

    const el = document.querySelector(step.target);
    if (!el) return;

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
  }, [step, isMobile]);

  useEffect(() => {
    if (!isOpen || visibleSteps.length === 0) return;
    if (!isMobile) {
      setReady(false);
      calculatePosition();
    }
  }, [isOpen, currentStep, calculatePosition, isMobile, visibleSteps]);

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
  }, [isOpen, currentStep, visibleSteps.length]);

  const handleNext = () => {
    if (currentStep < visibleSteps.length - 1) {
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

  if (!isOpen || !step || isMobile || visibleSteps.length === 0) return null;

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
            {currentStep + 1} of {visibleSteps.length}
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
            {currentStep === visibleSteps.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuidedTour;
