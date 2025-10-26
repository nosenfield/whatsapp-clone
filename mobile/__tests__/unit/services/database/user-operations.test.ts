/**
 * Unit tests for database user operations
 * Tests SQLite user CRUD operations and constraints
 */

import {
  upsertUser,
  getUser,
  getUsers,
} from '../../../../src/services/database';

import {
  createTestUser,
} from '../../../fixtures/test-data';

describe('Database User Operations', () => {
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

  describe('upsertUser', () => {
    test('should insert user', async () => {
      const user = createTestUser({ id: 'user-1' });

      await upsertUser(user);

      const retrieved = await getUser('user-1');
      expect(retrieved?.id).toBe('user-1');
      expect(retrieved?.displayName).toBe(user.displayName);
    });

    test('should update existing user', async () => {
      const user = createTestUser({ id: 'user-update', displayName: 'Old Name' });

      await upsertUser(user);
      await upsertUser({ ...user, displayName: 'New Name' });

      const retrieved = await getUser('user-update');
      expect(retrieved?.displayName).toBe('New Name');
    });

    test('should handle user with photo URL', async () => {
      const user = createTestUser({
        id: 'user-photo',
        photoURL: 'https://example.com/photo.jpg',
      });

      await upsertUser(user);

      const retrieved = await getUser('user-photo');
      expect(retrieved?.photoURL).toBe('https://example.com/photo.jpg');
    });

    test('should handle user with push token', async () => {
      const user = createTestUser({
        id: 'user-token',
        pushToken: 'ExponentPushToken[abc123]',
      });

      await upsertUser(user);

      const retrieved = await getUser('user-token');
      expect(retrieved?.pushToken).toBe('ExponentPushToken[abc123]');
    });
  });

  describe('getUser', () => {
    test('should return user by ID', async () => {
      const user = createTestUser({ id: 'user-get' });
      await upsertUser(user);

      const retrieved = await getUser('user-get');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('user-get');
      expect(retrieved?.displayName).toBe(user.displayName);
    });

    test('should return null for non-existent user', async () => {
      const user = await getUser('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('getUsers', () => {
    test('should get multiple users', async () => {
      await upsertUser(createTestUser({ id: 'user-1' }));
      await upsertUser(createTestUser({ id: 'user-2' }));
      await upsertUser(createTestUser({ id: 'user-3' }));

      const users = await getUsers(['user-1', 'user-3']);
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.id)).toContain('user-1');
      expect(users.map((u) => u.id)).toContain('user-3');
    });

    test('should return empty array for no user IDs', async () => {
      const users = await getUsers([]);
      expect(users).toEqual([]);
    });

    test('should handle partial matches', async () => {
      await upsertUser(createTestUser({ id: 'user-1' }));
      await upsertUser(createTestUser({ id: 'user-2' }));

      // Request 3 users but only 2 exist
      const users = await getUsers(['user-1', 'user-2', 'user-nonexistent']);
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.id)).toContain('user-1');
      expect(users.map((u) => u.id)).toContain('user-2');
    });

    test('should return empty array when no requested users exist', async () => {
      const users = await getUsers(['nonexistent-1', 'nonexistent-2']);
      expect(users).toEqual([]);
    });
  });
});
