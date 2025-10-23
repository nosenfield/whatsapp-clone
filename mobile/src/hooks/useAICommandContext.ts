import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../store/auth-store';

interface AICommandContext {
  currentScreen: 'ConversationList' | 'ConversationView' | 'Profile' | 'Other';
  currentConversationId?: string;
  currentUserId?: string;
}

export const useAICommandContext = (): AICommandContext => {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [context, setContext] = useState<AICommandContext>({
    currentScreen: 'Other',
    currentUserId: user?.id,
  });

  useEffect(() => {
    // Determine current screen based on pathname
    let currentScreen: AICommandContext['currentScreen'] = 'Other';
    let currentConversationId: string | undefined;

    if (pathname === '/chats' || pathname === '/(tabs)/chats') {
      currentScreen = 'ConversationList';
    } else if (pathname?.startsWith('/conversation/')) {
      currentScreen = 'ConversationView';
      // Extract conversation ID from pathname
      const match = pathname.match(/\/conversation\/(.+)/);
      if (match) {
        currentConversationId = match[1];
      }
    } else if (pathname === '/profile' || pathname === '/(tabs)/profile') {
      currentScreen = 'Profile';
    }

    setContext({
      currentScreen,
      currentConversationId,
      currentUserId: user?.id,
    });
  }, [pathname, user?.id]);

  return context;
};