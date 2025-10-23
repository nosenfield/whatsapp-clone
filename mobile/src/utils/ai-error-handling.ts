/**
 * AI Command Error Handling Utilities
 * Provides user-friendly error messages and recovery suggestions
 */

export interface AIError {
  code: string;
  message: string;
  suggestions?: readonly string[];
  recoverable: boolean;
}

export class AICommandError extends Error {
  public readonly code: string;
  public readonly suggestions?: readonly string[];
  public readonly recoverable: boolean;

  constructor(error: AIError) {
    super(error.message);
    this.name = 'AICommandError';
    this.code = error.code;
    this.suggestions = error.suggestions;
    this.recoverable = error.recoverable;
  }
}

/**
 * Error definitions for AI commands
 */
export const AI_ERRORS = {
  // Authentication errors
  NOT_AUTHENTICATED: {
    code: 'NOT_AUTHENTICATED',
    message: 'You must be logged in to use AI commands',
    suggestions: ['Please sign in to your account'],
    recoverable: true,
  },

  // API errors
  API_KEY_MISSING: {
    code: 'API_KEY_MISSING',
    message: 'AI service is not configured',
    suggestions: ['Contact support if this issue persists'],
    recoverable: false,
  },

  API_RATE_LIMIT: {
    code: 'API_RATE_LIMIT',
    message: 'Too many requests. Please wait a moment and try again',
    suggestions: ['Wait 30 seconds before trying again'],
    recoverable: true,
  },

  API_TIMEOUT: {
    code: 'API_TIMEOUT',
    message: 'Request timed out. Please try again',
    suggestions: ['Check your internet connection', 'Try again in a moment'],
    recoverable: true,
  },

  // Tool execution errors
  UNKNOWN_TOOL: {
    code: 'UNKNOWN_TOOL',
    message: 'Unknown command. Please try a different command',
    suggestions: ['Use one of the suggested commands', 'Try rephrasing your request'],
    recoverable: true,
  },

  EXECUTION_ERROR: {
    code: 'EXECUTION_ERROR',
    message: 'Command failed to execute',
    suggestions: ['Try again', 'Check your internet connection'],
    recoverable: true,
  },

  // Contact search errors
  NO_RESULTS: {
    code: 'NO_RESULTS',
    message: 'No contacts found matching your search',
    suggestions: [
      'Try a different name or email',
      'Check the spelling',
      'Make sure the person is registered in the app'
    ],
    recoverable: true,
  },

  SEARCH_FAILED: {
    code: 'SEARCH_FAILED',
    message: 'Failed to search contacts',
    suggestions: ['Try again', 'Check your internet connection'],
    recoverable: true,
  },

  // Conversation errors
  CONVERSATION_NOT_FOUND: {
    code: 'CONVERSATION_NOT_FOUND',
    message: 'Conversation not found',
    suggestions: ['The conversation may have been deleted', 'Try starting a new conversation'],
    recoverable: true,
  },

  CONVERSATION_ERROR: {
    code: 'CONVERSATION_ERROR',
    message: 'Failed to access conversation',
    suggestions: ['Try again', 'Check your internet connection'],
    recoverable: true,
  },

  NO_CURRENT_CONVERSATION: {
    code: 'NO_CURRENT_CONVERSATION',
    message: 'This command only works when viewing a conversation',
    suggestions: ['Open a conversation first', 'Use a different command'],
    recoverable: true,
  },

  // Message errors
  SEND_FAILED: {
    code: 'SEND_FAILED',
    message: 'Failed to send message',
    suggestions: ['Try again', 'Check your internet connection'],
    recoverable: true,
  },

  NO_MESSAGES: {
    code: 'NO_MESSAGES',
    message: 'No messages found',
    suggestions: ['The conversation may be empty', 'Try sending a message first'],
    recoverable: true,
  },

  NO_MATCHING_MESSAGE: {
    code: 'NO_MATCHING_MESSAGE',
    message: 'No matching messages found',
    suggestions: ['Try a different time range', 'Check if messages exist'],
    recoverable: true,
  },

  FETCH_FAILED: {
    code: 'FETCH_FAILED',
    message: 'Failed to retrieve data',
    suggestions: ['Try again', 'Check your internet connection'],
    recoverable: true,
  },

  // Network errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    suggestions: [
      'Check your internet connection',
      'Try again when connection is restored'
    ],
    recoverable: true,
  },

  // Permission errors
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'You don\'t have permission to perform this action',
    suggestions: ['Contact support if you believe this is an error'],
    recoverable: false,
  },

  // Validation errors
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid command format',
    suggestions: [
      'Use one of the suggested commands',
      'Try rephrasing your request'
    ],
    recoverable: true,
  },

  MESSAGE_TOO_LONG: {
    code: 'MESSAGE_TOO_LONG',
    message: 'Message is too long',
    suggestions: ['Shorten your message', 'Split into multiple messages'],
    recoverable: true,
  },

  // Unknown errors
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    suggestions: ['Try again', 'Contact support if the issue persists'],
    recoverable: true,
  },
} as const;

/**
 * Maps error codes to user-friendly error objects
 */
export function mapErrorToAIError(error: any): AIError {
  // Handle known error codes
  if (error?.code && AI_ERRORS[error.code as keyof typeof AI_ERRORS]) {
    return AI_ERRORS[error.code as keyof typeof AI_ERRORS];
  }

  // Handle network errors
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return AI_ERRORS.NETWORK_ERROR;
  }

  // Handle timeout errors
  if (error?.message?.includes('timeout')) {
    return AI_ERRORS.API_TIMEOUT;
  }

  // Handle authentication errors
  if (error?.message?.includes('auth') || error?.message?.includes('login')) {
    return AI_ERRORS.NOT_AUTHENTICATED;
  }

  // Handle API key errors
  if (error?.message?.includes('API key') || error?.message?.includes('unauthorized')) {
    return AI_ERRORS.API_KEY_MISSING;
  }

  // Handle rate limit errors
  if (error?.message?.includes('rate limit') || error?.message?.includes('too many')) {
    return AI_ERRORS.API_RATE_LIMIT;
  }

  // Default to unknown error
  return AI_ERRORS.UNKNOWN_ERROR;
}

/**
 * Creates a user-friendly error message with suggestions
 */
export function createUserFriendlyError(error: any): {
  message: string;
  suggestions: readonly string[];
  recoverable: boolean;
} {
  const aiError = mapErrorToAIError(error);
  
  return {
    message: aiError.message,
    suggestions: aiError.suggestions || [],
    recoverable: aiError.recoverable,
  };
}

/**
 * Determines if an error is recoverable (user can try again)
 */
export function isRecoverableError(error: any): boolean {
  const aiError = mapErrorToAIError(error);
  return aiError.recoverable;
}

/**
 * Gets retry delay based on error type
 */
export function getRetryDelay(error: any): number {
  const code = error?.code;
  
  switch (code) {
    case 'API_RATE_LIMIT':
      return 30000; // 30 seconds
    case 'NETWORK_ERROR':
    case 'API_TIMEOUT':
      return 5000; // 5 seconds
    default:
      return 1000; // 1 second
  }
}
