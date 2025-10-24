import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/auth-store';
import { createOrGetConversation } from '../src/services/conversation-service/';
import { useDebouncedSearch } from '../src/hooks/useDebouncedSearch';
import { Avatar } from '../src/components/Avatar';
import { User } from '../src/types';

export default function NewConversationScreen() {
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  
  const currentUser = useAuthStore((state) => state.user);
  
  // Use debounced search hook for real-time search
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isLoading: isSearching,
    isLoadingMore,
    error: searchError,
    hasMore,
    clearResults,
    loadMore,
  } = useDebouncedSearch({
    delay: 300, // 300ms delay
    minLength: 2, // Minimum 2 characters
    searchBy: 'email', // Search by email
    pageSize: 20, // 20 results per page
  });

  // Filter out current user from results
  const filteredResults = searchResults.filter(user => user.id !== currentUser?.id);

  // Handle infinite scroll
  const handleLoadMore = async () => {
    if (hasMore && !isLoadingMore) {
      await loadMore();
    }
  };

  // Render footer for loading more
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  const handleSelectUser = async (selectedUser: User) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to start a conversation');
      return;
    }

    setIsCreatingConversation(true);
    try {
      // Create or get existing conversation
      const conversationId = await createOrGetConversation(
        currentUser.id,
        selectedUser.id
      );

      // Navigate to conversation screen (replace to avoid back button issue)
      router.replace(`/conversation/${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
      disabled={isCreatingConversation}
    >
      <Avatar
        photoURL={item.photoURL}
        displayName={item.displayName}
        size={48}
        backgroundColor="#007AFF"
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Conversation',
          headerShown: true,
          headerBackTitle: 'Back',
          presentation: 'card',
        }}
      />
      <View style={styles.container}>
        {/* Search Bar - Top */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearResults}>
                <MaterialIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results / Content Area */}
        {searchError ? (
          <View style={styles.centerContent}>
            <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
            <Text style={styles.emptyText}>Search Error</Text>
            <Text style={styles.emptySubtext}>{searchError}</Text>
          </View>
        ) : isSearching ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : filteredResults.length > 0 ? (
          <FlatList
            data={filteredResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            style={styles.resultsList}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
          />
        ) : searchQuery.trim() && !isSearching ? (
          <View style={styles.centerContent}>
            <MaterialIcons name="person-search" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              Try searching with a different email
            </Text>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <MaterialIcons name="mail-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>Search for Users</Text>
            <Text style={styles.emptySubtext}>
              Enter an email address to find users
            </Text>
          </View>
        )}

        {/* Loading Overlay */}
        {isCreatingConversation && (
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.overlayText}>Starting conversation...</Text>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    marginLeft: 8,
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  overlayText: {
    fontSize: 16,
    color: '#000',
    marginTop: 12,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

