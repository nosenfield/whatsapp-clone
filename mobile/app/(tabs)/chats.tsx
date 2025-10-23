import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useConversations } from '../../src/hooks/useConversations';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { ConversationItem } from '../../src/components/ConversationItem';
import { AICommandButton } from '../../src/components/AICommandButton';
import { useAICommandContext } from '../../src/hooks/useAICommandContext';
import { Conversation } from '../../src/types';
import { deleteConversation } from '../../src/services/conversation-service';

export default function ChatsScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const { data: conversations, isLoading, refetch, isRefetching, isFetching } = useConversations(
    currentUser?.id
  );
  const aiContext = useAICommandContext();

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔍 Chats screen focused - refetching conversations');
      refetch();
    }, [refetch])
  );

  const handleNewChat = () => {
    // Show action sheet to choose between new conversation or new group
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'New Conversation', 'New Group'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // New Conversation
            router.push('/new-conversation');
          } else if (buttonIndex === 2) {
            // New Group
            router.push('/new-group');
          }
        }
      );
    } else {
      // Android fallback - just go to new conversation (or implement a modal)
      router.push('/new-conversation');
    }
  };

  const handleConversationPress = (conversationId: string) => {
    router.push(`/conversation/${conversationId}`);
  };

  const handleConversationLongPress = (conversationId: string) => {
    if (!currentUser?.id) return;

    // Find the conversation to get its name for the confirmation dialog
    const conversation = conversations?.find(c => c.id === conversationId);
    const conversationName = conversation?.type === 'group' 
      ? conversation.name || 'Group Chat'
      : (() => {
          const otherParticipantId = conversation?.participants.find(p => p !== currentUser.id);
          return otherParticipantId 
            ? conversation?.participantDetails[otherParticipantId]?.displayName || 'Unknown'
            : 'Unknown';
        })();

    // Show confirmation dialog
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${conversationName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(conversationId, currentUser.id);
              // Refresh the conversations list
              refetch();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert(
                'Error',
                'Failed to delete conversation. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      currentUserId={currentUser?.id || ''}
      onPress={handleConversationPress}
      onLongPress={handleConversationLongPress}
    />
  );

  // Show loading spinner only on initial load (not when we have cached data)
  if ((isLoading || isFetching) && !conversations) {
    return (
      <View style={styles.container}>
        <OfflineBanner />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleNewChat}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      {conversations && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isFetching}
              onRefresh={refetch}
              tintColor="#007AFF"
            />
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <MaterialIcons name="chat-bubble-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No Conversations Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a new conversation to begin messaging
          </Text>
        </View>
      )}

      {/* Floating Action Buttons */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewChat}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* AI Command Button */}
      <AICommandButton 
        appContext={aiContext}
        style={styles.aiFab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  aiFab: {
    position: 'absolute',
    bottom: 24,
    right: 88, // Position to the left of the main FAB
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759', // Green color for AI
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

