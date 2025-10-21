import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useConversations } from '../../src/hooks/useConversations';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { Conversation } from '../../src/types';

export default function ChatsScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const { data: conversations, isLoading, refetch, isRefetching } = useConversations(
    currentUser?.id
  );

  const handleNewChat = () => {
    router.push('/new-conversation');
  };

  const handleConversationPress = (conversationId: string) => {
    router.push(`/conversation/${conversationId}`);
  };

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

  const getOtherParticipantName = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants.find(
      (p) => p !== currentUser?.id
    );
    
    if (!otherParticipantId) return 'Unknown';
    
    const participantDetails = conversation.participantDetails[otherParticipantId];
    return participantDetails?.displayName || 'Unknown';
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipantName = getOtherParticipantName(item);
    const lastMessageText = item.lastMessage?.text || 'No messages yet';
    const timestamp = item.lastMessageAt;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item.id)}
      >
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={28} color="#fff" />
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {otherParticipantName}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(timestamp)}
            </Text>
          </View>
          <Text style={styles.lastMessage} numberOfLines={2}>
            {lastMessageText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !conversations) {
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
              refreshing={isRefetching}
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
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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

