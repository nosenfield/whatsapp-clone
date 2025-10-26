/**
 * Conversation Data Hook
 * 
 * Manages conversation state, loading, and real-time updates
 */

import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Conversation, Message } from '../../types';
import { getConversationById } from '../../services/conversation-service/';
import { subscribeToMessages, subscribeToConversation } from '../../services/firebase-firestore';
import {
  getConversationMessages,
  getConversationMessageCount,
  insertMessage,
  upsertConversation,
  getConversation,
} from '../../services/database/';
import { updateUserLastSeen } from '../../services/read-receipt-service';

interface UseConversationDataProps {
  conversationId: string;
  currentUserId: string;
  initialMessages?: Message[];
}

export const useConversationData = ({ 
  conversationId, 
  currentUserId,
  initialMessages,
}: UseConversationDataProps) => {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isLoading, setIsLoading] = useState(!initialMessages); // Don't show loading if we have initial messages
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const hasInitialMessagesRef = useRef(!!initialMessages); // Mark as having messages if passed initially
  const hasCachedMessagesRef = useRef(!!initialMessages);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    let unsubscribeFirestore: (() => void) | undefined;
    let unsubscribeConversation: (() => void) | undefined;
    let isMounted = true;
    
    // Only reset if we don't have initial messages passed in
    if (!initialMessages) {
      hasInitialMessagesRef.current = false;
    }

    const loadConversation = async () => {
      try {
        let cachedConversation: Conversation | null = null;
        
        // ⚡ PERFORMANCE: If we have initial messages, use them immediately
        if (initialMessages && initialMessages.length > 0) {
          console.log('⚡ Using pre-loaded initial messages:', initialMessages.length);
          hasInitialMessagesRef.current = true;
          hasCachedMessagesRef.current = true;
          
          // Check if there are more messages
          const totalCount = await getConversationMessageCount(conversationId);
          setHasMoreMessages(totalCount > 50);
          
          // Mark as read (do this in background)
          if (currentUserId) {
            const lastMessage = initialMessages[initialMessages.length - 1];
            const lastMessageId = lastMessage?.id;
            updateUserLastSeen(conversationId, currentUserId, lastMessageId)
              .then(() => console.log('✅ Marked messages as read (initial)'))
              .catch((error) => console.error('❌ Error marking messages as read:', error));
          }
        } else {
          // ⚡ PERFORMANCE: Check SQLite cache first (instant access)
          cachedConversation = await getConversation(conversationId);
          
          if (cachedConversation) {
            console.log('⚡ Using cached conversation:', conversationId);
            setConversation(cachedConversation);
            
            // Load messages from SQLite (instant display, limit 50)
            const localMessages = await getConversationMessages(conversationId, 50, 0);
            if (!isMounted) return;
            console.log('📨 Loaded', localMessages.length, 'cached messages from SQLite for conversation:', conversationId);
            
            // Check if there are more messages
            const totalCount = await getConversationMessageCount(conversationId);
            
            // ⚡ Only set loading to false if we actually have cached messages
            // Otherwise wait for Firestore to load and verify there are no messages
            if (localMessages.length > 0) {
              console.log('✅ Showing cached messages immediately');
              hasInitialMessagesRef.current = true;
              hasCachedMessagesRef.current = true;
              
              // ⚡ CRITICAL: Update messages state BEFORE setting isLoading to false
              // We batch these in a way that guarantees messages are available
              setMessages(localMessages);
              setHasMoreMessages(totalCount > 50);
              // IMPORTANT: Only set loading to false AFTER messages are in state
              // React will batch these updates, but by setting isLoading last,
              // we ensure the component always has messages when isLoading=false
              setIsLoading(false);
            
              // Mark as read (do this AFTER updating UI state to avoid blocking render)
              if (currentUserId) {
                // Don't await - let this happen in background
                const lastMessage = localMessages[localMessages.length - 1];
                const lastMessageId = lastMessage?.id;
                updateUserLastSeen(conversationId, currentUserId, lastMessageId)
                  .then(() => console.log('✅ Marked messages as read (cached)'))
                  .catch((error) => console.error('❌ Error marking messages as read:', error));
              }
            } else {
              console.log('⚠️ No cached messages found, waiting for Firestore...');
              // Keep isLoading=true, will be set to false after Firestore loads
              setMessages(localMessages);
              setHasMoreMessages(totalCount > 50);
            }
          }
        }
        
        // 1. Load conversation metadata from Firestore (for updates & uncached conversations)
        const conv = await getConversationById(conversationId);
        if (!conv || !isMounted) {
          if (!conv && !cachedConversation) {
            Alert.alert('Error', 'Conversation not found');
          }
          return;
        }
        
        // If we didn't use cache, display the fresh data
        if (!cachedConversation) {
          console.log('📖 Initial conversation loaded from Firestore:', conv.id);
          console.log('📖 Initial lastSeenBy:', conv.lastSeenBy);
          console.log('📖 Initial participants:', conv.participants);
          setConversation(conv);
          
          // Store conversation in SQLite (required for foreign key constraint)
          await upsertConversation(conv);
          
          // Load messages from SQLite (instant display, limit 50)
          const localMessages = await getConversationMessages(conversationId, 50, 0);
          if (!isMounted) return;
          
          // Check if there are more messages
          const totalCount = await getConversationMessageCount(conversationId);
          hasInitialMessagesRef.current = true;
          
          // ⚡ CRITICAL: Set messages and loading state together to prevent flash
          setMessages(localMessages);
          setHasMoreMessages(totalCount > 50);
          setIsLoading(false);
          
          // Mark as read (do this AFTER updating UI state to avoid blocking render)
          if (currentUserId) {
            const lastMessage = localMessages[localMessages.length - 1];
            const lastMessageId = lastMessage?.id;
            updateUserLastSeen(conversationId, currentUserId, lastMessageId)
              .then(() => console.log('✅ Marked messages as read'))
              .catch((error) => console.error('❌ Error marking messages as read:', error));
          }
        } else {
          // Update with fresh data from Firestore
          setConversation(conv);
          await upsertConversation(conv);
          
          // If we had cached conversation but no messages, check Firestore now
          if (cachedConversation && messages.length === 0) {
            console.log('📨 Cached conversation found but no cached messages, checking Firestore...');
            // Reload messages from SQLite (might have been updated by Firestore listener)
            const updatedMessages = await getConversationMessages(conversationId, 50, 0);
            if (!isMounted) return;
            
            console.log('📨 Found', updatedMessages.length, 'messages after Firestore load');
            
            // Only set loading to false if we actually have messages
            // Otherwise, keep loading until Firestore subscription delivers messages
            if (updatedMessages.length > 0) {
              hasInitialMessagesRef.current = true;
              setMessages(updatedMessages);
              setIsLoading(false);
            } else {
              console.log('⏳ No messages yet, waiting for Firestore subscription...');
              // Keep isLoading=true until Firestore subscription delivers messages
            }
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
            // Only update if we have messages to display OR if we've already loaded initial messages
            // This prevents clearing during initial load but allows "no messages" to show after load
            if (updatedMessages.length > 0 || hasInitialMessagesRef.current) {
              console.log('📨 Updating messages list with', updatedMessages.length, 'messages from SQLite');
              setMessages(updatedMessages);
              hasInitialMessagesRef.current = true;
              
              // If this is the first time we're getting messages, stop loading
              if (updatedMessages.length > 0 && isLoading) {
                console.log('✅ First messages received, stopping loading state');
                setIsLoading(false);
              }
            } else {
              // Still on initial load with no messages, skip update to prevent flash
              console.log('⏸️ Skipping message update during initial load (no initial messages set yet)');
            }
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

  // Only show as "not loading" if we've actually checked for messages
  // This prevents flash of "no messages" before cache is checked
  const isActuallyLoading = isLoading || (!hasInitialMessagesRef.current && messages.length === 0);

  return {
    conversation,
    messages,
    isLoading: isActuallyLoading,
    hasMoreMessages,
    setMessages,
  };
};
