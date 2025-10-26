import { useState, useEffect } from 'react';
import { subscribeToPresence } from '../services/firebase-rtdb';
import { Presence } from '../types';

/**
 * Hook to subscribe to multiple users' presence (online/offline status)
 * @param userIds - Array of user IDs to monitor
 * @returns Record of user ID to Presence object
 */
export const useMultiplePresence = (userIds: string[]): Record<string, Presence> => {
  const [presences, setPresences] = useState<Record<string, Presence>>({});

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPresences({});
      return;
    }

    console.log('👁️ Subscribing to presence for users:', userIds);

    const subscriptions: Array<() => void> = [];

    // Subscribe to each user's presence
    userIds.forEach((userId) => {
      if (!userId) return;

      const unsubscribe = subscribeToPresence(userId, (presence) => {
        setPresences(prev => ({
          ...prev,
          [userId]: presence
        }));
      });

      subscriptions.push(unsubscribe);
    });

    // Cleanup function
    return () => {
      console.log('👁️ Unsubscribing from presence for users:', userIds);
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [JSON.stringify(userIds)]); // Use JSON.stringify to ensure stable dependency

  return presences;
};
