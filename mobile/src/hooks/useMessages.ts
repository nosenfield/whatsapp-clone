import { useQuery } from '@tanstack/react-query';
import { getConversationMessages } from '../services/database';
import { Message } from '../types';

/**
 * Custom hook to fetch messages for a conversation
 */
export const useMessages = (conversationId: string | undefined) => {
  return useQuery<Message[], Error>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) throw new Error('Conversation ID is required');
      return await getConversationMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 1000 * 10, // 10 seconds
  });
};

