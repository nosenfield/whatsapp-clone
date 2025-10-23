import { QueryClient } from '@tanstack/react-query';
import { insertMessage, updateMessage, getConversationMessages } from '../services/database';
import { sendMessageToFirestore } from '../services/message-service';
import { useMessageStore } from '../store/message-store';
import { Message, MessageContent } from '../types';

export interface SendMessageCommand {
  conversationId: string;
  senderId: string;
  content: MessageContent;
}

export interface SendImageCommand {
  conversationId: string;
  senderId: string;
  imageUri: string;
  caption?: string;
}

export class MessageCommands {
  constructor(
    private queryClient: QueryClient
  ) {}

  /**
   * Unified send message flow
   * Used by both UI and AI
   */
  async sendMessage(command: SendMessageCommand): Promise<string> {
    const localId = `temp_${Date.now()}_${Math.random()}`;
    
    // 1. Optimistic update (instant UI feedback)
    const optimisticMessage: Message = {
      id: localId,
      localId,
      conversationId: command.conversationId,
      senderId: command.senderId,
      content: command.content,
      timestamp: new Date(),
      status: 'sending',
      syncStatus: 'pending',
      deliveredTo: [],
      readBy: {},
    };
    
    useMessageStore.getState().addOptimisticMessage(optimisticMessage);
    
    try {
      // 2. Persist to SQLite (local cache)
      await insertMessage(optimisticMessage);
      
      // 3. Remove from optimistic (now in SQLite)
      useMessageStore.getState().removeOptimisticMessage(localId);
      
      // 4. Sync to Firestore (remote)
      const serverId = await sendMessageToFirestore(
        command.conversationId,
        {
          senderId: command.senderId,
          content: command.content,
        }
      );
      
      // 5. Update with server ID
      await updateMessage(localId, {
        id: serverId,
        status: 'sent',
        syncStatus: 'synced',
      });
      
      // 6. Invalidate queries (update UI)
      await this.queryClient.invalidateQueries({
        queryKey: ['conversations', command.senderId],
      });
      await this.queryClient.invalidateQueries({
        queryKey: ['messages', command.conversationId],
      });
      
      console.log('✅ Message sent successfully:', serverId);
      return serverId;
      
    } catch (error) {
      // Mark as failed
      await updateMessage(localId, {
        status: 'sent',
        syncStatus: 'failed',
      });
      
      // Remove from optimistic store
      useMessageStore.getState().removeOptimisticMessage(localId);
      
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send image message
   */
  async sendImage(command: SendImageCommand): Promise<string> {
    const { uploadImageMessage } = await import('../services/image-service');
    
    const localId = `temp_${Date.now()}_${Math.random()}`;
    
    // 1. Optimistic update with local URI
    const optimisticMessage: Message = {
      id: localId,
      localId,
      conversationId: command.conversationId,
      senderId: command.senderId,
      content: {
        text: command.caption || '',
        type: 'image',
        mediaUrl: command.imageUri, // Local URI for preview
      },
      timestamp: new Date(),
      status: 'sending',
      syncStatus: 'pending',
      deliveredTo: [],
      readBy: {},
    };
    
    useMessageStore.getState().addOptimisticMessage(optimisticMessage);
    
    try {
      // 2. Persist to SQLite
      await insertMessage(optimisticMessage);
      
      // 3. Remove from optimistic
      useMessageStore.getState().removeOptimisticMessage(localId);
      
      // 4. Upload image to Firebase Storage
      const { imageUrl, thumbnailUrl } = await uploadImageMessage(
        command.conversationId,
        command.imageUri
      );
      
      // 5. Send message with uploaded URL
      const serverId = await sendMessageToFirestore(
        command.conversationId,
        {
          senderId: command.senderId,
          content: {
            text: command.caption || '',
            type: 'image',
            mediaUrl: imageUrl,
            mediaThumbnail: thumbnailUrl,
          },
        }
      );
      
      // 6. Update with server ID and URLs
      await updateMessage(localId, {
        id: serverId,
        status: 'sent',
        syncStatus: 'synced',
        content: {
          text: command.caption || '',
          type: 'image',
          mediaUrl: imageUrl,
          mediaThumbnail: thumbnailUrl,
        },
      });
      
      // 7. Invalidate queries
      await this.queryClient.invalidateQueries({
        queryKey: ['conversations', command.senderId],
      });
      
      console.log('✅ Image message sent:', serverId);
      return serverId;
      
    } catch (error) {
      await updateMessage(localId, {
        status: 'sent',
        syncStatus: 'failed',
      });
      
      useMessageStore.getState().removeOptimisticMessage(localId);
      
      console.error('❌ Failed to send image:', error);
      throw error;
    }
  }

  /**
   * Delete message for current user
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const { deleteMessage } = await import('../services/database');
    
    // Delete from SQLite
    await deleteMessage(messageId, userId);
    
    // Invalidate queries
    await this.queryClient.invalidateQueries({
      queryKey: ['messages'],
    });
    
    console.log('✅ Message deleted:', messageId);
  }
}
