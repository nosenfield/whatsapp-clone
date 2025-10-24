/**
 * Message Sending Hook
 * 
 * Handles sending text and image messages with optimistic updates
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '../../types';
import { useMessageStore } from '../../store/message-store';
import {
  getConversationMessages,
  insertMessage,
  updateMessage,
} from '../../services/database';
import { sendMessageToFirestore } from '../../services/message-service';
import { uploadImageMessage } from '../../services/image-service';
import { updateUserLastSeen } from '../../services/read-receipt-service';

interface UseMessageSendingProps {
  conversationId: string;
  currentUserId: string;
  onMessagesUpdate: (messages: Message[]) => void;
}

export const useMessageSending = ({ 
  conversationId, 
  currentUserId, 
  onMessagesUpdate 
}: UseMessageSendingProps) => {
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { optimisticMessages, addOptimisticMessage, removeOptimisticMessage } = useMessageStore();

  const handleSendMessage = async (text: string) => {
    if (!currentUserId || !conversationId) {
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
        conversationId,
        senderId: currentUserId,
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
      const updatedMessages = await getConversationMessages(conversationId);
      onMessagesUpdate(updatedMessages);

      // 4. Send to Firebase in background
      try {
        const serverId = await sendMessageToFirestore(conversationId, {
          senderId: currentUserId,
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
          await updateUserLastSeen(conversationId, currentUserId, serverId);
          console.log('✅ Updated last seen after sending message');
        } catch (error) {
          console.error('❌ Failed to update last seen after sending:', error);
          // Don't fail the message send if this fails
        }

        // 6. Reload messages
        const finalMessages = await getConversationMessages(conversationId);
        onMessagesUpdate(finalMessages);

        // 7. Invalidate conversations query to update the list
        queryClient.invalidateQueries({ queryKey: ['conversations', currentUserId] });
      } catch (error) {
        console.error('❌ Failed to send message to Firebase:', error);

        // Mark as failed
        await updateMessage(localId, {
          status: 'sent', // Keep as sent locally for now
          syncStatus: 'failed',
        });

        // Reload messages
        const finalMessages = await getConversationMessages(conversationId);
        onMessagesUpdate(finalMessages);

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

  const handleSendImage = async (imageUri: string) => {
    if (!currentUserId || !conversationId) {
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
        conversationId,
        senderId: currentUserId,
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
      const updatedMessages = await getConversationMessages(conversationId);
      onMessagesUpdate(updatedMessages);

      // 4. Upload image to Firebase Storage
      console.log('📤 Uploading image...');
      const { imageUrl, thumbnailUrl } = await uploadImageMessage(conversationId, imageUri);
      console.log('✅ Image uploaded:', imageUrl);

      // 5. Send message to Firestore with uploaded image URL
      const serverId = await sendMessageToFirestore(conversationId, {
        senderId: currentUserId,
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
        await updateUserLastSeen(conversationId, currentUserId, serverId);
        console.log('✅ Updated last seen after sending image');
      } catch (error) {
        console.error('❌ Failed to update last seen after sending image:', error);
        // Don't fail the image send if this fails
      }

      // 7. Reload messages with updated URLs
      const finalMessages = await getConversationMessages(conversationId);
      onMessagesUpdate(finalMessages);

      // 8. Invalidate conversations query to update the list
      queryClient.invalidateQueries({ queryKey: ['conversations', currentUserId] });
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

  return {
    isSending,
    handleSendMessage,
    handleSendImage,
  };
};
