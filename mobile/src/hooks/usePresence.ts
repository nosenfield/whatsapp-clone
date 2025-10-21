import { useState, useEffect } from 'react';
import { subscribeToPresence } from '../services/firebase-rtdb';
import { Presence } from '../types';

/**
 * Hook to subscribe to a user's presence (online/offline status)
 * @param userId - The user ID to monitor
 * @returns Presence object with online status and lastSeen timestamp
 */
export const usePresence = (userId: string | undefined): Presence => {
  const [presence, setPresence] = useState<Presence>({
    online: false,
    lastSeen: null,
  });

  useEffect(() => {
    if (!userId) return;

    console.log('👁️ Subscribing to presence for user:', userId);

    const unsubscribe = subscribeToPresence(userId, (newPresence) => {
      console.log('👁️ Presence update:', userId, newPresence);
      setPresence(newPresence);
    });

    return () => {
      console.log('👁️ Unsubscribing from presence for user:', userId);
      unsubscribe();
    };
  }, [userId]);

  return presence;
};

/**
 * Format last seen timestamp to human-readable string
 * @param lastSeen - The last seen date
 * @returns Formatted string like "5 minutes ago" or "yesterday"
 */
export const formatLastSeen = (lastSeen: Date | null): string => {
  if (!lastSeen) return 'last seen recently';

  const now = new Date();
  const diff = now.getTime() - lastSeen.getTime();

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return 'last seen just now';
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `last seen ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `last seen ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 1) return 'last seen yesterday';
    return `last seen ${days} days ago`;
  }

  // More than 7 days
  return 'last seen a long time ago';
};

