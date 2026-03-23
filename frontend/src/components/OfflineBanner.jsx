import { useState, useEffect } from 'react';
import { onSyncStateChange, initSyncManager, processQueue } from '../utils/syncManager';
import './OfflineBanner.css';

function OfflineBanner() {
  const [state, setState] = useState({
    online: navigator.onLine,
    syncing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    initSyncManager();
    const unsub = onSyncStateChange(setState);
    return unsub;
  }, []);

  // Nothing to show when online with no pending items
  if (state.online && state.pendingCount === 0 && !state.syncing) {
    return null;
  }

  return (
    <div className={`offline-banner ${state.online ? 'syncing' : 'offline'}`}>
      {!state.online && (
        <>
          <span className="offline-dot" />
          You're offline
          {state.pendingCount > 0 && ` — ${state.pendingCount} change${state.pendingCount > 1 ? 's' : ''} pending`}
        </>
      )}
      {state.online && state.syncing && (
        <>
          <span className="offline-spinner" />
          Syncing {state.pendingCount} change{state.pendingCount > 1 ? 's' : ''}...
        </>
      )}
      {state.online && !state.syncing && state.pendingCount > 0 && (
        <>
          <span className="offline-dot warning" />
          {state.pendingCount} change{state.pendingCount > 1 ? 's' : ''} pending
          <button className="offline-retry-btn" onClick={() => processQueue()}>Sync now</button>
        </>
      )}
    </div>
  );
}

export default OfflineBanner;
