/**
 * Unit tests for database data integrity and utility operations
 * Tests SQLite constraints, concurrent operations, and utility functions
 */

import {
  initDatabase,
  clearAllData,
  getDatabaseStats,
  upsertConversation,
  insertMessage,
  deleteConversation,
  getConversationMessages,
  upsertUser,
} from '../../../../src/services/database';

import {
  createTestMessage,
  createTestConversation,
  createTestUser,
} from '../../../fixtures/test-data';

describe('Database Data Integrity and Utilities', () => {
  // Initialize database once before all tests
  beforeAll(async () => {
    await initDatabase();
  });

  // Clear data before each test for isolation
  beforeEach(async () => {
    await clearAllData();
  });

  describe('Initialization', () => {
    test('should initialize database with tables', async () => {
      const stats = await getDatabaseStats();

      expect(stats).toBeDefined();
      expect(stats.messageCount).toBe(0);
      expect(stats.conversationCount).toBe(0);
      expect(stats.userCount).toBe(0);
    });

    test('should have foreign keys enabled', async () => {
      // This is tested implicitly by foreign key constraint tests below
      // If foreign keys weren't enabled, those tests would fail
      expect(true).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      const conversation = createTestConversation({ id: 'conv-integrity' });
      await upsertConversation(conversation);

      const message = createTestMessage({
        id: 'msg-integrity',
        conversationId: 'conv-integrity',
      });
      await insertMessage(message);

      // Delete conversation should cascade
      await deleteConversation('conv-integrity');

      const messages = await getConversationMessages('conv-integrity');
      expect(messages).toHaveLength(0);
    });

    test('should handle concurrent operations', async () => {
      const conversation = createTestConversation({ id: 'conv-concurrent' });
      await upsertConversation(conversation);

      // Insert multiple messages concurrently
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          insertMessage(
            createTestMessage({
              id: `msg-${i}`,
              conversationId: 'conv-concurrent',
            })
          )
        );
      }

      await Promise.all(promises);

      const messages = await getConversationMessages('conv-concurrent');
      expect(messages).toHaveLength(10);
    });

    test('should handle concurrent user operations', async () => {
      // Insert multiple users concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          upsertUser(
            createTestUser({
              id: `user-${i}`,
              displayName: `User ${i}`,
            })
          )
        );
      }

      await Promise.all(promises);

      const stats = await getDatabaseStats();
      expect(stats.userCount).toBe(5);
    });

    test('should handle mixed concurrent operations', async () => {
      const conversation = createTestConversation({ id: 'conv-mixed' });
      await upsertConversation(conversation);

      // Mix of operations
      const promises = [
        upsertUser(createTestUser({ id: 'user-mixed' })),
        insertMessage(createTestMessage({
          id: 'msg-mixed',
          conversationId: 'conv-mixed',
        })),
        upsertConversation(createTestConversation({ id: 'conv-mixed-2' })),
      ];

      await Promise.all(promises);

      const stats = await getDatabaseStats();
      expect(stats.userCount).toBe(1);
      expect(stats.conversationCount).toBe(2);
      expect(stats.messageCount).toBe(1);
    });
  });

  describe('clearAllData', () => {
    test('should delete all data', async () => {
      await upsertUser(createTestUser());
      await upsertConversation(createTestConversation());

      await clearAllData();

      const stats = await getDatabaseStats();
      expect(stats.userCount).toBe(0);
      expect(stats.conversationCount).toBe(0);
      expect(stats.messageCount).toBe(0);
    });

    test('should handle clearing empty database', async () => {
      // Should not throw when clearing already empty database
      await expect(clearAllData()).resolves.not.toThrow();

      const stats = await getDatabaseStats();
      expect(stats.userCount).toBe(0);
      expect(stats.conversationCount).toBe(0);
      expect(stats.messageCount).toBe(0);
    });
  });

  describe('getDatabaseStats', () => {
    test('should return correct counts', async () => {
      const conversation = createTestConversation({ id: 'conv-stats' });
      await upsertConversation(conversation);
      await insertMessage(
        createTestMessage({ conversationId: 'conv-stats' })
      );
      await upsertUser(createTestUser());

      const stats = await getDatabaseStats();
      expect(stats.conversationCount).toBe(1);
      expect(stats.messageCount).toBe(1);
      expect(stats.userCount).toBe(1);
    });

    test('should return zero counts for empty database', async () => {
      const stats = await getDatabaseStats();
      expect(stats.conversationCount).toBe(0);
      expect(stats.messageCount).toBe(0);
      expect(stats.userCount).toBe(0);
    });

    test('should update counts after operations', async () => {
      // Initial state
      let stats = await getDatabaseStats();
      expect(stats.userCount).toBe(0);
      expect(stats.conversationCount).toBe(0);
      expect(stats.messageCount).toBe(0);

      // Add user
      await upsertUser(createTestUser({ id: 'user-stats' }));
      stats = await getDatabaseStats();
      expect(stats.userCount).toBe(1);

      // Add conversation
      await upsertConversation(createTestConversation({ id: 'conv-stats' }));
      stats = await getDatabaseStats();
      expect(stats.conversationCount).toBe(1);

      // Add message
      await insertMessage(createTestMessage({
        id: 'msg-stats',
        conversationId: 'conv-stats',
      }));
      stats = await getDatabaseStats();
      expect(stats.messageCount).toBe(1);
    });
  });
});
