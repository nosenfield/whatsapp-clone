/**
 * Enhanced AI Command Service
 * 
 * Main service class that combines all enhanced AI command functionality.
 * Provides a unified interface for complex AI operations with tool chaining support.
 */

import { EnhancedAppContext, EnhancedAICommandResponse } from './types';
import { EnhancedAICommandCore } from './core';
import { ConversationOperations } from './conversations';
import { MessageOperations } from './messages';
import { ContactOperations } from './contacts';

/**
 * Enhanced AI Command Service
 * 
 * Client-side service for the enhanced AI command system with tool chaining support.
 * Provides a more flexible interface for complex AI operations.
 */
export class EnhancedAICommandService {
  private core: EnhancedAICommandCore;
  private conversations: ConversationOperations;
  private messages: MessageOperations;
  private contacts: ContactOperations;

  constructor() {
    this.core = new EnhancedAICommandCore();
    this.conversations = new ConversationOperations(this.core);
    this.messages = new MessageOperations(this.core);
    this.contacts = new ContactOperations(this.core);
  }

  /**
   * Process a natural language command with enhanced tool chaining
   */
  async processCommand(
    command: string,
    appContext: EnhancedAppContext,
    options: {
      enableToolChaining?: boolean;
      maxChainLength?: number;
    } = {}
  ): Promise<EnhancedAICommandResponse> {
    return this.core.processCommand(command, appContext, options);
  }

  /**
   * Execute a complex multi-step command with tool chaining
   */
  async executeComplexCommand(
    command: string,
    appContext: EnhancedAppContext,
    maxChainLength: number = 5
  ): Promise<EnhancedAICommandResponse> {
    return this.core.executeComplexCommand(command, appContext, maxChainLength);
  }

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
    return this.conversations.resolveConversation(params, appContext);
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
    return this.conversations.getConversations(params, appContext);
  }

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
    return this.messages.getMessages(params, appContext);
  }

  /**
   * Lookup contacts
   */
  async lookupContacts(
    params: {
      user_id: string;
      query: string;
      limit?: number;
      include_recent?: boolean;
      search_fields?: string[];
      min_confidence?: number;
      exclude_self?: boolean;
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.contacts.lookupContacts(params, appContext);
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
    return this.messages.sendMessage(params, appContext);
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
    return this.conversations.getConversationInfo(params, appContext);
  }

  /**
   * Get default app context for a user
   */
  getDefaultContext(currentUserId: string): EnhancedAppContext {
    return this.core.getDefaultContext(currentUserId);
  }
}
