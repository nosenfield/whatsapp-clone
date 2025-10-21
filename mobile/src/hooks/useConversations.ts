import { useQuery } from '@tanstack/react-query';
import { getUserConversations } from '../services/conversation-service';
import { Conversation } from '../types';

/**
 * Custom hook to fetch and manage user's conversations
 */
export const useConversations = (userId: string | undefined) => {
  return useQuery<Conversation[], Error>({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return await getUserConversations(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
};

