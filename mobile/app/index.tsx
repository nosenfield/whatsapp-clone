import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth-store';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('📱 Index screen - Auth check:', { isAuthenticated, isLoading });
  }, [isAuthenticated, isLoading]);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    console.log('✅ User authenticated - redirecting to chats');
    return <Redirect href="/(tabs)/chats" />;
  } else {
    console.log('❌ User not authenticated - redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
