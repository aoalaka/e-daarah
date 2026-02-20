import { useState, useEffect, useCallback, useRef } from 'react';
import './GuidedTour.css';

function GuidedTour({ steps, isOpen, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, placement: 'bottom' });
  const tooltipRef = useRef(null);

  const step = steps[currentStep];

  const calculatePosition = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.target);
    if (!el) {
      // Skip steps with missing targets
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        onComplete();
      }
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Small delay after scroll to get accurate rect
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const padding = 8;
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Calculate tooltip position
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const gap = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let placement = 'bottom';
      let top = rect.bottom + gap;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // If not enough space below, try above
      if (top + tooltipHeight > vh - 20) {
        placement = 'top';
        top = rect.top - gap - tooltipHeight;
      }

      // If not enough space above either, position to the right
      if (top < 20) {
        placement = 'right';
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
      }

      // If not enough space on right, go left
      if (placement === 'right' && left + tooltipWidth > vw - 20) {
        placement = 'left';
        left = rect.left - gap - tooltipWidth;
      }

      // On mobile, always position below or above
      if (vw < 768) {
        if (rect.bottom + tooltipHeight + gap < vh - 20) {
          placement = 'bottom';
          top = rect.bottom + gap;
        } else {
          placement = 'top';
          top = rect.top - gap - tooltipHeight;
        }
        left = Math.max(16, (vw - Math.min(tooltipWidth, vw - 32)) / 2);
      }

      // Keep tooltip within viewport
      left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));
      top = Math.max(16, top);

      setTooltipPos({ top, left, placement });
    });
  }, [step, currentStep, steps.length, onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }
    calculatePosition();
  }, [isOpen, currentStep, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, calculatePosition]);

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
        className={`guided-tour-tooltip guided-tour-tooltip--${tooltipPos.placement}`}
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
