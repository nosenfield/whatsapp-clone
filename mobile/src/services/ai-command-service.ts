import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';

// Types for AI command processing
export interface AppContext {
  currentScreen: 'chats' | 'conversation' | 'profile' | 'settings';
  currentConversationId?: string;
  currentUserId: string;
  recentConversations: string[];
  deviceInfo: {
    platform: 'ios' | 'android';
    version: string;
  };
}

export interface AICommandRequest {
  command: string;
  appContext: AppContext;
  currentUserId: string;
}

export interface AICommandResponse {
  success: boolean;
  result: any;
  response: string;
  action: 'navigate_to_conversation' | 'show_summary' | 'show_error' | 'no_action';
  error?: string;
  runId?: string; // LangSmith run ID for tracking
}

export interface CreateConversationParams {
  contactName: string;
  currentUserId: string;
  appContext?: AppContext;
}

export interface CreateConversationResult {
  success: boolean;
  conversationId?: string;
  error?: string;
  action: 'navigate_to_conversation' | 'show_error';
}

export interface FindOrCreateConversationParams {
  contactName: string;
  currentUserId: string;
  appContext?: AppContext;
}

export interface FindOrCreateConversationResult {
  success: boolean;
  conversationId: string;
  wasCreated: boolean;
  error?: string;
  action: 'navigate_to_conversation';
}

export interface SendMessageToContactParams {
  contactName: string;
  messageText: string;
  currentUserId: string;
  appContext?: AppContext;
}

export interface SendMessageToContactResult {
  success: boolean;
  conversationId: string;
  messageId: string;
  error?: string;
  action: 'navigate_to_conversation' | 'show_error';
}

export interface SummarizeConversationParams {
  conversationId: string;
  timeFilter?: '1day' | '1week' | '1month' | 'all';
  currentUserId: string;
  appContext?: AppContext;
}

export interface SummarizeConversationResult {
  success: boolean;
  summary?: string;
  messageCount: number;
  timeRange: string;
  error?: string;
  action: 'show_summary' | 'show_error';
}

export interface SummarizeMessageParams {
  messageId: string;
  currentUserId: string;
  appContext?: AppContext;
}

export interface SummarizeMessageResult {
  success: boolean;
  summary?: string;
  originalMessage: string;
  error?: string;
  action: 'show_summary' | 'show_error';
}

export interface SummarizeLatestReceivedParams {
  currentUserId: string;
  appContext?: AppContext;
}

export interface SummarizeLatestSentParams {
  currentUserId: string;
  appContext?: AppContext;
}

// AI Command Service
export class AICommandService {
  private processAICommand: any;

  constructor() {
    this.processAICommand = httpsCallable(functions, 'processAICommand');
  }

  /**
   * Process a natural language AI command with LangSmith logging
   */
  async processCommand(
    command: string,
    appContext: AppContext
  ): Promise<AICommandResponse> {
    try {
      console.log('🤖 Processing AI command:', command.substring(0, 50) + '...');
      
      const request: AICommandRequest = {
        command,
        appContext,
        currentUserId: appContext.currentUserId,
      };

      const result = await this.processAICommand(request);
      const response = result.data as AICommandResponse;
      
      // Log successful command execution
      if (response.success && response.runId) {
        console.log('✅ AI command executed successfully. LangSmith Run ID:', response.runId);
      } else if (!response.success) {
        console.error('❌ AI command failed:', response.error);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ AI command processing error:', error);
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
   * Create a new conversation with a contact
   */
  async createConversation(
    params: CreateConversationParams
  ): Promise<CreateConversationResult> {
    try {
      const result = await this.processCommand(
        `Start a new conversation with ${params.contactName}`,
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          conversationId: result.result.conversationId,
          action: 'navigate_to_conversation',
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create conversation',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Find or create a conversation with a contact
   */
  async findOrCreateConversation(
    params: FindOrCreateConversationParams
  ): Promise<FindOrCreateConversationResult> {
    try {
      const result = await this.processCommand(
        `Open my conversation with ${params.contactName}`,
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          conversationId: result.result.conversationId,
          wasCreated: result.result.wasCreated || false,
          action: 'navigate_to_conversation',
        };
      }

      return {
        success: false,
        conversationId: '',
        wasCreated: false,
        error: result.error || 'Failed to find or create conversation',
        action: 'navigate_to_conversation',
      };
    } catch (error: any) {
      return {
        success: false,
        conversationId: '',
        wasCreated: false,
        error: error.message || 'Unknown error',
        action: 'navigate_to_conversation',
      };
    }
  }

  /**
   * Send a message to a contact
   */
  async sendMessageToContact(
    params: SendMessageToContactParams
  ): Promise<SendMessageToContactResult> {
    try {
      const result = await this.processCommand(
        `Tell ${params.contactName} ${params.messageText}`,
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          conversationId: result.result.conversationId,
          messageId: result.result.messageId,
          action: 'navigate_to_conversation',
        };
      }

      return {
        success: false,
        conversationId: '',
        messageId: '',
        error: result.error || 'Failed to send message',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        conversationId: '',
        messageId: '',
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Summarize a conversation
   */
  async summarizeConversation(
    params: SummarizeConversationParams
  ): Promise<SummarizeConversationResult> {
    try {
      const timeFilter = params.timeFilter || 'all';
      const command = timeFilter === 'all' 
        ? `Summarize this conversation`
        : `Summarize my recent conversation (${timeFilter})`;

      const appContext = params.appContext || {
        currentScreen: 'chats' as const,
        currentUserId: '',
        recentConversations: [],
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      };

      const result = await this.processCommand(
        command,
        {
          currentScreen: appContext.currentScreen,
          currentUserId: appContext.currentUserId,
          recentConversations: appContext.recentConversations,
          deviceInfo: appContext.deviceInfo,
          currentConversationId: params.conversationId,
        }
      );

      if (result.success && result.result) {
        return {
          success: true,
          summary: result.result.summary,
          messageCount: result.result.messageCount || 0,
          timeRange: result.result.timeRange || timeFilter,
          action: 'show_summary',
        };
      }

      return {
        success: false,
        messageCount: 0,
        timeRange: timeFilter,
        error: result.error || 'Failed to summarize conversation',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        messageCount: 0,
        timeRange: params.timeFilter || 'all',
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Summarize a specific message
   */
  async summarizeMessage(
    params: SummarizeMessageParams
  ): Promise<SummarizeMessageResult> {
    try {
      const result = await this.processCommand(
        'Summarize the most recent message',
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          summary: result.result.summary,
          originalMessage: result.result.originalMessage || '',
          action: 'show_summary',
        };
      }

      return {
        success: false,
        originalMessage: '',
        error: result.error || 'Failed to summarize message',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        originalMessage: '',
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Summarize the most recent message received by the user
   */
  async summarizeLatestReceivedMessage(
    params: SummarizeLatestReceivedParams
  ): Promise<SummarizeMessageResult> {
    try {
      const result = await this.processCommand(
        'Summarize the most recent message',
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          summary: result.result.summary,
          originalMessage: result.result.originalMessage || '',
          action: 'show_summary',
        };
      }

      return {
        success: false,
        originalMessage: '',
        error: result.error || 'Failed to summarize latest received message',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        originalMessage: '',
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Summarize the most recent message sent by the user
   */
  async summarizeLatestSentMessage(
    params: SummarizeLatestSentParams
  ): Promise<SummarizeMessageResult> {
    try {
      const result = await this.processCommand(
        'Summarize my most recent message',
        params.appContext || this.getDefaultContext(params.currentUserId)
      );

      if (result.success && result.result) {
        return {
          success: true,
          summary: result.result.summary,
          originalMessage: result.result.originalMessage || '',
          action: 'show_summary',
        };
      }

      return {
        success: false,
        originalMessage: '',
        error: result.error || 'Failed to summarize latest sent message',
        action: 'show_error',
      };
    } catch (error: any) {
      return {
        success: false,
        originalMessage: '',
        error: error.message || 'Unknown error',
        action: 'show_error',
      };
    }
  }

  /**
   * Get default app context for a user
   */
  private getDefaultContext(currentUserId: string): AppContext {
    return {
      currentScreen: 'chats',
      currentUserId,
      recentConversations: [],
      deviceInfo: {
        platform: 'ios', // Default to iOS for now
        version: '1.0.0',
      },
    };
  }
}

// Export singleton instance
export const aiCommandService = new AICommandService();
