/**
 * Enhanced AI Command Service - Main Export
 * 
 * This module provides a clean interface to the enhanced AI command system
 * split into focused modules for better maintainability:
 * - types: All TypeScript interfaces and types
 * - core: Core command processing functionality
 * - conversations: Conversation-related operations
 * - messages: Message-related operations
 * - contacts: Contact-related operations
 * - service: Main service class that combines all modules
 */

// Export all types
export * from './types';

// Export main service class
export { EnhancedAICommandService } from './service';

// Export singleton instance
import { EnhancedAICommandService } from './service';
export const enhancedAICommandService = new EnhancedAICommandService();
