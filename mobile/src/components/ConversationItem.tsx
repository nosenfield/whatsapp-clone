import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Conversation } from '../types';
import { usePresence } from '../hooks/usePresence';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: (conversationId: string) => void;
}

export const ConversationItem = ({
  conversation,
  currentUserId,
  onPress,
}: ConversationItemProps) => {
  // Get other participant details
  const otherParticipantId = conversation.participants.find(
    (p) => p !== currentUserId
  );
  const otherParticipantName = otherParticipantId
    ? conversation.participantDetails[otherParticipantId]?.displayName || 'Unknown'
    : 'Unknown';

  // Subscribe to other participant's presence
  const presence = usePresence(otherParticipantId);

  const lastMessageText = conversation.lastMessage?.text || 'No messages yet';
  const timestamp = conversation.lastMessageAt;

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onPress(conversation.id)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={28} color="#fff" />
        </View>
        {/* Online indicator - green dot if user is online */}
        {presence.online && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {otherParticipantName}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {lastMessageText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759', // iOS green color
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 14,
    color: '#8E8E93',
  },
  lastMessage: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

