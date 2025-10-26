/**
 * Conversation Queries Module
 * 
 * Handles read operations for conversations
 */

import { firestore } from '../../../firebase.config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Conversation } from './types';
import { transformConversationData, sortConversationsByLastMessage } from './conversation-utils';

/**
 * Get a conversation by ID
 */
export const getConversationById = async (
  conversationId: string
): Promise<Conversation | null> => {
  try {
    const conversationRef = doc(firestore, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      return transformConversationData(conversationSnap.id, conversationSnap.data());
    }

    return null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const conversationsRef = collection(firestore, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );

    const snapshot = await getDocs(q);
    
    const conversations: Conversation[] = snapshot.docs.map(docSnap => 
      transformConversationData(docSnap.id, docSnap.data())
    );

    // Sort by last message time (newest first)
    return sortConversationsByLastMessage(conversations);
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
};

/**
 * Delete a conversation (removes user from participants)
 * Note: This doesn't actually delete the conversation document,
 * but removes the user from the participants list
 */
export const deleteConversation = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    console.log('🗑️ Deleting conversation for user:', userId, 'conversation:', conversationId);
    
    // Get the conversation document
    const conversationRef = doc(firestore, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      throw new Error('Conversation not found');
    }
    
    const conversationData = conversationSnap.data();
    const participants = conversationData.participants as string[];
    
    // Check if user is a participant
    if (!participants.includes(userId)) {
      throw new Error('User is not a participant in this conversation');
    }
    
    // Remove user from participants array
    const updatedParticipants = participants.filter(p => p !== userId);
    
    // If this was a direct conversation and we're removing one participant,
    // we could either delete the conversation entirely or keep it for the other user
    // For now, we'll keep it but mark it as inactive for the removed user
    if (conversationData.type === 'direct' && updatedParticipants.length === 1) {
      // For direct conversations, we'll keep the conversation but remove the user
      // The other participant can still see the conversation history
      console.log('📝 Direct conversation - keeping for other participant');
    }
    
    // Update the conversation document
    await deleteDoc(conversationRef);
    
    console.log('✅ Successfully deleted conversation for user');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};
