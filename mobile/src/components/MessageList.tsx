/**
 * @deprecated This component is deprecated. Use the modular message-list/ directory instead.
 * This file will be removed in a future version.
 * 
 * Migration guide:
 * - Replace: import { MessageList } from './MessageList'
 * - With: import { MessageList } from './message-list'
 * - The new modular structure provides the same API with better organization
 */

import { FlatList, StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MessageBubble } from './MessageBubble';
import { ReadReceiptLine } from './ReadReceiptLine';
import { Message, Conversation, User } from '../types';
import { getUsersWhoReadMessage } from '../services/read-receipt-service';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  conversation?: Conversation | null;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  conversation,
  hasNextPage = false,
  fetchNextPage,
  isFetchingNextPage = false,
}: MessageListProps) {
  const isGroup = conversation?.type === 'group';

  const renderLoadMoreButton = () => {
    if (!hasNextPage) return null;

    return (
      <View style={styles.loadMoreContainer}>
        {isFetchingNextPage ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={fetchNextPage}
          >
            <MaterialIcons name="expand-more" size={20} color="#007AFF" />
            <Text style={styles.loadMoreText}>Load more messages</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderMessageWithReadReceipt = (message: Message, index: number) => {
    // Debug: Check conversation data
    console.log('📖 Debug - Conversation:', conversation?.id);
    console.log('📖 Debug - lastSeenBy:', conversation?.lastSeenBy);
    console.log('📖 Debug - participants:', conversation?.participants);
    
    // Use timestamp-based approach to determine who has read this message
    const usersWhoRead = getUsersWhoReadMessage(
      message,
      conversation?.lastSeenBy,
      conversation?.participants,
      messages
    );
    
    const hasReadReceipts = usersWhoRead.length > 0;
    
    console.log('📖 Message:', message.id, 'hasReadReceipts:', hasReadReceipts, 'readers:', usersWhoRead.length);

    // Get user details for read receipts
    const readReceiptUsers = usersWhoRead.map(receipt => {
      const participantDetails = conversation?.participantDetails[receipt.userId];
      return {
        userId: receipt.userId,
        user: {
          id: receipt.userId,
          displayName: participantDetails?.displayName || 'Unknown',
          email: '', // We don't store email in participantDetails
          photoURL: participantDetails?.photoURL,
          createdAt: new Date(),
          lastActive: new Date(),
        } as User,
        readAt: receipt.readAt
      };
    });

    // Determine if this is the first message (chronologically earliest)
    const firstMessage = messages.reduce((earliest, current) => 
      current.timestamp < earliest.timestamp ? current : earliest
    );
    const isFirstMessage = message.id === firstMessage.id;

    // Check if any users haven't opened the conversation (should show above first message)
    const usersWhoNeverOpened = readReceiptUsers.filter(user => {
      const userLastSeen = conversation?.lastSeenBy?.[user.userId];
      return !userLastSeen || !userLastSeen.lastMessageId;
    });

    // Check if any users have read messages (should show below their last read message)
    const usersWhoReadMessages = readReceiptUsers.filter(user => {
      const userLastSeen = conversation?.lastSeenBy?.[user.userId];
      return userLastSeen && userLastSeen.lastMessageId;
    });

    return (
      <View key={message.id || message.localId || String(message.timestamp)}>
        {/* Show read receipt ABOVE first message for users who never opened conversation */}
        {isFirstMessage && usersWhoNeverOpened.length > 0 && (
          <ReadReceiptLine
            readBy={usersWhoNeverOpened}
            currentUserId={currentUserId}
          />
        )}
        
        <MessageBubble
          message={message}
          isOwnMessage={message.senderId === currentUserId}
          showSender={isGroup}
          conversation={conversation || undefined}
        />
        
        {/* Show read receipt BELOW message for users who have read messages */}
        {usersWhoReadMessages.length > 0 && (
          <ReadReceiptLine
            readBy={usersWhoReadMessages}
            currentUserId={currentUserId}
          />
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.centerContent}>
        <MaterialIcons name="chat-bubble-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>
          Send a message to start the conversation
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      renderItem={({ item, index }) => renderMessageWithReadReceipt(item, index)}
      keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
      inverted
      contentContainerStyle={styles.listContent}
      style={styles.list}
      ListFooterComponent={renderLoadMoreButton()}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingVertical: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
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
  },
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

