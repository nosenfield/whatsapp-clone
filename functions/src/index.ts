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
import OpenAI from "openai";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

// Initialize OpenAI client (only if API key is available)
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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
}

// OpenAI Tool Definitions
const openaiTools = [
  {
    type: "function" as const,
    function: {
      name: "createConversation",
      description: "Start a new conversation with a specific contact",
      parameters: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the contact to start a conversation with",
          },
        },
        required: ["contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findOrCreateConversation",
      description: "Open an existing conversation with a contact, or create one if it doesn't exist",
      parameters: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the contact to find or create a conversation with",
          },
        },
        required: ["contactName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sendMessageToContact",
      description: "Send a message to a specific contact",
      parameters: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the contact to send a message to",
          },
          messageText: {
            type: "string",
            description: "The message text to send",
          },
        },
        required: ["contactName", "messageText"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeCurrentConversation",
      description: "Summarize the current conversation",
      parameters: {
        type: "object",
        properties: {
          timeFilter: {
            type: "string",
            enum: ["1day", "1week", "1month", "all"],
            description: "Time period to summarize (1day, 1week, 1month, or all)",
          },
        },
        required: ["timeFilter"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeConversation",
      description: "Summarize a conversation with a specific contact",
      parameters: {
        type: "object",
        properties: {
          contactName: {
            type: "string",
            description: "The name of the contact whose conversation to summarize",
          },
          timeFilter: {
            type: "string",
            enum: ["1day", "1week", "1month", "all"],
            description: "Time period to summarize (1day, 1week, 1month, or all)",
          },
        },
        required: ["contactName", "timeFilter"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeLatestReceivedMessage",
      description: "Summarize the most recent message received by the user",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarizeLatestSentMessage",
      description: "Summarize the most recent message sent by the user",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

/**
 * Process AI commands using OpenAI GPT-4
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

      // Parse command intent using OpenAI
      const parsedCommand = await parseCommandWithOpenAI(command, appContext);

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
 * Parse command using OpenAI GPT-4 with function calling
 * @param {string} command The natural language command to parse
 * @param {AppContext} appContext Optional app context for parsing
 * @return {Promise<Object>} Parsed command with intent and parameters
 */
async function parseCommandWithOpenAI(
  command: string, appContext?: AppContext) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      logger.warn("OpenAI not initialized - missing API key");
      return {
        success: false,
        error: "AI service not configured. Please set OPENAI_API_KEY environment variable.",
      };
    }

    // Build context-aware system message
    const systemMessage = `You are an AI assistant for a WhatsApp-like messaging app. 
You can help users with conversation management and message summarization.

Current context:
- Screen: ${appContext?.currentScreen || "unknown"}
- Current conversation: ${appContext?.currentConversationId || "none"}
- User ID: ${appContext?.currentUserId || "unknown"}

Available functions:
- createConversation: Start a new conversation with a contact
- findOrCreateConversation: Open existing conversation or create new one
- sendMessageToContact: Send a message to a specific contact
- summarizeCurrentConversation: Summarize the current conversation
- summarizeConversation: Summarize conversation with a specific contact
- summarizeLatestReceivedMessage: Summarize the most recent message received
- summarizeLatestSentMessage: Summarize the most recent message sent

Parse the user's command and call the appropriate function with the correct parameters.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: systemMessage},
        {role: "user", content: command},
      ],
      tools: openaiTools,
      tool_choice: "auto",
      temperature: 0.1,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      return {
        success: false,
        error: "No response from OpenAI",
      };
    }

    // Check if OpenAI wants to call a function
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === "function") {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        return {
          success: true,
          intent: {
            action: functionName,
            parameters: functionArgs,
            confidence: 0.95,
          },
        };
      }
    }

    // If no function call, return a helpful response
    return {
      success: true,
      intent: {
        action: "no_action",
        parameters: {},
        confidence: 0.8,
        response: message.content || "I understand your request but couldn't determine a specific action to take.",
      },
    };
  } catch (error) {
    logger.error("Error parsing command with OpenAI", {error});
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
      timestamp: new Date(),
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

/**
 * Generate response text for the user
 * @param {Object} toolResult The tool execution result
 * @param {Object} intent The parsed command intent
 * @return {Promise<string>} Generated response text
 */
async function generateResponse(toolResult: any, intent: any): Promise<string> {
  if (!toolResult.success) {
    return toolResult.error || "Sorry, I couldn't complete that request.";
  }

  switch (intent.action) {
  case "createConversation":
  case "findOrCreateConversation":
    return `I've opened your conversation${toolResult.wasCreated ? " (created new)" : ""}.`;

  case "sendMessageToContact":
    return `I've sent your message to ${intent.parameters.contactName}.`;

  case "summarizeCurrentConversation":
  case "summarizeConversation":
    return `Here's a summary of your conversation (${toolResult.messageCount} messages): ${toolResult.summary}`;

  case "summarizeLatestReceivedMessage":
  case "summarizeLatestSentMessage":
    return `Here's a summary of that message: ${toolResult.summary}`;

  default:
    return "Command completed successfully.";
  }
}

/**
 * Log AI command for audit purposes
 * @param {Object} data Command data to log
 * @return {Promise<void>}
 */
async function logAICommand(data: any) {
  try {
    await admin.firestore().collection("aiCommands").add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error("Error logging AI command", {error});
    // Don't throw - logging failure shouldn't break the command
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
  const usersSnapshot = await admin.firestore()
    .collection("users")
    .where("displayName", "==", contactName)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return null;
  }

  const userDoc = usersSnapshot.docs[0];
  return {
    id: userDoc.id,
    ...userDoc.data(),
  };
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
  const messageRef = await admin.firestore()
    .collection("conversations")
    .doc(messageData.conversationId)
    .collection("messages")
    .add({
      ...messageData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
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

  // Use OpenAI to generate a sophisticated summary
  const messageTexts = messages
    .filter((msg) => (msg as any).content?.type === "text")
    .map((msg) => (msg as any).content?.text || "")
    .join("\n");

  try {
    // Check if OpenAI is available
    if (!openai) {
      logger.warn("OpenAI not initialized - falling back to simple summary");
      const summary = messageTexts.length > 200 ?
        messageTexts.substring(0, 197) + "..." :
        messageTexts;
      return {
        text: `Conversation summary: ${summary}`,
        messageCount: messages.length,
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes conversations. Provide a concise, informative summary of the key points discussed.",
        },
        {
          role: "user",
          content: `Please summarize this conversation:\n\n${messageTexts}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const summary = response.choices[0]?.message?.content || "Unable to generate summary.";
    return {
      text: summary,
      messageCount: messages.length,
    };
  } catch (error) {
    logger.error("Error generating conversation summary with OpenAI", {error});
    // Fallback to simple truncation
    const summary = messageTexts.length > 200 ?
      messageTexts.substring(0, 197) + "..." :
      messageTexts;
    return {
      text: `Conversation summary: ${summary}`,
      messageCount: messages.length,
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
    // Check if OpenAI is available
    if (!openai) {
      logger.warn("OpenAI not initialized - falling back to simple summary");
      const summary = messageText.length > 100 ?
        messageText.substring(0, 97) + "..." :
        messageText;
      return {
        text: `Message summary: ${summary}`,
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes messages. Provide a concise summary of the key points in the message.",
        },
        {
          role: "user",
          content: `Please summarize this message:\n\n${messageText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content || "Unable to generate summary.";
    return {
      text: summary,
    };
  } catch (error) {
    logger.error("Error generating message summary with OpenAI", {error});
    // Fallback to simple truncation
    const summary = messageText.length > 100 ?
      messageText.substring(0, 97) + "..." :
      messageText;
    return {
      text: `Message summary: ${summary}`,
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
