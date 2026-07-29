import { useEffect, useRef } from 'react';

/**
 * Triggers an instant data sync event across all browser tabs/windows.
 * Call this function whenever Admin or User creates, updates, or deletes data.
 */
export const triggerDataSync = (key = 'global_sync') => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(`vone_sync_${key}`, timestamp.toString());
    window.dispatchEvent(new CustomEvent('vone_local_sync', { detail: { key, timestamp } }));
  } catch (err) {
    console.error('DataSync trigger error:', err);
  }
};

/**
 * Custom React hook for auto-syncing data.
 * Uses useRef for fetchFn to prevent infinite re-render loops when unmemoized functions are passed.
 */
export const useDataSync = (fetchFn, intervalMs = 8000, key = 'global_sync') => {
  const savedFetchFn = useRef(fetchFn);

  useEffect(() => {
    savedFetchFn.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    let isMounted = true;

    const safeFetch = () => {
      if (isMounted && typeof savedFetchFn.current === 'function') {
        savedFetchFn.current();
      }
    };

    // Initial fetch
    safeFetch();

    // 1. Storage Event Listener (Cross-Tab Sync)
    const handleStorage = (e) => {
      if (e.key === `vone_sync_${key}` || e.key === 'vone_sync_global_sync') {
        safeFetch();
      }
    };

    // 2. Custom Event Listener (Same-Tab Sync)
    const handleCustomSync = (e) => {
      if (e.detail?.key === key || e.detail?.key === 'global_sync') {
        safeFetch();
      }
    };

    // 3. Tab Visibility Listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        safeFetch();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('vone_local_sync', handleCustomSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Polling Interval Backup
    let timer = null;
    if (intervalMs > 0) {
      timer = setInterval(safeFetch, intervalMs);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('vone_local_sync', handleCustomSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timer) clearInterval(timer);
    };
  }, [intervalMs, key]);
};
