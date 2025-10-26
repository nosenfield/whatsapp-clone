/**
 * Load More Button Component
 * 
 * Handles pagination UI for loading more messages
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onPress: () => void;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  hasNextPage,
  isFetchingNextPage,
  onPress,
}) => {
  if (!hasNextPage) return null;

  return (
    <View style={styles.loadMoreContainer}>
      {isFetchingNextPage ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={onPress}
        >
          <MaterialIcons name="expand-more" size={20} color="#007AFF" />
          <Text style={styles.loadMoreText}>Load more messages</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadMoreContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    gap: 4,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
