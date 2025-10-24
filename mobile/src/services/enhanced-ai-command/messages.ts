/**
 * Enhanced AI Command Service - Message Operations
 * 
 * Message-related operations for the enhanced AI command system.
 */

import { EnhancedAppContext } from './types';
import { EnhancedAICommandCore } from './core';

/**
 * Message operations for enhanced AI commands
 */
export class MessageOperations {
  constructor(private core: EnhancedAICommandCore) {}

  /**
   * Get messages from a conversation
   */
  async getMessages(
    params: {
      conversation_id: string;
      limit?: number;
      before_id?: string;
      after_id?: string;
      sender_id?: string;
      message_type?: 'text' | 'image' | 'file';
      date_from?: string;
      date_to?: string;
      search_text?: string;
      include_metadata?: boolean;
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Show me messages from conversation ${params.conversation_id}`,
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
        error: result.error || 'Failed to get messages',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    params: {
      conversation_id?: string;
      content: string;
      sender_id: string;
      message_type?: 'text' | 'image' | 'file';
      media_url?: string;
      caption?: string;
      recipient_id?: string;
      create_conversation_if_missing?: boolean;
      priority?: 'normal' | 'high' | 'urgent';
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Send message: "${params.content}"`,
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
        error: result.error || 'Failed to send message',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
