import { User } from '../../types';
import { getDb } from './init';

/**
 * Insert or update a user
 */
export const upsertUser = async (user: User): Promise<void> => {
  const database = getDb();
  
  await database.runAsync(
    `INSERT OR REPLACE INTO users (id, displayName, email, photoURL, lastSynced)
     VALUES (?, ?, ?, ?, ?)`,
    [
      user.id,
      user.displayName,
      user.email,
      user.photoURL || null,
      Date.now(),
    ]
  );
};

/**
 * Get a user by ID
 */
export const getUser = async (userId: string): Promise<User | null> => {
  const database = getDb();
  
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (!row) return null;

  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    photoURL: row.photoURL || undefined,
    createdAt: new Date(row.lastSynced),
    lastActive: new Date(row.lastSynced),
  };
};

/**
 * Get multiple users by IDs
 */
export const getUsers = async (userIds: string[]): Promise<User[]> => {
  if (userIds.length === 0) return [];
  
  const database = getDb();
  const placeholders = userIds.map(() => '?').join(',');
  
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM users WHERE id IN (${placeholders})`,
    userIds
  );

  return rows.map(row => ({
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    photoURL: row.photoURL || undefined,
    createdAt: new Date(row.lastSynced),
    lastActive: new Date(row.lastSynced),
  }));
};
