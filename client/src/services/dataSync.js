import { useEffect } from 'react';

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
 * Calls fetchFn:
 * 1. Immediately on mount
 * 2. Instantly when triggerDataSync() is fired (via Storage & Custom Event)
 * 3. Instantly when tab becomes visible (visibilitychange)
 * 4. Periodically every `intervalMs` (default: 8000ms)
 */
export const useDataSync = (fetchFn, intervalMs = 8000, key = 'global_sync') => {
  useEffect(() => {
    let isMounted = true;

    const safeFetch = () => {
      if (isMounted && typeof fetchFn === 'function') {
        fetchFn();
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

    // 3. Tab Visibility & Focus Listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        safeFetch();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('vone_local_sync', handleCustomSync);
    window.addEventListener('focus', safeFetch);
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
      window.removeEventListener('focus', safeFetch);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timer) clearInterval(timer);
    };
  }, [fetchFn, intervalMs, key]);
};
