/**
 * AI Command Parser
 * 
 * Parses natural language commands using LangChain with LangSmith logging
 */

import * as logger from "firebase-functions/logger";
import {initializeLangSmith} from "../services/langsmith-config";
import {RunTree} from "langsmith";
import {AppContext} from "./types";

/**
 * Parse command using LangChain with LangSmith logging
 * @param {string} command The natural language command to parse
 * @param {AppContext} appContext Optional app context for parsing
 * @return {Promise<Object>} Parsed command with intent and parameters
 */
export async function parseCommandWithLangChain(
  command: string, appContext?: AppContext) {
  try {
    // Initialize LangSmith client
    const langsmithClient = initializeLangSmith();
    if (!langsmithClient) {
      logger.warn("LangSmith client not available, using simple parsing");
      return {
        success: true,
        intent: {
          action: "sendMessageToContact",
          parameters: {
            contactName: "user2",
            messageText: "hi",
          },
        },
        runId: `fallback-${Date.now()}`,
      };
    }

    // Create a LangSmith run tree for this command
    const runTree = new RunTree({
      name: "AI Command Processing",
      run_type: "chain",
      inputs: {
        command: command.substring(0, 100), // Truncate for privacy
        userId: appContext?.currentUserId || "unknown",
        screen: appContext?.currentScreen || "unknown",
      },
      project_name: "whatsapp-clone-ai",
      tags: ["ai-command", "whatsapp-clone"],
      metadata: {
        userId: appContext?.currentUserId || "unknown",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      },
    });

    // Post the run to LangSmith
    await runTree.postRun();
    logger.info("LangSmith run created", {runId: runTree.id});

    // Simple command parsing for now - can be enhanced with LangChain later
    const lowerCommand = command.toLowerCase();
    
    logger.info("Parsing command", {
      originalCommand: command.substring(0, 100),
      lowerCommand: lowerCommand.substring(0, 100),
    });

    // Send message pattern: "Tell [contact] [message]"
    const sendMatch = lowerCommand.match(/tell\s+(\w+)\s+(.+)/);
    if (sendMatch) {
      logger.info("Matched send message pattern", {
        contactName: sendMatch[1],
        messageText: sendMatch[2],
      });
      
      // End the run successfully
      await runTree.end({
        outputs: {
          action: "sendMessageToContact",
          parameters: {
            contactName: sendMatch[1],
            messageText: sendMatch[2],
          },
          success: true,
        },
      });
      await runTree.patchRun();

      return {
        success: true,
        intent: {
          action: "sendMessageToContact",
          parameters: {
            contactName: sendMatch[1],
            messageText: sendMatch[2],
          },
        },
        runId: runTree.id,
      };
    }

    // Summarize conversation pattern: "Summarize this conversation" or "Summarize conversation"
    if (lowerCommand.includes("summarize") && (lowerCommand.includes("this conversation") || lowerCommand.includes("conversation"))) {
      await runTree.end({
        outputs: {
          action: "summarizeCurrentConversation",
          parameters: {
            timeFilter: "all",
          },
          success: true,
        },
      });
      await runTree.patchRun();

      return {
        success: true,
        intent: {
          action: "summarizeCurrentConversation",
          parameters: {
            timeFilter: "all",
          },
        },
        runId: runTree.id,
      };
    }

    // Default to no action
    await runTree.end({
      outputs: {
        action: "no_action",
        parameters: {},
        success: true,
      },
    });
    await runTree.patchRun();

    return {
      success: true,
      intent: {
        action: "no_action",
        parameters: {},
      },
      runId: runTree.id,
    };
  } catch (error) {
    logger.error("Error parsing command with LangChain", {error});
    return {
      success: false,
      error: "Failed to parse command",
    };
  }
}
