/**
 * Integration tests for messaging bugs that were fixed
 * These tests verify the bugs don't regress
 * 
 * IMPORTANT: These tests use REAL database operations, not mocks!
 */

import {
  initDatabase,
  insertMessage,
  upsertConversation,
  getConversationMessages,
  clearAllData,
  getPendingMessages,
} from '../../../src/services/database';
import {
  createTestMessage,
  createTestConversation,
  createOptimisticMessage,
} from '../../fixtures/test-data';

describe('Messaging Bug Fixes - Regression Tests (Real Database)', () => {
  // Initialize database before all tests
  beforeAll(async () => {
    await initDatabase();
  });

  // Clear data before each test for clean slate
  beforeEach(async () => {
    await clearAllData();
  });

  describe('Bug #1: UNIQUE Constraint (messages.id)', () => {
    test('should use INSERT OR IGNORE to prevent duplicate messages', async () => {
      // Create conversation first (FOREIGN KEY requirement)
      const conversation = createTestConversation({ id: 'conv-bug-1' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'duplicate-test-1',
        conversationId: 'conv-bug-1',
      });

      // First insert - should succeed
      await insertMessage(message);

      // Second insert (duplicate) - should NOT throw
      // This validates INSERT OR IGNORE is working
      await expect(insertMessage(message)).resolves.not.toThrow();

      // Verify only ONE message exists
      const messages = await getConversationMessages('conv-bug-1');
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('duplicate-test-1');
    });

    test('should silently ignore duplicate inserts', async () => {
      const conversation = createTestConversation({ id: 'conv-bug-1-b' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'duplicate-test-2',
        conversationId: 'conv-bug-1-b',
        content: { text: 'Original text', type: 'text' },
      });

      // Insert same message 3 times
      await insertMessage(message);
      await insertMessage(message);
      await insertMessage(message);

      // Should still only have 1 message
      const messages = await getConversationMessages('conv-bug-1-b');
      expect(messages).toHaveLength(1);
      expect(messages[0].content.text).toBe('Original text');
    });
  });

  describe('Bug #2: NOT NULL Constraint (conversationId)', () => {
    test('should reject message without conversationId', async () => {
      const invalidMessage = {
        ...createTestMessage(),
        conversationId: null as any, // Invalid!
      };

      // This should throw because conversationId is NOT NULL
      await expect(insertMessage(invalidMessage)).rejects.toThrow();
    });

    test('should require conversationId to be defined', async () => {
      const invalidMessage = {
        ...createTestMessage(),
        conversationId: undefined as any, // Invalid!
      };

      // This should throw
      await expect(insertMessage(invalidMessage)).rejects.toThrow();
    });
  });

  describe('Bug #3: FOREIGN KEY Constraint (conversation not in SQLite)', () => {
    test('should reject message if conversation does not exist', async () => {
      const message = createTestMessage({
        conversationId: 'nonexistent-conv-123',
      });

      // This should throw because conversation doesn't exist (FOREIGN KEY constraint)
      await expect(insertMessage(message)).rejects.toThrow();
    });

    test('should accept message after conversation is created', async () => {
      const conversationId = 'conv-bug-3';

      // Step 1: Create conversation first
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      // Step 2: Now message insert should work
      const message = createTestMessage({ conversationId });
      await expect(insertMessage(message)).resolves.not.toThrow();

      // Verify message exists
      const messages = await getConversationMessages(conversationId);
      expect(messages).toHaveLength(1);
    });

    test('should validate correct flow: conversation before messages', async () => {
      const conversationId = 'conv-bug-3-flow';

      // Correct order:
      // 1. Create conversation
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      // 2. Insert messages
      const msg1 = createTestMessage({
        id: 'msg-1',
        conversationId,
      });
      const msg2 = createTestMessage({
        id: 'msg-2',
        conversationId,
      });

      await insertMessage(msg1);
      await insertMessage(msg2);

      // Both should exist
      const messages = await getConversationMessages(conversationId);
      expect(messages).toHaveLength(2);
    });
  });

  describe('Bug #4: Duplicate Messages in UI (Optimistic Store)', () => {
    test('should clear optimistic message after inserting to SQLite', async () => {
      // Simulate optimistic store
      const optimisticStore = {
        messages: [] as any[],
        add: function (msg: any) {
          this.messages.push(msg);
        },
        remove: function (localId: string) {
          this.messages = this.messages.filter((m) => m.localId !== localId);
        },
      };

      // Create conversation
      const conversation = createTestConversation({ id: 'conv-bug-4' });
      await upsertConversation(conversation);

      // Step 1: Add to optimistic store (UI shows immediately)
      const optimisticMsg = createOptimisticMessage('Hello', 'user-1');
      optimisticMsg.conversationId = 'conv-bug-4';
      optimisticStore.add(optimisticMsg);
      expect(optimisticStore.messages).toHaveLength(1);

      // Step 2: Insert to SQLite (persists locally)
      const persistedMsg = {
        ...optimisticMsg,
        id: 'server-123', // Server assigns real ID
        status: 'sent' as const,
        syncStatus: 'synced' as const,
      };
      await insertMessage(persistedMsg);

      // Step 3: Remove from optimistic (THE FIX for Bug #4)
      optimisticStore.remove(optimisticMsg.localId!);
      expect(optimisticStore.messages).toHaveLength(0);

      // Step 4: Reload from SQLite
      const messagesFromDb = await getConversationMessages('conv-bug-4');

      // Total messages visible = optimistic (0) + SQLite (1) = 1
      const totalVisible = optimisticStore.messages.length + messagesFromDb.length;
      expect(totalVisible).toBe(1); // No duplicate!
    });

    test('should demonstrate the bug when optimistic not cleared', async () => {
      // Simulate the BUG scenario
      const optimisticStore = {
        messages: [] as any[],
        add: function (msg: any) {
          this.messages.push(msg);
        },
        // Bug: forget to call remove!
      };

      const conversation = createTestConversation({ id: 'conv-bug-4-bad' });
      await upsertConversation(conversation);

      const optimisticMsg = createOptimisticMessage('Hello', 'user-1');
      optimisticMsg.conversationId = 'conv-bug-4-bad';

      // Add to optimistic
      optimisticStore.add(optimisticMsg);

      // Insert to SQLite
      const persistedMsg = {
        ...optimisticMsg,
        id: 'server-456',
        status: 'sent' as const,
        syncStatus: 'synced' as const,
      };
      await insertMessage(persistedMsg);

      // BUG: Forgot to remove from optimistic store!
      // optimisticStore.remove(optimisticMsg.localId!); // <-- MISSING!

      // Reload from SQLite
      const messagesFromDb = await getConversationMessages('conv-bug-4-bad');

      // Total = optimistic (1) + SQLite (1) = 2 duplicates!
      const totalVisible = optimisticStore.messages.length + messagesFromDb.length;
      expect(totalVisible).toBe(2); // This is the BUG!
    });
  });

  describe('Message Send Flow - Integration', () => {
    test('should follow correct optimistic update flow order', async () => {
      const callOrder: string[] = [];
      const conversationId = 'conv-flow-test';

      // Setup conversation
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      // Simulate optimistic store
      const optimisticStore = {
        messages: [] as any[],
        add: (msg: any) => {
          callOrder.push('add-optimistic');
          optimisticStore.messages.push(msg);
        },
        remove: (localId: string) => {
          callOrder.push('remove-optimistic');
          optimisticStore.messages = optimisticStore.messages.filter(
            (m) => m.localId !== localId
          );
        },
      };

      // Create message
      const optimisticMsg = createOptimisticMessage('Test flow', 'user-1');
      optimisticMsg.conversationId = conversationId;

      // Step 1: Add to optimistic (instant UI)
      optimisticStore.add(optimisticMsg);

      // Step 2: Insert to SQLite
      callOrder.push('insert-sqlite');
      const persistedMsg = {
        ...optimisticMsg,
        id: 'server-789',
        status: 'sent' as const,
        syncStatus: 'synced' as const,
      };
      await insertMessage(persistedMsg);

      // Step 3: Remove from optimistic (CRITICAL)
      optimisticStore.remove(optimisticMsg.localId!);

      // Step 4: Reload from SQLite
      callOrder.push('reload-sqlite');
      const messages = await getConversationMessages(conversationId);

      // Verify correct order
      expect(callOrder).toEqual([
        'add-optimistic',
        'insert-sqlite',
        'remove-optimistic', // Must happen BEFORE reload
        'reload-sqlite',
      ]);

      // Verify no duplicates
      expect(optimisticStore.messages).toHaveLength(0);
      expect(messages).toHaveLength(1);
    });

    test('should handle offline queue correctly', async () => {
      const conversationId = 'conv-offline-test';

      // Setup conversation
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      // Create message with pending sync status (offline)
      const offlineMsg = createTestMessage({
        id: 'pending-msg-1',
        conversationId,
        syncStatus: 'pending', // Not synced to Firestore yet
        status: 'sending',
      });

      await insertMessage(offlineMsg);

      // Verify it's in the pending queue
      const pendingMessages = await getPendingMessages();
      expect(pendingMessages).toHaveLength(1);
      expect(pendingMessages[0].syncStatus).toBe('pending');
      expect(pendingMessages[0].status).toBe('sending');
    });
  });

  describe('Data Integrity', () => {
    test('should maintain message order by timestamp', async () => {
      const conversationId = 'conv-order-test';
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      // Insert messages in random order
      const msg1 = createTestMessage({
        id: 'msg-1',
        conversationId,
        timestamp: new Date('2025-01-01T10:00:00'),
      });
      const msg2 = createTestMessage({
        id: 'msg-2',
        conversationId,
        timestamp: new Date('2025-01-01T11:00:00'),
      });
      const msg3 = createTestMessage({
        id: 'msg-3',
        conversationId,
        timestamp: new Date('2025-01-01T09:00:00'),
      });

      // Insert in random order
      await insertMessage(msg2);
      await insertMessage(msg1);
      await insertMessage(msg3);

      // Retrieve messages (should be ordered DESC by timestamp)
      const messages = await getConversationMessages(conversationId);

      expect(messages).toHaveLength(3);
      expect(messages[0].id).toBe('msg-2'); // Newest first
      expect(messages[1].id).toBe('msg-1');
      expect(messages[2].id).toBe('msg-3'); // Oldest last
    });

    test('should handle JSON serialization correctly', async () => {
      const conversationId = 'conv-json-test';
      const conversation = createTestConversation({ id: conversationId });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-json',
        conversationId,
        deliveredTo: ['user-1', 'user-2', 'user-3'],
        readBy: {
          'user-1': new Date('2025-01-01T10:00:00'),
          'user-2': new Date('2025-01-01T10:01:00'),
        },
      });

      await insertMessage(message);

      const messages = await getConversationMessages(conversationId);
      expect(messages[0].deliveredTo).toEqual(['user-1', 'user-2', 'user-3']);
      expect(messages[0].readBy).toHaveProperty('user-1');
      expect(messages[0].readBy).toHaveProperty('user-2');
    });
  });
});
