import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../store/auth-store';
import { AppContext } from '../services/ai-command-service';
import { Platform } from 'react-native';

export function useAICommandContext(): AppContext {
  const [appContext, setAppContext] = useState<AppContext>({
    currentScreen: 'chats',
    currentUserId: '',
    recentConversations: [],
    deviceInfo: {
      platform: 'ios',
      version: '1.0.0',
    },
  });

  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    // Determine current screen based on pathname
    let currentScreen: AppContext['currentScreen'] = 'chats';
    let currentConversationId: string | undefined;

    if (pathname.startsWith('/conversation/')) {
      currentScreen = 'conversation';
      // Extract conversation ID from pathname
      const match = pathname.match(/\/conversation\/(.+)/);
      if (match) {
        currentConversationId = match[1];
      }
    } else if (pathname.startsWith('/profile')) {
      currentScreen = 'profile';
    } else if (pathname.startsWith('/settings')) {
      currentScreen = 'settings';
    }

    setAppContext({
      currentScreen,
      currentConversationId,
      currentUserId: user.id,
      recentConversations: [], // TODO: Load from store or database
      deviceInfo: {
        platform: Platform.OS as 'ios' | 'android',
        version: '1.0.0', // TODO: Get from app version
      },
    });
  }, [pathname, user]);

  return appContext;
}
