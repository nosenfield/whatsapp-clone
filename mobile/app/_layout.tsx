import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/services/database';
import { useAuthStore } from '../src/store/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
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
    const unsubscribe = useAuthStore.getState().initializeAuth();
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Slot />
    </QueryClientProvider>
  );
}
