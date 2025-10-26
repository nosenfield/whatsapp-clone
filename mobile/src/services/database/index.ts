/**
 * Database Service - Modular SQLite Operations
 * 
 * This module provides a clean interface to SQLite database operations
 * split into focused modules for better maintainability:
 * - init: Database initialization and connection management
 * - messages: Message CRUD operations
 * - conversations: Conversation CRUD operations
 * - users: User CRUD operations
 * - utils: Utility functions and cleanup
 */

// Database initialization
export { initDatabase, getDb } from './init';

// Message operations
export {
  insertMessage,
  updateMessage,
  getConversationMessages,
  getConversationMessageCount,
  getPendingMessages,
  deleteMessage,
  deleteOldMessages,
} from './messages';

// Conversation operations
export {
  upsertConversation,
  getConversations,
  getConversation,
  updateUnreadCount,
  deleteConversation,
} from './conversations';

// User operations
export {
  upsertUser,
  getUser,
  getUsers,
} from './users';

// Utility functions
export {
  clearAllData,
  getDatabaseStats,
} from './utils';
