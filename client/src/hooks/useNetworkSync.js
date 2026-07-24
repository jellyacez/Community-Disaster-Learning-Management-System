import { useEffect } from 'react';
import { processOfflineQueue } from '../lib/LocalSave/syncManager';

export default function useNetworkSync() {
  useEffect(() => {

    processOfflineQueue();

    window.addEventListener('online', processOfflineQueue);

    return () => {
      window.removeEventListener('online', processOfflineQueue);
    };
  }, []);
}
