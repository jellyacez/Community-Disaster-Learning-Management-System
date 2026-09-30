import { useEffect, useRef } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { processOfflineQueue } from '../lib/LocalSave/syncManager';
import { useOfflineSession } from './offlineSession';

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

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('trigger-offline-sync', triggerSync);
    window.addEventListener("offline-sync-item-success", refreshDashboard);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-offline-sync', triggerSync);
      window.removeEventListener("offline-sync-item-success", refreshDashboard);
    };
  }, [userId, queryClient]);
}
