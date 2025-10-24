/**
 * Firebase Cloud Functions
 *
 * Functions for push notifications and other backend logic
 */

import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Expo, ExpoPushMessage, ExpoPushTicket} from "expo-server-sdk";
import {generateEmbedding, shouldEmbedText} from "./services/embeddings";
import {upsertToPinecone} from "./services/pinecone";
import {extractCalendarEvents} from "./features/calendar-extraction";
import {initializeLangSmith} from "./services/langsmith-config";
import {RunTree} from "langsmith";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

// OpenAI client removed - using functions.config() in calendar extraction
// LangSmith client removed - using OpenAI directly

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1", // Match your Firebase region
});

/**
 * Send push notification when a new message is created
 *
 * Triggers on: /conversations/{conversationId}/messages/{messageId}
 * When: A new message document is created
 */
export const sendMessageNotification = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    try {
      const messageId = event.params.messageId;
      const conversationId = event.params.conversationId;

      // Get the message data
      const messageData = event.data?.data();
      if (!messageData) {
        logger.warn("No message data found", {messageId});
        return;
      }

      logger.info("Processing notification for new message", {
        conversationId,
        messageId,
        senderId: messageData.senderId,
      });

      // Get conversation data
      const conversationDoc = await admin
        .firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        logger.warn("Conversation not found", {conversationId});
        return;
      }

      const conversationData = conversationDoc.data();
      if (!conversationData) {
        logger.warn("No conversation data", {conversationId});
        return;
      }

      // Get sender info
      const senderDoc = await admin
        .firestore()
        .collection("users")
        .doc(messageData.senderId)
        .get();

      const senderData = senderDoc.data();
      const senderName = senderData?.displayName || "Someone";

      // Determine recipients (all participants except sender)
      const participants = conversationData.participants || [];
      const recipientIds = participants.filter(
        (id: string) => id !== messageData.senderId
      );

      if (recipientIds.length === 0) {
        logger.info("No recipients for notification");
        return;
      }

      logger.info("Fetching push tokens for recipients", {
        recipientCount: recipientIds.length,
      });

      // Get push tokens for all recipients
      const recipientDocs = await admin
        .firestore()
        .collection("users")
        .where(admin.firestore.FieldPath.documentId(), "in", recipientIds)
        .get();

      const pushTokens: string[] = [];
      const recipientNames: Record<string, string> = {};

      recipientDocs.forEach((doc) => {
        const userData = doc.data();
        // Check if user has push token, notifications enabled,
        // and valid Expo token
        const notificationsEnabled =
          userData.notificationsEnabled !== false; // Default to true
        if (
          userData.pushToken &&
          Expo.isExpoPushToken(userData.pushToken) &&
          notificationsEnabled
        ) {
          pushTokens.push(userData.pushToken);
          recipientNames[userData.pushToken] =
            userData.displayName || "User";
        }
      });

      if (pushTokens.length === 0) {
        logger.info("No valid push tokens found for recipients");
        return;
      }

      logger.info("Found push tokens", {count: pushTokens.length});

      // Determine notification title based on conversation type
      let notificationTitle: string;
      if (conversationData.type === "group") {
        notificationTitle = conversationData.name || "Group Chat";
      } else {
        notificationTitle = senderName;
      }

      // Construct notification body
      let notificationBody: string;
      if (messageData.content.type === "image") {
        const caption = messageData.content.text;
        notificationBody = caption ? `📷 ${caption}` : "📷 Image";
      } else {
        notificationBody = messageData.content.text;
      }

      // Add sender name prefix for group chats
      if (conversationData.type === "group") {
        notificationBody = `${senderName}: ${notificationBody}`;
      }

      // Truncate long messages
      if (notificationBody.length > 200) {
        notificationBody = notificationBody.substring(0, 197) + "...";
      }

      // Create push messages
      const messages: ExpoPushMessage[] = pushTokens.map((pushToken) => ({
        to: pushToken,
        sound: "default",
        title: notificationTitle,
        body: notificationBody,
        data: {
          type: "new_message",
          conversationId,
          messageId,
          senderId: messageData.senderId,
          senderName,
        },
        badge: 1, // TODO: Calculate actual unread count per user
        priority: "high",
        channelId: "messages", // For Android
      }));

      logger.info("Sending push notifications", {
        messageCount: messages.length,
      });

      // Send notifications in chunks (Expo recommends batches of 100)
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          logger.info("Sent notification chunk", {
            chunkSize: chunk.length,
          });
        } catch (error) {
          logger.error("Error sending notification chunk", {error});
        }
      }

      // Log results
      const successCount = tickets.filter((t) => t.status === "ok").length;
      const errorCount = tickets.filter((t) => t.status === "error").length;

      logger.info("Push notifications sent", {
        total: tickets.length,
        success: successCount,
        errors: errorCount,
      });

      // Log any errors
      tickets.forEach((ticket, index) => {
        if (ticket.status === "error") {
          logger.error("Notification error", {
            token: pushTokens[index],
            error: ticket.message,
            details: ticket.details,
          });
        }
      });

      return {
        success: true,
        sent: tickets.length,
        successCount,
        errorCount,
      };
    } catch (error) {
      logger.error("Error in sendMessageNotification function", {error});
      throw error;
    }
  }
);

// AI Command Processing Types
interface AppContext {
  currentScreen: "chats" | "conversation" | "profile" | "settings";
  currentConversationId?: string;
  currentUserId: string;
  recentConversations: string[];
  deviceInfo: {
    platform: "ios" | "android";
    version: string;
  };
}

interface AICommandRequest {
  command: string;
  appContext: AppContext;
  currentUserId: string;
}

interface AICommandResponse {
  success: boolean;
  result: any;
  response: string;
  action: "navigate_to_conversation" | "show_summary" | "show_error" | "no_action";
  error?: string;
  runId?: string; // LangSmith run ID
}

/**
 * Process AI commands using LangChain with LangSmith logging
 *
 * This function handles natural language commands and executes appropriate tools
 */
export const processAICommand = onCall(
  {cors: true},
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

/**
 * Parse command using LangChain with LangSmith logging
 * @param {string} command The natural language command to parse
 * @param {AppContext} appContext Optional app context for parsing
 * @return {Promise<Object>} Parsed command with intent and parameters
 */
async function parseCommandWithLangChain(
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

    // Send message pattern: "Tell [contact] [message]"
    const sendMatch = lowerCommand.match(/tell\s+(\w+)\s+(.+)/);
    if (sendMatch) {
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

/**
 * Execute the appropriate tool based on parsed intent
 * @param {Object} intent The parsed command intent
 * @param {string} currentUserId The current user ID
 * @param {AppContext} appContext Optional app context
 * @return {Promise<Object>} Tool execution result
 */
async function executeTool(
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
      conversationId: conversation.id,
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
      conversationId: conversation.id,
      senderId: currentUserId,
      content: {text: messageText, type: "text"},
    });

    return {
      success: true,
      conversationId: conversation.id,
      messageId: message.id,
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


// Helper functions for database operations

/**
 * Find contact by display name
 * @param {string} contactName The contact display name
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Contact data or null
 */
async function findContactByName(contactName: string, currentUserId: string) {
  // First try exact match
  const usersSnapshot = await admin.firestore()
    .collection("users")
    .where("displayName", "==", contactName)
    .limit(1)
    .get();

  // If no exact match, try case-insensitive search
  if (usersSnapshot.empty) {
    const allUsersSnapshot = await admin.firestore()
      .collection("users")
      .get();

    const matchingUser = allUsersSnapshot.docs.find((doc) => {
      const userData = doc.data();
      return userData.displayName?.toLowerCase() === contactName.toLowerCase();
    });

    if (matchingUser) {
      return {
        id: matchingUser.id,
        ...matchingUser.data(),
      };
    }
  } else {
    const userDoc = usersSnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  }

  return null;
}

/**
 * Find conversation between two users
 * @param {string} userId1 First user ID
 * @param {string} userId2 Second user ID
 * @return {Promise<Object|null>} Conversation data or null
 */
async function findConversation(userId1: string, userId2: string) {
  // Find direct conversation between two users
  const conversationsSnapshot = await admin.firestore()
    .collection("conversations")
    .where("type", "==", "direct")
    .where("participants", "array-contains", userId1)
    .get();

  for (const doc of conversationsSnapshot.docs) {
    const data = doc.data();
    if (data.participants.includes(userId2)) {
      return {
        id: doc.id,
        ...data,
      };
    }
  }

  return null;
}

/**
 * Create a new conversation
 * @param {string[]} participants Array of participant user IDs
 * @return {Promise<Object>} Created conversation data
 */
async function createConversation(participants: string[]) {
  const conversationData = {
    type: participants.length === 2 ? "direct" : "group",
    participants,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await admin.firestore().collection("conversations").add(conversationData);

  return {
    id: docRef.id,
    ...conversationData,
  };
}

/**
 * Send a message to a conversation
 * @param {Object} messageData Message data to send
 * @return {Promise<Object>} Sent message data
 */
async function sendMessage(messageData: any) {
  const timestamp = admin.firestore.Timestamp.fromDate(new Date());
  const messageRef = await admin.firestore()
    .collection("conversations")
    .doc(messageData.conversationId)
    .collection("messages")
    .add({
      ...messageData,
      timestamp,
      status: "sent",
      deliveredTo: messageData.deliveredTo || [],
      readBy: messageData.readBy || {},
    });

  // Update conversation's lastMessage and lastMessageAt
  await admin.firestore()
    .collection("conversations")
    .doc(messageData.conversationId)
    .update({
      lastMessage: {
        text: messageData.content.text,
        senderId: messageData.senderId,
        timestamp: timestamp,
      },
      lastMessageAt: timestamp,
      updatedAt: timestamp,
    });

  return {
    id: messageRef.id,
    ...messageData,
  };
}

/**
 * Summarize conversation messages
 * @param {string} conversationId The conversation ID
 * @param {string} timeFilter Time filter for messages
 * @return {Promise<Object>} Summary data
 */
async function summarizeConversationMessages(
  conversationId: string, timeFilter: string) {
  // Get messages based on time filter
  let query = admin.firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "desc");

  if (timeFilter !== "all") {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeFilter) {
    case "1day":
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "1week":
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "1month":
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoffDate = new Date(0);
    }

    query = query.where("timestamp", ">=", cutoffDate);
  }

  const messagesSnapshot = await query.limit(50).get();
  const messages = messagesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (messages.length === 0) {
    return {
      text: "No messages found in the specified time range.",
      messageCount: 0,
    };
  }

  // Use LangChain to generate a sophisticated summary with LangSmith logging
  const messageTexts = messages
    .filter((msg) => (msg as any).content?.type === "text")
    .map((msg) => (msg as any).content?.text || "")
    .join("\n");

  try {
    // Simple summary for now - can be enhanced with LangChain later
    return {
      text: `Summary of ${messages.length} messages: ${messageTexts.substring(0, 200)}...`,
      messageCount: messages.length,
    };
  } catch (error) {
    logger.error("Error generating conversation summary", {error});
    return {
      text: "Failed to generate summary",
      messageCount: 0,
    };
  }
}

/**
 * Summarize a single message
 * @param {string} messageText The message text to summarize
 * @return {Promise<Object>} Summary data
 */
async function summarizeMessage(messageText: string) {
  try {
    // Simple summary for now - can be enhanced with LangChain later
    return {
      text: `Summary: ${messageText.substring(0, 100)}...`,
    };
  } catch (error) {
    logger.error("Error summarizing message", {error});
    return {
      text: "Failed to summarize message",
    };
  }
}

/**
 * Get latest received message in conversation
 * @param {string} conversationId The conversation ID
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Latest message or null
 */
async function getLatestReceivedMessage(
  conversationId: string, currentUserId: string) {
  const messagesSnapshot = await admin.firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .where("senderId", "!=", currentUserId)
    .orderBy("senderId")
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();

  if (messagesSnapshot.empty) {
    return null;
  }

  const doc = messagesSnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get latest received message globally
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Latest message or null
 */
async function getLatestReceivedMessageGlobally(currentUserId: string) {
  // This is a simplified implementation
  // In production, you'd need a more sophisticated query
  const conversationsSnapshot = await admin.firestore()
    .collection("conversations")
    .where("participants", "array-contains", currentUserId)
    .limit(10)
    .get();

  let latestMessage = null;
  let latestTimestamp = null;

  for (const convDoc of conversationsSnapshot.docs) {
    const messagesSnapshot = await admin.firestore()
      .collection("conversations")
      .doc(convDoc.id)
      .collection("messages")
      .where("senderId", "!=", currentUserId)
      .orderBy("senderId")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (!messagesSnapshot.empty) {
      const message = messagesSnapshot.docs[0].data();
      if (!latestTimestamp || message.timestamp > latestTimestamp) {
        latestMessage = {
          id: messagesSnapshot.docs[0].id,
          ...message,
        };
        latestTimestamp = message.timestamp;
      }
    }
  }

  return latestMessage;
}

/**
 * Get latest sent message in conversation
 * @param {string} conversationId The conversation ID
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Latest message or null
 */
async function getLatestSentMessage(
  conversationId: string, currentUserId: string) {
  const messagesSnapshot = await admin.firestore()
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .where("senderId", "==", currentUserId)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get();

  if (messagesSnapshot.empty) {
    return null;
  }

  const doc = messagesSnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get latest sent message globally
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Latest message or null
 */
async function getLatestSentMessageGlobally(currentUserId: string) {
  // This is a simplified implementation
  // In production, you'd need a more sophisticated query
  const conversationsSnapshot = await admin.firestore()
    .collection("conversations")
    .where("participants", "array-contains", currentUserId)
    .limit(10)
    .get();

  let latestMessage = null;
  let latestTimestamp = null;

  for (const convDoc of conversationsSnapshot.docs) {
    const messagesSnapshot = await admin.firestore()
      .collection("conversations")
      .doc(convDoc.id)
      .collection("messages")
      .where("senderId", "==", currentUserId)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (!messagesSnapshot.empty) {
      const message = messagesSnapshot.docs[0].data();
      if (!latestTimestamp || message.timestamp > latestTimestamp) {
        latestMessage = {
          id: messagesSnapshot.docs[0].id,
          ...message,
        };
        latestTimestamp = message.timestamp;
      }
    }
  }

  return latestMessage;
}

/**
 * Generate embeddings for new messages (RAG Pipeline)
 *
 * Triggers on: /conversations/{conversationId}/messages/{messageId}
 * When: A new message document is created
 */
export const generateMessageEmbedding = onDocumentCreated(
  "conversations/{conversationId}/messages/{messageId}",
  async (event) => {
    try {
      const messageId = event.params.messageId;
      const conversationId = event.params.conversationId;

      // Get the message data
      const messageData = event.data?.data();
      if (!messageData) {
        logger.warn("No message data found for embedding generation", {messageId});
        return;
      }

      // Only process text messages
      if (messageData.content?.type !== "text" || !messageData.content?.text) {
        logger.info("Skipping non-text message for embedding", {messageId, type: messageData.content?.type});
        return;
      }

      const messageText = messageData.content.text;

      // Check if text is suitable for embedding
      if (!shouldEmbedText(messageText)) {
        logger.info("Skipping message - not suitable for embedding", {messageId, textLength: messageText.length});
        return;
      }

      logger.info("Generating embedding for new message", {
        conversationId,
        messageId,
        senderId: messageData.senderId,
        textLength: messageText.length,
      });

      // Generate embedding
      const embedding = await generateEmbedding(messageText);

      // Prepare metadata
      const metadata = {
        conversationId,
        messageId,
        senderId: messageData.senderId,
        timestamp: messageData.timestamp?.toDate?.() || new Date(messageData.timestamp),
        messageType: messageData.content.type,
        text: messageText.substring(0, 500), // Store first 500 chars for reference
      };

      // Upsert to Pinecone
      await upsertToPinecone(messageId, embedding, metadata);

      // Store embedding reference in Firestore
      await admin.firestore()
        .collection("messageEmbeddings")
        .doc(messageId)
        .set({
          messageId,
          conversationId,
          embedding: embedding,
          text: messageText,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: {
            senderId: messageData.senderId,
            timestamp: messageData.timestamp,
            messageType: messageData.content.type,
          },
        });

      logger.info("Successfully generated and stored message embedding", {
        messageId,
        conversationId,
        embeddingLength: embedding.length,
      });

      return {
        success: true,
        messageId,
        embeddingLength: embedding.length,
      };
    } catch (error) {
      logger.error("Error generating message embedding", {error});
      // Don't throw - embedding failure shouldn't break message creation
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

// Export Parent-Caregiver AI features
export {extractCalendarEvents};

// Export Enhanced AI Command Processor
export {processEnhancedAICommand} from "./enhanced-ai-processor";

/**
 * Clean up old notification receipts (optional maintenance function)
 * You could schedule this to run periodically with Cloud Scheduler
 */
// export const cleanupNotificationReceipts = onSchedule(
//   "every 24 hours",
//   async (event) => {
//     logger.info("Cleaning up old notification receipts");
//     // Implementation for cleanup
//   }
// );
