import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Offline Banner Component
 * Displays a banner at the top of the screen when network is unavailable
 * Automatically shows/hides based on network status
 */
export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <MaterialIcons name="cloud-off" size={16} color="#fff" />
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

