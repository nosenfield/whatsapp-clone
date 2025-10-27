import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth-store';
import { useMessageStore } from '../../src/store/message-store';
import { useNavigationCacheStore } from '../../src/store/navigation-cache-store';
import { MessageInput } from '../../src/components/MessageInput';
import { MessageList } from '../../src/components/message-list';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { AICommandButton } from '../../src/components/AICommandButton';
import { useAICommandContext } from '../../src/hooks/useAICommandContext';
import { Message } from '../../src/types';
import {
  ConversationHeader,
  GroupMemberAvatars,
} from '../../src/components/conversation';
import {
  useConversationData,
  useMessageSending,
  useMessagePagination,
  useConversationDisplay,
} from '../../src/hooks/conversation';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const { optimisticMessages } = useMessageStore();
  const aiContext = useAICommandContext();
  const { getCachedMessages, clearCachedMessages } = useNavigationCacheStore();

  // Get pre-loaded cached messages from navigation cache
  const initialCachedMessages = getCachedMessages(id);
  
  console.log('🎯 ConversationScreen RENDER - id:', id);
  console.log('🎯 Initial cached messages from store:', initialCachedMessages?.length || 0);

  // Load conversation data with initial messages
  const { conversation, messages, isLoading, setMessages } = useConversationData({
    conversationId: id,
    currentUserId: currentUser?.id || '',
    initialMessages: initialCachedMessages,
  });
  
  console.log('🎯 Messages from hook:', messages.length);
  console.log('🎯 isLoading from hook:', isLoading);
  
  // Clear cache after using it to prevent stale data
  useEffect(() => {
    return () => {
      console.log('🧹 Clearing cached messages for:', id);
      clearCachedMessages(id);
    };
  }, [id, clearCachedMessages]);

  // Handle message sending
  const { isSending, handleSendMessage, handleSendImage } = useMessageSending({
    conversationId: id,
    currentUserId: currentUser?.id || '',
    onMessagesUpdate: setMessages,
  });

  // Handle pagination
  const { isLoadingMore, hasMoreMessages, loadMoreMessages } = useMessagePagination({
    conversationId: id,
  });

  // Handle conversation display logic
  const {
    isGroup,
    conversationName,
    otherParticipantId,
    otherParticipantPhotoURL,
    presence,
    headerSubtitle,
    groupMemberPresence,
    typingUserIds,
    showMemberAvatars,
    setShowMemberAvatars,
  } = useConversationDisplay({
    conversation,
    currentUserId: currentUser?.id || '',
    conversationId: id,
  });

  // Handle loading more messages
  const handleLoadMore = () => {
    loadMoreMessages(setMessages);
  };

  // Check if other participant is typing (for direct chats)
  const isOtherParticipantTyping = !isGroup && otherParticipantId 
    ? typingUserIds.includes(otherParticipantId)
    : false;

  // Combine stored messages with optimistic messages
  const allMessages = [
    ...messages,
    ...optimisticMessages.filter((m) => m.conversationId === id),
  ];

  // Show loading screen to prevent empty slide-in animation when:
  // 1. We're still loading AND have no messages to show
  // This ensures the screen doesn't slide in empty on first open
  const shouldShowLoading = isLoading || (allMessages.length === 0 && !conversation);

  if (shouldShowLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: conversationName,
          headerShown: true,
          headerTitleAlign: 'center',
          headerBackTitle: 'Chats',
          animation: 'slide_from_right',
          animationDuration: 300,
          headerTitle: () => (
            <ConversationHeader
              conversation={conversation}
              currentUserId={currentUser?.id || ''}
              isGroup={isGroup}
              conversationName={conversationName}
              headerSubtitle={headerSubtitle}
              otherParticipantPhotoURL={otherParticipantPhotoURL}
              isOnline={!isGroup && presence.online}
              isTyping={isOtherParticipantTyping}
              showMemberAvatars={showMemberAvatars}
              onToggleMemberAvatars={() => setShowMemberAvatars(!showMemberAvatars)}
            />
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <AICommandButton 
                appContext={aiContext}
                style={styles.headerAIButton}
              />
            </View>
          ),
        }}
      />
      
      {/* Group Member Avatars Bar */}
      {showMemberAvatars && conversation && isGroup && (
        <GroupMemberAvatars
          conversation={conversation}
          groupMemberPresence={groupMemberPresence}
          typingUserIds={typingUserIds}
        />
      )}
      
      <View style={styles.container}>
        <OfflineBanner />
        <MessageList
          messages={allMessages}
          currentUserId={currentUser?.id || ''}
          isLoading={shouldShowLoading}
          conversation={conversation}
          hasNextPage={hasMoreMessages}
          fetchNextPage={handleLoadMore}
          isFetchingNextPage={isLoadingMore}
          autoScrollOnNewMessage={true}
          initialScrollToBottom={true}
        />
        <MessageInput
          conversationId={id}
          userId={currentUser?.id || ''}
          onSend={handleSendMessage}
          onSendImage={handleSendImage}
          disabled={isSending}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerRightContainer: {
    marginRight: 16,
    zIndex: 1000,
  },
  headerAIButton: {
    // No additional styles needed, button handles its own styling
  },
});