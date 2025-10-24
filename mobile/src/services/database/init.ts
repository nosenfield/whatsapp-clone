import * as SQLite from 'expo-sqlite';

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
export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};
