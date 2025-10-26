/**
 * Group Conversations Module
 * 
 * Handles operations for group conversations
 */

import { firestore } from '../../../firebase.config';
import {
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { getUserById } from '../user-search';
import { ConversationCreationData } from './types';
import { createConversationData, validateParticipants } from './conversation-utils';

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
    validateParticipants(participantIds, 2, 20);

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

    // Create group conversation document
    const conversationData: ConversationCreationData = {
      type: 'group',
      name: groupName,
      participants: participantIds,
      participantDetails,
      createdBy: creatorId,
    };

    const conversationRef = await addDoc(
      collection(firestore, 'conversations'),
      createConversationData(conversationData)
    );

    console.log('✅ Created group conversation:', conversationRef.id);
    return conversationRef.id;
  } catch (error) {
    console.error('Error creating group conversation:', error);
    throw error;
  }
};
