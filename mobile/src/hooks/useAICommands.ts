import { useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { AIToolExecutor, ToolCall } from '../services/ai-tool-executor';
import { createUserFriendlyError, isRecoverableError, getRetryDelay } from '../utils/ai-error-handling';
import OpenAI from 'openai';

interface AICommandResult {
  success: boolean;
  message: string;
  action?: {
    type: 'navigate' | 'toast' | 'none';
    payload?: any;
  };
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

    // Check for API key
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.log('❌ No OpenAI API key found');
      const apiError = createUserFriendlyError({ code: 'API_KEY_MISSING' });
      return {
        success: false,
        message: apiError.message
      };
    }

    console.log('✅ User authenticated and API key found, proceeding with AI command');

    setIsProcessing(true);
    setError(null);

    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      });

      const toolExecutor = new AIToolExecutor({
        currentUserId: user.id,
        currentConversationId,
      });

      // Define available tools for OpenAI function calling
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'search_contacts',
            description: 'Search for users by name, email, or username to find conversation participants',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query (name, email, username, etc.)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 5
                },
                includeRecent: {
                  type: 'boolean',
                  description: 'Prioritize users from recent conversations',
                  default: true
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'get_conversation_with_user',
            description: 'Get an existing conversation or create a new one with a specific user',
            parameters: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID from search_contacts result'
                }
              },
              required: ['userId']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'send_message',
            description: 'Send a message in a specific conversation',
            parameters: {
              type: 'object',
              properties: {
                conversationId: {
                  type: 'string',
                  description: 'ID of the conversation'
                },
                content: {
                  type: 'string',
                  description: 'Message content to send'
                },
                type: {
                  type: 'string',
                  enum: ['text', 'image', 'file'],
                  default: 'text',
                  description: 'Type of message'
                }
              },
              required: ['conversationId', 'content']
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'get_current_conversation',
            description: 'Get details about the currently open conversation. Only works when user is viewing a conversation.',
            parameters: {
              type: 'object',
              properties: {}
            }
          }
        },
        {
          type: 'function' as const,
          function: {
            name: 'get_latest_message',
            description: 'Get the most recent message, optionally filtered by direction (sent/received)',
            parameters: {
              type: 'object',
              properties: {
                conversationId: {
                  type: 'string',
                  description: 'Specific conversation ID, or null to search all conversations'
                },
                direction: {
                  type: 'string',
                  enum: ['sent', 'received', 'both'],
                  default: 'both',
                  description: 'Filter by message direction'
                }
              }
            }
          }
        }
      ];

      // Create system context
      const contextPrompt = currentConversationId 
        ? `You are currently in conversation ${currentConversationId}. ` +
          `When the user says "this conversation" or "here", they mean this conversation.`
        : `You are viewing the conversation list.`;

      const messages = [
        {
          role: 'user' as const,
          content: command
        }
      ];

      let response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for a messaging app. ${contextPrompt}

Available commands:
- "Tell [Contact] [message]" - Send a message to someone
- "Open my conversation with [Contact]" - Navigate to a conversation
- "Start a new conversation with [Contact]" - Create and open a new conversation
- "Summarize the most recent message" - Get a summary of the latest message
- "Summarize my most recent message" - Get a summary of your latest sent message
- "Summarize this conversation" - Get a summary of the current conversation (only works when viewing a conversation)

Always be helpful and confirm actions before taking them. If you find multiple matches for a contact, ask the user to clarify which one they mean.`
          },
          ...messages
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 4096,
      });

      // Handle tool calls iteratively
      while (response.choices[0]?.finish_reason === 'tool_calls') {
        const toolCalls = response.choices[0]?.message?.tool_calls || [];
        
        if (toolCalls.length === 0) break;

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.choices[0]?.message?.content || '',
          tool_calls: toolCalls
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function') {
            const toolResult = await toolExecutor.execute({
              name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments)
            });

            // Add tool result to messages
            messages.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolCall.id
            });
          }
        }

        // Get next response
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: 4096,
        });
      }

      // Extract final text response
      const finalMessage = response.choices[0]?.message?.content || 'Command executed successfully';

      return {
        success: true,
        message: finalMessage,
        action: {
          type: 'toast',
          payload: { message: finalMessage }
        }
      };

    } catch (err) {
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

