import { useEffect } from 'react';
import { processOfflineQueue } from '../lib/LocalSave/syncManager';

export default function useNetworkSync() {
  useEffect(() => {
    // Initial trigger
    processOfflineQueue();

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
