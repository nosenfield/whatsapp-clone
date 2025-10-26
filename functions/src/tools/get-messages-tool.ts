/**
 * Get Messages Tool
 *
 * Retrieves messages from a conversation with flexible filtering and pagination.
 * Supports before/after cursor-based pagination and content filtering.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class GetMessagesTool extends BaseAITool {
  name = "get_messages";
  description = "Get messages from a conversation with pagination, filtering, and sorting. Supports cursor-based pagination and content search.";

  parameters: ToolParameter[] = [
    {
      name: "conversation_id",
      type: "string",
      description: "The conversation ID to get messages from",
      required: true,
    },
    {
      name: "limit",
      type: "number",
      description: "Maximum number of messages to return",
      required: false,
      default: 50,
    },
    {
      name: "before_id",
      type: "string",
      description: "Get messages before this message ID (for pagination)",
      required: false,
    },
    {
      name: "after_id",
      type: "string",
      description: "Get messages after this message ID (for pagination)",
      required: false,
    },
    {
      name: "sender_id",
      type: "string",
      description: "Filter messages by sender ID",
      required: false,
    },
    {
      name: "message_type",
      type: "string",
      description: "Filter by message type (text, image, file)",
      required: false,
    },
    {
      name: "date_from",
      type: "string",
      description: "Filter messages from this date (ISO string)",
      required: false,
    },
    {
      name: "date_to",
      type: "string",
      description: "Filter messages to this date (ISO string)",
      required: false,
    },
    {
      name: "search_text",
      type: "string",
      description: "Search for messages containing this text",
      required: false,
    },
    {
      name: "include_metadata",
      type: "boolean",
      description: "Include message metadata (read status, delivery status)",
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        conversation_id,
        limit = 50,
        before_id,
        after_id,
        sender_id,
        message_type,
        date_from,
        date_to,
        search_text,
        include_metadata = true,
      } = params;

      logger.info("Getting messages", {
        conversationId: conversation_id,
        limit,
        beforeId: before_id,
        afterId: after_id,
        senderId: sender_id,
        messageType: message_type,
        searchText: search_text,
      });

      // Verify conversation exists and user has access
      const conversationAccess = await this.verifyConversationAccess(conversation_id, context.currentUserId);
      if (!conversationAccess.hasAccess) {
        return {
          success: false,
          error: conversationAccess.error || "Access denied",
          confidence: 0,
        };
      }

      // Build query
      let query = admin.firestore()
        .collection("conversations")
        .doc(conversation_id)
        .collection("messages")
        .orderBy("timestamp", "desc");

      // Apply filters
      if (sender_id) {
        query = query.where("senderId", "==", sender_id);
      }

      if (message_type) {
        query = query.where("content.type", "==", message_type);
      }

      if (date_from) {
        const fromDate = new Date(date_from);
        query = query.where("timestamp", ">=", admin.firestore.Timestamp.fromDate(fromDate));
      }

      if (date_to) {
        const toDate = new Date(date_to);
        query = query.where("timestamp", "<=", admin.firestore.Timestamp.fromDate(toDate));
      }

      // Apply pagination
      if (before_id) {
        const beforeDoc = await admin.firestore()
          .collection("conversations")
          .doc(conversation_id)
          .collection("messages")
          .doc(before_id)
          .get();

        if (beforeDoc.exists) {
          query = query.endBefore(beforeDoc);
        }
      }

      if (after_id) {
        const afterDoc = await admin.firestore()
          .collection("conversations")
          .doc(conversation_id)
          .collection("messages")
          .doc(after_id)
          .get();

        if (afterDoc.exists) {
          query = query.startAfter(afterDoc);
        }
      }

      // Apply limit
      query = query.limit(limit);

      const messagesSnapshot = await query.get();
      const messages = [];

      for (const doc of messagesSnapshot.docs) {
        const messageData = doc.data();

        // Apply text search filter if specified
        if (search_text && !this.matchesSearchText(messageData, search_text)) {
          continue;
        }

        const message: any = await this.buildMessageObject(doc.id, messageData, include_metadata);
        messages.push(message);
      }

      // Sort messages chronologically (oldest first)
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const result = {
        messages: messages,
        conversation_id: conversation_id,
        total_returned: messages.length,
        has_more: messages.length === limit,
        pagination: {
          before_id: before_id || null,
          after_id: after_id || null,
          limit: limit,
        },
        filters_applied: {
          sender_id: sender_id || null,
          message_type: message_type || null,
          date_from: date_from || null,
          date_to: date_to || null,
          search_text: search_text || null,
        } as Record<string, any>,
      };

      return {
        success: true,
        data: result,
        confidence: 0.95,
        metadata: {
          messagesReturned: messages.length,
          includeMetadata: include_metadata,
          filtersApplied: Object.keys(result.filters_applied).filter((key) => result.filters_applied[key] !== null),
        },
      };
    } catch (error) {
      logger.error("Error getting messages:", error);
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

  private matchesSearchText(messageData: any, searchText: string): boolean {
    if (!searchText) return true;

    const normalizedSearch = searchText.toLowerCase();

    // Search in message content
    if (messageData.content?.text) {
      if (messageData.content.text.toLowerCase().includes(normalizedSearch)) {
        return true;
      }
    }

    // Search in captions for media messages
    if (messageData.content?.caption) {
      if (messageData.content.caption.toLowerCase().includes(normalizedSearch)) {
        return true;
      }
    }

    return false;
  }

  private async buildMessageObject(messageId: string, messageData: any, includeMetadata: boolean): Promise<any> {
    const message: any = {
      id: messageId,
      sender_id: messageData.senderId,
      sender_name: await this.getSenderName(messageData.senderId),
      content: {
        type: messageData.content?.type || "text",
        text: messageData.content?.text || "",
        caption: messageData.content?.caption || null,
        media_url: messageData.content?.mediaUrl || null,
      },
      timestamp: this.formatTimestamp(messageData.timestamp),
      status: messageData.status || "sent",
    };

    // Add metadata if requested
    if (includeMetadata) {
      message.metadata = {
        read_by: messageData.readBy || {},
        delivered_to: messageData.deliveredTo || [],
        read_count: Object.keys(messageData.readBy || {}).length,
        delivery_count: (messageData.deliveredTo || []).length,
      };
    }

    return message;
  }

  private async getSenderName(senderId: string): Promise<string> {
    try {
      const userDoc = await admin.firestore().collection("users").doc(senderId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData?.displayName || userData?.email || "Unknown";
      }
    } catch (error) {
      logger.warn("Error getting sender name:", error);
    }
    return "Unknown";
  }
}
