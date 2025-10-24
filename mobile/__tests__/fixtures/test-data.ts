/**
 * Test fixtures - Sample data for tests
 */

import { User, Message, Conversation } from '../../src/types';

// Sample Users
export const createTestUser = (overrides?: Partial<User>): User => ({
  id: 'user-123',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: undefined,
  createdAt: new Date('2025-01-01'),
  lastActive: new Date('2025-01-15'),
  ...overrides,
});

export const testUser1: User = createTestUser({
  id: 'user-1',
  displayName: 'Alice',
  email: 'alice@example.com',
});

export const testUser2: User = createTestUser({
  id: 'user-2',
  displayName: 'Bob',
  email: 'bob@example.com',
});

// Sample Messages
export const createTestMessage = (overrides?: Partial<Message>): Message => ({
  id: `msg-${Date.now()}`,
  localId: undefined,
  conversationId: 'conv-123',
  senderId: 'user-1',
  content: {
    text: 'Test message',
    type: 'text',
  },
  timestamp: new Date(),
  status: 'sent',
  syncStatus: 'synced',
  deliveredTo: [],
  readBy: {},
  ...overrides,
});

export const testMessages: Message[] = [
  createTestMessage({
    id: 'msg-1',
    content: { text: 'Hello', type: 'text' },
    timestamp: new Date('2025-01-15T10:00:00'),
  }),
  createTestMessage({
    id: 'msg-2',
    content: { text: 'Hi there!', type: 'text' },
    senderId: 'user-2',
    timestamp: new Date('2025-01-15T10:01:00'),
  }),
  createTestMessage({
    id: 'msg-3',
    content: { text: 'How are you?', type: 'text' },
    timestamp: new Date('2025-01-15T10:02:00'),
  }),
];

// Sample Conversations
export const createTestConversation = (overrides?: Partial<Conversation>): Conversation => ({
  id: 'conv-123',
  type: 'direct',
  participants: ['user-1', 'user-2'],
  participantDetails: {
    'user-1': {
      displayName: 'Alice',
      photoURL: undefined,
    },
    'user-2': {
      displayName: 'Bob',
      photoURL: undefined,
    },
  },
  lastMessage: {
    id: 'last-msg-1',
    text: 'Last message text',
    senderId: 'user-1',
    timestamp: new Date('2025-01-15T10:00:00'),
  },
  createdAt: new Date('2025-01-01'),
  lastMessageAt: new Date('2025-01-15T10:00:00'),
  unreadCount: {},
  ...overrides,
});

export const testConversation: Conversation = createTestConversation();

// Optimistic Message (for testing send flow)
export const createOptimisticMessage = (text: string, userId: string): Message => ({
  id: `temp_${Date.now()}_${Math.random()}`,
  localId: `temp_${Date.now()}_${Math.random()}`,
  conversationId: 'conv-123',
  senderId: userId,
  content: {
    text,
    type: 'text',
  },
  timestamp: new Date(),
  status: 'sending',
  syncStatus: 'pending',
  deliveredTo: [],
  readBy: {},
});

// Failed Message (for testing retry)
export const createFailedMessage = (): Message => createTestMessage({
  status: 'sent',
  syncStatus: 'failed',
});

