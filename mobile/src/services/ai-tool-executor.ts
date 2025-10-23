import { useAuthStore } from '../store/auth-store';
import { searchUsersByEmail, searchUsersByDisplayName } from './user-search';
import { 
  createOrGetConversation, 
  getConversationById 
} from './conversation-service';
import { sendMessageToFirestore } from './message-service';
import { getConversationMessages } from './database';
import { createUserFriendlyError, AI_ERRORS } from '../utils/ai-error-handling';

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  suggestions?: readonly string[];
}

export class AIToolExecutor {
  private currentUserId: string;
  private currentConversationId?: string;

  constructor(context: { 
    currentUserId: string;
    currentConversationId?: string;
  }) {
    this.currentUserId = context.currentUserId;
    this.currentConversationId = context.currentConversationId;
  }

  async execute(toolCall: ToolCall): Promise<ToolResponse> {
    try {
      switch (toolCall.name) {
        case 'search_contacts':
          return await this.searchContacts(toolCall.parameters as {
            query: string;
            limit?: number;
            includeRecent?: boolean;
          });
        
        case 'get_conversation_with_user':
          return await this.getConversationWithUser(toolCall.parameters as {
            userId: string;
          });
        
        case 'send_message':
          return await this.sendMessage(toolCall.parameters as {
            conversationId: string;
            content: string;
            type?: 'text' | 'image' | 'file';
          });
        
        case 'get_current_conversation':
          return await this.getCurrentConversation();
        
        case 'get_latest_message':
          return await this.getLatestMessage(toolCall.parameters as {
            conversationId?: string | null;
            direction?: 'sent' | 'received' | 'both';
          });
        
        default:
          const unknownError = createUserFriendlyError({ code: 'UNKNOWN_TOOL' });
          return {
            success: false,
            error: {
              code: 'UNKNOWN_TOOL',
              message: unknownError.message
            },
            suggestions: unknownError.suggestions
          };
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      const friendlyError = createUserFriendlyError(error);
      return {
        success: false,
        error: {
          code: friendlyError.message.includes('network') ? 'NETWORK_ERROR' : 'EXECUTION_ERROR',
          message: friendlyError.message
        },
        suggestions: friendlyError.suggestions
      };
    }
  }

  private async searchContacts(params: {
    query: string;
    limit?: number;
    includeRecent?: boolean;
  }): Promise<ToolResponse> {
    try {
      // Search by email first (more precise)
      let users = await searchUsersByEmail(params.query);
      
      // If no email matches, try display name search
      if (users.length === 0) {
        users = await searchUsersByDisplayName(params.query);
      }
      
      // Apply limit
      const limit = params.limit || 5;
      users = users.slice(0, limit);
      
      if (users.length === 0) {
        const noResultsError = createUserFriendlyError({ code: 'NO_RESULTS' });
        return {
          success: false,
          error: {
            code: 'NO_RESULTS',
            message: noResultsError.message
          },
          suggestions: noResultsError.suggestions
        };
      }

      return {
        success: true,
        data: users.map(user => ({
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        })),
        suggestions: users.length > 1 ? [
          'Multiple users found. Please specify which one you mean.'
        ] : undefined
      };
    } catch (error) {
      const searchError = createUserFriendlyError({ code: 'SEARCH_FAILED' });
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: searchError.message
        },
        suggestions: searchError.suggestions
      };
    }
  }

  private async getConversationWithUser(params: {
    userId: string;
  }): Promise<ToolResponse> {
    try {
      const conversationId = await createOrGetConversation(
        this.currentUserId,
        params.userId
      );

      const conversation = await getConversationById(conversationId);

      if (!conversation) {
        return {
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Could not create or find conversation'
          }
        };
      }

      const otherParticipant = conversation.participants.find(
        id => id !== this.currentUserId
      );

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          type: conversation.type,
          otherParticipant: otherParticipant ? {
            id: otherParticipant,
            displayName: conversation.participantDetails[otherParticipant]?.displayName,
            photoURL: conversation.participantDetails[otherParticipant]?.photoURL
          } : undefined,
          lastMessageAt: conversation.lastMessageAt,
          isNew: !conversation.lastMessage
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONVERSATION_ERROR',
          message: 'Failed to get or create conversation'
        }
      };
    }
  }

  private async sendMessage(params: {
    conversationId: string;
    content: string;
    type?: 'text' | 'image' | 'file';
  }): Promise<ToolResponse> {
    try {
      const messageId = await sendMessageToFirestore(
        params.conversationId,
        {
          senderId: this.currentUserId,
          content: {
            text: params.content,
            type: params.type || 'text'
          }
        }
      );

      return {
        success: true,
        data: {
          messageId,
          conversationId: params.conversationId,
          content: params.content,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: 'Failed to send message'
        }
      };
    }
  }

  private async getCurrentConversation(): Promise<ToolResponse> {
    if (!this.currentConversationId) {
      return {
        success: false,
        error: {
          code: 'NO_CURRENT_CONVERSATION',
          message: 'Not currently viewing a conversation'
        },
        suggestions: [
          'This command only works when viewing a conversation'
        ]
      };
    }

    try {
      const conversation = await getConversationById(this.currentConversationId);

      if (!conversation) {
        return {
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Current conversation not found'
          }
        };
      }

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          type: conversation.type,
          participants: conversation.participants,
          participantDetails: conversation.participantDetails,
          lastMessageAt: conversation.lastMessageAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to get current conversation'
        }
      };
    }
  }

  private async getLatestMessage(params: {
    conversationId?: string | null;
    direction?: 'sent' | 'received' | 'both';
  }): Promise<ToolResponse> {
    try {
      const conversationId = params.conversationId || this.currentConversationId;

      if (!conversationId) {
        return {
          success: false,
          error: {
            code: 'NO_CONVERSATION',
            message: 'No conversation specified'
          }
        };
      }

      const messages = await getConversationMessages(conversationId, 1, 0);

      if (messages.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_MESSAGES',
            message: 'No messages found in conversation'
          }
        };
      }

      const latestMessage = messages[0];
      const direction = latestMessage.senderId === this.currentUserId 
        ? 'sent' 
        : 'received';

      // Filter by direction if specified
      if (params.direction && params.direction !== 'both' && params.direction !== direction) {
        return {
          success: false,
          error: {
            code: 'NO_MATCHING_MESSAGE',
            message: `No ${params.direction} messages found`
          }
        };
      }

      return {
        success: true,
        data: {
          messageId: latestMessage.id,
          conversationId: latestMessage.conversationId,
          senderId: latestMessage.senderId,
          content: latestMessage.content,
          timestamp: latestMessage.timestamp,
          direction
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to get latest message'
        }
      };
    }
  }
}

