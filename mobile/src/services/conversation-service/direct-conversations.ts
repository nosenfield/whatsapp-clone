/**
 * Direct Conversations Module
 * 
 * Handles operations for direct (one-on-one) conversations
 */

import { firestore } from '../../../firebase.config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getUserById } from '../user-search';
import { Conversation, ConversationCreationData } from './types';
import { transformConversationData, createConversationData, validateParticipants } from './conversation-utils';

/**
 * Create a new conversation or get existing one between two users
 * This ensures we don't create duplicate conversations
 */
export const createOrGetConversation = async (
  userId1: string,
  userId2: string
): Promise<string> => {
  try {
    // Check if a direct conversation already exists between these users
    const existingConversation = await findDirectConversation(userId1, userId2);
    
    if (existingConversation) {
      console.log('✅ Found existing conversation:', existingConversation.id);
      return existingConversation.id;
    }

    // Create new conversation
    console.log('📝 Creating new conversation between:', userId1, userId2);
    
    // Get user details for participant info
    const user1 = await getUserById(userId1);
    const user2 = await getUserById(userId2);
    
    if (!user1 || !user2) {
      throw new Error('Failed to fetch user details');
    }

    const conversationData: ConversationCreationData = {
      type: 'direct',
      participants: [userId1, userId2],
      participantDetails: {
        [userId1]: {
          displayName: user1.displayName,
          photoURL: user1.photoURL || undefined,
        },
        [userId2]: {
          displayName: user2.displayName,
          photoURL: user2.photoURL || undefined,
        },
      },
    };

    const conversationRef = await addDoc(
      collection(firestore, 'conversations'),
      createConversationData(conversationData)
    );

    console.log('✅ Created new conversation:', conversationRef.id);
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating/getting conversation:', error);
    throw error;
  }
};

/**
 * Find an existing direct conversation between two users
 */
export const findDirectConversation = async (
  userId1: string,
  userId2: string
): Promise<Conversation | null> => {
  try {
    const conversationsRef = collection(firestore, 'conversations');
    
    // Query for conversations where both users are participants
    const q = query(
      conversationsRef,
      where('type', '==', 'direct'),
      where('participants', 'array-contains', userId1)
    );

    const snapshot = await getDocs(q);
    
    // Filter to find conversation with both users
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const participants = data.participants as string[];
      
      if (participants.includes(userId2)) {
        return transformConversationData(docSnap.id, data);
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding direct conversation:', error);
    throw error;
  }
};
