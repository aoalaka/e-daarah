import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './TrialBanner.css';

function TrialBanner({ trialEndsAt, subscriptionStatus, pricingPlan }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Don't show if dismissed or if user has an active subscription
  if (dismissed) return null;
  if (subscriptionStatus === 'active') return null;
  if (pricingPlan !== 'trial' && subscriptionStatus !== 'trialing') return null;

  // Calculate days remaining
  const now = new Date();
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;

  if (!trialEnd) return null;

  const diffTime = trialEnd - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Trial expired
  if (daysRemaining <= 0) {
    return (
      <div className="trial-banner trial-expired">
        <div className="trial-banner-content">
          <div className="trial-banner-icon">!</div>
          <div className="trial-banner-text">
            <strong>Your trial has expired.</strong>
            <span>Subscribe now to continue using e-daarah and keep your data.</span>
          </div>
        </div>
        <button
          className="trial-banner-btn"
          onClick={() => navigate(`/${window.location.pathname.split('/')[1]}/admin/settings`)}
        >
          Subscribe Now
        </button>
      </div>
    );
  }

  // Determine urgency based on days remaining
  let urgency = 'normal';
  if (daysRemaining <= 3) {
    urgency = 'critical';
  } else if (daysRemaining <= 7) {
    urgency = 'warning';
  }

  // Don't show banner if more than 10 days remaining
  if (daysRemaining > 10) return null;

  return (
    <div className={`trial-banner trial-${urgency}`}>
      <div className="trial-banner-content">
        <div className="trial-banner-icon">
          {urgency === 'critical' ? '!' : urgency === 'warning' ? '!' : 'i'}
        </div>
        <div className="trial-banner-text">
          <strong>
            {daysRemaining === 1
              ? 'Your trial ends tomorrow!'
              : `${daysRemaining} days left in your trial`}
          </strong>
          <span>
            {daysRemaining <= 3
              ? 'Subscribe now to keep your data and continue using e-daarah.'
              : 'Upgrade to a paid plan before your trial ends.'}
          </span>
        </div>
      </div>
      <div className="trial-banner-actions">
        <button
          className="trial-banner-btn"
          onClick={() => {
            // Navigate to settings tab (billing section)
            const currentPath = window.location.pathname;
            const slug = currentPath.split('/')[1];
            navigate(`/${slug}/admin`);
            // Trigger settings tab - this will be handled by parent
            window.dispatchEvent(new CustomEvent('openSettingsTab'));
          }}
        >
          Subscribe
        </button>
        {daysRemaining > 3 && (
          <button
            className="trial-banner-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}

export default TrialBanner;
