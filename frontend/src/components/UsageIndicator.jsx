import './UsageIndicator.css';

// Plan limits configuration (should match backend)
const PLAN_LIMITS = {
  trial: { maxStudents: 75, maxTeachers: 5, maxClasses: 5 },
  standard: { maxStudents: 75, maxTeachers: 5, maxClasses: 5 },
  plus: { maxStudents: 300, maxTeachers: 20, maxClasses: 15 },
  enterprise: { maxStudents: Infinity, maxTeachers: Infinity, maxClasses: Infinity }
};

function UsageIndicator({ type, current, plan = 'trial' }) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

  let max;
  switch (type) {
    case 'students':
      max = limits.maxStudents;
      break;
    case 'teachers':
      max = limits.maxTeachers;
      break;
    case 'classes':
      max = limits.maxClasses;
      break;
    default:
      return null;
  }

  // Don't show indicator for unlimited plans
  if (max === Infinity) {
    return null;
  }

  const percentage = Math.min((current / max) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = current >= max;

  return (
    <div className={`usage-indicator ${isAtLimit ? 'at-limit' : isNearLimit ? 'near-limit' : ''}`}>
      <div className="usage-bar">
        <div
          className="usage-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="usage-text">
        {current} / {max}
      </span>
    </div>
  );
}

export default UsageIndicator;
export { PLAN_LIMITS };
