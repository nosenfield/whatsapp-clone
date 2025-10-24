/**
 * Database Helper Functions
 * 
 * Helper functions for database operations used by AI commands
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

/**
 * Find contact by display name
 * @param {string} contactName The contact display name
 * @param {string} currentUserId The current user ID
 * @return {Promise<Object|null>} Contact data or null
 */
export async function findContactByName(contactName: string, currentUserId: string) {
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
export async function findConversation(userId1: string, userId2: string) {
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
export async function createConversation(participants: string[]) {
  const conversationData: any = {
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
export async function sendMessage(messageData: any) {
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
export async function summarizeConversationMessages(
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
export async function summarizeMessage(messageText: string) {
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
export async function getLatestReceivedMessage(
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
export async function getLatestReceivedMessageGlobally(currentUserId: string) {
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
export async function getLatestSentMessage(
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
export async function getLatestSentMessageGlobally(currentUserId: string) {
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
