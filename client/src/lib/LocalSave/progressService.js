import { localDb } from './localDb';

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
    console.log("Step progress saved locally and queued for sync.");
  } catch (error) {
    console.error("Failed to save step progress:", error);
  }
};

export const saveOfflineResult = async (moduleId, userId, isPassed) => {
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
          passed: isPassed
        }
      });

    });
    console.log("Quiz result saved locally and queued for sync.");
  } catch (error) {
    console.error("Failed to save offline result:", error);
  }
};