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
  ScrollView,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/auth-store';
import { searchUsersByEmail } from '../src/services/user-search';
import { createGroupConversation } from '../src/services/conversation-service/';
import { User } from '../src/types';
import { getBottomSafeArea } from '../src/constants/layout';
import { MAX_GROUP_SIZE } from '../src/constants';

export default function NewGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  const currentUser = useAuthStore((state) => state.user);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchUsersByEmail(searchQuery.trim().toLowerCase(), { limit: 10 });
      const results = result.users;
      
      // Filter out current user and already selected users
      const filteredResults = results.filter(
        user => 
          user.id !== currentUser?.id && 
          !selectedUsers.some(selected => selected.id === user.id)
      );
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Failed', 'Unable to search for users. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    // Check if we've reached the limit
    if (selectedUsers.length >= MAX_GROUP_SIZE - 1) {
      Alert.alert(
        'Group Limit Reached',
        `You can only add up to ${MAX_GROUP_SIZE} members (including yourself).`
      );
      return;
    }

    // Add user to selected list
    setSelectedUsers([...selectedUsers, user]);
    
    // Remove from search results
    setSearchResults(searchResults.filter(u => u.id !== user.id));
    
    // Clear search query
    setSearchQuery('');
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    if (selectedUsers.length < 2) {
      Alert.alert('Not Enough Members', 'Please add at least 2 members to create a group.');
      return;
    }

    if (!groupName.trim()) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }

    setIsCreatingGroup(true);
    try {
      // Get all participant IDs (current user + selected users)
      const participantIds = [currentUser.id, ...selectedUsers.map(u => u.id)];

      // Create group conversation
      const conversationId = await createGroupConversation(
        currentUser.id,
        participantIds,
        groupName.trim()
      );

      console.log('✅ Group created:', conversationId);

      // Navigate to the new group conversation (replace to avoid back button issue)
      router.replace(`/conversation/${conversationId}`);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const renderSelectedUser = ({ item }: { item: User }) => (
    <View style={styles.selectedUserChip}>
      <Text style={styles.selectedUserName} numberOfLines={1}>
        {item.displayName}
      </Text>
      <TouchableOpacity
        onPress={() => handleRemoveUser(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="close" size={18} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
    >
      <View style={styles.avatar}>
        <MaterialIcons name="person" size={24} color="#fff" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <MaterialIcons name="add-circle-outline" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  const canCreateGroup = selectedUsers.length >= 2 && groupName.trim().length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Group',
          headerShown: true,
          headerBackTitle: 'Back',
          presentation: 'card',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleCreateGroup}
              disabled={!canCreateGroup || isCreatingGroup}
              style={styles.createButton}
            >
              <Text
                style={[
                  styles.createButtonText,
                  (!canCreateGroup || isCreatingGroup) && styles.createButtonTextDisabled,
                ]}
              >
                Create
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Group Name Input */}
        <View style={styles.groupNameContainer}>
          <View style={styles.groupIconPlaceholder}>
            <MaterialIcons name="group" size={32} color="#007AFF" />
          </View>
          <TextInput
            style={styles.groupNameInput}
            placeholder="Group name..."
            value={groupName}
            onChangeText={setGroupName}
            maxLength={50}
            autoFocus={false}
          />
        </View>

        {/* Selected Members */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedUsersContainer}>
            <Text style={styles.selectedUsersTitle}>
              Members: {selectedUsers.length + 1}/{MAX_GROUP_SIZE}
            </Text>
            <FlatList
              horizontal
              data={selectedUsers}
              renderItem={renderSelectedUser}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedUsersList}
            />
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Search Results / Empty State */}
        <View style={styles.searchResultsContainer}>
          {isSearching ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
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
              <MaterialIcons name="person-add" size={64} color="#C7C7CC" />
              <Text style={styles.emptyText}>Add Members</Text>
              <Text style={styles.emptySubtext}>
                Search for users to add to your group
              </Text>
              <Text style={styles.emptySubtext2}>
                Minimum 2 members required
              </Text>
            </View>
          )}
        </View>

        {/* Search Bar - Bottom */}
        <View style={[styles.searchContainer, { paddingBottom: getBottomSafeArea() + 16 }]}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <MaterialIcons name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {isCreatingGroup && (
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.overlayText}>Creating group...</Text>
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
  createButton: {
    paddingHorizontal: 8,
  },
  createButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#C7C7CC',
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9F9F9',
  },
  groupIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  selectedUsersContainer: {
    paddingVertical: 12,
    paddingLeft: 16,
    backgroundColor: '#F9F9F9',
  },
  selectedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  selectedUsersList: {
    paddingRight: 16,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    marginRight: 8,
    maxWidth: 120,
  },
  selectedUserName: {
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
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
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
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
  emptySubtext2: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 4,
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
});

