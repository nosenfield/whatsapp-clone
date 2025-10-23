import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../store/auth-store';

export const AuthDebugInfo: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Auth Debug Info</Text>
      <Text style={styles.info}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
      <Text style={styles.info}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
      <Text style={styles.info}>User: {user ? user.displayName : 'None'}</Text>
      <Text style={styles.info}>User ID: {user?.id || 'None'}</Text>
      <Text style={styles.info}>Email: {user?.email || 'None'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
});
