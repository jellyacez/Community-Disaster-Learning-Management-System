import { localDb } from '../localDb';
import apiClient from '../apiClient';
import { enqueueMemoryTask } from './syncManager';

const SESSION_STORAGE_KEY = 'lms_offline_session';

// Helper to keep the localStorage offline session in sync when profile fields change offline
function patchCachedOfflineUser(patch) {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.user) {
      parsed.user = { ...parsed.user, ...patch };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new StorageEvent('storage', { key: SESSION_STORAGE_KEY }));
    }
  } catch {
    // Ignore storage errors
  }
}

export const saveOfflineModuleProgress = async (userId, moduleId, newProgress) => {
  try {
    const existing = await localDb.module_activity.get(`${userId}_${moduleId}`);
    await localDb.module_activity.put({
      ...existing,
      modact_id: `${userId}_${moduleId}`,
      user_id: userId,
      mod_id: moduleId,
      progress: newProgress,
      updated_at: Date.now()
    });

    return { status: 'queued', storageType: 'idb' };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineModuleProgress:", error);
    return {
      status: 'failed',
      storageType: 'none',
      error: error.message || 'Failed to save progress locally'
    };
  }
};

export const recalculateModuleProgress = async (moduleId, userId) => {
  try {
    const allLevels = await localDb.levels.where({ mod_id: moduleId }).toArray();
    const levelIds = allLevels.map(l => l.level_id);
    if (levelIds.length === 0) return 0;

    const totalSteps = await localDb.module_steps.where('level_id').anyOf(levelIds).count();

    const completedSteps = await localDb.user_step_progress
      .where({ user_id: userId, mod_id: moduleId })
      .count();

    if (totalSteps === 0) return 0;

    const percentage = Math.min(100, Math.round((completedSteps / totalSteps) * 100));

    await saveOfflineModuleProgress(userId, moduleId, percentage);

    return percentage;
  } catch (error) {
    console.warn("Failed to recalculate module progress offline:", error);
    return 0;
  }
};

export const saveOfflineStepProgress = async (moduleId, stepId, userId) => {
  try {
    await localDb.transaction("rw", localDb.user_step_progress, localDb.sync_queue, async () => {
      await localDb.user_step_progress.put({
        mod_id: moduleId,
        step_id: stepId,
        user_id: userId,
        completed_at: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'MARK_STEP_COMPLETE',
        status: 'pending',
        payload: {
          mod_id: moduleId,
          user_id: userId,
          step_id: stepId
        }
      });
    });

    try {
      await recalculateModuleProgress(moduleId, userId);
    } catch (e) {
      console.warn("Failed to recalculate module progress locally:", e);
    }

    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'Progress saved locally and will sync when reconnected.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineStepProgress. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask('MARK_STEP_COMPLETE', {
        mod_id: moduleId,
        user_id: userId,
        step_id: stepId
      });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in saveOfflineStepProgress:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const saveOfflineResult = async (moduleId, userId, isPassed, newAnswersArray, stepId = null) => {
  try {
    await localDb.transaction("rw", localDb.results, localDb.user_step_progress, localDb.sync_queue, async () => {
      await localDb.results.put({
        mod_id: moduleId,
        step_id: stepId,
        user_id: userId,
        passed: isPassed,
        date_taken: Date.now()
      });

      if (stepId && isPassed) {
        await localDb.user_step_progress.put({
          mod_id: moduleId,
          step_id: stepId,
          user_id: userId,
          completed_at: Date.now()
        });
      }

      await localDb.sync_queue.add({
        action_type: "SUBMIT_QUIZ",
        status: 'pending',
        payload: {
          mod_id: moduleId,
          step_id: stepId,
          user_id: userId,
          passed: isPassed,
          answer: newAnswersArray
        }
      });
    });

    if (stepId && isPassed) {
      try {
        await recalculateModuleProgress(moduleId, userId);
      } catch (e) {
        console.warn("Failed to recalculate module progress after quiz:", e);
      }
    }

    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'Quiz result saved locally and will sync when reconnected.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineResult. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask("SUBMIT_QUIZ", {
        mod_id: moduleId,
        step_id: stepId,
        user_id: userId,
        passed: isPassed,
        answer: newAnswersArray
      });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in saveOfflineResult:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const markModuleCompletedOffline = async (userId, moduleId) => {
  try {
    await localDb.transaction('rw', localDb.module_activity, localDb.sync_queue, async () => {
      const existing = await localDb.module_activity.get(`${userId}_${moduleId}`);
      await localDb.module_activity.put({
        ...existing,
        modact_id: `${userId}_${moduleId}`,
        user_id: userId,
        mod_id: moduleId,
        modstatus: 'Completed',
        progress: 100,
        completed_at: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'COMPLETE_MODULE',
        status: 'pending',
        payload: {
          user_id: userId,
          mod_id: moduleId
        }
      });
    });

    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'Module marked as completed locally.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in markModuleCompletedOffline. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask('COMPLETE_MODULE', {
        user_id: userId,
        mod_id: moduleId
      });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in markModuleCompletedOffline:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const saveOfflineAvatarChange = async (userId, newImage) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {
      const existing = await localDb.user.get(userId);
      await localDb.user.put({
        ...existing,
        id: userId,
        image: newImage,
        updatedAt: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_AVATAR',
        status: 'pending',
        payload: {
          user_id: userId,
          image: newImage
        }
      });
    });

    patchCachedOfflineUser({ image: newImage });
    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'User avatar saved locally.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineAvatarChange. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask('UPDATE_AVATAR', {
        user_id: userId,
        image: newImage
      });
      patchCachedOfflineUser({ image: newImage });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in saveOfflineAvatarChange:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const saveOfflineUserName = async (userId, newUserName) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {
      const existing = await localDb.user.get(userId);
      await localDb.user.put({
        ...existing,
        id: userId,
        name: newUserName,
        updatedAt: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_NAME',
        status: 'pending',
        payload: {
          user_id: userId,
          name: newUserName,
        }
      });
    });

    patchCachedOfflineUser({ name: newUserName });
    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'Profile settings saved offline.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineUserName. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask('UPDATE_NAME', {
        user_id: userId,
        name: newUserName,
      });
      patchCachedOfflineUser({ name: newUserName });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in saveOfflineUserName:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const saveOfflineNotification = async (userId, newPreference) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {
      const existing = await localDb.user.get(userId);
      await localDb.user.put({
        ...existing,
        id: userId,
        settings: newPreference,
        updatedAt: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_NOTIFICATION_SETTINGS',
        status: 'pending',
        payload: {
          user_id: userId,
          settings: newPreference
        }
      });
    });

    window.dispatchEvent(new CustomEvent('offline-sync-queue-updated'));
    return {
      status: 'queued',
      storageType: 'idb',
      message: 'Notification settings saved offline.'
    };
  } catch (error) {
    console.warn("IndexedDB failed in saveOfflineNotification. Attempting memory fallback:", error);
    try {
      const memRes = enqueueMemoryTask('UPDATE_NOTIFICATION_SETTINGS', {
        user_id: userId,
        settings: newPreference
      });
      return {
        status: 'queued_memory_only',
        storageType: 'memory',
        warning: memRes.warning
      };
    } catch (fallbackError) {
      console.error("Memory fallback failed in saveOfflineNotification:", fallbackError);
      return {
        status: 'failed',
        storageType: 'none',
        error: error.message || 'Storage unavailable'
      };
    }
  }
};

export const saveUserProgress = async (progressData) => {
  if (!navigator.onLine) {
    const res = await saveOfflineModuleProgress(
      progressData.userId,
      progressData.moduleId,
      progressData.progress
    );
    if (res?.status === 'failed') {
      return {
        status: 'failed',
        storageType: 'none',
        error: res.error,
        message: 'Storage unavailable. Progress could not be saved offline.'
      };
    }
    return {
      status: res?.status || 'queued',
      storageType: res?.storageType || 'idb',
      message: 'Saved offline'
    };
  }

  try {
    const response = await apiClient.post('/modules/progress', progressData);
    return response.data;
  } catch (error) {
    if (error.code === "ERR_NETWORK" || !error.response) {
      const res = await saveOfflineModuleProgress(
        progressData.userId,
        progressData.moduleId,
        progressData.progress
      );
      if (res?.status === 'failed') {
        return {
          status: 'failed',
          storageType: 'none',
          error: res.error,
          message: 'Storage unavailable. Progress could not be saved offline.'
        };
      }
      return {
        status: res?.status || 'queued',
        storageType: res?.storageType || 'idb',
        message: 'Saved offline'
      };
    }

    throw error;
  }
};
