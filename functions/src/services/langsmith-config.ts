/**
 * LangSmith Configuration
 *
 * This file configures LangSmith for logging and monitoring AI operations
 */

import {Client} from "langsmith";
import {getLangSmithApiKey, getLangSmithEndpoint} from "./env-config";

// Initialize LangSmith client
let langsmithClient: Client | null = null;

/**
 * Initialize LangSmith client
 */
export function initializeLangSmith(): Client | null {
  try {
    // Check if LangSmith API key is available
    const apiKey = getLangSmithApiKey();

    if (!apiKey) {
      console.warn("LangSmith API key not found. LangSmith logging disabled.");
      return null;
    }

    // Initialize LangSmith client
    langsmithClient = new Client({
      apiKey: apiKey,
      apiUrl: getLangSmithEndpoint(),
    });

    console.log("✅ LangSmith client initialized successfully");
    return langsmithClient;
  } catch (error) {
    console.error("❌ Failed to initialize LangSmith client:", error);
    return null;
  }
}

/**
 * Get the initialized LangSmith client
 */
export function getLangSmithClient(): Client | null {
  if (!langsmithClient) {
    return initializeLangSmith();
  }
  return langsmithClient;
}

// LangSmith configuration constants
export const LANGSMITH_CONFIG = {
  PROJECT_NAME: "whatsapp-clone-ai", // 👈 YOUR PROJECT NAME HERE
  DEFAULT_RUN_NAME: "ai-command-execution",
  TAGS: {
    COMMAND_PROCESSING: "command-processing",
    TOOL_EXECUTION: "tool-execution",
    MESSAGE_SUMMARIZATION: "message-summarization",
    CONVERSATION_MANAGEMENT: "conversation-management",
  },
  METADATA: {
    APP_VERSION: "1.0.0",
    ENVIRONMENT: process.env.NODE_ENV || "development",
  },
};

/**
 * Helper function to create run metadata
 */
export function createRunMetadata(
  userId: string,
  command: string,
  context?: any
): Record<string, any> {
  return {
    userId,
    command: command.substring(0, 100), // Truncate for privacy
    timestamp: new Date().toISOString(),
    environment: LANGSMITH_CONFIG.METADATA.ENVIRONMENT,
    appVersion: LANGSMITH_CONFIG.METADATA.APP_VERSION,
    ...context,
  };
}

/**
 * Helper function to create run tags
 */
export function createRunTags(operation: string): string[] {
  return [
    LANGSMITH_CONFIG.TAGS.COMMAND_PROCESSING,
    operation,
    LANGSMITH_CONFIG.METADATA.ENVIRONMENT,
  ];
}
