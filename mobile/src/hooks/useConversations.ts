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
    staleTime: 0, // Always consider data stale - refetch on mount
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes (formerly cacheTime)
    refetchInterval: 1000 * 15, // Refetch every 15 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the app
    refetchOnMount: true, // Always refetch when component mounts
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });
};

