import { openDB } from 'idb';

const DB_NAME = 'edaarah-offline';
const DB_VERSION = 1;

const STORES = {
  SYNC_QUEUE: 'sync-queue',      // Pending writes to replay
  CACHED_DATA: 'cached-data',    // Cached API responses
};

let dbPromise;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Sync queue: stores pending API calls
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queue = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
          queue.createIndex('createdAt', 'createdAt');
          queue.createIndex('type', 'type');
        }

        // Cached data: stores API responses for offline reading
        if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
          db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ── Sync Queue ─────────────────────────────────────

/**
 * Add a pending API call to the sync queue.
 * @param {string} type - Action type (e.g., 'attendance-bulk', 'attendance-solo')
 * @param {string} url - API endpoint path
 * @param {string} method - HTTP method
 * @param {object} data - Request body
 * @param {object} meta - Extra metadata (class name, date, etc. for display)
 */
export async function addToSyncQueue(type, url, method, data, meta = {}) {
  const db = await getDB();
  return db.add(STORES.SYNC_QUEUE, {
    type,
    url,
    method,
    data,
    meta,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

/** Get all pending items in the sync queue. */
export async function getSyncQueue() {
  const db = await getDB();
  return db.getAllFromIndex(STORES.SYNC_QUEUE, 'createdAt');
}

/** Get count of pending items. */
export async function getSyncQueueCount() {
  const db = await getDB();
  return db.count(STORES.SYNC_QUEUE);
}

/** Remove an item from the queue after successful sync. */
export async function removeFromSyncQueue(id) {
  const db = await getDB();
  return db.delete(STORES.SYNC_QUEUE, id);
}

/** Update retry count for a failed item. */
export async function incrementRetry(id) {
  const db = await getDB();
  const item = await db.get(STORES.SYNC_QUEUE, id);
  if (item) {
    item.retries += 1;
    item.lastRetry = new Date().toISOString();
    return db.put(STORES.SYNC_QUEUE, item);
  }
}

/** Clear all items from the queue. */
export async function clearSyncQueue() {
  const db = await getDB();
  return db.clear(STORES.SYNC_QUEUE);
}

// ── Cached Data ────────────────────────────────────

/**
 * Cache an API response for offline use.
 * @param {string} key - Cache key (e.g., 'students-classId-123')
 * @param {*} data - The data to cache
 */
export async function cacheData(key, data) {
  const db = await getDB();
  return db.put(STORES.CACHED_DATA, {
    key,
    data,
    cachedAt: new Date().toISOString(),
  });
}

/** Get cached data by key. Returns null if not found. */
export async function getCachedData(key) {
  const db = await getDB();
  const entry = await db.get(STORES.CACHED_DATA, key);
  return entry || null;
}

/** Remove a cached entry. */
export async function removeCachedData(key) {
  const db = await getDB();
  return db.delete(STORES.CACHED_DATA, key);
}

/** Clear all cached data. */
export async function clearCachedData() {
  const db = await getDB();
  return db.clear(STORES.CACHED_DATA);
}

export { STORES };
