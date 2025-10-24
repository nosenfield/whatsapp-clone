/**
 * Enhanced AI Command Service
 * 
 * Client-side service for the enhanced AI command system with tool chaining support.
 * Provides a more flexible interface for complex AI operations.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';

// Enhanced interfaces for the new tool architecture
export interface EnhancedAppContext {
  currentScreen: 'chats' | 'conversation' | 'profile' | 'settings';
  currentConversationId?: string;
  currentUserId: string;
  recentConversations: string[];
  deviceInfo: {
    platform: 'ios' | 'android';
    version: string;
  };
}

export interface EnhancedAICommandRequest {
  command: string;
  appContext: EnhancedAppContext;
  currentUserId: string;
  enableToolChaining?: boolean;
  maxChainLength?: number;
}

export interface EnhancedAICommandResponse {
  success: boolean;
  result: any;
  response: string;
  action: 'navigate_to_conversation' | 'show_summary' | 'show_error' | 'no_action' | 'tool_chain';
  error?: string;
  runId?: string;
  toolChain?: {
    toolsUsed: string[];
    results: any[];
    totalExecutionTime: number;
  };
}

// Tool-specific interfaces
export interface ResolveConversationParams {
  user_id: string;
  contact_identifier: string;
  create_if_missing?: boolean;
  conversation_type?: 'direct' | 'group';
}

export interface ResolveConversationResult {
  conversation_id: string;
  participants: Array<{
    id: string;
    displayName: string;
    email: string;
    photoURL?: string;
  }>;
  was_created: boolean;
  conversation_type: string;
  created_at: string;
  last_message_at: string;
}

export interface GetConversationsParams {
  user_id: string;
  limit?: number;
  include_preview?: boolean;
  conversation_type?: 'direct' | 'group' | 'all';
  unread_only?: boolean;
  sort_by?: 'last_message' | 'created' | 'updated';
}

export interface GetConversationsResult {
  conversations: Array<{
    id: string;
    type: string;
    participants: any[];
    name?: string;
    created_date: string;
    last_message_at: string;
    unread_count: number;
    last_message_preview?: {
      text: string;
      sender_id: string;
      sender_name: string;
      timestamp: string;
    };
    message_count: number;
    is_group: boolean;
    other_participants: any[];
  }>;
  total_count: number;
  has_more: boolean;
  user_id: string;
  filters_applied: any;
}

export interface GetMessagesParams {
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
}

export interface GetMessagesResult {
  messages: Array<{
    id: string;
    sender_id: string;
    sender_name: string;
    content: {
      type: string;
      text: string;
      caption?: string;
      media_url?: string;
    };
    timestamp: string;
    status: string;
    metadata?: {
      read_by: Record<string, any>;
      delivered_to: string[];
      read_count: number;
      delivery_count: number;
    };
  }>;
  conversation_id: string;
  total_returned: number;
  has_more: boolean;
  pagination: any;
  filters_applied: any;
}

export interface LookupContactsParams {
  user_id: string;
  query: string;
  limit?: number;
  include_recent?: boolean;
  search_fields?: string[];
  min_confidence?: number;
  exclude_self?: boolean;
}

export interface LookupContactsResult {
  contacts: Array<{
    id: string;
    name: string;
    email: string;
    photo_url?: string;
    identifiers: string[];
    confidence: number;
    is_recent: boolean;
    last_contact?: string;
  }>;
  total_found: number;
  query: string;
  search_criteria: any;
}

export interface SendMessageParams {
  conversation_id?: string;
  content: string;
  sender_id: string;
  message_type?: 'text' | 'image' | 'file';
  media_url?: string;
  caption?: string;
  recipient_id?: string;
  create_conversation_if_missing?: boolean;
  priority?: 'normal' | 'high' | 'urgent';
}

export interface SendMessageResult {
  message_id: string;
  conversation_id: string;
  status: string;
  timestamp: string;
  content: {
    type: string;
    text: string;
    caption?: string;
    media_url?: string;
  };
  delivery_info: {
    delivered_to: string[];
    read_by: Record<string, any>;
    delivery_count: number;
    read_count: number;
  };
}

export interface GetConversationInfoParams {
  conversation_id: string;
  user_id: string;
  include_participants?: boolean;
  include_statistics?: boolean;
  include_recent_activity?: boolean;
}

export interface GetConversationInfoResult {
  id: string;
  type: string;
  name?: string;
  created_date: string;
  last_message_at: string;
  updated_at: string;
  participant_count: number;
  is_group: boolean;
  participants?: any[];
  other_participants?: any[];
  statistics?: {
    total_messages: number;
    recent_messages: number;
    message_counts_by_sender: Record<string, number>;
    message_types: Record<string, number>;
    daily_activity: Record<string, number>;
    average_messages_per_day: number;
    most_active_sender?: string;
    most_common_message_type: string;
  };
  recent_activity?: {
    recent_messages: any[];
    participant_activity: Record<string, number>;
    last_activity?: string;
    activity_summary: string;
  };
  user_context: {
    unread_count: number;
    is_participant: boolean;
    joined_at: string;
  };
}

// Enhanced AI Command Service
export class EnhancedAICommandService {
  private processEnhancedAICommand: any;

  constructor() {
    this.processEnhancedAICommand = httpsCallable(functions, 'processEnhancedAICommand');
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
    try {
      console.log('🤖 Processing enhanced AI command:', command.substring(0, 50) + '...');
      
      const request: EnhancedAICommandRequest = {
        command,
        appContext,
        currentUserId: appContext.currentUserId,
        enableToolChaining: options.enableToolChaining ?? true,
        maxChainLength: options.maxChainLength ?? 5,
      };

      const result = await this.processEnhancedAICommand(request);
      const response = result.data as EnhancedAICommandResponse;
      
      // Log successful command execution
      if (response.success && response.runId) {
        console.log('✅ Enhanced AI command executed successfully. LangSmith Run ID:', response.runId);
        if (response.toolChain) {
          console.log('🔗 Tool chain executed:', response.toolChain.toolsUsed.join(' → '));
          console.log('⏱️ Total execution time:', response.toolChain.totalExecutionTime + 'ms');
        }
      } else if (!response.success) {
        console.error('❌ Enhanced AI command failed:', response.error);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Enhanced AI command processing error:', error);
      return {
        success: false,
        result: null,
        response: 'Sorry, I encountered an error processing your command.',
        action: 'show_error',
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Resolve a conversation with a contact
   */
  async resolveConversation(
    params: ResolveConversationParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: ResolveConversationResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Find or create conversation with ${params.contact_identifier}`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as ResolveConversationResult,
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
    params: GetConversationsParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: GetConversationsResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Show me my conversations`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as GetConversationsResult,
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
   * Get messages from a conversation
   */
  async getMessages(
    params: GetMessagesParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: GetMessagesResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Show me messages from conversation ${params.conversation_id}`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as GetMessagesResult,
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
   * Lookup contacts
   */
  async lookupContacts(
    params: LookupContactsParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: LookupContactsResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Find contacts matching "${params.query}"`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as LookupContactsResult,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to lookup contacts',
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
    params: SendMessageParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: SendMessageResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Send message: "${params.content}"`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as SendMessageResult,
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

  /**
   * Get conversation information
   */
  async getConversationInfo(
    params: GetConversationInfoParams,
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: GetConversationInfoResult; error?: string }> {
    try {
      const result = await this.processCommand(
        `Get information about conversation ${params.conversation_id}`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result as GetConversationInfoResult,
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

  /**
   * Execute a complex multi-step command with tool chaining
   */
  async executeComplexCommand(
    command: string,
    appContext: EnhancedAppContext,
    maxChainLength: number = 5
  ): Promise<EnhancedAICommandResponse> {
    return this.processCommand(command, appContext, {
      enableToolChaining: true,
      maxChainLength,
    });
  }

  /**
   * Get default app context for a user
   */
  private getDefaultContext(currentUserId: string): EnhancedAppContext {
    return {
      currentScreen: 'chats',
      currentUserId,
      recentConversations: [],
      deviceInfo: {
        platform: 'ios',
        version: '1.0.0',
      },
    };
  }
}

// Export singleton instance
export const enhancedAICommandService = new EnhancedAICommandService();
