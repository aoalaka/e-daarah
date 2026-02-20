import { useState, useEffect, useCallback, useRef } from 'react';
import './GuidedTour.css';

function GuidedTour({ steps, isOpen, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const [ready, setReady] = useState(false);
  const tooltipRef = useRef(null);
  const rafRef = useRef(null);

  const step = steps[currentStep];

  const calculatePosition = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    // Skip if element missing or not visible (e.g. sidebar hidden on mobile)
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

    // Wait for scroll + render to settle
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

        // Measure actual tooltip if available
        const tooltipEl = tooltipRef.current;
        const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 300;
        const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 160;
        const gap = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw < 768;

        let placement = 'bottom';
        let top, left;

        if (isMobile) {
          // On mobile: always center horizontally, position above or below
          const tw = Math.min(tooltipWidth, vw - 32);
          left = (vw - tw) / 2;

          if (rect.bottom + tooltipHeight + gap + 20 < vh) {
            placement = 'bottom';
            top = rect.bottom + gap;
          } else if (rect.top - tooltipHeight - gap > 20) {
            placement = 'top';
            top = rect.top - gap - tooltipHeight;
          } else {
            // Fallback: position at bottom of screen
            placement = 'bottom';
            top = vh - tooltipHeight - 20;
          }
        } else {
          // Desktop positioning
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;

          // Try below first
          if (top + tooltipHeight > vh - 20) {
            // Try above
            placement = 'top';
            top = rect.top - gap - tooltipHeight;
          }

          // If above doesn't work, try right
          if (top < 20) {
            placement = 'right';
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + gap;

            // If right doesn't fit, try left
            if (left + tooltipWidth > vw - 20) {
              placement = 'left';
              left = rect.left - gap - tooltipWidth;
            }
          }

          // Clamp within viewport
          left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));
          top = Math.max(16, Math.min(top, vh - tooltipHeight - 16));
        }

        setTooltipPos({ top, left, placement });
        setReady(true);
      }, 50);
    });
  }, [step, currentStep, steps.length, onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setReady(false);
      return;
    }
    setReady(false);
    calculatePosition();
  }, [isOpen, currentStep, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setReady(false);
      calculatePosition();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition]);

  // Recalculate after tooltip renders (to get accurate height)
  useEffect(() => {
    if (isOpen && tooltipRef.current && !ready) {
      calculatePosition();
    }
  }, [isOpen, ready, calculatePosition]);

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

  return (
    <div className="guided-tour-overlay">
      {/* Spotlight cutout */}
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

      {/* Click backdrop to skip */}
      <div className="guided-tour-backdrop" onClick={onSkip} />

      {/* Tooltip */}
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
