import { getDb } from './init';

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
