import { Conversation } from '../../types';
import { getDb } from './init';

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
      id: '', // We don't store the ID in SQLite, will be populated from Firestore
      text: row.lastMessageText,
      senderId: row.lastMessageSenderId,
      timestamp: new Date(row.lastMessageAt),
    } : undefined,
    unreadCount: { [row.id]: row.unreadCount }, // Simplified for local storage
    lastSeenBy: {}, // Not stored in SQLite, will be populated from Firestore
  };
};
