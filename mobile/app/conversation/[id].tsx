import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { useMessageStore } from '../../src/store/message-store';
import { MessageInput } from '../../src/components/MessageInput';
import { MessageList } from '../../src/components/MessageList';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { Message, Conversation } from '../../src/types';
import { getConversationById } from '../../src/services/conversation-service';
import { subscribeToMessages } from '../../src/services/firebase-firestore';
import {
  getConversationMessages,
  insertMessage,
  updateMessage,
} from '../../src/services/database';
import { sendMessageToFirestore } from '../../src/services/message-service';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const { optimisticMessages, addOptimisticMessage, removeOptimisticMessage } =
    useMessageStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Get conversation details and other participant name
  const otherParticipant = conversation?.participants.find(
    (p) => p !== currentUser?.id
  );
  const otherParticipantName =
    otherParticipant && conversation?.participantDetails[otherParticipant]
      ? conversation.participantDetails[otherParticipant].displayName
      : 'Chat';

  // Load conversation and messages
  useEffect(() => {
    if (!id || !currentUser?.id) return;

    let unsubscribeFirestore: (() => void) | undefined;
    let isMounted = true;

    const loadConversation = async () => {
      try {
        // 1. Load conversation metadata
        const conv = await getConversationById(id);
        if (!conv || !isMounted) {
          if (!conv) {
            Alert.alert('Error', 'Conversation not found');
          }
          return;
        }
        setConversation(conv);

        // 2. Load messages from SQLite (instant display)
        const localMessages = await getConversationMessages(id);
        if (!isMounted) return;
        setMessages(localMessages);
        setIsLoading(false);

        // 3. Subscribe to Firestore for real-time updates
        unsubscribeFirestore = subscribeToMessages(id, async (firebaseMessages) => {
          if (!isMounted) return;
          console.log('📨 Received messages from Firestore:', firebaseMessages.length);

          // Merge with local messages and deduplicate
          for (const fbMessage of firebaseMessages) {
            // Check if message already exists in SQLite
            const exists = localMessages.some(
              (m) => m.id === fbMessage.id || m.localId === fbMessage.id
            );

            if (!exists) {
              // Insert new message to SQLite
              await insertMessage(fbMessage);
            }
          }

          // Reload from SQLite to get fresh data
          const updatedMessages = await getConversationMessages(id);
          if (isMounted) {
            setMessages(updatedMessages);
          }
        });
      } catch (error) {
        console.error('Error loading conversation:', error);
        if (isMounted) {
          Alert.alert('Error', 'Failed to load conversation');
          setIsLoading(false);
        }
      }
    };

    loadConversation();

    // Cleanup: unsubscribe from Firestore and mark component as unmounted
    return () => {
      isMounted = false;
      if (unsubscribeFirestore) {
        console.log('🧹 Cleaning up Firestore listener for conversation:', id);
        unsubscribeFirestore();
      }
    };
  }, [id, currentUser?.id]); // Only re-run if conversation ID or user ID changes

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    if (!currentUser || !id || !conversation) {
      Alert.alert('Error', 'Cannot send message');
      return;
    }

    setIsSending(true);

    try {
      // Generate local ID for optimistic update
      const localId = `temp_${Date.now()}_${Math.random()}`;
      const timestamp = new Date();

      // Create optimistic message
      const optimisticMessage: Message = {
        id: localId,
        localId,
        conversationId: id,
        senderId: currentUser.id,
        content: {
          text,
          type: 'text',
        },
        timestamp,
        status: 'sending',
        syncStatus: 'pending',
        deliveredTo: [],
        readBy: {},
      };

      // 1. Add to optimistic store (instant UI update)
      addOptimisticMessage(optimisticMessage);

      // 2. Insert to SQLite
      await insertMessage(optimisticMessage);

      // 3. Reload messages from SQLite (includes optimistic message)
      const updatedMessages = await getConversationMessages(id);
      setMessages(updatedMessages);

      // 4. Send to Firebase in background
      try {
        const serverId = await sendMessageToFirestore(id, {
          senderId: currentUser.id,
          content: {
            text,
            type: 'text',
          },
        });

        console.log('✅ Message sent to Firebase:', serverId);

        // 5. Update local message with server ID
        await updateMessage(localId, {
          id: serverId,
          status: 'sent',
          syncStatus: 'synced',
        });

        // 6. Remove from optimistic store
        removeOptimisticMessage(localId);

        // 7. Reload messages
        const finalMessages = await getConversationMessages(id);
        setMessages(finalMessages);
      } catch (error) {
        console.error('❌ Failed to send message to Firebase:', error);

        // Mark as failed
        await updateMessage(localId, {
          status: 'sent', // Keep as sent locally for now
          syncStatus: 'failed',
        });

        // Remove from optimistic store
        removeOptimisticMessage(localId);

        // Reload messages
        const finalMessages = await getConversationMessages(id);
        setMessages(finalMessages);

        Alert.alert(
          'Message Failed',
          'Failed to send message. It will be retried when you reconnect.'
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
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
          title: otherParticipantName,
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <OfflineBanner />
        <MessageList
          messages={allMessages}
          currentUserId={currentUser?.id || ''}
          isLoading={false}
        />
        <MessageInput onSend={handleSendMessage} disabled={isSending} />
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
});

