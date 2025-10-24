/**
 * AI Command Processing Types
 * 
 * Type definitions for AI command processing functionality
 */

export interface AppContext {
  currentScreen: "chats" | "conversation" | "profile" | "settings";
  currentConversationId?: string;
  currentUserId: string;
  recentConversations: string[];
  deviceInfo: {
    platform: "ios" | "android";
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
  action: "navigate_to_conversation" | "show_summary" | "show_error" | "no_action";
  error?: string;
  runId?: string; // LangSmith run ID
}
