/**
 * Enhanced AI Command Service - Conversation Operations
 * 
 * Conversation-related operations for the enhanced AI command system.
 */

import { EnhancedAppContext } from './types';
import { EnhancedAICommandCore } from './core';

/**
 * Conversation operations for enhanced AI commands
 */
export class ConversationOperations {
  constructor(private core: EnhancedAICommandCore) {}

  /**
   * Resolve a conversation with a contact
   */
  async resolveConversation(
    params: {
      user_id: string;
      contact_identifier: string;
      create_if_missing?: boolean;
      conversation_type?: 'direct' | 'group';
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Find or create conversation with ${params.contact_identifier}`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to resolve conversation',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get conversations for a user
   */
  async getConversations(
    params: {
      user_id: string;
      limit?: number;
      include_preview?: boolean;
      conversation_type?: 'direct' | 'group' | 'all';
      unread_only?: boolean;
      sort_by?: 'last_message' | 'created' | 'updated';
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Show me my conversations`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to get conversations',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Get conversation information
   */
  async getConversationInfo(
    params: {
      conversation_id: string;
      user_id: string;
      include_participants?: boolean;
      include_statistics?: boolean;
      include_recent_activity?: boolean;
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Get information about conversation ${params.conversation_id}`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to get conversation info',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
