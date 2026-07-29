import { useState, useEffect } from 'react';
import api from '../services/api';

let subscriptionCache = null;
let subscriptionCacheTime = 0;

/**
 * useSubscriptionGuard
 * Returns whether the current user has an active paid subscription.
 * Uses in-memory caching to eliminate page load delays across all pages.
 */
export default function useSubscriptionGuard() {
  const isCached = subscriptionCache !== null && (Date.now() - subscriptionCacheTime < 60000);
  const [hasSubscription, setHasSubscription] = useState(
    subscriptionCache ? subscriptionCache.status === 'active' : true
  );
  const [subscription, setSubscription] = useState(subscriptionCache);
  const [loading, setLoading] = useState(!isCached);

  useEffect(() => {
    if (isCached) {
      setLoading(false);
      return;
    }

    api.get('/plans/my-subscription')
      .then(res => {
        subscriptionCache = res.data;
        subscriptionCacheTime = Date.now();
        if (res.data && res.data.status === 'active') {
          setHasSubscription(true);
          setSubscription(res.data);
        } else {
          setHasSubscription(false);
          setSubscription(null);
        }
      })
      .catch(() => {
        setHasSubscription(false);
        setSubscription(null);
      })
      .finally(() => setLoading(false));
  }, [isCached]);

  return { hasSubscription, subscription, loading };
}
