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
  const isGroup = conversation.type === 'group';

  // Get conversation display name
  const displayName = isGroup
    ? conversation.name || 'Group Chat'
    : (() => {
        const otherParticipantId = conversation.participants.find(
          (p) => p !== currentUserId
        );
        return otherParticipantId
          ? conversation.participantDetails[otherParticipantId]?.displayName || 'Unknown'
          : 'Unknown';
      })();

  // Get other participant ID (for presence in direct chats)
  const otherParticipantId = !isGroup
    ? conversation.participants.find((p) => p !== currentUserId)
    : undefined;

  // Subscribe to other participant's presence (only for direct chats)
  const presence = usePresence(otherParticipantId);

  // Format last message preview based on message type
  const getLastMessagePreview = () => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const senderName =
      isGroup && conversation.lastMessage.senderId !== currentUserId
        ? conversation.participantDetails[conversation.lastMessage.senderId]?.displayName || 'Someone'
        : conversation.lastMessage.senderId === currentUserId
        ? 'You'
        : '';
    
    // If it's a text message with content, show it with sender name for groups
    if (conversation.lastMessage.text) {
      if (isGroup && senderName) {
        return `${senderName}: ${conversation.lastMessage.text}`;
      }
      return conversation.lastMessage.text;
    }
    
    // Otherwise, it's likely a media message - show appropriate placeholder
    if (isGroup && senderName) {
      return `${senderName}: 📷 Image`;
    }
    return '📷 Image';
  };

  const lastMessageText = getLastMessagePreview();
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
        <View style={[styles.avatar, isGroup && styles.groupAvatar]}>
          <MaterialIcons
            name={isGroup ? 'group' : 'person'}
            size={isGroup ? 26 : 28}
            color="#fff"
          />
        </View>
        {/* Online indicator - green dot if user is online (only for direct chats) */}
        {!isGroup && presence.online && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {displayName}
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
  groupAvatar: {
    backgroundColor: '#34C759', // Green for groups
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

