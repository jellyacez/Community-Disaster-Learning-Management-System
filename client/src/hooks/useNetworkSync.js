import { useEffect, useRef } from 'react';
import { processOfflineQueue } from '../lib/LocalSave/syncManager';
import { authClient } from '../lib/auth-client';

export default function useNetworkSync() {
  const { data: session, isPending } = authClient.useSession();
  const hasInitialSyncedRef = useRef(false);

  // Mount-time sync: Defer until authentication session is hydrated and valid
  useEffect(() => {
    if (!isPending && session?.user && !hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      processOfflineQueue();
    }
  }, [session, isPending]);

  // Event listeners for runtime network and visibility transitions
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useNetworkSync] Device is back online. Triggering offline sync...');
      processOfflineQueue();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        processOfflineQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('trigger-offline-sync', processOfflineQueue);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('trigger-offline-sync', processOfflineQueue);
    };
  }, []);
}

