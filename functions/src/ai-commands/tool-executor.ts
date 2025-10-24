/**
 * AI Tool Executor
 * 
 * Executes AI command tools based on parsed intent
 */

import * as logger from "firebase-functions/logger";
import {AppContext} from "./types";
import {
  findContactByName,
  findConversation,
  createConversation,
  sendMessage,
  summarizeConversationMessages,
  summarizeMessage,
  getLatestReceivedMessage,
  getLatestReceivedMessageGlobally,
  getLatestSentMessage,
  getLatestSentMessageGlobally,
} from "../helpers/database-helpers";

/**
 * Execute the appropriate tool based on parsed intent
 * @param {Object} intent The parsed command intent
 * @param {string} currentUserId The current user ID
 * @param {AppContext} appContext Optional app context
 * @return {Promise<Object>} Tool execution result
 */
export async function executeTool(
  intent: any, currentUserId: string, appContext?: AppContext) {
  try {
    switch (intent.action) {
    case "createConversation":
      return await executeCreateConversation(
        intent.parameters, currentUserId);

    case "findOrCreateConversation":
      return await executeFindOrCreateConversation(
        intent.parameters, currentUserId);

    case "sendMessageToContact":
      return await executeSendMessageToContact(
        intent.parameters, currentUserId);

    case "summarizeCurrentConversation":
      return await executeSummarizeCurrentConversation(
        intent.parameters, currentUserId, appContext);

    case "summarizeConversation":
      return await executeSummarizeConversation(intent.parameters, currentUserId);

    case "summarizeLatestReceivedMessage":
      return await executeSummarizeLatestReceivedMessage(currentUserId, appContext);

    case "summarizeLatestSentMessage":
      return await executeSummarizeLatestSentMessage(currentUserId, appContext);

    default:
      return {
        success: false,
        error: "Unknown action",
        action: "show_error",
      };
    }
  } catch (error) {
    logger.error("Error executing tool", {error, intent});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tool execution failed",
      action: "show_error",
    };
  }
}

/**
 * Tool: Create a new conversation with a contact
 * @param {Object} params Tool parameters
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object>} Creation result
 */
async function executeCreateConversation(params: any, currentUserId: string) {
  try {
    const {contactName} = params;

    // Find contact by display name
    const contact = await findContactByName(contactName, currentUserId);
    if (!contact) {
      return {
        success: false,
        error: `Contact "${contactName}" not found`,
        action: "show_error",
      };
    }

    // Check if conversation already exists
    const existingConversation = await findConversation(currentUserId, contact.id);
    if (existingConversation) {
      return {
        success: true,
        conversationId: existingConversation.id,
        wasCreated: false,
        action: "navigate_to_conversation",
      };
    }

    // Create new conversation
    const conversation = await createConversation([currentUserId, contact.id]);

    return {
      success: true,
      conversationId: conversation.id,
      wasCreated: true,
      action: "navigate_to_conversation",
    };
  } catch (error) {
    logger.error("Error creating conversation", {error, params});
    return {
      success: false,
      error: "Failed to create conversation",
      action: "show_error",
    };
  }
}

/**
 * Tool: Find or create conversation with contact
 * @param {Object} params Tool parameters
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object>} Find/create result
 */
async function executeFindOrCreateConversation(params: any, currentUserId: string) {
  try {
    const {contactName} = params;

    // Find contact by display name
    const contact = await findContactByName(contactName, currentUserId);
    if (!contact) {
      return {
        success: false,
        error: `Contact "${contactName}" not found`,
        action: "show_error",
      };
    }

    // Find existing conversation
    let conversation = await findConversation(currentUserId, contact.id);
    let wasCreated = false;

    // Create if doesn't exist
    if (!conversation) {
      conversation = await createConversation([currentUserId, contact.id]);
      wasCreated = true;
    }

    return {
      success: true,
      conversationId: conversation?.id,
      wasCreated,
      action: "navigate_to_conversation",
    };
  } catch (error) {
    logger.error("Error finding or creating conversation", {error, params});
    return {
      success: false,
      error: "Failed to find or create conversation",
      action: "show_error",
    };
  }
}

/**
 * Tool: Send message to contact
 * @param {Object} params Tool parameters
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object>} Send result
 */
async function executeSendMessageToContact(params: any, currentUserId: string) {
  try {
    const {contactName, messageText} = params;

    // Find contact by display name
    const contact = await findContactByName(contactName, currentUserId);
    if (!contact) {
      return {
        success: false,
        error: `Contact "${contactName}" not found`,
        action: "show_error",
      };
    }

    // Find or create conversation
    let conversation = await findConversation(currentUserId, contact.id);
    if (!conversation) {
      conversation = await createConversation([currentUserId, contact.id]);
    }

    // Send message
    const message = await sendMessage({
      conversationId: conversation?.id,
      senderId: currentUserId,
      content: {text: messageText, type: "text"},
    });

    return {
      success: true,
      conversationId: conversation?.id,
      messageId: message?.id,
      action: "navigate_to_conversation",
    };
  } catch (error) {
    logger.error("Error sending message to contact", {error, params});
    return {
      success: false,
      error: "Failed to send message",
      action: "show_error",
    };
  }
}

/**
 * Tool: Summarize current conversation
 * @param {Object} params Tool parameters
 * @param {string} currentUserId The current user ID
 * @param {AppContext} appContext Optional app context
 * @return {Promise<Object>} Summarization result
 */
async function executeSummarizeCurrentConversation(
  params: any, currentUserId: string, appContext?: AppContext) {
  try {
    const {timeFilter = "all"} = params;
    const conversationId = appContext?.currentConversationId;

    if (!conversationId) {
      return {
        success: false,
        error: "No current conversation to summarize",
        action: "show_error",
      };
    }

    const summary = await summarizeConversationMessages(conversationId, timeFilter);

    return {
      success: true,
      summary: summary.text,
      messageCount: summary.messageCount,
      timeRange: timeFilter,
      action: "show_summary",
    };
  } catch (error) {
    logger.error("Error summarizing current conversation", {error, params});
    return {
      success: false,
      error: "Failed to summarize conversation",
      action: "show_error",
    };
  }
}

/**
 * Tool: Summarize conversation with contact
 * @param {Object} params Tool parameters
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object>} Summarization result
 */
async function executeSummarizeConversation(params: any, currentUserId: string) {
  try {
    const {contactName, timeFilter = "all"} = params;

    // Find contact by display name
    const contact = await findContactByName(contactName, currentUserId);
    if (!contact) {
      return {
        success: false,
        error: `Contact "${contactName}" not found`,
        action: "show_error",
      };
    }

    // Find conversation
    const conversation = await findConversation(currentUserId, contact.id);
    if (!conversation) {
      return {
        success: false,
        error: `No conversation found with ${contactName}`,
        action: "show_error",
      };
    }

    const summary = await summarizeConversationMessages(conversation.id, timeFilter);

    return {
      success: true,
      summary: summary.text,
      messageCount: summary.messageCount,
      timeRange: timeFilter,
      action: "show_summary",
    };
  } catch (error) {
    logger.error("Error summarizing conversation", {error, params});
    return {
      success: false,
      error: "Failed to summarize conversation",
      action: "show_error",
    };
  }
}

/**
 * Tool: Summarize latest received message
 * @param {string} currentUserId The current user ID
 * @param {AppContext} appContext Optional app context
 * @return {Promise<Object>} Summarization result
 */
async function executeSummarizeLatestReceivedMessage(
  currentUserId: string, appContext?: AppContext) {
  try {
    const conversationId = appContext?.currentConversationId;

    if (conversationId) {
      // Summarize latest message in current conversation
      const latestMessage = await getLatestReceivedMessage(conversationId, currentUserId);
      if (!latestMessage) {
        return {
          success: false,
          error: "No recent messages found",
          action: "show_error",
        };
      }

      const summary = await summarizeMessage((latestMessage as any).content?.text || "");

      return {
        success: true,
        summary: summary.text,
        originalMessage: (latestMessage as any).content?.text || "",
        action: "show_summary",
      };
    } else {
      // Summarize latest message across all conversations
      const latestMessage = await getLatestReceivedMessageGlobally(currentUserId);
      if (!latestMessage) {
        return {
          success: false,
          error: "No recent messages found",
          action: "show_error",
        };
      }

      const summary = await summarizeMessage((latestMessage as any).content?.text || "");

      return {
        success: true,
        summary: summary.text,
        originalMessage: (latestMessage as any).content?.text || "",
        action: "show_summary",
      };
    }
  } catch (error) {
    logger.error("Error summarizing latest received message", {error});
    return {
      success: false,
      error: "Failed to summarize latest message",
      action: "show_error",
    };
  }
}

/**
 * Tool: Summarize latest sent message
 * @param {string} currentUserId The current user ID
 * @param {AppContext} appContext Optional app context
 * @return {Promise<Object>} Summarization result
 */
async function executeSummarizeLatestSentMessage(
  currentUserId: string, appContext?: AppContext) {
  try {
    const conversationId = appContext?.currentConversationId;

    if (conversationId) {
      // Summarize latest sent message in current conversation
      const latestMessage = await getLatestSentMessage(conversationId, currentUserId);
      if (!latestMessage) {
        return {
          success: false,
          error: "No recent messages found",
          action: "show_error",
        };
      }

      const summary = await summarizeMessage((latestMessage as any).content?.text || "");

      return {
        success: true,
        summary: summary.text,
        originalMessage: (latestMessage as any).content?.text || "",
        action: "show_summary",
      };
    } else {
      // Summarize latest sent message across all conversations
      const latestMessage = await getLatestSentMessageGlobally(currentUserId);
      if (!latestMessage) {
        return {
          success: false,
          error: "No recent messages found",
          action: "show_error",
        };
      }

      const summary = await summarizeMessage((latestMessage as any).content?.text || "");

      return {
        success: true,
        summary: summary.text,
        originalMessage: (latestMessage as any).content?.text || "",
        action: "show_summary",
      };
    }
  } catch (error) {
    logger.error("Error summarizing latest sent message", {error});
    return {
      success: false,
      error: "Failed to summarize latest message",
      action: "show_error",
    };
  }
}
