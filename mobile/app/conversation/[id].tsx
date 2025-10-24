import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert, Image, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth-store';
import { useMessageStore } from '../../src/store/message-store';
import { MessageInput } from '../../src/components/MessageInput';
import { MessageList } from '../../src/components/MessageList';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { AICommandButton } from '../../src/components/AICommandButton';
import { useAICommandContext } from '../../src/hooks/useAICommandContext';
import { Message, Conversation } from '../../src/types';
import { getConversationById } from '../../src/services/conversation-service';
import { subscribeToMessages } from '../../src/services/firebase-firestore';
import {
  getConversationMessages,
  getConversationMessageCount,
  insertMessage,
  updateMessage,
  upsertConversation,
} from '../../src/services/database';
import { sendMessageToFirestore } from '../../src/services/message-service';
import { usePresence, formatLastSeen } from '../../src/hooks/usePresence';
import { useMultiplePresence } from '../../src/hooks/useMultiplePresence';
import {
  useTypingIndicators,
  formatTypingIndicator,
} from '../../src/hooks/useTypingIndicators';
import { uploadImageMessage } from '../../src/services/image-service';
import { updateUserLastSeen } from '../../src/services/read-receipt-service';
import { subscribeToConversation } from '../../src/services/firebase-firestore';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { optimisticMessages, addOptimisticMessage, removeOptimisticMessage } =
    useMessageStore();
  const aiContext = useAICommandContext();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(50); // Start after first 50
  const [showMemberAvatars, setShowMemberAvatars] = useState(false);

  // Determine if this is a group conversation
  const isGroup = conversation?.type === 'group';

  // Get conversation display name
  const conversationName = isGroup
    ? conversation?.name || 'Group Chat'
    : (() => {
        const otherParticipant = conversation?.participants.find(
          (p) => p !== currentUser?.id
        );
        return otherParticipant && conversation?.participantDetails[otherParticipant]
          ? conversation.participantDetails[otherParticipant].displayName
          : 'Chat';
      })();

  // Get other participant ID (for presence in direct chats)
  const otherParticipantId = !isGroup
    ? conversation?.participants.find((p) => p !== currentUser?.id)
    : undefined;

  // Get other participant's photo URL (for direct chats)
  const otherParticipantPhotoURL = !isGroup && otherParticipantId
    ? conversation?.participantDetails[otherParticipantId]?.photoURL
    : undefined;

  // Subscribe to other participant's presence (only for direct chats)
  const presence = usePresence(otherParticipantId);

  // Get presence for all group members (only for group chats)
  const groupMemberPresence = useMultiplePresence(
    isGroup && conversation ? conversation.participants : []
  );

  // Format header subtitle
  const headerSubtitle = isGroup
    ? `${conversation?.participants.length || 0} members`
    : presence.online
    ? 'online'
    : formatLastSeen(presence.lastSeen);

  // Subscribe to typing indicators
  const typingUserIds = useTypingIndicators(id, currentUser?.id);

  // Format typing indicator text
  const typingText =
    conversation && typingUserIds.length > 0
      ? formatTypingIndicator(typingUserIds, conversation.participantDetails)
      : null;

  // Load conversation and messages
  useEffect(() => {
    if (!id || !currentUser?.id) return;

           let unsubscribeFirestore: (() => void) | undefined;
           let unsubscribeConversation: (() => void) | undefined;
           let isMounted = true;

    const loadConversation = async () => {
      try {
               // 1. Load conversation metadata from Firestore
               const conv = await getConversationById(id);
               if (!conv || !isMounted) {
                 if (!conv) {
                   Alert.alert('Error', 'Conversation not found');
                 }
                 return;
               }
               console.log('📖 Initial conversation loaded:', conv.id);
               console.log('📖 Initial lastSeenBy:', conv.lastSeenBy);
               console.log('📖 Initial participants:', conv.participants);
               setConversation(conv);

        // 1.5. Store conversation in SQLite (required for foreign key constraint)
        await upsertConversation(conv);

        // 2. Load messages from SQLite (instant display, limit 50)
        const localMessages = await getConversationMessages(id, 50, 0);
        if (!isMounted) return;
        setMessages(localMessages);
        
        // Check if there are more messages
        const totalCount = await getConversationMessageCount(id);
        setHasMoreMessages(totalCount > 50);
        setIsLoading(false);

        // 4. Mark messages as read and track conversation view
        if (currentUser?.id) {
          try {
            // Get the last message ID to mark as read
            const lastMessage = localMessages[localMessages.length - 1];
            const lastMessageId = lastMessage?.id;
            
            // Update user's last seen timestamp
            await updateUserLastSeen(id, currentUser.id, lastMessageId);
            
            console.log('✅ Marked messages as read and tracked conversation view');
          } catch (error) {
            console.error('❌ Error marking messages as read:', error);
            // Don't show error to user as this is background functionality
          }
        }

               // 3. Subscribe to conversation updates for real-time read receipts
               unsubscribeConversation = subscribeToConversation(id, async (updatedConversation) => {
                 if (!isMounted) return;
                 console.log('📖 Conversation updated with new lastSeenBy data:', updatedConversation.lastSeenBy);
                 console.log('📖 Updated conversation participants:', updatedConversation.participants);
                 setConversation(updatedConversation);
               });

               // 4. Subscribe to Firestore for real-time message updates
        unsubscribeFirestore = subscribeToMessages(id, async (firebaseMessages) => {
          if (!isMounted) return;
          console.log('📨 Received messages from Firestore:', firebaseMessages.length);

          // Get all existing messages to check for duplicates
          const existingMessages = await getConversationMessages(id);
          const existingIds = new Set(existingMessages.map((m) => m.id));

          // Insert only new messages (not already in SQLite)
          let hasNewMessages = false;
          for (const fbMessage of firebaseMessages) {
            // Skip if message already exists by ID
            if (existingIds.has(fbMessage.id)) {
              continue;
            }
            
            // Also skip if there's a message with the same localId (same temp message)
            const isDuplicate = existingMessages.some(
              (existing) =>
                existing.senderId === fbMessage.senderId &&
                existing.conversationId === fbMessage.conversationId &&
                existing.content.text === fbMessage.content.text &&
                existing.content.type === fbMessage.content.type &&
                Math.abs(existing.timestamp.getTime() - fbMessage.timestamp.getTime()) < 5000 // Within 5 seconds
            );
            
            if (!isDuplicate) {
              await insertMessage(fbMessage);
              hasNewMessages = true;
            }
          }

          // If we received new messages and user is currently in the chat, update their last seen
          if (hasNewMessages && currentUser?.id) {
            try {
              // Get the most recent message to mark as read
              const updatedMessages = await getConversationMessages(id);
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              
              if (lastMessage?.id) {
                await updateUserLastSeen(id, currentUser.id, lastMessage.id);
                console.log('✅ Updated last seen after receiving new message while in chat');
              }
            } catch (error) {
              console.error('❌ Failed to update last seen after receiving message:', error);
              // Don't fail the message processing if this fails
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
             if (unsubscribeConversation) {
               console.log('🧹 Cleaning up conversation listener for conversation:', id);
               unsubscribeConversation();
             }
           };
  }, [id, currentUser?.id]); // Only re-run if conversation ID or user ID changes

  // Handle sending an image message
  const handleSendImage = async (imageUri: string) => {
    if (!currentUser || !id || !conversation) {
      Alert.alert('Error', 'Cannot send image');
      return;
    }

    setIsSending(true);

    try {
      // Generate local ID for optimistic update
      const localId = `temp_${Date.now()}_${Math.random()}`;
      const timestamp = new Date();

      // Create optimistic message with placeholder
      const optimisticMessage: Message = {
        id: localId,
        localId,
        conversationId: id,
        senderId: currentUser.id,
        content: {
          text: '', // No text for image-only messages
          type: 'image',
          mediaUrl: imageUri, // Use local URI for immediate display
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

      // 2.5. Remove from optimistic store since it's now in SQLite
      removeOptimisticMessage(localId);

      // 3. Reload messages from SQLite (includes the message)
      const updatedMessages = await getConversationMessages(id);
      setMessages(updatedMessages);

      // 4. Upload image to Firebase Storage
      console.log('📤 Uploading image...');
      const { imageUrl, thumbnailUrl } = await uploadImageMessage(id, imageUri);
      console.log('✅ Image uploaded:', imageUrl);

      // 5. Send message to Firestore with uploaded image URL
      const serverId = await sendMessageToFirestore(id, {
        senderId: currentUser.id,
        content: {
          text: '',
          type: 'image',
          mediaUrl: imageUrl,
          mediaThumbnail: thumbnailUrl,
        },
      });

      console.log('✅ Image message sent to Firebase:', serverId);

      // 6. Update local message with server ID and uploaded URL
      await updateMessage(localId, {
        id: serverId,
        status: 'sent',
        syncStatus: 'synced',
        content: {
          text: '',
          type: 'image',
          mediaUrl: imageUrl,
          mediaThumbnail: thumbnailUrl,
        },
      });

      // 6.5. Update user's last seen timestamp since they sent a message
      try {
        await updateUserLastSeen(id, currentUser.id, serverId);
        console.log('✅ Updated last seen after sending image');
      } catch (error) {
        console.error('❌ Failed to update last seen after sending image:', error);
        // Don't fail the image send if this fails
      }

      // 7. Reload messages with updated URLs
      const finalMessages = await getConversationMessages(id);
      setMessages(finalMessages);

      // 8. Invalidate conversations query to update the list
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.id] });
    } catch (error) {
      console.error('❌ Failed to send image:', error);
      Alert.alert(
        'Failed to Send Image',
        'Could not upload image. Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  // Handle sending a text message
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

      // 2.5. Remove from optimistic store since it's now in SQLite
      removeOptimisticMessage(localId);

      // 3. Reload messages from SQLite (includes the message)
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

        // 5.5. Update user's last seen timestamp since they sent a message
        try {
          await updateUserLastSeen(id, currentUser.id, serverId);
          console.log('✅ Updated last seen after sending message');
        } catch (error) {
          console.error('❌ Failed to update last seen after sending:', error);
          // Don't fail the message send if this fails
        }

        // 6. Reload messages
        const finalMessages = await getConversationMessages(id);
        setMessages(finalMessages);

        // 7. Invalidate conversations query to update the list
        queryClient.invalidateQueries({ queryKey: ['conversations', currentUser.id] });
      } catch (error) {
        console.error('❌ Failed to send message to Firebase:', error);

        // Mark as failed
        await updateMessage(localId, {
          status: 'sent', // Keep as sent locally for now
          syncStatus: 'failed',
        });

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

  // Load more messages (older messages)
  const handleLoadMore = async () => {
    if (!id || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const olderMessages = await getConversationMessages(id, 50, currentOffset);
      setMessages((prev) => [...prev, ...olderMessages]);
      setCurrentOffset((prev) => prev + 50);
      
      // Check if there are even more messages
      const totalCount = await getConversationMessageCount(id);
      setHasMoreMessages(totalCount > currentOffset + 50);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
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
          title: conversationName,
          headerShown: true,
          headerTitleAlign: 'center',
          headerBackTitle: 'Chats',
          headerTitle: () => (
            <TouchableOpacity 
              style={styles.headerContainer}
              onPress={() => isGroup && setShowMemberAvatars(!showMemberAvatars)}
              activeOpacity={isGroup ? 0.7 : 1}
            >
              {!isGroup && (
                <View style={styles.headerAvatarContainer}>
                  {otherParticipantPhotoURL ? (
                    <Image
                      source={{ uri: otherParticipantPhotoURL }}
                      style={styles.headerPhoto}
                    />
                  ) : (
                    <View style={styles.headerDefaultAvatar}>
                      <MaterialIcons
                        name="person"
                        size={18}
                        color="#fff"
                      />
                    </View>
                  )}
                </View>
              )}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{conversationName}</Text>
                <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      
      {/* Group Member Avatars Bar */}
      {showMemberAvatars && conversation && isGroup && (
        <View style={styles.memberAvatarsBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.memberAvatarsScrollContent}
          >
            {conversation.participants
              .map((participantId) => ({
                id: participantId,
                participant: conversation.participantDetails[participantId]
              }))
              .filter(({ participant }) => participant) // Remove participants without details
              .sort((a, b) => a.participant.displayName.localeCompare(b.participant.displayName)) // Sort alphabetically
              .map(({ id: participantId, participant }) => {
                // Get presence for this participant from pre-collected data
                const memberPresence = groupMemberPresence[participantId];
                
                return (
                  <View key={participantId} style={styles.memberAvatarContainer}>
                    <View style={styles.memberAvatarWrapper}>
                      <View style={styles.memberAvatar}>
                        {participant.photoURL ? (
                          <Image
                            source={{ uri: participant.photoURL }}
                            style={styles.memberAvatarImage}
                          />
                        ) : (
                          <MaterialIcons
                            name="person"
                            size={20}
                            color="#fff"
                          />
                        )}
                      </View>
                      {/* Online indicator */}
                      {memberPresence?.online && (
                        <View style={styles.memberOnlineIndicator} />
                      )}
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {participant.displayName}
                    </Text>
                  </View>
                );
              })}
          </ScrollView>
        </View>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatarContainer: {
    position: 'absolute',
    left: 0,
  },
  headerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerDefaultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
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
  memberAvatarsBar: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  memberAvatarsScrollContent: {
    paddingHorizontal: 4,
  },
  memberAvatarContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 50,
  },
  memberAvatarWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberOnlineIndicator: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  memberAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberName: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

