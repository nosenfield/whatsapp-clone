/**
 * Message Pagination Hook
 * 
 * Handles loading more messages (pagination) functionality
 */

import { useState } from 'react';
import { Message } from '../../types';
import { getConversationMessages, getConversationMessageCount } from '../../services/database';

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

  const loadMoreMessages = async (onMessagesUpdate: (messages: Message[]) => void) => {
    if (!conversationId || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const olderMessages = await getConversationMessages(conversationId, 50, currentOffset);
      onMessagesUpdate((prev: Message[]) => [...prev, ...olderMessages]);
      setCurrentOffset((prev) => prev + 50);
      
      // Check if there are even more messages
      const totalCount = await getConversationMessageCount(conversationId);
      setHasMoreMessages(totalCount > currentOffset + 50);
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
