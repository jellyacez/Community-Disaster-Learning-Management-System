import { localDb } from '../localDb';

import apiClient from '../apiClient'; // Ensure this points to your standard axios client
export const saveOfflineModuleProgress = async (userId, moduleId, newProgress) => {
  try {
    // FIX: Use localDb consistently
    await localDb.transaction('rw', localDb.module_activity, localDb.sync_queue, async () => {

      await localDb.module_activity.put({
        modact_id: `${userId}_${moduleId}`, // Use a composite string if missing actual ID
        user_id: userId,
        mod_id: moduleId,
        progress: newProgress,
        updated_at: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_PROGRESS',
        status: 'pending',
        payload: {
          user_id: userId,
          mod_id: moduleId,
          progress: newProgress
        }
      });

    });

    console.log("Progress saved locally and queued for sync.");
  } catch (error) {
    console.error("Failed to save progress offline:", error);
  }
};


export const recalculateModuleProgress = async (moduleId, userId) => {
  const allLevels = await localDb.levels.where({ mod_id: moduleId }).toArray();
  const levelIds = allLevels.map(l => l.level_id);
  const totalSteps = await localDb.module_steps.where('level_id').anyOf(levelIds).count();

  const completedSteps = await localDb.user_step_progress
    .where({ user_id: userId, mod_id: moduleId })
    .count();

  if (totalSteps === 0) return 0;

  const percentage = Math.round((completedSteps / totalSteps) * 100);

  // Save the newly calculated percentage to Dexie and the sync queue
  await saveOfflineModuleProgress(userId, moduleId, percentage);

  return percentage;
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

    recalculateModuleProgress(moduleId, userId);

    console.log("Step progress saved locally and queued for sync.");
  } catch (error) {
    console.error("Failed to save step progress:", error);
  }
};

export const saveOfflineResult = async (moduleId, userId, isPassed, newAnswersArray) => {
  try {
    await localDb.transaction("rw", localDb.results, localDb.sync_queue, async () => {

      await localDb.results.put({
        mod_id: moduleId,
        user_id: userId,
        passed: isPassed,
        date_taken: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: "SUBMIT_QUIZ",
        status: 'pending',
        payload: {
          mod_id: moduleId,
          user_id: userId,
          passed: isPassed,
          answer:newAnswersArray
        }
      });

    });
    console.log("Quiz result saved locally and queued for sync.");
  } catch (error) {
    console.error("Failed to save offline result:", error);
  }
};

export const markModuleCompletedOffline = async (userId, moduleId) => {
  try {
    await localDb.transaction('rw', localDb.module_activity, localDb.sync_queue, async () => {

      // Update local UI state
      await localDb.module_activity.update(`${userId}_${moduleId}`, {
        modstatus: 'Completed',
        progress: 100,
        completed_at: Date.now()
      });

      // Queue for backend
      await localDb.sync_queue.add({
        action_type: 'COMPLETE_MODULE',
        status: 'pending',
        payload: {
          user_id: userId,
          mod_id: moduleId
        }
      });
    });
    console.log("Module marked as completed locally.");
  } catch (error) {
    console.error("Failed to mark module as completed offline:", error);
  }
};

export const saveOfflineAvatarChange = async (userId, newImage) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {

      await localDb.user.update(userId, {
        image: newImage,
        updatedAt: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_AVATAR',
        status: 'pending',
        payload: {
          user_id: userId,
          image:newImage
        }
      });
    });
    console.log("User Avatar Saved Locally.");
  } catch (error) {
    console.error("Failed to save profile settings:", error);
  }
};

export const saveOfflineUserName = async (userId, newUserName ) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {

      await localDb.user.update(userId, {
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
    console.log("Profile settings saved offline.");
  } catch (error) {
    console.error("Failed to save profile settings:", error);
  }
};

export const saveOfflineNotification = async (userId, newPreference ) => {
  try {
    await localDb.transaction('rw', localDb.user, localDb.sync_queue, async () => {

      await localDb.user.update(userId, {
        settings: newPreference,
        updatedAt: Date.now()
      });

      await localDb.sync_queue.add({
        action_type: 'UPDATE_NOTIFICATION_SETTINGS',
        status: 'pending',
        payload: {
          user_id: userId,
          name: newPreference
        }
      });
    });
    console.log("Notification settings saved offline.");
  } catch (error) {
    console.error("Failed to save Notification settings:", error);
  }
};




//Use when needed to update specifc step progress
export const saveUserProgress = async (progressData) => {
  // 1. Check offline state immediately
  if (!navigator.onLine) {
    await saveOfflineModuleProgress(
      progressData.userId,
      progressData.moduleId,
      progressData.progress
    );
    return { status: 'queued', message: 'Saved offline' };
  }

  // 2. Attempt online sync
  try {
    const response = await apiClient.post('/modules/progress', progressData);
    return response.data;
  } catch (error) {
    // 3. Fallback if network drops mid-request
    if (error.code === "ERR_NETWORK" || !error.response) {
      await saveOfflineModuleProgress(
        progressData.userId,
        progressData.moduleId,
        progressData.progress
      );
      console.warn("Network dropped. Progress saved to local queue.");
      return { status: 'queued', message: 'Saved offline' };
    }

    throw error;
  }
};
