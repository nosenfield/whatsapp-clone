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
        return response;
      } else if (!response.success) {
        console.error('❌ Enhanced AI command failed:', response.error);
        
        // Don't fall back to simple parser to prevent duplicate message execution
        // The enhanced processor should handle all cases or fail gracefully
        console.log('🚫 Not falling back to simple parser to prevent duplicate messages');
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
