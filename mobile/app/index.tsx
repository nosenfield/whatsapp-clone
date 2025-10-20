import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth-store';

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('📱 Index screen mounted');
    console.log('🔐 Auth state:', { isAuthenticated, isLoading, user: user?.email });
  }, [isAuthenticated, isLoading, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WhatsApp Clone</Text>
      <Text style={styles.subtitle}>
        {isLoading ? 'Checking authentication...' : 
         isAuthenticated ? `Logged in as ${user?.email}` : 
         'Not authenticated'}
      </Text>
      <Text style={styles.debug}>
        Check your terminal for logs! 👀
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  debug: {
    fontSize: 12,
    color: '#999',
    marginTop: 20,
  },
});
