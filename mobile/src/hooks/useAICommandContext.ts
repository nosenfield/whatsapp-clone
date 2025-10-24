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
    // Debug logging
    console.log('🔍 useAICommandContext Debug:');
    console.log('  - pathname:', pathname);
    
    // Determine current screen based on pathname
    let currentScreen: AICommandContext['currentScreen'] = 'Other';
    let currentConversationId: string | undefined;

    if (pathname === '/chats' || pathname === '/(tabs)/chats') {
      currentScreen = 'ConversationList';
      console.log('  - Detected: ConversationList');
    } else if (pathname?.startsWith('/conversation/')) {
      currentScreen = 'ConversationView';
      console.log('  - Detected: ConversationView');
      // Extract conversation ID from pathname
      const match = pathname.match(/\/conversation\/(.+)/);
      if (match) {
        currentConversationId = match[1];
        console.log('  - Extracted conversationId:', currentConversationId);
      }
    } else if (pathname === '/profile' || pathname === '/(tabs)/profile') {
      currentScreen = 'Profile';
      console.log('  - Detected: Profile');
    } else {
      console.log('  - Detected: Other');
    }

    const finalContext = {
      currentScreen,
      currentConversationId,
      currentUserId: user?.id,
    };
    
    console.log('  - Final context:', finalContext);
    setContext(finalContext);
  }, [pathname, user?.id]);

  return context;
};