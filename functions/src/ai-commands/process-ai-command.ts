/**
 * Process AI Command Cloud Function
 * 
 * Main function for processing AI commands using LangChain with LangSmith logging
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {AICommandRequest, AICommandResponse, AppContext} from "./types";
import {parseCommandWithLangChain} from "./command-parser";
import {executeTool} from "./tool-executor";

/**
 * Process AI commands using LangChain with LangSmith logging
 *
 * This function handles natural language commands and executes appropriate tools
 */
export const processAICommand = onCall(
  {
    cors: true,
    secrets: ["OPENAI_API_KEY", "LANGSMITH_API_KEY", "PINECONE_API_KEY"]
  },
  async (request): Promise<AICommandResponse> => {
    try {
      const {command, appContext, currentUserId} = request.data as AICommandRequest;

      // Validate request
      if (!command || !currentUserId) {
        return {
          success: false,
          result: null,
          response: "Invalid request: missing command or user ID",
          action: "show_error",
          error: "Missing required parameters",
        };
      }

      logger.info("Processing AI command", {
        command: command.substring(0, 100), // Log first 100 chars
        userId: currentUserId,
        screen: appContext?.currentScreen,
      });

      // Parse command intent using LangChain with LangSmith logging
      const parsedCommand = await parseCommandWithLangChain(command, appContext);

      if (!parsedCommand.success) {
        return {
          success: false,
          result: null,
          response: "Sorry, I couldn't understand that command.",
          action: "show_error",
          error: parsedCommand.error,
        };
      }

      // Execute the appropriate tool
      const toolResult = await executeTool(parsedCommand.intent, currentUserId, appContext);

      // Generate response
      const response = await generateResponse(toolResult, parsedCommand.intent);

      // Log the command for audit purposes
      await logAICommand({
        userId: currentUserId,
        command,
        parsedIntent: parsedCommand.intent,
        result: toolResult,
        timestamp: new Date(),
        appContext,
      });

      return {
        success: true,
        result: toolResult,
        response,
        action: (toolResult.action as
          "navigate_to_conversation" | "show_summary" | "show_error" |
          "no_action") || "no_action",
        runId: parsedCommand.runId, // Include LangSmith run ID
      };
    } catch (error) {
      logger.error("Error processing AI command", {error});
      return {
        success: false,
        result: null,
        response: "Sorry, I encountered an error processing your command.",
        action: "show_error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Generate a user-friendly response
 */
async function generateResponse(toolResult: any, intent: any): Promise<string> {
  if (toolResult.success) {
    return toolResult.message || "Command executed successfully";
  } else {
    return toolResult.error || "Command failed";
  }
}

/**
 * Log AI command for audit purposes
 */
async function logAICommand(params: {
  userId: string;
  command: string;
  parsedIntent: any;
  result: any;
  timestamp: Date;
  appContext?: AppContext;
}): Promise<void> {
  // Simple logging - can be expanded to write to Firestore
  logger.info("AI Command logged", {
    userId: params.userId,
    command: params.command.substring(0, 100),
    intent: params.parsedIntent,
    timestamp: params.timestamp,
  });
}
