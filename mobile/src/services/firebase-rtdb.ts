import { realtimeDb } from '../../firebase.config';
import { ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';
import { Presence } from '../types';

// Presence operations
export const setPresence = async (userId: string, online: boolean): Promise<void> => {
  const presenceRef = ref(realtimeDb, `presence/${userId}`);
  
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

export const subscribeToPresence = (
  userId: string,
  callback: (presence: Presence) => void
): (() => void) => {
  const presenceRef = ref(realtimeDb, `presence/${userId}`);
  
  return onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback({
        online: data.online,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
      });
    }
  });
};

// Typing indicators
export const setTyping = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  const typingRef = ref(realtimeDb, `typing/${conversationId}/${userId}`);
  
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
      Object.entries(data).forEach(([userId, value]: [string, any]) => {
        if (value.isTyping && now - value.timestamp < 5000) {
          typingUsers[userId] = true;
        }
      });
      
      callback(typingUsers);
    } else {
      callback({});
    }
  });
};
