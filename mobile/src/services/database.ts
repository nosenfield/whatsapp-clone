import * as SQLite from 'expo-sqlite';
import { Message, Conversation, User, MessageStatus, SyncStatus } from '../types';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the SQLite database and create tables
 */
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('whatsapp_clone.db');

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create tables
    await db.execAsync(`
      -- Users table (cache of Firebase users)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        email TEXT NOT NULL,
        photoURL TEXT,
        lastSynced INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
        participants TEXT NOT NULL,
        participantDetails TEXT,
        name TEXT,
        lastMessageText TEXT,
        lastMessageSenderId TEXT,
        lastMessageAt INTEGER,
        unreadCount INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        localId TEXT UNIQUE,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        contentText TEXT NOT NULL,
        contentType TEXT DEFAULT 'text' CHECK(contentType IN ('text', 'image', 'file')),
        mediaUrl TEXT,
        mediaThumbnail TEXT,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('sending', 'sent', 'delivered', 'read')),
        syncStatus TEXT DEFAULT 'synced' CHECK(syncStatus IN ('pending', 'synced', 'failed')),
        deliveredTo TEXT DEFAULT '[]',
        readBy TEXT DEFAULT '{}',
        deletedAt INTEGER,
        deletedFor TEXT DEFAULT '[]',
        createdAt INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp 
        ON messages(conversationId, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_messages_status 
        ON messages(status);
      
      CREATE INDEX IF NOT EXISTS idx_messages_sync 
        ON messages(syncStatus);
      
      CREATE INDEX IF NOT EXISTS idx_conversations_lastMessage 
        ON conversations(lastMessageAt DESC);
    `);

    console.log('✅ SQLite database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get the database instance
 */
const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Insert a new message into the local database
 * Uses INSERT OR IGNORE to prevent duplicate key errors
 */
export const insertMessage = async (message: Message): Promise<void> => {
  const database = getDb();
  
  await database.runAsync(
    `INSERT OR IGNORE INTO messages (
      id, localId, conversationId, senderId, contentText, contentType,
      mediaUrl, mediaThumbnail, timestamp, status, syncStatus,
      deliveredTo, readBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      message.id,
      message.localId || null,
      message.conversationId,
      message.senderId,
      message.content.text,
      message.content.type,
      message.content.mediaUrl || null,
      message.content.mediaThumbnail || null,
      message.timestamp.getTime(),
      message.status,
      message.syncStatus || 'synced',
      JSON.stringify(message.deliveredTo || []),
      JSON.stringify(message.readBy || {}),
    ]
  );
};

/**
 * Update an existing message
 */
export const updateMessage = async (
  messageId: string,
  updates: Partial<Message>
): Promise<void> => {
  const database = getDb();
  
  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.status) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.syncStatus) {
    setClauses.push('syncStatus = ?');
    values.push(updates.syncStatus);
  }
  if (updates.deliveredTo) {
    setClauses.push('deliveredTo = ?');
    values.push(JSON.stringify(updates.deliveredTo));
  }
  if (updates.readBy) {
    setClauses.push('readBy = ?');
    values.push(JSON.stringify(updates.readBy));
  }
  if (updates.id && updates.localId) {
    // Replace localId with server id
    setClauses.push('id = ?');
    values.push(updates.id);
  }

  if (setClauses.length === 0) return;

  values.push(messageId);

  await database.runAsync(
    `UPDATE messages SET ${setClauses.join(', ')} WHERE id = ? OR localId = ?`,
    [...values, messageId]
  );
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (
  conversationId: string,
  limit: number = 50
): Promise<Message[]> => {
  const database = getDb();
  
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM messages 
     WHERE conversationId = ? AND deletedAt IS NULL
     ORDER BY timestamp DESC 
     LIMIT ?`,
    [conversationId, limit]
  );

  return rows.map(rowToMessage);
};

/**
 * Get pending messages (not yet synced)
 */
export const getPendingMessages = async (): Promise<Message[]> => {
  const database = getDb();
  
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM messages 
     WHERE syncStatus = 'pending'
     ORDER BY timestamp ASC`
  );

  return rows.map(rowToMessage);
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (
  messageId: string,
  userId: string
): Promise<void> => {
  const database = getDb();
  
  // Get current deletedFor array
  const row = await database.getFirstAsync<any>(
    'SELECT deletedFor FROM messages WHERE id = ?',
    [messageId]
  );

  if (!row) return;

  const deletedFor = JSON.parse(row.deletedFor || '[]');
  if (!deletedFor.includes(userId)) {
    deletedFor.push(userId);
  }

  await database.runAsync(
    'UPDATE messages SET deletedFor = ? WHERE id = ?',
    [JSON.stringify(deletedFor), messageId]
  );
};

/**
 * Hard delete old messages (for cleanup)
 */
export const deleteOldMessages = async (olderThanDays: number = 90): Promise<void> => {
  const database = getDb();
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  
  await database.runAsync(
    'DELETE FROM messages WHERE timestamp < ?',
    [cutoffTime]
  );
};

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Insert or update a conversation
 */
export const upsertConversation = async (conversation: Conversation): Promise<void> => {
  const database = getDb();
  
  await database.runAsync(
    `INSERT OR REPLACE INTO conversations (
      id, type, participants, participantDetails, name,
      lastMessageText, lastMessageSenderId, lastMessageAt, unreadCount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversation.id,
      conversation.type,
      JSON.stringify(conversation.participants),
      JSON.stringify(conversation.participantDetails || {}),
      conversation.name || null,
      conversation.lastMessage?.text || null,
      conversation.lastMessage?.senderId || null,
      conversation.lastMessage?.timestamp.getTime() || Date.now(),
      0, // unreadCount will be calculated separately
    ]
  );
};

/**
 * Get all conversations for the current user
 */
export const getConversations = async (): Promise<Conversation[]> => {
  const database = getDb();
  
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM conversations 
     ORDER BY lastMessageAt DESC`
  );

  return rows.map(rowToConversation);
};

/**
 * Get a single conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  const database = getDb();
  
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM conversations WHERE id = ?',
    [conversationId]
  );

  return row ? rowToConversation(row) : null;
};

/**
 * Update conversation's unread count
 */
export const updateUnreadCount = async (
  conversationId: string,
  count: number
): Promise<void> => {
  const database = getDb();
  
  await database.runAsync(
    'UPDATE conversations SET unreadCount = ? WHERE id = ?',
    [count, conversationId]
  );
};

/**
 * Delete a conversation and all its messages
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  const database = getDb();
  
  // Foreign key cascade will delete messages automatically
  await database.runAsync(
    'DELETE FROM conversations WHERE id = ?',
    [conversationId]
  );
};

// ============================================================================
// USER OPERATIONS
// ============================================================================

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert database row to Message object
 */
const rowToMessage = (row: any): Message => {
  return {
    id: row.id,
    localId: row.localId || undefined,
    conversationId: row.conversationId,
    senderId: row.senderId,
    content: {
      text: row.contentText,
      type: row.contentType,
      mediaUrl: row.mediaUrl || undefined,
      mediaThumbnail: row.mediaThumbnail || undefined,
    },
    timestamp: new Date(row.timestamp),
    status: row.status as MessageStatus,
    syncStatus: row.syncStatus as SyncStatus,
    deliveredTo: JSON.parse(row.deliveredTo || '[]'),
    readBy: JSON.parse(row.readBy || '{}'),
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : undefined,
    deletedFor: JSON.parse(row.deletedFor || '[]'),
  };
};

/**
 * Convert database row to Conversation object
 */
const rowToConversation = (row: any): Conversation => {
  return {
    id: row.id,
    type: row.type,
    participants: JSON.parse(row.participants),
    participantDetails: JSON.parse(row.participantDetails || '{}'),
    name: row.name || undefined,
    createdAt: new Date(row.createdAt),
    lastMessageAt: new Date(row.lastMessageAt),
    lastMessage: row.lastMessageText ? {
      text: row.lastMessageText,
      senderId: row.lastMessageSenderId,
      timestamp: new Date(row.lastMessageAt),
    } : undefined,
    unreadCount: { [row.id]: row.unreadCount }, // Simplified for local storage
  };
};

/**
 * Clear all data (useful for logout or testing)
 */
export const clearAllData = async (): Promise<void> => {
  const database = getDb();
  
  await database.execAsync(`
    DELETE FROM messages;
    DELETE FROM conversations;
    DELETE FROM users;
  `);
  
  console.log('✅ All local data cleared');
};

/**
 * Get database statistics (for debugging)
 */
export const getDatabaseStats = async (): Promise<{
  messageCount: number;
  conversationCount: number;
  userCount: number;
}> => {
  const database = getDb();
  
  const messageCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM messages'
  );
  
  const conversationCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM conversations'
  );
  
  const userCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM users'
  );

  return {
    messageCount: messageCount?.count || 0,
    conversationCount: conversationCount?.count || 0,
    userCount: userCount?.count || 0,
  };
};
