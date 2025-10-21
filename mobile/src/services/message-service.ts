import { firestore } from '../../firebase.config';
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { Message, MessageContent } from '../types';

/**
 * Send a message to Firestore and update conversation metadata
 */
export const sendMessageToFirestore = async (
  conversationId: string,
  messageData: {
    senderId: string;
    content: MessageContent;
  }
): Promise<string> => {
  try {
    // 1. Add message to conversation's messages subcollection
    const messagesRef = collection(
      firestore,
      'conversations',
      conversationId,
      'messages'
    );

    const messageDoc = await addDoc(messagesRef, {
      senderId: messageData.senderId,
      content: messageData.content,
      timestamp: Timestamp.now(),
      status: 'sent',
      deliveredTo: [],
      readBy: {},
    });

    console.log('✅ Message added to Firestore:', messageDoc.id);

    // 2. Update conversation's lastMessage and lastMessageAt
    const conversationRef = doc(firestore, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: {
        text: messageData.content.text,
        senderId: messageData.senderId,
        timestamp: Timestamp.now(),
      },
      lastMessageAt: Timestamp.now(),
    });

    console.log('✅ Conversation metadata updated');

    return messageDoc.id;
  } catch (error) {
    console.error('❌ Error sending message to Firestore:', error);
    throw error;
  }
};

/**
 * Update message status (delivered, read, etc.)
 */
export const updateMessageStatus = async (
  conversationId: string,
  messageId: string,
  updates: Partial<Pick<Message, 'status' | 'deliveredTo' | 'readBy'>>
): Promise<void> => {
  try {
    const messageRef = doc(
      firestore,
      'conversations',
      conversationId,
      'messages',
      messageId
    );

    await updateDoc(messageRef, updates as any);
    console.log('✅ Message status updated:', messageId);
  } catch (error) {
    console.error('❌ Error updating message status:', error);
    throw error;
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessageForUser = async (
  conversationId: string,
  messageId: string,
  userId: string
): Promise<void> => {
  try {
    const messageRef = doc(
      firestore,
      'conversations',
      conversationId,
      'messages',
      messageId
    );

    // Add user to deletedFor array
    await updateDoc(messageRef, {
      deletedFor: [...([] as string[]), userId], // TODO: Fetch existing array first
    });

    console.log('✅ Message deleted for user:', userId);
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    throw error;
  }
};

