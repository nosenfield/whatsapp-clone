import { useInfiniteQuery } from '@tanstack/react-query';
import { getConversationMessages, getConversationMessageCount } from '../services/database';
import { Message } from '../types';

const MESSAGES_PER_PAGE = 50;

/**
 * Custom hook to fetch messages for a conversation with pagination
 */
export const useMessages = (conversationId: string | undefined) => {
  return useInfiniteQuery<Message[], Error>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!conversationId) throw new Error('Conversation ID is required');
      return await getConversationMessages(conversationId, MESSAGES_PER_PAGE, pageParam as number);
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page has fewer messages than the page size, we've reached the end
      if (lastPage.length < MESSAGES_PER_PAGE) {
        return undefined;
      }
      // Return the offset for the next page
      return allPages.length * MESSAGES_PER_PAGE;
    },
    initialPageParam: 0,
    enabled: !!conversationId,
    staleTime: 1000 * 10, // 10 seconds
  });
};

