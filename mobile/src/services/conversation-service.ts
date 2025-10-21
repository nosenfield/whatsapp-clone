import { firestore } from '../../firebase.config';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Conversation } from '../types';
import { getUserById } from './user-search';

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

    const conversationData = {
      type: 'direct',
      participants: [userId1, userId2],
      participantDetails: {
        [userId1]: {
          displayName: user1.displayName,
          photoURL: user1.photoURL || null,
        },
        [userId2]: {
          displayName: user2.displayName,
          photoURL: user2.photoURL || null,
        },
      },
      createdAt: Timestamp.now(),
      lastMessageAt: Timestamp.now(),
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0,
      },
    };

    const conversationRef = await addDoc(
      collection(firestore, 'conversations'),
      conversationData
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
const findDirectConversation = async (
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
        return {
          id: docSnap.id,
          type: data.type,
          participants: data.participants,
          participantDetails: data.participantDetails || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          unreadCount: data.unreadCount || {},
        } as Conversation;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding direct conversation:', error);
    throw error;
  }
};

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
      const data = conversationSnap.data();
      return {
        id: conversationSnap.id,
        type: data.type,
        participants: data.participants,
        participantDetails: data.participantDetails || {},
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
        lastMessage: data.lastMessage ? {
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        } : undefined,
        unreadCount: data.unreadCount || {},
      } as Conversation;
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
    
    const conversations: Conversation[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data.type,
        participants: data.participants,
        participantDetails: data.participantDetails || {},
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
        lastMessage: data.lastMessage ? {
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        } : undefined,
        unreadCount: data.unreadCount || {},
      } as Conversation;
    });

    // Sort by last message time (newest first)
    conversations.sort((a, b) => 
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
};

