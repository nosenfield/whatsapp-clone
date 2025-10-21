import { useState, useEffect } from 'react';
import { subscribeToTyping } from '../services/firebase-rtdb';

/**
 * Hook to subscribe to typing indicators in a conversation
 * @param conversationId - The conversation ID to monitor
 * @param currentUserId - Current user's ID (to filter out own typing)
 * @returns Array of user IDs who are currently typing
 */
export const useTypingIndicators = (
  conversationId: string | undefined,
  currentUserId: string | undefined
): string[] => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    console.log('⌨️ Subscribing to typing indicators for conversation:', conversationId);

    const unsubscribe = subscribeToTyping(conversationId, (typingUsersMap) => {
      // Filter out current user and convert to array
      const userIds = Object.keys(typingUsersMap).filter(
        (userId) => userId !== currentUserId && typingUsersMap[userId]
      );

      console.log('⌨️ Typing users:', userIds);
      setTypingUsers(userIds);
    });

    return () => {
      console.log('⌨️ Unsubscribing from typing indicators for:', conversationId);
      unsubscribe();
    };
  }, [conversationId, currentUserId]);

  return typingUsers;
};

/**
 * Format typing indicator text based on users typing
 * @param typingUserIds - Array of user IDs who are typing
 * @param participantDetails - Map of user details
 * @returns Formatted string like "John is typing..." or "John and Sarah are typing..."
 */
export const formatTypingIndicator = (
  typingUserIds: string[],
  participantDetails: Record<string, { displayName: string }>
): string | null => {
  if (typingUserIds.length === 0) return null;

  const names = typingUserIds
    .map((userId) => participantDetails[userId]?.displayName || 'Someone')
    .slice(0, 2); // Show max 2 names

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  } else if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  } else {
    return `${names[0]} and others are typing...`;
  }
};

