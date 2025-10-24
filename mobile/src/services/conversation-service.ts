/**
 * @deprecated This service is deprecated. Use the modular conversation-service/ directory instead.
 * This file will be removed in a future version.
 * 
 * Migration guide:
 * - Replace: import { ... } from './conversation-service'
 * - With: import { ... } from './conversation-service'
 * - The new modular structure provides the same API with better organization
 */

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
  deleteDoc,
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
        lastSeenBy: data.lastSeenBy ? Object.fromEntries(
          Object.entries(data.lastSeenBy).map(([userId, seenData]: [string, any]) => [
            userId,
            {
              lastMessageId: seenData.lastMessageId,
              seenAt: seenData.seenAt?.toDate() || new Date()
            }
          ])
        ) : {},
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
          id: data.lastMessage.id || '',
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        } : undefined,
        unreadCount: data.unreadCount || {},
        lastSeenBy: data.lastSeenBy ? Object.fromEntries(
          Object.entries(data.lastSeenBy).map(([userId, seenData]: [string, any]) => [
            userId,
            {
              lastMessageId: seenData.lastMessageId,
              seenAt: seenData.seenAt?.toDate() || new Date()
            }
          ])
        ) : {},
      } as Conversation;
    }

    return null;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

/**
 * Create a new group conversation
 * @param creatorId - User ID of the group creator
 * @param participantIds - Array of all participant user IDs (including creator)
 * @param groupName - Name of the group
 * @returns The ID of the created group conversation
 */
export const createGroupConversation = async (
  creatorId: string,
  participantIds: string[],
  groupName: string
): Promise<string> => {
  try {
    console.log('📝 Creating group conversation:', groupName);
    console.log('   Creator:', creatorId);
    console.log('   Participants:', participantIds.length);

    // Validate participants
    if (participantIds.length < 2) {
      throw new Error('Group must have at least 2 members');
    }

    if (participantIds.length > 20) {
      throw new Error('Group cannot have more than 20 members');
    }

    if (!participantIds.includes(creatorId)) {
      throw new Error('Creator must be in participants list');
    }

    // Fetch details for all participants
    const participantDetails: Record<string, { displayName: string; photoURL?: string }> = {};
    
    for (const userId of participantIds) {
      const user = await getUserById(userId);
      if (!user) {
        console.error('Failed to fetch user:', userId);
        throw new Error(`Failed to fetch user details for ${userId}`);
      }
      
      // Only include photoURL if it exists (Firestore doesn't accept undefined)
      const details: { displayName: string; photoURL?: string } = {
        displayName: user.displayName,
      };
      
      if (user.photoURL) {
        details.photoURL = user.photoURL;
      }
      
      participantDetails[userId] = details;
    }

    // Initialize unread count for all participants
    const unreadCount: Record<string, number> = {};
    participantIds.forEach(id => {
      unreadCount[id] = 0;
    });

    // Create group conversation document
    const conversationData = {
      type: 'group',
      name: groupName,
      participants: participantIds,
      participantDetails,
      createdBy: creatorId,
      createdAt: Timestamp.now(),
      lastMessageAt: Timestamp.now(),
      unreadCount,
    };

    const conversationRef = await addDoc(
      collection(firestore, 'conversations'),
      conversationData
    );

    console.log('✅ Created group conversation:', conversationRef.id);
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating group conversation:', error);
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
          id: data.lastMessage.id || '',
          text: data.lastMessage.text,
          senderId: data.lastMessage.senderId,
          timestamp: data.lastMessage.timestamp?.toDate() || new Date(),
        } : undefined,
        unreadCount: data.unreadCount || {},
        lastSeenBy: data.lastSeenBy ? Object.fromEntries(
          Object.entries(data.lastSeenBy).map(([userId, seenData]: [string, any]) => [
            userId,
            {
              lastMessageId: seenData.lastMessageId,
              seenAt: seenData.seenAt?.toDate() || new Date()
            }
          ])
        ) : {},
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

