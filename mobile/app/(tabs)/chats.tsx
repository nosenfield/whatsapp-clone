import { useCallback, useState } from 'react';
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
import { useNavigationCacheStore } from '../../src/store/navigation-cache-store';
import { useConversations } from '../../src/hooks/useConversations';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { ConversationItem } from '../../src/components/ConversationItem';
import { Conversation } from '../../src/types';
import { deleteConversation } from '../../src/services/conversation-service/';
import { getConversationMessages } from '../../src/services/database/';

export default function ChatsScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const { data: conversations, isLoading, refetch, isRefetching, isFetching } = useConversations(
    currentUser?.id
  );
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const { setCachedMessages } = useNavigationCacheStore();

  // Refetch when screen comes into focus (auto-refresh - no spinner)
  useFocusEffect(
    useCallback(() => {
      console.log('🔍 Chats screen focused - refetching conversations');
      refetch();
    }, [refetch])
  );

  // Handle manual pull-to-refresh
  const handleManualRefresh = useCallback(async () => {
    setIsManualRefresh(true);
    try {
      await refetch();
    } finally {
      setIsManualRefresh(false);
    }
  }, [refetch]);

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

  const handleConversationPress = async (conversationId: string) => {
    console.log('📱 Conversation pressed:', conversationId);
    
    // ⚡ PERFORMANCE: Load cached messages before navigation to prevent flash
    try {
      console.log('⏳ Loading cached messages...');
      const cachedMessages = await getConversationMessages(conversationId, 50, 0);
      console.log('✅ Pre-loaded', cachedMessages.length, 'cached messages');
      console.log('📦 Sample message:', cachedMessages[0] ? {
        id: cachedMessages[0].id,
        content: cachedMessages[0].content.text?.substring(0, 30),
      } : 'none');
      
      // Store in global cache for the conversation screen to pick up
      setCachedMessages(conversationId, cachedMessages);
      console.log('💾 Stored in navigation cache');
      
      // Small delay to ensure state is set before navigation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Navigate normally - conversation screen will check cache
      console.log('🚀 Navigating to conversation...');
      router.push(`/conversation/${conversationId}` as any);
    } catch (error) {
      console.error('❌ Error pre-loading messages:', error);
      // Navigate anyway - will fall back to normal cache check
      router.push(`/conversation/${conversationId}` as any);
    }
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
              refreshing={isManualRefresh}
              onRefresh={handleManualRefresh}
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

      {/* Floating Action Button */}
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
});

