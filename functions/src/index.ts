/**
 * Firebase Cloud Functions
 *
 * Functions for push notifications and other backend logic
 */

import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Expo, ExpoPushMessage, ExpoPushTicket} from "expo-server-sdk";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

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
        // Check if user has push token, notifications enabled, and valid Expo token
        const notificationsEnabled = userData.notificationsEnabled !== false; // Default to true if not set
        if (
          userData.pushToken &&
          Expo.isExpoPushToken(userData.pushToken) &&
          notificationsEnabled
        ) {
          pushTokens.push(userData.pushToken);
          recipientNames[userData.pushToken] = userData.displayName || "User";
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
