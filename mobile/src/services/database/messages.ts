import { Message, MessageStatus, SyncStatus } from '../../types';
import { getDb } from './init';

/**
 * Insert a new message into the local database
 * Uses INSERT OR IGNORE to prevent duplicate key errors
 */
export const insertMessage = async (message: Message): Promise<void> => {
  const database = getDb();
  
  // Validate required fields
  if (!message.conversationId) {
    throw new Error('conversationId is required');
  }
  
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
  if (updates.id) {
    // Replace localId with server id
    setClauses.push('id = ?');
    values.push(updates.id);
  }
  // Update content if provided (for image uploads where URL changes)
  if (updates.content) {
    if (updates.content.text !== undefined) {
      setClauses.push('contentText = ?');
      values.push(updates.content.text);
    }
    if (updates.content.type !== undefined) {
      setClauses.push('contentType = ?');
      values.push(updates.content.type);
    }
    if (updates.content.mediaUrl !== undefined) {
      setClauses.push('mediaUrl = ?');
      values.push(updates.content.mediaUrl);
    }
    if (updates.content.mediaThumbnail !== undefined) {
      setClauses.push('mediaThumbnail = ?');
      values.push(updates.content.mediaThumbnail);
    }
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
  limit: number = 50,
  offset: number = 0,
  beforeTimestamp?: number
): Promise<Message[]> => {
  const database = getDb();

  let query = `SELECT * FROM messages
               WHERE conversationId = ? AND deletedAt IS NULL`;
  let params: any[] = [conversationId];

  if (beforeTimestamp) {
    query += ` AND timestamp < ?`;
    params.push(beforeTimestamp);
  }

  query += ` ORDER BY timestamp ASC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = await database.getAllAsync<any>(query, params);

  return rows.map(rowToMessage);
};

/**
 * Get total message count for a conversation
 */
export const getConversationMessageCount = async (
  conversationId: string
): Promise<number> => {
  const database = getDb();
  
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM messages 
     WHERE conversationId = ? AND deletedAt IS NULL`,
    [conversationId]
  );

  return result?.count || 0;
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
