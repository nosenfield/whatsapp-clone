/**
 * @deprecated This service is deprecated. Use EnhancedAICommandService from '../enhanced-ai-command' instead.
 * This file will be removed in a future version.
 * 
 * Migration guide:
 * - Replace: import { AICommandService } from './ai-command-service-unified'
 * - With: import { EnhancedAICommandService } from './enhanced-ai-command'
 * - Update method calls to use the new API
 */

import { QueryClient } from '@tanstack/react-query';
import { MessageCommands } from '../commands/message-commands';
import { ConversationCommands } from '../commands/conversation-commands';

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

export interface AICommandResponse {
  success: boolean;
  result: any;
  response: string;
  action: 'navigate_to_conversation' | 'show_summary' | 'show_error' | 'no_action';
  error?: string;
}

export class AICommandService {
  private messageCommands: MessageCommands;
  private conversationCommands: ConversationCommands;

  constructor(queryClient: QueryClient) {
    this.messageCommands = new MessageCommands(queryClient);
    this.conversationCommands = new ConversationCommands(queryClient);
  }

  async processCommand(
    command: string,
    appContext: AppContext
  ): Promise<AICommandResponse> {
    // Parse command intent (simplified for now)
    const intent = this.parseCommand(command, appContext);
    
    // Use unified commands instead of calling Firebase functions
    try {
      switch (intent.action) {
        case 'sendMessageToContact':
          return await this.handleSendMessage(intent, appContext);
        
        case 'findOrCreateConversation':
          return await this.handleFindConversation(intent, appContext);
        
        case 'summarizeConversation':
          return await this.handleSummarizeConversation(intent, appContext);
        
        default:
          return {
            success: false,
            result: null,
            response: 'Unknown command',
            action: 'show_error',
          };
      }
    } catch (error: any) {
      console.error('❌ AI command error:', error);
      return {
        success: false,
        result: null,
        response: error.message || 'Failed to execute command',
        action: 'show_error',
        error: error.message,
      };
    }
  }

  private async handleSendMessage(
    intent: any,
    appContext: AppContext
  ): Promise<AICommandResponse> {
    // 1. Find or create conversation
    const conversation = await this.conversationCommands
      .findOrCreateConversation({
        contactName: intent.parameters.contactName,
        userId: appContext.currentUserId,
      });
    
    // 2. Send message using unified command
    const messageId = await this.messageCommands.sendMessage({
      conversationId: conversation.id,
      senderId: appContext.currentUserId,
      content: {
        text: intent.parameters.messageText,
        type: 'text',
      },
    });
    
    return {
      success: true,
      result: { 
        conversationId: conversation.id, 
        messageId 
      },
      response: `Message sent to ${intent.parameters.contactName}`,
      action: 'navigate_to_conversation',
    };
  }

  private async handleFindConversation(
    intent: any,
    appContext: AppContext
  ): Promise<AICommandResponse> {
    const conversation = await this.conversationCommands
      .findOrCreateConversation({
        contactName: intent.parameters.contactName,
        userId: appContext.currentUserId,
      });
    
    return {
      success: true,
      result: { conversationId: conversation.id },
      response: `Opening conversation with ${intent.parameters.contactName}`,
      action: 'navigate_to_conversation',
    };
  }

  private async handleSummarizeConversation(
    intent: any,
    appContext: AppContext
  ): Promise<AICommandResponse> {
    // This can remain as a Firebase function call
    // since it's read-only and doesn't affect state
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('../../firebase.config');
    
    const processAICommand = httpsCallable(functions, 'processAICommand');
    
    const response = await processAICommand({
      command: 'summarize conversation',
      appContext,
      currentUserId: appContext.currentUserId,
    });
    
    return response.data as AICommandResponse;
  }

  /**
   * Simple command parsing (can be enhanced with OpenAI later)
   */
  private parseCommand(command: string, appContext: AppContext): any {
    const lowerCommand = command.toLowerCase();
    
    // Send message pattern: "Tell [contact] [message]"
    const sendMatch = lowerCommand.match(/tell\s+(\w+)\s+(.+)/);
    if (sendMatch) {
      return {
        action: 'sendMessageToContact',
        parameters: {
          contactName: sendMatch[1],
          messageText: sendMatch[2],
        },
      };
    }
    
    // Find conversation pattern: "Open conversation with [contact]"
    const openMatch = lowerCommand.match(/open\s+conversation\s+with\s+(\w+)/);
    if (openMatch) {
      return {
        action: 'findOrCreateConversation',
        parameters: {
          contactName: openMatch[1],
        },
      };
    }
    
    // Summarize pattern: "Summarize conversation"
    if (lowerCommand.includes('summarize') && lowerCommand.includes('conversation')) {
      return {
        action: 'summarizeConversation',
        parameters: {},
      };
    }
    
    // Default to no action
    return {
      action: 'no_action',
      parameters: {},
    };
  }
}
