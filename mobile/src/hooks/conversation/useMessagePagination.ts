/**
 * Message Pagination Hook
 * 
 * Handles loading more messages (pagination) functionality
 */

import { useState } from 'react';
import { Message } from '../../types';
import { getConversationMessages, getConversationMessageCount } from '../../services/database/';

interface UseMessagePaginationProps {
  conversationId: string;
  initialOffset?: number;
}

export const useMessagePagination = ({ 
  conversationId, 
  initialOffset = 50 
}: UseMessagePaginationProps) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(initialOffset);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const loadMoreMessages = async (onMessagesUpdate: (updater: (prev: Message[]) => Message[]) => void) => {
    if (!conversationId || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      // Get the oldest message timestamp to load messages older than that
      const currentMessages = await getConversationMessages(conversationId, 1000, 0); // Get all current messages
      const oldestMessage = currentMessages[0]; // Since DB now returns chronological order

      if (!oldestMessage) {
        setHasMoreMessages(false);
        return;
      }

      // Load messages older than the oldest current message
      const olderMessages = await getConversationMessages(conversationId, 50, 0, oldestMessage.timestamp.getTime());

      if (olderMessages.length > 0) {
        onMessagesUpdate((prev: Message[]) => [...olderMessages, ...prev]);
        setCurrentOffset((prev) => prev + olderMessages.length);

        // Check if there are even more messages
        const totalCount = await getConversationMessageCount(conversationId);
        setHasMoreMessages(totalCount > currentOffset + olderMessages.length);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    isLoadingMore,
    hasMoreMessages,
    loadMoreMessages,
  };
};
