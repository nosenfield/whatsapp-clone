/**
 * Enhanced AI Command Service Core
 * 
 * Core functionality for processing natural language commands with tool chaining.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase.config';
import {
  EnhancedAppContext,
  EnhancedAICommandRequest,
  EnhancedAICommandResponse,
} from './types';

/**
 * Core enhanced AI command processing functionality
 */
export class EnhancedAICommandCore {
  private processEnhancedAICommand: any;
  private processAICommand: any;

  constructor() {
    this.processEnhancedAICommand = httpsCallable(functions, 'processEnhancedAICommand');
    this.processAICommand = httpsCallable(functions, 'processAICommand');
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
        return response;
      } else if (!response.success) {
        console.error('❌ Enhanced AI command failed:', response.error);
        
        // Check if it's an OpenAI configuration error and fall back to simple parser
        if (response.error && response.error.includes('AI service not configured')) {
          console.log('🔄 Falling back to simple AI command parser...');
          return await this.fallbackToSimpleParser(command, appContext);
        }
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
   * Fallback to simple AI command parser when enhanced version fails
   */
  private async fallbackToSimpleParser(
    command: string,
    appContext: EnhancedAppContext
  ): Promise<EnhancedAICommandResponse> {
    try {
      console.log('🔄 Using simple AI command parser as fallback');
      
      const simpleRequest = {
        command,
        appContext: {
          currentScreen: appContext.currentScreen,
          currentConversationId: appContext.currentConversationId,
          currentUserId: appContext.currentUserId,
        },
        currentUserId: appContext.currentUserId,
      };

      const result = await this.processAICommand(simpleRequest);
      const response = result.data as any;
      
      // Convert simple response to enhanced response format
      return {
        success: response.success,
        result: response.result,
        response: response.response,
        action: response.action as any,
        error: response.error,
        runId: response.runId,
      };
    } catch (error: any) {
      console.error('❌ Fallback parser also failed:', error);
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
   * Get default app context for a user
   */
  getDefaultContext(currentUserId: string): EnhancedAppContext {
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
