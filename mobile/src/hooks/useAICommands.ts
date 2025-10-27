import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { enhancedAICommandService, EnhancedAppContext } from '../services/enhanced-ai-command';
import { ClarificationData, ClarificationOption } from '../services/enhanced-ai-command/types';
import { createUserFriendlyError } from '../utils/ai-error-handling';

interface AICommandResult {
  success: boolean;
  message: string;
  action?: {
    type: 'navigate' | 'toast' | 'summary' | 'analysis' | 'none';
    payload?: any;
  };
  runId?: string; // LangSmith run ID
  // Clarification fields
  requires_clarification?: boolean;
  clarification_data?: ClarificationData;
  original_command?: string;
}

export const useAICommands = (currentConversationId?: string, appContext?: any) => {
  const { user } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeCommand = async (command: string): Promise<AICommandResult> => {
    console.log('🤖 AI Command executed:', command);
    console.log('👤 Current user:', user);
    
    if (!user) {
      console.log('❌ No user found in auth store');
      const authError = createUserFriendlyError({ code: 'NOT_AUTHENTICATED' });
      return {
        success: false,
        message: authError.message
      };
    }

    console.log('✅ User authenticated, proceeding with AI command');

    setIsProcessing(true);
    setError(null);

    try {
      // Debug logging
      console.log('🔍 Enhanced AI Command Debug:');
      console.log('  - currentConversationId:', currentConversationId);
      console.log('  - appContext:', appContext);
      console.log('  - appContext.currentScreen:', appContext?.currentScreen);
      console.log('  - appContext.currentConversationId:', appContext?.currentConversationId);

      // Use the passed appContext if available, otherwise create a fallback
      const contextToUse: EnhancedAppContext = appContext ? {
        currentScreen: appContext.currentScreen === 'ConversationList' ? 'chats' : 
                      appContext.currentScreen === 'ConversationView' ? 'conversation' :
                      appContext.currentScreen === 'Profile' ? 'profile' : 'settings',
        currentConversationId: appContext.currentConversationId,
        currentUserId: user.id,
        recentConversations: [], // Could be populated from your conversation list
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      } : {
        currentScreen: currentConversationId ? 'conversation' : 'chats',
        currentConversationId,
        currentUserId: user.id,
        recentConversations: [], // Could be populated from your conversation list
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      };

      console.log('  - Final contextToUse:', contextToUse);

      // Use the enhanced AI command service with proper tool calling
      const response = await enhancedAICommandService.processCommand(command, contextToUse, {
        enableToolChaining: true,
        maxChainLength: 5,
      });
      
      // Log LangSmith run ID if available
      if (response.runId) {
        console.log('✅ LangSmith Run ID:', response.runId);
      }
      
      // Debug: Log full response structure
      console.log('🔍 Full AI response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Check if clarification is required
        console.log('🔍 Checking for clarification:', {
          action: response.action,
          requires_clarification: response.requires_clarification,
          clarification_data: response.clarification_data,
          response: response.response
        });
        
        // Check for clarification in multiple places
        const isClarificationRequest = response.action === 'request_clarification' && 
          (response.requires_clarification || 
           response.clarification_data || 
           (response.result && response.result.requires_user_input));
        
        if (isClarificationRequest) {
          console.log('✅ Clarification detected, returning clarification data');
          
          // Extract clarification data from different possible locations
          const clarificationData = response.clarification_data || 
                                  response.result || 
                                  (response.action && typeof response.action === 'object' && (response.action as any).payload);
          
          return {
            success: true,
            message: response.response,
            requires_clarification: true,
            clarification_data: clarificationData,
            original_command: command,
            runId: response.runId,
          };
        }
        
        // Determine action type based on response.action
        let actionType: 'navigate' | 'toast' | 'summary' | 'analysis' | 'none' = 'toast';
        if (response.action === 'navigate_to_conversation') {
          actionType = 'navigate';
        } else if (response.action === 'show_summary') {
          actionType = 'summary';
        } else if (response.action === 'no_action') {
          actionType = 'none';
        }
        
        // Check if this is an analyze_conversation or analyze_conversations_multi result
        const isAnalysisResult = response.toolChain?.toolsUsed?.includes('analyze_conversation') ||
                                response.toolChain?.toolsUsed?.includes('analyze_conversations_multi') ||
                                response.result?.answer !== undefined;
        
        if (isAnalysisResult && response.result) {
          actionType = 'analysis';
        }
        
        return {
          success: true,
          message: response.response,
          action: {
            type: actionType,
            payload: response.result,
          },
          runId: response.runId,
        };
      } else {
        return {
          success: false,
          message: response.response || 'Command failed',
        };
      }
    } catch (err: any) {
      console.error('❌ AI command error:', err);
      const friendlyError = createUserFriendlyError(err);
      setError(friendlyError.message);
      
      return {
        success: false,
        message: friendlyError.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const continueCommandWithClarification = async (
    originalCommand: string,
    clarificationData: ClarificationData,
    userSelection: ClarificationOption
  ): Promise<AICommandResult> => {
    console.log('🔄 Continuing command with clarification:', originalCommand.substring(0, 50) + '...');
    console.log('📋 User selected:', userSelection.title);
    
    if (!user) {
      const authError = createUserFriendlyError({ code: 'NOT_AUTHENTICATED' });
      return {
        success: false,
        message: authError.message
      };
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Use the same context logic as executeCommand
      const contextToUse: EnhancedAppContext = appContext ? {
        currentScreen: appContext.currentScreen === 'ConversationList' ? 'chats' : 
                      appContext.currentScreen === 'ConversationView' ? 'conversation' :
                      appContext.currentScreen === 'Profile' ? 'profile' : 'settings',
        currentConversationId: appContext.currentConversationId,
        currentUserId: user.id,
        recentConversations: [],
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      } : {
        currentScreen: currentConversationId ? 'conversation' : 'chats',
        currentConversationId,
        currentUserId: user.id,
        recentConversations: [],
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      };

      const response = await enhancedAICommandService.continueCommandWithClarification(
        originalCommand,
        clarificationData,
        userSelection,
        contextToUse
      );

      if (response.success) {
        return {
          success: true,
          message: response.response,
          action: {
            type: response.action === 'navigate_to_conversation' ? 'navigate' : 'toast',
            payload: response.result,
          },
          runId: response.runId,
        };
      } else {
        return {
          success: false,
          message: response.response || 'Command failed',
        };
      }
    } catch (err: any) {
      console.error('❌ Command continuation error:', err);
      const friendlyError = createUserFriendlyError(err);
      setError(friendlyError.message);
      
      return {
        success: false,
        message: friendlyError.message
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    executeCommand,
    continueCommandWithClarification,
    isProcessing,
    error
  };
};