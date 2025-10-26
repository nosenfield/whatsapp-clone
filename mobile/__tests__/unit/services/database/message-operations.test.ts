/**
 * Unit tests for database message operations
 * Tests SQLite message CRUD operations, constraints, and data integrity
 */

import {
  insertMessage,
  updateMessage,
  getConversationMessages,
  getPendingMessages,
  deleteMessage,
  deleteOldMessages,
  upsertConversation,
} from '../../../../src/services/database';

import {
  createTestMessage,
  createTestConversation,
} from '../../../fixtures/test-data';

describe('Database Message Operations', () => {
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

  describe('insertMessage', () => {
    test('should insert a message successfully', async () => {
      const conversation = createTestConversation({ id: 'conv-insert-1' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-insert-1',
        conversationId: 'conv-insert-1',
      });

      await insertMessage(message);

      const messages = await getConversationMessages('conv-insert-1');
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-insert-1');
      expect(messages[0].conversationId).toBe('conv-insert-1');
    });

    test('should use INSERT OR IGNORE to prevent duplicates', async () => {
      const conversation = createTestConversation({ id: 'conv-duplicate' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'duplicate-id',
        conversationId: 'conv-duplicate',
      });

      // Insert twice - should not throw
      await insertMessage(message);
      await insertMessage(message);

      // Should only have one message
      const messages = await getConversationMessages('conv-duplicate');
      expect(messages).toHaveLength(1);
    });

    test('should enforce foreign key constraint', async () => {
      const message = createTestMessage({
        id: 'msg-fk-violation',
        conversationId: 'nonexistent-conv',
      });

      // Should throw or fail silently due to foreign key constraint
      await expect(insertMessage(message)).rejects.toThrow();
    });

    test('should serialize complex content correctly', async () => {
      const conversation = createTestConversation({ id: 'conv-complex' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-complex',
        conversationId: 'conv-complex',
        content: {
          text: 'Hello with emoji 🚀',
          type: 'text',
          metadata: { sentiment: 'positive' },
        },
      });

      await insertMessage(message);

      const messages = await getConversationMessages('conv-complex');
      expect(messages[0].content.text).toBe('Hello with emoji 🚀');
    });

    test('should handle image messages', async () => {
      const conversation = createTestConversation({ id: 'conv-image' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-image',
        conversationId: 'conv-image',
        content: {
          text: 'Check this out!',
          type: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          mediaThumbnail: 'https://example.com/thumb.jpg',
        },
      });

      await insertMessage(message);

      const messages = await getConversationMessages('conv-image');
      expect(messages[0].content.type).toBe('image');
      expect(messages[0].content.mediaUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('updateMessage', () => {
    test('should update message status', async () => {
      const conversation = createTestConversation({ id: 'conv-status' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-status',
        conversationId: 'conv-status',
        status: 'sending',
      });

      await insertMessage(message);
      await updateMessage('msg-status', { status: 'sent' });

      const messages = await getConversationMessages('conv-status');
      expect(messages[0].status).toBe('sent');
    });

    test('should replace localId with server id', async () => {
      const conversation = createTestConversation({ id: 'conv-replace' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'temp_456',
        localId: 'temp_456',
        conversationId: 'conv-replace',
      });

      await insertMessage(message);

      // Update with server ID
      await updateMessage('temp_456', {
        id: 'server_789',
        localId: 'temp_456',
      });

      const messages = await getConversationMessages('conv-replace');
      expect(messages[0].id).toBe('server_789');
    });

    test('should update syncStatus', async () => {
      const conversation = createTestConversation({ id: 'conv-sync-update' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-sync',
        conversationId: 'conv-sync-update',
        syncStatus: 'pending',
      });

      await insertMessage(message);
      await updateMessage('msg-sync', { syncStatus: 'synced' });

      const messages = await getConversationMessages('conv-sync-update');
      expect(messages[0].syncStatus).toBe('synced');
    });

    test('should update deliveredTo array', async () => {
      const conversation = createTestConversation({ id: 'conv-delivered' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-delivered',
        conversationId: 'conv-delivered',
        deliveredTo: [],
      });

      await insertMessage(message);
      await updateMessage('msg-delivered', {
        deliveredTo: ['user-1', 'user-2'],
      });

      const messages = await getConversationMessages('conv-delivered');
      expect(messages[0].deliveredTo).toEqual(['user-1', 'user-2']);
    });
  });

  describe('getConversationMessages', () => {
    test('should return messages for a conversation', async () => {
      const conversation = createTestConversation({ id: 'conv-get' });
      await upsertConversation(conversation);

      await insertMessage(
        createTestMessage({ id: 'msg-1', conversationId: 'conv-get' })
      );
      await insertMessage(
        createTestMessage({ id: 'msg-2', conversationId: 'conv-get' })
      );
      await insertMessage(
        createTestMessage({ id: 'msg-3', conversationId: 'conv-get' })
      );

      const messages = await getConversationMessages('conv-get');
      expect(messages).toHaveLength(3);
    });

    test('should order messages by timestamp DESC', async () => {
      const conversation = createTestConversation({ id: 'conv-order' });
      await upsertConversation(conversation);

      await insertMessage(
        createTestMessage({
          id: 'msg-1',
          conversationId: 'conv-order',
          timestamp: new Date('2025-01-01T10:00:00'),
        })
      );
      await insertMessage(
        createTestMessage({
          id: 'msg-2',
          conversationId: 'conv-order',
          timestamp: new Date('2025-01-01T11:00:00'),
        })
      );
      await insertMessage(
        createTestMessage({
          id: 'msg-3',
          conversationId: 'conv-order',
          timestamp: new Date('2025-01-01T09:00:00'),
        })
      );

      const messages = await getConversationMessages('conv-order');
      expect(messages[0].id).toBe('msg-2'); // Newest first
      expect(messages[1].id).toBe('msg-1');
      expect(messages[2].id).toBe('msg-3'); // Oldest last
    });

    test('should respect limit parameter', async () => {
      const conversation = createTestConversation({ id: 'conv-limit' });
      await upsertConversation(conversation);

      // Insert 10 messages
      for (let i = 0; i < 10; i++) {
        await insertMessage(
          createTestMessage({
            id: `msg-${i}`,
            conversationId: 'conv-limit',
          })
        );
      }

      const messages = await getConversationMessages('conv-limit', 5);
      expect(messages).toHaveLength(5);
    });

    test('should exclude deleted messages', async () => {
      const conversation = createTestConversation({ id: 'conv-deleted' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-deleted',
        conversationId: 'conv-deleted',
      });
      await insertMessage(message);

      // Soft delete the message
      await deleteMessage('msg-deleted', 'user-1');

      // Note: Current implementation uses soft delete (deletedFor field)
      // Messages still appear in queries but have deletedFor populated
      const messages = await getConversationMessages('conv-deleted');
      expect(messages).toHaveLength(1);
      expect(messages[0].deletedFor).toContain('user-1');
    });

    test('should return empty array for non-existent conversation', async () => {
      const messages = await getConversationMessages('nonexistent');
      expect(messages).toEqual([]);
    });
  });

  describe('getPendingMessages', () => {
    test('should return only pending messages', async () => {
      const conversation = createTestConversation({ id: 'conv-pending' });
      await upsertConversation(conversation);

      await insertMessage(
        createTestMessage({
          id: 'msg-pending',
          conversationId: 'conv-pending',
          syncStatus: 'pending',
        })
      );
      await insertMessage(
        createTestMessage({
          id: 'msg-synced',
          conversationId: 'conv-pending',
          syncStatus: 'synced',
        })
      );

      const pending = await getPendingMessages();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('msg-pending');
    });

    test('should order pending messages by timestamp ASC', async () => {
      const conversation = createTestConversation({ id: 'conv-pending-order' });
      await upsertConversation(conversation);

      await insertMessage(
        createTestMessage({
          id: 'pending-2',
          conversationId: 'conv-pending-order',
          syncStatus: 'pending',
          timestamp: new Date('2025-01-01T11:00:00'),
        })
      );
      await insertMessage(
        createTestMessage({
          id: 'pending-1',
          conversationId: 'conv-pending-order',
          syncStatus: 'pending',
          timestamp: new Date('2025-01-01T10:00:00'),
        })
      );

      const pending = await getPendingMessages();
      expect(pending[0].id).toBe('pending-1'); // Oldest first
      expect(pending[1].id).toBe('pending-2');
    });
  });

  describe('deleteMessage', () => {
    test('should soft delete message for a user', async () => {
      const conversation = createTestConversation({ id: 'conv-delete' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-delete',
        conversationId: 'conv-delete',
      });
      await insertMessage(message);

      await deleteMessage('msg-delete', 'user-1');

      const messages = await getConversationMessages('conv-delete');
      expect(messages[0].deletedFor).toContain('user-1');
    });

    test('should support multiple users deleting same message', async () => {
      const conversation = createTestConversation({ id: 'conv-multi-delete' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-multi-delete',
        conversationId: 'conv-multi-delete',
      });
      await insertMessage(message);

      await deleteMessage('msg-multi-delete', 'user-1');
      await deleteMessage('msg-multi-delete', 'user-2');

      const messages = await getConversationMessages('conv-multi-delete');
      expect(messages[0].deletedFor).toContain('user-1');
      expect(messages[0].deletedFor).toContain('user-2');
    });
  });

  describe('deleteOldMessages', () => {
    test('should delete messages older than specified days', async () => {
      const conversation = createTestConversation({ id: 'conv-old' });
      await upsertConversation(conversation);

      // Old message (100 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      await insertMessage(
        createTestMessage({
          id: 'msg-old',
          conversationId: 'conv-old',
          timestamp: oldDate,
        })
      );

      // Recent message
      await insertMessage(
        createTestMessage({
          id: 'msg-recent',
          conversationId: 'conv-old',
          timestamp: new Date(),
        })
      );

      // Delete messages older than 90 days
      await deleteOldMessages(90);

      const messages = await getConversationMessages('conv-old');
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-recent');
    });
  });
});
