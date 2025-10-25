import { realtimeDb } from '../../firebase.config';
import { 
  ref, 
  set, 
  onValue, 
  onDisconnect, 
  serverTimestamp,
  get
} from 'firebase/database';
import { Presence } from '../types';

/**
 * Sanitize user ID for Firebase Realtime Database paths
 * Firebase RTDB paths cannot contain ".", "#", "$", "[", or "]"
 * This function replaces invalid characters with underscores
 */
const sanitizeUserIdForRTDB = (userId: string): string => {
  if (!userId) {
    throw new Error('User ID cannot be empty');
  }
  
  // Replace invalid characters with underscores
  return userId.replace(/[.#$[\]]/g, '_');
};

// Initialize presence system for a user
// This should be called once on app launch after authentication
export const initializePresence = async (userId: string): Promise<void> => {
  console.log('🟢 Initializing presence for user:', userId);
  
  const sanitizedUserId = sanitizeUserIdForRTDB(userId);
  const presenceRef = ref(realtimeDb, `presence/${sanitizedUserId}`);
  const connectionRef = ref(realtimeDb, '.info/connected');
  
  // Monitor connection state
  onValue(connectionRef, async (snapshot) => {
    if (snapshot.val() === true) {
      console.log('🟢 Connected to Firebase RTDB');
      
      // Set user as online
      await set(presenceRef, {
        online: true,
        lastSeen: serverTimestamp(),
      });
      
      // Set up automatic offline status on disconnect
      onDisconnect(presenceRef).set({
        online: false,
        lastSeen: serverTimestamp(),
      });
    } else {
      console.log('🔴 Disconnected from Firebase RTDB');
    }
  });
};

// Manually set presence (for app backgrounding/foregrounding)
export const setPresence = async (userId: string, online: boolean): Promise<void> => {
  const sanitizedUserId = sanitizeUserIdForRTDB(userId);
  const presenceRef = ref(realtimeDb, `presence/${sanitizedUserId}`);
  
  await set(presenceRef, {
    online,
    lastSeen: serverTimestamp(),
  });
  
  if (online) {
    // Set up automatic offline status on disconnect
    onDisconnect(presenceRef).set({
      online: false,
      lastSeen: serverTimestamp(),
    });
  }
};

// Subscribe to another user's presence
export const subscribeToPresence = (
  userId: string,
  callback: (presence: Presence) => void
): (() => void) => {
  const sanitizedUserId = sanitizeUserIdForRTDB(userId);
  const presenceRef = ref(realtimeDb, `presence/${sanitizedUserId}`);
  
  return onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback({
        online: data.online,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
      });
    } else {
      // User has never been online or data doesn't exist
      callback({
        online: false,
        lastSeen: null,
      });
    }
  });
};

// Get presence once (no subscription)
export const getPresence = async (userId: string): Promise<Presence> => {
  const sanitizedUserId = sanitizeUserIdForRTDB(userId);
  const presenceRef = ref(realtimeDb, `presence/${sanitizedUserId}`);
  const snapshot = await get(presenceRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      online: data.online,
      lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
    };
  }
  
  return {
    online: false,
    lastSeen: null,
  };
};

// Subscribe to connection state
export const subscribeToConnectionState = (
  callback: (connected: boolean) => void
): (() => void) => {
  const connectionRef = ref(realtimeDb, '.info/connected');
  
  return onValue(connectionRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// Typing indicators
export const setTyping = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  const sanitizedUserId = sanitizeUserIdForRTDB(userId);
  const typingRef = ref(realtimeDb, `typing/${conversationId}/${sanitizedUserId}`);
  
  if (isTyping) {
    await set(typingRef, {
      isTyping: true,
      timestamp: serverTimestamp(),
    });
  } else {
    await set(typingRef, null);
  }
};

export const subscribeToTyping = (
  conversationId: string,
  callback: (typingUsers: Record<string, boolean>) => void
): (() => void) => {
  const typingRef = ref(realtimeDb, `typing/${conversationId}`);
  
  return onValue(typingRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const typingUsers: Record<string, boolean> = {};
      
      // Filter out stale typing indicators (older than 5 seconds)
      const now = Date.now();
      Object.entries(data).forEach(([sanitizedUserId, value]: [string, any]) => {
        if (value.isTyping && now - value.timestamp < 5000) {
          // Note: We're using sanitized user IDs as keys here
          // The calling code should handle the mapping if needed
          typingUsers[sanitizedUserId] = true;
        }
      });
      
      callback(typingUsers);
    } else {
      callback({});
    }
  });
};
