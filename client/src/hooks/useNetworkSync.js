import { useEffect, useRef } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { processOfflineQueue } from '../lib/LocalSave/syncManager';
import { useOfflineSession } from './offlineSession';
import { setPendingRetakes, showRecertificationToast } from '../lib/recertification';

const STEP_COMPLETION_TASKS = ['MARK_STEP_COMPLETE', 'SUBMIT_QUIZ'];

export default function useNetworkSync() {
  const { data: session, isPending } = useOfflineSession();
  const hasInitialSyncedRef = useRef(false);
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Mount-time sync
  useEffect(() => {
    if (!isPending && userId && !hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      processOfflineQueue(userId);
    }
  }, [userId, isPending]);

  // Event listeners
  useEffect(() => {
    const handleOnline = () => {
      if (userId) processOfflineQueue(userId);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && userId) {
        processOfflineQueue(userId);
      }
    };

    const triggerSync = () => {
      if (userId) processOfflineQueue(userId);
    };

    // Listen for sync completion to instantly update the UI (e.g. Enrolled Modules progress)
    const refreshDashboard = () => {
      queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
    };

    // A step completed offline only learns the certificate outcome when it syncs
    const handleRecertification = (event) => {
      const { task, response } = event.detail || {};
      if (!response || !STEP_COMPLETION_TASKS.includes(task?.action_type)) return;
      const moduleId = task.payload?.mod_id;
      if (moduleId == null) return;

      if (response.recertificationRequired) {
        setPendingRetakes(moduleId, response.recertificationStepIds || []);
        showRecertificationToast(
          "A certificate is due for renewal. Open the module and retake its final assessment to recertify."
        );
      } else if (response.passed !== false) {
        setPendingRetakes(moduleId, []);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('trigger-offline-sync', triggerSync);
    window.addEventListener("offline-sync-item-success", refreshDashboard);
    window.addEventListener("offline-sync-item-success", handleRecertification);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-offline-sync', triggerSync);
      window.removeEventListener("offline-sync-item-success", refreshDashboard);
      window.removeEventListener("offline-sync-item-success", handleRecertification);
    };
  }, [userId, queryClient]);
}
