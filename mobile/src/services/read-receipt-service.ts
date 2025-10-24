import { firestore } from '../../firebase.config';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Message } from '../types';

/**
 * Update user's last seen timestamp in conversation
 * This is the efficient timestamp-based approach for read receipts
 */
export const updateUserLastSeen = async (
  conversationId: string,
  userId: string,
  lastMessageId?: string
): Promise<void> => {
  try {
    console.log('📖 Updating last seen for user:', userId, 'in conversation:', conversationId, 'lastMessageId:', lastMessageId);
    
    const conversationRef = doc(firestore, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      [`lastSeenBy.${userId}`]: {
        lastMessageId: lastMessageId || null,
        seenAt: serverTimestamp()
      }
    });

    console.log('✅ Updated last seen for user:', userId);
  } catch (error) {
    console.error('❌ Error updating last seen:', error);
    throw error;
  }
};

/**
 * Check if a user has read a specific message based on timestamp comparison
 */
export const hasUserReadMessage = (
  message: Message,
  userId: string,
  conversationLastSeenBy?: Record<string, { lastMessageId?: string; seenAt: Date }>
): boolean => {
  if (!conversationLastSeenBy || !conversationLastSeenBy[userId]) {
    return false;
  }

  const userLastSeen = conversationLastSeenBy[userId];
  
  // User has read this message if it's before or at their last seen timestamp
  const hasRead = message.timestamp <= userLastSeen.seenAt;
  
  // Debug logging
  console.log(`📖 hasUserReadMessage: user=${userId}, message=${message.id}, messageTime=${message.timestamp.toISOString()}, seenAt=${userLastSeen.seenAt.toISOString()}, hasRead=${hasRead}`);
  
  return hasRead;
};

/**
 * Get users who have read a specific message
 * Only returns users for whom this is their LAST read message
 */
export const getUsersWhoReadMessage = (
  message: Message,
  conversationLastSeenBy?: Record<string, { lastMessageId?: string; seenAt: Date }>,
  conversationParticipants?: string[],
  allMessages?: Message[]
): Array<{ userId: string; readAt: Date }> => {
  if (!conversationLastSeenBy || !conversationParticipants) {
    return [];
  }

  return conversationParticipants
    .filter(userId => {
      const userLastSeen = conversationLastSeenBy[userId];
      if (!userLastSeen) return false;
      
      // User has read this message if it's before or at their last seen timestamp
      const hasReadThisMessage = message.timestamp <= userLastSeen.seenAt;
      
      if (!hasReadThisMessage) return false;
      
      // Only show read receipt if this is their LAST read message
      // Check if there are any messages after this one that the user has also read
      if (allMessages) {
        const messagesAfterThis = allMessages.filter(m => m.timestamp > message.timestamp);
        const hasReadMessagesAfterThis = messagesAfterThis.some(m => m.timestamp <= userLastSeen.seenAt);
        
        console.log(`📖 User ${userId} - Message ${message.id}: hasReadThisMessage=${hasReadThisMessage}, messagesAfterThis=${messagesAfterThis.length}, hasReadMessagesAfterThis=${hasReadMessagesAfterThis}`);
        
        // If user has read messages after this one, don't show read receipt for this message
        if (hasReadMessagesAfterThis) {
          return false;
        }
      }
      
      return true;
    })
    .map(userId => ({
      userId,
      readAt: conversationLastSeenBy[userId].seenAt
    }));
};
