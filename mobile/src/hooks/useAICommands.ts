import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase.config';
import { createUserFriendlyError } from '../utils/ai-error-handling';

interface AICommandResult {
  success: boolean;
  message: string;
  action?: {
    type: 'navigate' | 'toast' | 'none';
    payload?: any;
  };
  runId?: string; // LangSmith run ID
}

export const useAICommands = (currentConversationId?: string) => {
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
      // Use the Cloud Function with LangSmith logging
      const processAICommand = httpsCallable(functions, 'processAICommand');
      
      const appContext = {
        currentScreen: currentConversationId ? 'conversation' : 'chats',
        currentConversationId,
        currentUserId: user.id,
        recentConversations: [], // Could be populated from your conversation list
        deviceInfo: {
          platform: 'ios' as const,
          version: '1.0.0',
        },
      };

      const result = await processAICommand({
        command,
        appContext,
        currentUserId: user.id,
      });

      const response = result.data as any;
      
      // Log LangSmith run ID if available
      if (response.runId) {
        console.log('✅ LangSmith Run ID:', response.runId);
      }

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

  return {
    executeCommand,
    isProcessing,
    error
  };
};