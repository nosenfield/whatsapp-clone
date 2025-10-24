/**
 * Get Conversation Info Tool
 *
 * Retrieves detailed information about a conversation including metadata,
 * participant details, and statistics.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class GetConversationInfoTool extends BaseAITool {
  name = "get_conversation_info";
  description = "Get detailed information about a conversation including participants, metadata, message count, and statistics.";

  parameters: ToolParameter[] = [
    {
      name: "conversation_id",
      type: "string",
      description: "The conversation ID to get information for",
      required: true,
    },
    {
      name: "user_id",
      type: "string",
      description: "The current user ID for access verification",
      required: true,
    },
    {
      name: "include_participants",
      type: "boolean",
      description: "Include detailed participant information",
      required: false,
      default: true,
    },
    {
      name: "include_statistics",
      type: "boolean",
      description: "Include conversation statistics",
      required: false,
      default: true,
    },
    {
      name: "include_recent_activity",
      type: "boolean",
      description: "Include recent activity summary",
      required: false,
      default: false,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        conversation_id,
        user_id,
        include_participants = true,
        include_statistics = true,
        include_recent_activity = false,
      } = params;

      logger.info("Getting conversation info", {
        conversationId: conversation_id,
        userId: user_id,
        includeParticipants: include_participants,
        includeStatistics: include_statistics,
        includeRecentActivity: include_recent_activity,
      });

      // Step 1: Verify conversation access
      const accessCheck = await this.verifyConversationAccess(conversation_id, user_id);
      if (!accessCheck.hasAccess) {
        return {
          success: false,
          error: accessCheck.error || "Access denied",
          confidence: 0,
        };
      }

      // Step 2: Get conversation data
      const conversationDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversation_id)
        .get();

      if (!conversationDoc.exists) {
        return {
          success: false,
          error: "Conversation not found",
          confidence: 0,
        };
      }

      const conversationData = conversationDoc.data();
      const participants = conversationData?.participants || [];

      // Step 3: Build base conversation info
      const conversationInfo: any = {
        id: conversation_id,
        type: conversationData?.type || "direct",
        name: conversationData?.name || null,
        created_date: this.formatTimestamp(conversationData?.createdAt),
        last_message_at: this.formatTimestamp(conversationData?.lastMessageAt),
        updated_at: this.formatTimestamp(conversationData?.updatedAt),
        participant_count: participants.length,
        is_group: conversationData?.type === "group",
      };

      // Step 4: Add participant details if requested
      if (include_participants) {
        conversationInfo.participants = await this.getParticipantDetails(participants);
        conversationInfo.other_participants = this.getOtherParticipants(conversationInfo.participants, user_id);
      }

      // Step 5: Add statistics if requested
      if (include_statistics) {
        conversationInfo.statistics = await this.getConversationStatistics(conversation_id, participants);
      }

      // Step 6: Add recent activity if requested
      if (include_recent_activity) {
        conversationInfo.recent_activity = await this.getRecentActivity(conversation_id);
      }

      // Step 7: Add user-specific information
      conversationInfo.user_context = {
        unread_count: conversationData?.unreadCount?.[user_id] || 0,
        is_participant: participants.includes(user_id),
        joined_at: this.formatTimestamp(conversationData?.createdAt), // Simplified - would need proper tracking
      };

      return {
        success: true,
        data: conversationInfo,
        confidence: 0.95,
        metadata: {
          includeParticipants: include_participants,
          includeStatistics: include_statistics,
          includeRecentActivity: include_recent_activity,
          participantCount: participants.length,
        },
      };
    } catch (error) {
      logger.error("Error getting conversation info:", error);
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
      lastActive: this.formatTimestamp(doc.data().lastActive),
    }));
  }

  private getOtherParticipants(participants: any[], userId: string): any[] {
    return participants.filter((p) => p.id !== userId);
  }

  private async getConversationStatistics(conversationId: string, participants: string[]): Promise<any> {
    try {
      // Get message count
      const messagesSnapshot = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .get();

      const totalMessages = messagesSnapshot.size;

      // Get message counts by sender
      const messageCountsBySender: Record<string, number> = {};
      const messageTypes: Record<string, number> = {};
      const dailyActivity: Record<string, number> = {};

      messagesSnapshot.docs.forEach((doc) => {
        const messageData = doc.data();
        const senderId = messageData.senderId;
        const messageType = messageData.content?.type || "text";
        const timestamp = messageData.timestamp;

        // Count by sender
        messageCountsBySender[senderId] = (messageCountsBySender[senderId] || 0) + 1;

        // Count by type
        messageTypes[messageType] = (messageTypes[messageType] || 0) + 1;

        // Count daily activity
        if (timestamp) {
          const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
          const dateKey = date.toISOString().split("T")[0];
          dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
        }
      });

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMessagesSnapshot = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .get();

      const recentMessageCount = recentMessagesSnapshot.size;

      return {
        total_messages: totalMessages,
        recent_messages: recentMessageCount,
        message_counts_by_sender: messageCountsBySender,
        message_types: messageTypes,
        daily_activity: dailyActivity,
        average_messages_per_day: totalMessages > 0 ? Math.round(totalMessages / Math.max(Object.keys(dailyActivity).length, 1)) : 0,
        most_active_sender: this.getMostActiveSender(messageCountsBySender),
        most_common_message_type: this.getMostCommonMessageType(messageTypes),
      };
    } catch (error) {
      logger.error("Error getting conversation statistics:", error);
      return {
        total_messages: 0,
        recent_messages: 0,
        message_counts_by_sender: {},
        message_types: {},
        daily_activity: {},
        average_messages_per_day: 0,
        most_active_sender: null,
        most_common_message_type: "text",
      };
    }
  }

  private getMostActiveSender(messageCountsBySender: Record<string, number>): string | null {
    let maxCount = 0;
    let mostActiveSender = null;

    for (const [senderId, count] of Object.entries(messageCountsBySender)) {
      if (count > maxCount) {
        maxCount = count;
        mostActiveSender = senderId;
      }
    }

    return mostActiveSender;
  }

  private getMostCommonMessageType(messageTypes: Record<string, number>): string {
    let maxCount = 0;
    let mostCommonType = "text";

    for (const [type, count] of Object.entries(messageTypes)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonType = type;
      }
    }

    return mostCommonType;
  }

  private async getRecentActivity(conversationId: string): Promise<any> {
    try {
      // Get last 10 messages for activity summary
      const recentMessagesSnapshot = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      const recentMessages = recentMessagesSnapshot.docs.map((doc) => ({
        id: doc.id,
        senderId: doc.data().senderId,
        content: doc.data().content?.text || "",
        type: doc.data().content?.type || "text",
        timestamp: this.formatTimestamp(doc.data().timestamp),
      }));

      // Get participant activity summary
      const participantActivity: Record<string, number> = {};
      recentMessages.forEach((message) => {
        participantActivity[message.senderId] = (participantActivity[message.senderId] || 0) + 1;
      });

      return {
        recent_messages: recentMessages,
        participant_activity: participantActivity,
        last_activity: recentMessages.length > 0 ? recentMessages[0].timestamp : null,
        activity_summary: this.generateActivitySummary(participantActivity),
      };
    } catch (error) {
      logger.error("Error getting recent activity:", error);
      return {
        recent_messages: [],
        participant_activity: {},
        last_activity: null,
        activity_summary: "No recent activity",
      };
    }
  }

  private generateActivitySummary(participantActivity: Record<string, number>): string {
    const totalMessages = Object.values(participantActivity).reduce((sum, count) => sum + count, 0);

    if (totalMessages === 0) {
      return "No recent activity";
    }

    const activeParticipants = Object.keys(participantActivity).length;
    const mostActive = Object.entries(participantActivity)
      .sort(([, a], [, b]) => b - a)[0];

    if (activeParticipants === 1) {
      return `Only ${mostActive[0]} has been active recently`;
    } else if (activeParticipants === 2) {
      return "Two participants have been active recently";
    } else {
      return `${activeParticipants} participants have been active recently`;
    }
  }
}
