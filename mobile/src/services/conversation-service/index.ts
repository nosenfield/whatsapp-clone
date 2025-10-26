/**
 * Conversation Service - Main Export
 * 
 * This module provides a clean interface to conversation operations
 * split into focused modules for better maintainability:
 * - types: All TypeScript interfaces and types
 * - direct-conversations: Direct message operations
 * - group-conversations: Group operations
 * - conversation-queries: Read operations
 * - conversation-utils: Shared utilities
 */

// Export all types
export * from './types';

// Export all conversation operations
export * from './direct-conversations';
export * from './group-conversations';
export * from './conversation-queries';
export * from './conversation-utils';
