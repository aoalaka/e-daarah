import api from '../services/api';
import {
  getSyncQueue,
  removeFromSyncQueue,
  incrementRetry,
  getSyncQueueCount,
} from './offlineStore';

const MAX_RETRIES = 5;
let isSyncing = false;
let listeners = new Set();

// ── Online/Offline State ────────────────────────────

export function isOnline() {
  return navigator.onLine;
}

/**
 * Subscribe to sync state changes.
 * Listener receives: { online, syncing, pendingCount }
 */
export function onSyncStateChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(state) {
  listeners.forEach(fn => fn(state));
}

async function emitCurrentState() {
  const pendingCount = await getSyncQueueCount();
  notifyListeners({
    online: isOnline(),
    syncing: isSyncing,
    pendingCount,
  });
}

// ── Queue Replay ────────────────────────────────────

/**
 * Process all pending items in the sync queue.
 * Called automatically when connectivity returns.
 */
export async function processQueue() {
  if (isSyncing || !isOnline()) return;

  const items = await getSyncQueue();
  if (items.length === 0) return;

  isSyncing = true;
  await emitCurrentState();

  for (const item of items) {
    if (!isOnline()) break; // Stop if we went offline again

    if (item.retries >= MAX_RETRIES) {
      // Give up after max retries — remove from queue
      console.warn(`[Sync] Dropping item after ${MAX_RETRIES} retries:`, item.meta);
      await removeFromSyncQueue(item.id);
      continue;
    }

    try {
      await api({
        method: item.method,
        url: item.url,
        data: item.data,
      });
      await removeFromSyncQueue(item.id);
    } catch (error) {
      const status = error.response?.status;

      if (status === 401) {
        // Token expired — stop syncing, user needs to re-login
        isSyncing = false;
        await emitCurrentState();
        return;
      }

      if (status >= 400 && status < 500) {
        // Client error (duplicate, validation) — discard, can't be fixed by retry
        console.warn(`[Sync] Discarding item (${status}):`, item.meta, error.response?.data);
        await removeFromSyncQueue(item.id);
      } else {
        // Server error or network error — retry later
        await incrementRetry(item.id);
      }
    }
  }

  isSyncing = false;
  await emitCurrentState();
}

// ── Event Listeners ─────────────────────────────────

function handleOnline() {
  emitCurrentState();
  // Small delay to let the connection stabilize
  setTimeout(() => processQueue(), 1000);
}

function handleOffline() {
  emitCurrentState();
}

/**
 * Initialize the sync manager. Call once at app startup.
 * Sets up online/offline listeners and processes any pending queue.
 */
export function initSyncManager() {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Process any items that queued up while the app was closed
  if (isOnline()) {
    setTimeout(() => processQueue(), 2000);
  }

  // Emit initial state
  emitCurrentState();
}

/**
 * Cleanup listeners. Call on app unmount if needed.
 */
export function destroySyncManager() {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  listeners.clear();
}
