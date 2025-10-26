import { useQuery } from '@tanstack/react-query';
import { getUserConversations } from '../services/conversation-service/';
import { upsertConversation } from '../services/database/';
import { Conversation } from '../types';

/**
 * Custom hook to fetch and manage user's conversations
 * 
 * Performance: Preloads top 10 conversations to SQLite for instant access
 * Cache: Conversations cached for 5 minutes to avoid unnecessary refetches
 */
export const useConversations = (userId: string | undefined) => {
  return useQuery<Conversation[], Error>({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const conversations = await getUserConversations(userId);
      
      // Preload top 10 conversations to SQLite for instant access
      // This allows opening conversations without waiting for Firestore
      const conversationsToPreload = conversations.slice(0, 10);
      try {
        await Promise.all(
          conversationsToPreload.map(conv => upsertConversation(conv))
        );
        console.log(`✅ Preloaded ${conversationsToPreload.length} conversations to SQLite`);
      } catch (error) {
        console.error('Failed to preload conversations:', error);
        // Don't fail the query if preloading fails
      }
      
      return conversations;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // ✅ Cache for 5 minutes (was 0)
    gcTime: 1000 * 60 * 30,   // Keep in memory for 30 minutes (was 5 minutes)
    refetchInterval: 1000 * 15, // Refetch every 15 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the app
    refetchOnMount: false,      // ✅ Don't refetch on every mount (was true)
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  });
};

