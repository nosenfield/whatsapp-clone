/**
 * Conversation Service Types
 * 
 * All TypeScript interfaces and types for conversation operations
 */

import { Conversation } from '../../types';

// Re-export the main Conversation type
export type { Conversation };

// Additional types specific to conversation operations
export interface ConversationParticipant {
  userId: string;
  displayName: string;
  photoURL?: string;
}

export interface ConversationCreationData {
  type: 'direct' | 'group';
  participants: string[];
  participantDetails: Record<string, { displayName: string; photoURL?: string }>;
  name?: string;
  createdBy?: string;
}

export interface ConversationQueryOptions {
  includeLastMessage?: boolean;
  sortBy?: 'lastMessageAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationUpdateData {
  name?: string;
  lastMessageAt?: Date;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount?: Record<string, number>;
  lastSeenBy?: Record<string, { lastMessageId: string; seenAt: Date }>;
}
