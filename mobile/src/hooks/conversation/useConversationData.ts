/**
 * Conversation Data Hook
 * 
 * Manages conversation state, loading, and real-time updates
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Conversation, Message } from '../../types';
import { getConversationById } from '../../services/conversation-service';
import { subscribeToMessages, subscribeToConversation } from '../../services/firebase-firestore';
import {
  getConversationMessages,
  getConversationMessageCount,
  insertMessage,
  upsertConversation,
} from '../../services/database';
import { updateUserLastSeen } from '../../services/read-receipt-service';

interface UseConversationDataProps {
  conversationId: string;
  currentUserId: string;
}

export const useConversationData = ({ conversationId, currentUserId }: UseConversationDataProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let unsubscribeFirestore: (() => void) | undefined;
    let unsubscribeConversation: (() => void) | undefined;
    let isMounted = true;

    const loadConversation = async () => {
      try {
        // 1. Load conversation metadata from Firestore
        const conv = await getConversationById(conversationId);
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
        const localMessages = await getConversationMessages(conversationId, 50, 0);
        if (!isMounted) return;
        setMessages(localMessages);
        
        // Check if there are more messages
        const totalCount = await getConversationMessageCount(conversationId);
        setHasMoreMessages(totalCount > 50);
        setIsLoading(false);

        // 4. Mark messages as read and track conversation view
        if (currentUserId) {
          try {
            // Get the last message ID to mark as read
            const lastMessage = localMessages[localMessages.length - 1];
            const lastMessageId = lastMessage?.id;
            
            // Update user's last seen timestamp
            await updateUserLastSeen(conversationId, currentUserId, lastMessageId);
            
            console.log('✅ Marked messages as read and tracked conversation view');
          } catch (error) {
            console.error('❌ Error marking messages as read:', error);
            // Don't show error to user as this is background functionality
          }
        }

        // 3. Subscribe to conversation updates for real-time read receipts
        unsubscribeConversation = subscribeToConversation(conversationId, async (updatedConversation) => {
          if (!isMounted) return;
          console.log('📖 Conversation updated with new lastSeenBy data:', updatedConversation.lastSeenBy);
          console.log('📖 Updated conversation participants:', updatedConversation.participants);
          setConversation(updatedConversation);
        });

        // 4. Subscribe to Firestore for real-time message updates
        unsubscribeFirestore = subscribeToMessages(conversationId, async (firebaseMessages) => {
          if (!isMounted) return;
          console.log('📨 Received messages from Firestore:', firebaseMessages.length);

          // Get all existing messages to check for duplicates
          const existingMessages = await getConversationMessages(conversationId);
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
          if (hasNewMessages && currentUserId) {
            try {
              // Get the most recent message to mark as read
              const updatedMessages = await getConversationMessages(conversationId);
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              
              if (lastMessage?.id) {
                await updateUserLastSeen(conversationId, currentUserId, lastMessage.id);
                console.log('✅ Updated last seen after receiving new message while in chat');
              }
            } catch (error) {
              console.error('❌ Failed to update last seen after receiving message:', error);
              // Don't fail the message processing if this fails
            }
          }

          // Reload from SQLite to get fresh data
          const updatedMessages = await getConversationMessages(conversationId);
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
        console.log('🧹 Cleaning up Firestore listener for conversation:', conversationId);
        unsubscribeFirestore();
      }
      if (unsubscribeConversation) {
        console.log('🧹 Cleaning up conversation listener for conversation:', conversationId);
        unsubscribeConversation();
      }
    };
  }, [conversationId, currentUserId]);

  return {
    conversation,
    messages,
    isLoading,
    hasMoreMessages,
    setMessages,
  };
};
