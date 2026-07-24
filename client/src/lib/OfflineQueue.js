import Dexie from "dexie";

// Initialize Dexie for offline queuing
const db = new Dexie("BacolorLMSOfflineDB");

// Define schema
db.version(1).stores({
  writeQueue: '++id, endpoint, method, user_id, created_at, retry_count, status'
});

/**
 * Enqueue a failed write request
 * @param {Object} payload
 * @param {string} payload.endpoint API path
 * @param {string} payload.method POST/PUT
 * @param {Object} payload.payload The request body
 * @param {string} [payload.user_id] User ID (optional, defaults to anonymous)
 */
export const enqueueWrite = async (payload) => {
  return await db.writeQueue.add({
    endpoint: payload.endpoint,
    method: payload.method,
    payload: payload.payload,
    user_id: payload.user_id || 'anonymous',
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: 'pending'
  });
};

/**
 * Remove an item from the queue
 * @param {number} id
 */
export const dequeueWrite = async (id) => {
  return await db.writeQueue.delete(id);
};

/**
 * Get all pending writes
 */
export const getAllPendingWrites = async () => {
  return await db.writeQueue.where('status').equals('pending').toArray();
};

export default db;
