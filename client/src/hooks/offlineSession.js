import { useCallback, useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';

const SESSION_STORAGE_KEY = 'lms_offline_session';

function readCachedSession() {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);

    // Remove if expired
    if (parsed?.session?.expiresAt && new Date(parsed.session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useOfflineSession() {
  const { data: liveSession, isPending, error } = authClient.useSession();
  const [cachedSession, setCachedSession] = useState(readCachedSession);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Helper to manually update or clear both localStorage and React state
  const updateCachedSession = useCallback((newSession) => {
    try {
      if (newSession?.user) {
        const serialized = JSON.stringify(newSession);
        localStorage.setItem(SESSION_STORAGE_KEY, serialized);
        setCachedSession((prev) =>
          JSON.stringify(prev) === serialized ? prev : newSession
        );
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setCachedSession((prev) => (prev === null ? null : null));
      }
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }, []);

  // Track browser online/offline status and cross-tab storage changes
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleStorage = (e) => {
      if (e.key === SESSION_STORAGE_KEY) {
        setCachedSession(readCachedSession());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Sync live session from Better Auth into local storage
  useEffect(() => {
    if (liveSession?.user) {
      updateCachedSession(liveSession);
    } else if (!isPending && !liveSession && !isOffline && !error) {
      // Server confirmed the user is logged out while online
      updateCachedSession(null);
    }
  }, [liveSession, isPending, isOffline, error, updateCachedSession]);

  // Fall back to cachedSession while loading, when offline, or on network error
  const effectiveSession =
    liveSession ?? (isPending || isOffline || error ? cachedSession : null);

  return {
    data: effectiveSession,
    isPending: isPending && !cachedSession,
    isOffline,
    updateCachedSession,
  };
}
