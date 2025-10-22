import { FlatList, StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MessageBubble } from './MessageBubble';
import { Message, Conversation } from '../types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  conversation?: Conversation | null;
}

export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  conversation,
}: MessageListProps) {
  const isGroup = conversation?.type === 'group';

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
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.senderId === currentUserId}
          showSender={isGroup}
          conversation={conversation || undefined}
        />
      )}
      keyExtractor={(item) => item.id || item.localId || String(item.timestamp)}
      inverted
      contentContainerStyle={styles.listContent}
      style={styles.list}
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
});

