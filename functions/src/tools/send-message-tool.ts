/**
 * Send Message Tool
 *
 * Sends a message to a conversation with automatic conversation resolution.
 * Supports text, image, and file messages with delivery tracking.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class SendMessageTool extends BaseAITool {
  name = "send_message";
  description = "Send a message to a conversation. Automatically resolves conversation if needed and supports text, image, and file messages.";

  parameters: ToolParameter[] = [
    {
      name: "conversation_id",
      type: "string",
      description: "The conversation ID to send the message to",
      required: false,
    },
    {
      name: "content",
      type: "string",
      description: "The message content/text",
      required: true,
    },
    {
      name: "sender_id",
      type: "string",
      description: "The sender user ID",
      required: true,
    },
    {
      name: "message_type",
      type: "string",
      description: "Type of message (text, image, file)",
      required: false,
      default: "text",
    },
    {
      name: "media_url",
      type: "string",
      description: "URL for media content (images, files)",
      required: false,
    },
    {
      name: "caption",
      type: "string",
      description: "Caption for media messages",
      required: false,
    },
    {
      name: "recipient_id",
      type: "string",
      description: "Recipient user ID (for direct messages)",
      required: false,
    },
    {
      name: "create_conversation_if_missing",
      type: "boolean",
      description: "Create conversation if it does not exist",
      required: false,
      default: true,
    },
    {
      name: "priority",
      type: "string",
      description: "Message priority (normal, high, urgent)",
      required: false,
      default: "normal",
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        conversation_id,
        content,
        sender_id,
        message_type = "text",
        media_url,
        caption,
        recipient_id,
        create_conversation_if_missing = true,
        priority = "normal",
      } = params;

      logger.info("Sending message", {
        conversationId: conversation_id,
        senderId: sender_id,
        messageType: message_type,
        hasMedia: !!media_url,
        recipientId: recipient_id,
        createIfMissing: create_conversation_if_missing,
      });

      // Step 1: Resolve conversation
      let conversationId = conversation_id;

      if (!conversationId && recipient_id) {
        // Find or create conversation with recipient
        const conversation = await this.findConversationBetweenUsers(sender_id, recipient_id);

        if (!conversation && create_conversation_if_missing) {
          const newConversation = await this.createConversation([sender_id, recipient_id]);
          conversationId = newConversation.id;
          logger.info("Created new conversation for message", {conversationId});
        } else if (conversation) {
          conversationId = conversation.id;
        } else {
          return {
            success: false,
            error: "Conversation not found and creation not allowed",
            confidence: 0,
          };
        }
      }

      if (!conversationId) {
        return {
          success: false,
          error: "No conversation ID provided and no recipient specified",
          confidence: 0,
        };
      }

      // Step 2: Verify conversation access
      const accessCheck = await this.verifyConversationAccess(conversationId, sender_id);
      if (!accessCheck.hasAccess) {
        return {
          success: false,
          error: accessCheck.error || "Access denied",
          confidence: 0,
        };
      }

      // Step 3: Prepare message data
      const messageData = {
        conversationId: conversationId,
        senderId: sender_id,
        content: {
          type: message_type,
          text: content,
          caption: caption || null,
          mediaUrl: media_url || null,
        },
        priority: priority,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: "sending",
        deliveredTo: [],
        readBy: {},
      };

      // Step 4: Send the message
      const message = await this.sendMessage(messageData);

      // Step 5: Update conversation metadata
      await this.updateConversationMetadata(conversationId, message);

      // Step 6: Get message status
      const messageStatus = await this.getMessageStatus(message.id, conversationId);

      const result = {
        message_id: message.id,
        conversation_id: conversationId,
        status: messageStatus.status,
        timestamp: this.formatTimestamp(message.timestamp),
        content: {
          type: message_type,
          text: content,
          caption: caption,
          media_url: media_url,
        },
        delivery_info: {
          delivered_to: messageStatus.deliveredTo || [],
          read_by: messageStatus.readBy || {},
          delivery_count: (messageStatus.deliveredTo || []).length,
          read_count: Object.keys(messageStatus.readBy || {}).length,
        },
      };

      return {
        success: true,
        data: result,
        confidence: 0.95,
        metadata: {
          messageType: message_type,
          hasMedia: !!media_url,
          conversationCreated: !conversation_id && !!recipient_id,
          priority: priority,
        },
      };
    } catch (error) {
      logger.error("Error sending message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      };
    }
  }

  private async verifyConversationAccess(conversationId: string, userId: string): Promise<{ hasAccess: boolean; error?: string }> {
    try {
      const conversationDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        return {hasAccess: false, error: "Conversation not found"};
      }

      const conversationData = conversationDoc.data();
      const participants = conversationData?.participants || [];

      if (!participants.includes(userId)) {
        return {hasAccess: false, error: "Access denied"};
      }

      return {hasAccess: true};
    } catch (error) {
      logger.error("Error verifying conversation access:", error);
      return {hasAccess: false, error: "Error verifying access"};
    }
  }

  protected async sendMessage(messageData: any): Promise<any> {
    const timestamp = admin.firestore.Timestamp.fromDate(new Date());

    // Create message document
    const messageRef = await admin.firestore()
      .collection("conversations")
      .doc(messageData.conversationId)
      .collection("messages")
      .add({
        ...messageData,
        timestamp,
        status: "sent",
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
      timestamp,
    };
  }

  private async updateConversationMetadata(conversationId: string, message: any): Promise<void> {
    try {
      // Get conversation participants
      const conversationDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) return;

      const conversationData = conversationDoc.data();
      const participants = conversationData?.participants || [];

      // Update unread counts for all participants except sender
      const unreadCounts: Record<string, number> = {};
      for (const participantId of participants) {
        if (participantId !== message.senderId) {
          unreadCounts[participantId] = (conversationData?.unreadCount?.[participantId] || 0) + 1;
        }
      }

      // Update conversation with unread counts
      await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .update({
          unreadCount: unreadCounts,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      logger.error("Error updating conversation metadata:", error);
    }
  }

  private async getMessageStatus(messageId: string, conversationId: string): Promise<any> {
    try {
      const messageDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc(messageId)
        .get();

      if (!messageDoc.exists) {
        return {status: "failed", deliveredTo: [], readBy: {}};
      }

      const messageData = messageDoc.data();
      return {
        status: messageData?.status || "sent",
        deliveredTo: messageData?.deliveredTo || [],
        readBy: messageData?.readBy || {},
      };
    } catch (error) {
      logger.error("Error getting message status:", error);
      return {status: "unknown", deliveredTo: [], readBy: {}};
    }
  }
}
