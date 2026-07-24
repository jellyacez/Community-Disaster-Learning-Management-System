// src/lib/syncManager.js
import { localDb } from '../localDb';
import { authClient } from '../auth-client';


export const getAllPendingWrites = async () => {

  return await localDb.sync_queue
    .where('status')
    .equals('pending')
    .toArray();
};


export const dequeueWrite = async (syncId) => {
  return await localDb.sync_queue.delete(syncId);
};

/**
 * The main synchronization loop to process the queue
 */
export const processOfflineQueue = async () => {
  if (!navigator.onLine) return;

  // 1. Read from the unified queue
  const pendingTasks = await getAllPendingWrites();

  if (pendingTasks.length === 0) return;
  console.log(`Attempting to sync ${pendingTasks.length} offline actions...`);

  // 2. Loop through and execute each task based on its action_type
  for (const task of pendingTasks) {
    try {

      if (task.action_type === 'MARK_STEP_COMPLETE') {
        await authClient.post(`/modules/${task.payload.mod_id}/steps/${task.payload.step_id}/complete`, { answers: null });
      }

      else if (task.action_type === 'SUBMIT_QUIZ') {
        await authClient.post(`/modules/${task.payload.mod_id}/steps/${task.payload.step_id}/complete`, { answers: task.payload.answer });
      }

      else if (task.action_type === 'UPDATE_PROGRESS') {
        // Example: Sending general percentage updates
        await authClient.post('/api/module/progress/', task.payload);
      }

      // 3. If the API call succeeds, delete the task from Dexie
      await dequeueWrite(task.sync_id);

    } catch (error) {
      console.error(`Sync failed for task ${task.sync_id}. Will retry later.`, error);
      // If it fails, we DO NOT dequeue it. It stays in Dexie for the next attempt.
    }
  }
};
