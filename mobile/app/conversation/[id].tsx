import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useMessageStore } from '../../src/store/message-store';
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

  // Load conversation data
  const { conversation, messages, isLoading, setMessages } = useConversationData({
    conversationId: id,
    currentUserId: currentUser?.id || '',
  });

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
    otherParticipantPhotoURL,
    headerSubtitle,
    groupMemberPresence,
    typingText,
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

  // Combine stored messages with optimistic messages
  const allMessages = [
    ...messages,
    ...optimisticMessages.filter((m) => m.conversationId === id),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
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
          headerTitle: () => (
            <ConversationHeader
              conversation={conversation}
              currentUserId={currentUser?.id || ''}
              isGroup={isGroup}
              conversationName={conversationName}
              headerSubtitle={headerSubtitle}
              otherParticipantPhotoURL={otherParticipantPhotoURL}
              showMemberAvatars={showMemberAvatars}
              onToggleMemberAvatars={() => setShowMemberAvatars(!showMemberAvatars)}
            />
          ),
        }}
      />
      
      {/* Group Member Avatars Bar */}
      {showMemberAvatars && conversation && isGroup && (
        <GroupMemberAvatars
          conversation={conversation}
          groupMemberPresence={groupMemberPresence}
        />
      )}
      
      <View style={styles.container}>
        <OfflineBanner />
        <MessageList
          messages={allMessages}
          currentUserId={currentUser?.id || ''}
          isLoading={false}
          conversation={conversation}
          hasNextPage={hasMoreMessages}
          fetchNextPage={handleLoadMore}
          isFetchingNextPage={isLoadingMore}
        />
        {typingText && (
          <View style={styles.typingIndicatorContainer}>
            <Text style={styles.typingIndicatorText}>{typingText}</Text>
          </View>
        )}
        <MessageInput
          conversationId={id}
          userId={currentUser?.id || ''}
          onSend={handleSendMessage}
          onSendImage={handleSendImage}
          disabled={isSending}
        />
        
        {/* AI Command Button */}
        <AICommandButton 
          appContext={aiContext}
          style={styles.aiFab}
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
  typingIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  typingIndicatorText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  aiFab: {
    position: 'absolute',
    bottom: 100, // Position above the message input
    right: 20,
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