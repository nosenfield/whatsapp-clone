/**
 * Get Conversations Tool
 *
 * Retrieves conversations for a user with pagination and preview information.
 * Supports filtering and sorting options.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class GetConversationsTool extends BaseAITool {
  name = "get_conversations";
  description = "Get conversations for a user with pagination, previews, and metadata. Supports filtering by type, date range, and unread status.";

  parameters: ToolParameter[] = [
    {
      name: "user_id",
      type: "string",
      description: "The user ID to get conversations for",
      required: true,
    },
    {
      name: "limit",
      type: "number",
      description: "Maximum number of conversations to return",
      required: false,
      default: 10,
    },
    {
      name: "include_preview",
      type: "boolean",
      description: "Whether to include last message preview",
      required: false,
      default: true,
    },
    {
      name: "conversation_type",
      type: "string",
      description: "Filter by conversation type (direct, group, or all)",
      required: false,
      default: "all",
    },
    {
      name: "unread_only",
      type: "boolean",
      description: "Only return conversations with unread messages",
      required: false,
      default: false,
    },
    {
      name: "sort_by",
      type: "string",
      description: "Sort conversations by (last_message, created, updated)",
      required: false,
      default: "last_message",
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        user_id,
        limit = 10,
        include_preview = true,
        conversation_type = "all",
        unread_only = false,
        sort_by = "last_message",
      } = params;

      logger.info("Getting conversations", {
        userId: user_id,
        limit,
        includePreview: include_preview,
        conversationType: conversation_type,
        unreadOnly: unread_only,
        sortBy: sort_by,
      });

      // Build query
      let query = admin.firestore()
        .collection("conversations")
        .where("participants", "array-contains", user_id);

      // Apply type filter
      if (conversation_type !== "all") {
        query = query.where("type", "==", conversation_type);
      }

      // Apply sorting
      switch (sort_by) {
      case "last_message":
        query = query.orderBy("lastMessageAt", "desc");
        break;
      case "created":
        query = query.orderBy("createdAt", "desc");
        break;
      case "updated":
        query = query.orderBy("updatedAt", "desc");
        break;
      default:
        query = query.orderBy("lastMessageAt", "desc");
      }

      // Apply limit
      query = query.limit(limit);

      const conversationsSnapshot = await query.get();
      const conversations = [];

      for (const doc of conversationsSnapshot.docs) {
        const conversationData = doc.data();

        // Skip if unread_only is true and no unread messages
        if (unread_only && !this.hasUnreadMessages(conversationData, user_id)) {
          continue;
        }

        const conversation: any = await this.buildConversationObject(doc.id, conversationData, user_id, include_preview);
        conversations.push(conversation);
      }

      // Sort by unread count if unread_only is true
      if (unread_only) {
        conversations.sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0));
      }

      const result = {
        conversations: conversations,
        total_count: conversations.length,
        has_more: conversations.length === limit,
        user_id: user_id,
        filters_applied: {
          conversation_type,
          unread_only,
          sort_by,
        },
      };

      // Provide clear next action instruction for AI
      let instruction_for_ai = "";
      let next_action: "continue" | "complete" = "complete";
      
      if (conversations.length === 0) {
        instruction_for_ai = "No conversations found. Inform the user.";
        next_action = "complete";
      } else if (conversations.length === 1) {
        instruction_for_ai = `Use conversation_id "${conversations[0].conversation_id}" for the next tool call (e.g., summarize_conversation, get_messages).`;
        next_action = "continue";
      } else {
        instruction_for_ai = `Found ${conversations.length} conversations. If user wants to summarize the most recent, use conversation_id "${conversations[0].conversation_id}". Otherwise, present the list to the user.`;
        next_action = "continue";
      }

      return {
        success: true,
        data: result,
        next_action,
        instruction_for_ai,
        confidence: 0.95,
        metadata: {
          conversationsReturned: conversations.length,
          includePreview: include_preview,
          filtersApplied: result.filters_applied,
        },
      };
    } catch (error) {
      logger.error("Error getting conversations:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      };
    }
  }

  private hasUnreadMessages(conversationData: any, userId: string): boolean {
    const unreadCount = conversationData.unreadCount?.[userId] || 0;
    return unreadCount > 0;
  }

  private async buildConversationObject(
    conversationId: string,
    conversationData: any,
    userId: string,
    includePreview: boolean
  ): Promise<any> {
    const conversation: any = {
      id: conversationId,
      type: conversationData.type,
      participants: conversationData.participants || [],
      name: conversationData.name,
      created_date: this.formatTimestamp(conversationData.createdAt),
      last_message_at: this.formatTimestamp(conversationData.lastMessageAt),
      unread_count: conversationData.unreadCount?.[userId] || 0,
    };

    // Get participant details
    if (conversationData.participants) {
      const participantDetails = await this.getParticipantDetails(conversationData.participants);
      conversation.participants = participantDetails;
    }

    // Add last message preview if requested
    if (includePreview && conversationData.lastMessage) {
      conversation.last_message_preview = {
        text: this.truncateText(conversationData.lastMessage.text || "", 100),
        sender_id: conversationData.lastMessage.senderId,
        sender_name: await this.getSenderName(conversationData.lastMessage.senderId, conversationData.participants),
        timestamp: this.formatTimestamp(conversationData.lastMessage.timestamp),
      };
    }

    // Add conversation metadata
    conversation.message_count = await this.getMessageCount(conversationId);
    conversation.is_group = conversationData.type === "group";
    conversation.other_participants = this.getOtherParticipants(conversation.participants, userId);

    return conversation;
  }

  private async getParticipantDetails(participantIds: string[]): Promise<any[]> {
    if (participantIds.length === 0) return [];

    const participantsSnapshot = await admin.firestore()
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", participantIds)
      .get();

    return participantsSnapshot.docs.map((doc) => ({
      id: doc.id,
      displayName: doc.data().displayName,
      email: doc.data().email,
      photoURL: doc.data().photoURL,
    }));
  }

  private async getSenderName(senderId: string, participants: string[]): Promise<string> {
    // Try to get sender name from participants first
    const participantDetails = await this.getParticipantDetails([senderId]);
    if (participantDetails.length > 0) {
      return participantDetails[0].displayName || participantDetails[0].email || "Unknown";
    }

    // Fallback to direct user lookup
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

  private async getMessageCount(conversationId: string): Promise<number> {
    try {
      const messagesSnapshot = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .get();

      return messagesSnapshot.size;
    } catch (error) {
      logger.warn("Error getting message count:", error);
      return 0;
    }
  }

  private getOtherParticipants(participants: any[], userId: string): any[] {
    return participants.filter((p) => p.id !== userId);
  }
}
