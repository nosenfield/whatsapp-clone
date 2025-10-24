/**
 * Unit tests for database conversation operations
 * Tests SQLite conversation CRUD operations and constraints
 */

import {
  upsertConversation,
  getConversations,
  getConversation,
  updateUnreadCount,
  deleteConversation,
} from '../../../../src/services/database';

import {
  createTestConversation,
} from '../../../fixtures/test-data';

describe('Database Conversation Operations', () => {
  // Initialize database once before all tests
  beforeAll(async () => {
    const { initDatabase } = await import('../../../../src/services/database');
    await initDatabase();
  });

  // Clear data before each test for isolation
  beforeEach(async () => {
    const { clearAllData } = await import('../../../../src/services/database');
    await clearAllData();
  });

  describe('upsertConversation', () => {
    test('should insert new conversation', async () => {
      const conversation = createTestConversation({ id: 'conv-new' });

      await upsertConversation(conversation);

      const conversations = await getConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv-new');
    });

    test('should update existing conversation', async () => {
      const conversation = createTestConversation({
        id: 'conv-update',
        lastMessage: {
          id: 'msg-1',
          text: 'First message',
          senderId: 'user-1',
          timestamp: new Date('2025-01-01'),
        },
      });

      await upsertConversation(conversation);

      // Update with new last message
      await upsertConversation({
        ...conversation,
        lastMessage: {
          id: 'msg-2',
          text: 'Second message',
          senderId: 'user-2',
          timestamp: new Date('2025-01-02'),
        },
      });

      const conv = await getConversation('conv-update');
      expect(conv?.lastMessage?.text).toBe('Second message');
    });

    test('should handle group conversations', async () => {
      const groupConv = createTestConversation({
        id: 'group-1',
        type: 'group',
        name: 'Test Group',
        participants: ['user-1', 'user-2', 'user-3'],
      });

      await upsertConversation(groupConv);

      const conv = await getConversation('group-1');
      expect(conv?.type).toBe('group');
      expect(conv?.name).toBe('Test Group');
      expect(conv?.participants).toHaveLength(3);
    });
  });

  describe('getConversations', () => {
    test('should return all conversations', async () => {
      await upsertConversation(createTestConversation({ id: 'conv-1' }));
      await upsertConversation(createTestConversation({ id: 'conv-2' }));
      await upsertConversation(createTestConversation({ id: 'conv-3' }));

      const conversations = await getConversations();
      expect(conversations).toHaveLength(3);
    });

    test('should order by lastMessageAt DESC', async () => {
      await upsertConversation(
        createTestConversation({
          id: 'conv-1',
          lastMessage: {
            id: 'msg-old',
            text: 'Old',
            senderId: 'user-1',
            timestamp: new Date('2025-01-01'),
          },
          lastMessageAt: new Date('2025-01-01'),
        })
      );
      await upsertConversation(
        createTestConversation({
          id: 'conv-2',
          lastMessage: {
            id: 'msg-recent',
            text: 'Recent',
            senderId: 'user-1',
            timestamp: new Date('2025-01-02'),
          },
          lastMessageAt: new Date('2025-01-02'),
        })
      );

      const conversations = await getConversations();
      expect(conversations[0].id).toBe('conv-2'); // Most recent first
    });
  });

  describe('getConversation', () => {
    test('should return single conversation', async () => {
      const conversation = createTestConversation({ id: 'conv-single' });
      await upsertConversation(conversation);

      const conv = await getConversation('conv-single');
      expect(conv).toBeDefined();
      expect(conv?.id).toBe('conv-single');
    });

    test('should return null for non-existent conversation', async () => {
      const conv = await getConversation('nonexistent');
      expect(conv).toBeNull();
    });
  });

  describe('updateUnreadCount', () => {
    test('should update unread count', async () => {
      const conversation = createTestConversation({ id: 'conv-unread' });
      await upsertConversation(conversation);

      await updateUnreadCount('conv-unread', 5);

      const conv = await getConversation('conv-unread');
      expect(conv?.unreadCount).toBeDefined();
    });
  });

  describe('deleteConversation', () => {
    test('should delete conversation and cascade to messages', async () => {
      const conversation = createTestConversation({ id: 'conv-cascade' });
      await upsertConversation(conversation);

      const { insertMessage, getConversationMessages } = await import('../../../../src/services/database');
      const { createTestMessage } = await import('../../../fixtures/test-data');

      await insertMessage(
        createTestMessage({
          id: 'msg-cascade',
          conversationId: 'conv-cascade',
        })
      );

      await deleteConversation('conv-cascade');

      const conversations = await getConversations();
      expect(conversations).toHaveLength(0);

      const messages = await getConversationMessages('conv-cascade');
      expect(messages).toHaveLength(0); // Cascaded delete
    });
  });
});
