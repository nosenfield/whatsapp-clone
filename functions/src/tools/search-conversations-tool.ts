/**
 * Search Conversations Tool
 *
 * Searches conversations by semantic content using RAG pipeline.
 * Useful for queries like "Find the conversation about the party" or 
 * "Which chat discussed the meeting?"
 * 
 * This enables users to ask questions about conversations they're NOT currently viewing.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {searchUserConversations} from "../services/rag-helper";

export class SearchConversationsTool extends BaseAITool {
  name = "search_conversations";
  description = "Search for conversations by topic or content. Use when user asks about a conversation they're not currently viewing (e.g., 'Find the chat about the party', 'Which conversation discussed X?')";

  parameters: ToolParameter[] = [
    {
      name: "query",
      type: "string",
      description: "The search query (topic, keywords, or question about conversation content)",
      required: true,
    },
    {
      name: "user_id",
      type: "string",
      description: "The current user ID",
      required: true,
    },
    {
      name: "max_results",
      type: "number",
      description: "Maximum number of conversations to return",
      required: false,
      default: 5,
    },
    {
      name: "min_confidence",
      type: "number",
      description: "Minimum confidence threshold (0.0-1.0)",
      required: false,
      default: 0.3,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        query,
        user_id,
        max_results = 5,
        min_confidence = 0.3,
      } = params;

      logger.info("Searching conversations", {
        query: query.substring(0, 100),
        userId: user_id,
        maxResults: max_results,
      });

      // Use RAG to search for relevant messages
      const relevantMessages = await searchUserConversations(
        query,
        user_id,
        max_results * 3 // Get more messages than needed to find top conversations
      );

      if (relevantMessages.length === 0) {
        return {
          success: false,
          data: {},
          next_action: "complete",
          instruction_for_ai: `No conversations found matching "${query}". Inform user no relevant conversations were found.`,
          confidence: 0,
        };
      }

      // Group messages by conversation and calculate relevance scores
      const conversationScores = new Map<string, {
        conversationId: string;
        messages: any[];
        totalScore: number;
        avgScore: number;
        mostRecentMessage: any;
      }>();

      for (const message of relevantMessages) {
        const convId = message.metadata?.conversationId || message.conversationId;
        if (!convId) continue;

        const score = message.score || 0;
        
        if (score < min_confidence) continue;

        if (!conversationScores.has(convId)) {
          conversationScores.set(convId, {
            conversationId: convId,
            messages: [],
            totalScore: 0,
            avgScore: 0,
            mostRecentMessage: null,
          });
        }

        const convData = conversationScores.get(convId)!;
        convData.messages.push(message);
        convData.totalScore += score;
        
        // Track most recent message
        if (!convData.mostRecentMessage || 
            message.timestamp > convData.mostRecentMessage.timestamp) {
          convData.mostRecentMessage = message;
        }
      }

      // Calculate average scores and sort by relevance
      const rankedConversations = Array.from(conversationScores.values())
        .map(conv => ({
          ...conv,
          avgScore: conv.totalScore / conv.messages.length,
          messageCount: conv.messages.length,
        }))
        .sort((a, b) => {
          // Sort by: 1) message count (more mentions = more relevant)
          //          2) average score (higher relevance)
          const countDiff = b.messageCount - a.messageCount;
          if (countDiff !== 0) return countDiff;
          return b.avgScore - a.avgScore;
        })
        .slice(0, max_results);

      // Get full conversation details for top results
      const conversationDetails = await this.getConversationDetails(
        rankedConversations.map(c => c.conversationId),
        user_id
      );

      // Merge relevance data with conversation details
      const results = rankedConversations
        .map(ranked => {
          const details = conversationDetails.find(d => d.id === ranked.conversationId);
          if (!details) return null;

          return {
            conversation_id: ranked.conversationId,
            title: details.title || this.generateConversationTitle(details, user_id),
            participants: details.participants,
            participant_details: details.participantDetails,
            relevance_score: ranked.avgScore,
            matching_messages_count: ranked.messageCount,
            most_relevant_message: ranked.mostRecentMessage?.content || 
                                   ranked.messages[0]?.content || 
                                   "No preview available",
            last_message_timestamp: details.lastMessage?.timestamp || 
                                   ranked.mostRecentMessage?.timestamp,
          };
        })
        .filter(Boolean);

      // Determine next action based on results
      let next_action: "clarification_needed" | "continue" | "complete";
      let clarification = undefined;

      if (results.length === 0) {
        next_action = "complete";
      } else if (results.length === 1) {
        // Single clear result - continue automatically
        next_action = "continue";
      } else {
        // Multiple results - need clarification
        next_action = "clarification_needed";
        clarification = this.buildClarificationOptions(results, query);
      }

      logger.info("Conversation search completed", {
        resultsFound: results.length,
        nextAction: next_action,
        requiresClarification: !!clarification,
      });

      return {
        success: true,
        data: {
          conversations: results,
          search_query: query,
          result_count: results.length,
        },
        next_action,
        clarification,
        instruction_for_ai: results.length === 1 
          ? `Found conversation "${results[0]?.title}" (ID: ${results[0]?.conversation_id}). Use this conversation_id for analysis.`
          : `Found ${results.length} relevant conversations. User needs to select which one.`,
        confidence: results[0]?.relevance_score || 0,
        metadata: {
          toolName: this.name,
          conversationsFound: results.length,
          searchQuery: query,
        },
      };
    } catch (error) {
      logger.error("Error searching conversations:", error);
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Inform user that conversation search failed.",
        confidence: 0,
      };
    }
  }

  private async getConversationDetails(
    conversationIds: string[],
    userId: string
  ): Promise<any[]> {
    try {
      const conversationDocs = await Promise.all(
        conversationIds.map(id =>
          admin.firestore()
            .collection("conversations")
            .doc(id)
            .get()
        )
      );

      return conversationDocs
        .filter(doc => {
          if (!doc.exists) return false;
          const data = doc.data();
          return data?.participants?.includes(userId);
        })
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
    } catch (error) {
      logger.error("Error getting conversation details:", error);
      return [];
    }
  }

  private generateConversationTitle(conversation: any, currentUserId: string): string {
    // If it's a direct message, use the other participant's name
    if (conversation.type === "direct" && conversation.participantDetails) {
      const otherParticipantId = conversation.participants?.find(
        (p: string) => p !== currentUserId
      );
      if (otherParticipantId) {
        const details = conversation.participantDetails[otherParticipantId];
        return details?.displayName || details?.email || "Unknown";
      }
    }

    // For group chats or if no name found
    return conversation.title || `Chat with ${conversation.participants?.length || 0} people`;
  }

  private buildClarificationOptions(
    conversations: any[],
    query: string
  ): any {
    return {
      type: "select_conversation",
      question: `I found ${conversations.length} conversations about "${query}". Which one would you like to know about?`,
      options: conversations.map((conv, index) => ({
        id: conv.conversation_id,
        title: conv.title,
        subtitle: conv.most_relevant_message.substring(0, 100) + "...",
        confidence: conv.relevance_score,
        metadata: {
          participants: conv.participants,
          matchingMessagesCount: conv.matching_messages_count,
          lastMessageTimestamp: conv.last_message_timestamp,
        },
        display_text: `${index + 1}. ${conv.title} - "${conv.most_relevant_message.substring(0, 50)}..."`,
      })),
      allow_multiple: false,
      metadata: {
        original_query: query,
        tool_name: this.name,
      },
    };
  }
}
