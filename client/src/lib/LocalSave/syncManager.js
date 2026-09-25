import { localDb } from '../localDb';
import apiClient from '../apiClient';
import toast from 'react-hot-toast';

export const MAX_RETRY_COUNT = 5;
export const MAX_AUTH_RETRY_COUNT = 3; // Bounded retries for transient auth (401) races
export const BASE_DELAY_MS = 10000; // 10 seconds
export const MAX_DELAY_MS = 1800000; // 30 minutes

let retryTimeoutId = null;
let isSyncing = false;
let pendingRerun = false;

/**
 * Full-jitter exponential backoff calculation:
 * delay = min(MAX_DELAY, BASE_DELAY * 2^retryCount) + uniform_random(0, delay * 0.3)
 */
export const calculateBackoff = (retryCount) => {
  const exponent = Math.max(0, retryCount - 1);
  const baseBackoff = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, exponent));
  const jitter = Math.floor(Math.random() * (baseBackoff * 0.3));
  return baseBackoff + jitter;
};

/**
 * Distinguish between transient and terminal errors
 */
export const isTransientError = (error, retryCount = 0) => {
  // Device network error or timeout while browser reports online
  if (!error.response && navigator.onLine) return true;
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;

  // Rate-limiting (429) is transient
  if (error.response?.status === 429) return true;

  // Server-side errors (500–599) are transient
  if (error.response?.status >= 500 && error.response?.status <= 599) return true;

  // Auth race condition (401 Unauthorized) is transient ONLY within bounded retry budget
  if (error.response?.status === 401 && retryCount < MAX_AUTH_RETRY_COUNT) return true;

  // Everything else (400, 403, 404, 422, unhandled schema, or 401 past budget) is terminal
  return false;
};


/**
 * Human-readable error message extractor
 */
export const extractErrorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.status === 401) return 'Session expired. Please log in again.';
  if (error.response?.status === 403) return 'Permission denied for this action.';
  if (error.response?.status === 404) return 'The requested resource no longer exists.';
  if (error.response?.status === 409) return error.response?.data?.message || error.response?.data?.error || 'State conflict: resource was modified while offline.';
  if (error.response?.status === 422) return 'Validation error: data was rejected by the server.';
  if (error.response?.status >= 500) return 'Server error. The service is temporarily unavailable.';
  if (error.message) return error.message;
  return 'Unknown error during offline synchronization.';
};

/**
 * Action human-readable labels for notifications and UI
 */
export const getActionDescription = (task) => {
  if (!task) return 'Unknown Action';
  const p = task.payload || {};
  switch (task.action_type) {
    case 'SUBMIT_FEEDBACK':
      return p.subject ? `Feedback: "${p.subject}"` : 'Feedback Message';
    case 'REPLY_FEEDBACK':
      return `Reply to Ticket #${p.feedback_id || p.id || ''}`;
    case 'MARK_STEP_COMPLETE':
      return `Module ${p.mod_id || ''} Step ${p.step_id || ''} Progress`;
    case 'SUBMIT_QUIZ':
      return `Quiz Submission for Module ${p.mod_id || ''}`;
    case 'UPDATE_PROGRESS':
      return `Module ${p.mod_id || ''} Progress (${p.progress || 0}%)`;
    case 'COMPLETE_MODULE':
      return `Completion Certificate for Module ${p.mod_id || ''}`;
    case 'UPDATE_NAME':
      return `Name Change to "${p.name || ''}"`;
    case 'UPDATE_AVATAR':
      return 'Profile Picture Update';
    case 'UPDATE_NOTIFICATION_SETTINGS':
      return 'Notification Preferences Update';
    default:
      return task.action_type || 'Queued Action';
  }
};

export let memorySyncQueue = [];

export const clearMemoryQueue = () => {
  memorySyncQueue = [];
};

export const enqueueMemoryTask = (action_type, payload) => {
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const task = {
    sync_id: memoryId,
    action_type,
    status: 'pending',
    payload,
    retry_count: 0,
    created_at: new Date().toISOString(),
    is_memory_only: true
  };
  memorySyncQueue.push(task);
  window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
  return {
    success: true,
    task,
    warning: 'Storage restricted (Private Browsing / Quota Exceeded). Action queued in memory for this session only — do not close this tab.'
  };
};

export const enqueueSyncTask = async (action_type, payload) => {
  const task = {
    action_type,
    status: 'pending',
    payload,
    retry_count: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const id = await localDb.sync_queue.add(task);
    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return { status: 'queued', storageType: 'idb', id };
  } catch (error) {
    console.warn('[SyncManager] IndexedDB write failed; falling back to in-memory queue:', error);
    const memRes = enqueueMemoryTask(action_type, payload);
    return {
      status: 'queued_memory_only',
      storageType: 'memory',
      id: memRes.task.sync_id,
      warning: memRes.warning
    };
  }
};

export const updateTaskRecord = async (syncId, updates) => {
  if (typeof syncId === 'string' && syncId.startsWith('mem_')) {
    const item = memorySyncQueue.find((t) => t.sync_id === syncId);
    if (item) {
      Object.assign(item, updates);
    }
    return;
  }
  try {
    await localDb.sync_queue.update(syncId, updates);
  } catch (err) {
    console.warn('[SyncManager] Failed to update task in Dexie:', err);
  }
};

export const getAllPendingWrites = async () => {
  const now = Date.now();
  let dbTasks = [];
  try {
    const all = await localDb.sync_queue.toArray();
    dbTasks = all.filter(
      (t) => t.status === 'pending' || (t.status === 'retrying' && (!t.next_retry_at || t.next_retry_at <= now))
    );
  } catch (err) {
    console.warn('[SyncManager] Failed to read from Dexie sync_queue:', err);
  }

  const memTasks = memorySyncQueue.filter(
    (t) => t.status === 'pending' || (t.status === 'retrying' && (!t.next_retry_at || t.next_retry_at <= now))
  );

  return [...dbTasks, ...memTasks];
};

export const getFailedTasks = async () => {
  let dbFailed = [];
  try {
    dbFailed = await localDb.sync_queue.where('status').equals('failed').toArray();
  } catch (err) {
    console.warn('[SyncManager] Failed to read failed tasks from Dexie:', err);
  }
  const memFailed = memorySyncQueue.filter((t) => t.status === 'failed');
  return [...dbFailed, ...memFailed];
};

export const getAllSyncQueueItems = async () => {
  let dbItems = [];
  try {
    dbItems = await localDb.sync_queue.toArray();
  } catch (err) {
    console.warn('[SyncManager] Failed to read sync_queue from Dexie:', err);
  }
  return [...dbItems, ...memorySyncQueue];
};

export const dequeueWrite = async (syncId) => {
  if (typeof syncId === 'string' && syncId.startsWith('mem_')) {
    memorySyncQueue = memorySyncQueue.filter((t) => t.sync_id !== syncId);
    return true;
  }
  try {
    return await localDb.sync_queue.delete(syncId);
  } catch (err) {
    console.warn('[SyncManager] Failed to delete from Dexie sync_queue:', err);
  }
};

export const retryFailedTask = async (syncId) => {
  await updateTaskRecord(syncId, {
    status: 'pending',
    retry_count: 0,
    next_retry_at: null,
    last_error: null,
    error_type: null
  });
  window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
  return processOfflineQueue();
};

export const discardFailedTask = async (syncId) => {
  await dequeueWrite(syncId);
  window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
};

/**
 * Dispatch an individual task based on action_type
 */
const dispatchTask = async (task) => {
  switch (task.action_type) {
    case 'SUBMIT_FEEDBACK':
      return await apiClient.post('/feedbacks', task.payload);

    case 'REPLY_FEEDBACK':
      return await apiClient.put(
        `/feedbacks/${task.payload.feedback_id || task.payload.id}/reply`,
        { reply: task.payload.reply }
      );

    case 'MARK_STEP_COMPLETE':
      return await apiClient.post(
        `/modules/${task.payload.mod_id}/steps/${task.payload.step_id}/complete`,
        { answers: null }
      );

    case 'SUBMIT_QUIZ':
      return await apiClient.post(
        `/modules/${task.payload.mod_id}/steps/${task.payload.step_id}/complete`,
        { answers: task.payload.answer }
      );

    case 'UPDATE_PROGRESS':
    case 'COMPLETE_MODULE':
      return await apiClient.post('/modules/progress', task.payload);

    case 'UPDATE_NAME':
      return await apiClient.put('/auth/update-user', { name: task.payload.name });

    case 'UPDATE_AVATAR':
      return await apiClient.put('/auth/update-user', { image: task.payload.image });

    case 'UPDATE_NOTIFICATION_SETTINGS':
      return await apiClient.put('/users/me/settings', task.payload.settings || task.payload);

    default:
      throw new Error(`Terminal: Unsupported action_type '${task.action_type}'`);
  }
};

/**
 * Main synchronization loop to process queued offline tasks
 */
export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;

  if (isSyncing) {
    console.log('[SyncManager] Sync already in progress. Flagging pending rerun.');
    pendingRerun = true;
    return;
  }

  isSyncing = true;
  pendingRerun = false;

  try {
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }

    const tasksToProcess = await getAllPendingWrites();
    if (tasksToProcess.length === 0) {
      scheduleNextRetryIfNeeded();
      return;
    }

    console.log(`[SyncManager] Processing ${tasksToProcess.length} queued offline actions...`);

    for (const task of tasksToProcess) {
      // Abort loop immediately if device goes offline mid-batch
      if (!navigator.onLine) {
        console.warn('[SyncManager] Network disconnected mid-sync. Pausing queue.');
        break;
      }

      try {
        await dispatchTask(task);

        // Successfully synced: delete from localDb
        await dequeueWrite(task.sync_id);
        console.log(`[SyncManager] Successfully synced task ${task.sync_id} (${task.action_type})`);

        window.dispatchEvent(
          new CustomEvent('offline-sync-item-success', { detail: { syncId: task.sync_id, task } })
        );
        window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
      } catch (error) {
        // If network dropped mid-request, pause without burning a retry attempt
        if (!navigator.onLine) {
          console.warn(`[SyncManager] Network lost during task ${task.sync_id}. Retaining attempt budget.`);
          break;
        }

        const isAuthError = error.response?.status === 401;
        const currentRetries = (task.retry_count || 0) + 1;
        const maxAllowedRetries = isAuthError ? MAX_AUTH_RETRY_COUNT : MAX_RETRY_COUNT;
        const errorMessage = extractErrorMessage(error);
        const isTransient = isTransientError(error, task.retry_count || 0);

        if (isTransient && currentRetries < maxAllowedRetries) {
          // Schedule next exponential backoff
          const backoffDelay = calculateBackoff(currentRetries);
          const nextRetryAt = Date.now() + backoffDelay;

          console.warn(
            `[SyncManager] Task ${task.sync_id} encountered transient ${isAuthError ? 'auth (401)' : 'network/server'} error (Attempt ${currentRetries}/${maxAllowedRetries}). Next retry in ${(
              backoffDelay / 1000
            ).toFixed(0)}s.`,
            errorMessage
          );

          await updateTaskRecord(task.sync_id, {
            status: 'retrying',
            retry_count: currentRetries,
            next_retry_at: nextRetryAt,
            last_error: errorMessage,
            error_type: isAuthError ? 'auth_retry' : 'transient',
            last_attempt_at: Date.now()
          });
        } else {
          // Terminal error OR 409 Conflict OR exhausted retry budget
          const isConflict = error.response?.status === 409;
          const errorType = isAuthError
            ? 'auth_expired'
            : isConflict
              ? 'conflict'
              : isTransient
                ? 'transient_exhausted'
                : 'terminal';

          console.error(
            `[SyncManager] Task ${task.sync_id} failed (${errorType}). Total attempts: ${currentRetries}.`,
            errorMessage
          );

          await updateTaskRecord(task.sync_id, {
            status: isConflict ? 'conflict' : 'failed',
            retry_count: currentRetries,
            last_error: errorMessage,
            error_type: errorType,
            conflict_type: error.response?.data?.conflict_type || (isConflict ? 'TICKET_CLOSED' : null),
            failed_at: Date.now(),
            next_retry_at: null
          });

          if (isConflict) {
            toast.error(`Sync conflict on ${getActionDescription(task)}: ${errorMessage}`, {
              duration: 7000,
              icon: '⚠️'
            });
          } else {
            toast.error(`Could not sync ${getActionDescription(task)}: ${errorMessage}`, {
              duration: 6000
            });
          }
        }

        window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
      }
    }

    scheduleNextRetryIfNeeded();
  } finally {
    isSyncing = false;
    if (pendingRerun && navigator.onLine) {
      pendingRerun = false;
      processOfflineQueue();
    }
  }
};

/**
 * Check if any tasks are in 'retrying' state and schedule a timer for the earliest next_retry_at
 */
const scheduleNextRetryIfNeeded = async () => {
  if (!navigator.onLine) return;

  let retryingTasks = [];
  try {
    retryingTasks = await localDb.sync_queue
      .where('status')
      .equals('retrying')
      .toArray();
  } catch (err) {
    console.warn('[SyncManager] Failed to read retrying tasks from Dexie:', err);
  }

  const memRetrying = memorySyncQueue.filter((t) => t.status === 'retrying');
  const allRetrying = [...retryingTasks, ...memRetrying];

  if (allRetrying.length === 0) return;

  const now = Date.now();
  let earliest = Infinity;

  for (const t of allRetrying) {
    if (t.next_retry_at && t.next_retry_at < earliest) {
      earliest = t.next_retry_at;
    }
  }

  if (earliest !== Infinity) {
    const delay = Math.max(500, earliest - now);
    if (retryTimeoutId) clearTimeout(retryTimeoutId);
    retryTimeoutId = setTimeout(() => {
      processOfflineQueue();
    }, delay);
  }
};

