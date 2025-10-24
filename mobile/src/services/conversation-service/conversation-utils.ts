/**
 * Conversation Utilities
 * 
 * Shared utilities and helper functions for conversation operations
 */

import { Timestamp } from 'firebase/firestore';
import { Conversation, ConversationCreationData } from './types';

/**
 * Transform Firestore document data to Conversation object
 */
export const transformConversationData = (docId: string, data: any): Conversation => {
  return {
    id: docId,
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
};

/**
 * Create conversation data object for Firestore
 */
export const createConversationData = (data: ConversationCreationData) => {
  const baseData = {
    type: data.type,
    participants: data.participants,
    participantDetails: data.participantDetails,
    createdAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
    unreadCount: Object.fromEntries(
      data.participants.map(id => [id, 0])
    ),
  };

  if (data.name) {
    return { ...baseData, name: data.name };
  }

  if (data.createdBy) {
    return { ...baseData, createdBy: data.createdBy };
  }

  return baseData;
};

/**
 * Validate conversation participants
 */
export const validateParticipants = (participants: string[], minCount: number = 2, maxCount: number = 20) => {
  if (participants.length < minCount) {
    throw new Error(`Conversation must have at least ${minCount} members`);
  }

  if (participants.length > maxCount) {
    throw new Error(`Conversation cannot have more than ${maxCount} members`);
  }

  // Check for duplicate participants
  const uniqueParticipants = new Set(participants);
  if (uniqueParticipants.size !== participants.length) {
    throw new Error('Duplicate participants found');
  }
};

/**
 * Sort conversations by last message time
 */
export const sortConversationsByLastMessage = (conversations: Conversation[], order: 'asc' | 'desc' = 'desc') => {
  return conversations.sort((a, b) => {
    const timeA = a.lastMessageAt.getTime();
    const timeB = b.lastMessageAt.getTime();
    return order === 'desc' ? timeB - timeA : timeA - timeB;
  });
};
