import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { initDatabase } from '../src/services/database';
import { useAuthStore } from '../src/store/auth-store';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import {
  setupNotificationListeners,
  getInitialNotification,
  getNotificationData,
  isMessageNotification,
} from '../src/services/notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    console.log('🎯 APP LAUNCHED - RootLayout mounted');
    
    // Initialize SQLite database
    initDatabase()
      .then(() => {
        console.log('✅ Database initialization complete');
      })
      .catch((error) => {
        console.error('❌ Database initialization failed:', error);
      });
    
    // Initialize authentication listener
    console.log('🔐 Initializing auth listener...');
    (async () => {
      try {
        await useAuthStore.getState().initializeAuth();
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
      }
    })();
  }, []);

  // Set up notification handlers
  useEffect(() => {
    console.log('🔔 Setting up notification handlers...');

    // Check if app was opened from a notification (cold start)
    getInitialNotification().then((response) => {
      if (response) {
        handleNotificationTap(response);
      }
    });

    // Set up listeners for notifications
    const cleanup = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTap
    );

    return cleanup;
  }, []);

  /**
   * Handle notification received while app is in foreground
   */
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('📬 Notification received in foreground:', notification);
    
    const data = getNotificationData(notification);
    
    // You could show an in-app banner here instead of the default notification
    // For now, we'll let the default handler show it
  };

  /**
   * Handle notification tap (user clicked on notification)
   */
  const handleNotificationTap = (response: Notifications.NotificationResponse) => {
    console.log('👆 User tapped notification:', response);
    
    const data = getNotificationData(response);
    
    // Navigate to conversation if it's a message notification
    if (isMessageNotification(data)) {
      console.log('📨 Navigating to conversation:', data.conversationId);
      
      // Use setTimeout to ensure navigation happens after auth is initialized
      setTimeout(() => {
        router.push(`/conversation/${data.conversationId}`);
      }, 100);
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
