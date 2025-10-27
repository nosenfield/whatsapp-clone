/**
 * Analyze Conversations Multi Tool
 *
 * Searches across user's recent conversations to extract information
 * when user isn't in a specific conversation.
 * 
 * Use cases:
 * - User on ConversationList asks "Who confirmed?"
 * - User wants to aggregate info across conversations
 * - User doesn't remember which conversation has the info
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {searchUserConversations} from "../services/rag-helper";
import {AnalyzeConversationTool} from "./analyze-conversation-tool";

interface ConversationGroup {
  conversationId: string;
  messages: any[];
  lastActive: number;
  relevanceScore: number;
  title?: string;
  participantDetails?: any;
}

export class AnalyzeConversationsMultiTool extends BaseAITool {
  name = "analyze_conversations_multi";
  description = "Extract information from recent conversations when not in a specific conversation. Searches semantically across multiple conversations to answer questions like 'Who confirmed?', 'What time is the meeting?', 'Who is coming?'";

  parameters: ToolParameter[] = [
    {
      name: "query",
      type: "string",
      description: "The question to answer (e.g., 'Who is coming to the party?', 'What did John say about the budget?')",
      required: true,
    },
    {
      name: "current_user_id",
      type: "string",
      description: "Current user ID",
      required: true,
    },
    {
      name: "max_conversations",
      type: "number",
      description: "Maximum number of conversations to search",
      required: false,
      default: 5,
    },
    {
      name: "time_window_hours",
      type: "number",
      description: "Only analyze conversations with activity in last N hours (0 = no limit)",
      required: false,
      default: 48,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        query,
        current_user_id,
        max_conversations = 5,
        time_window_hours = 48,
      } = params;

      logger.info("🔍 Analyzing multiple conversations for query", {
        query: query.substring(0, 100),
        userId: current_user_id,
        maxConversations: max_conversations,
        timeWindowHours: time_window_hours,
      });

      // Step 1: Use RAG to find relevant messages across all conversations
      const relevantMessages = await searchUserConversations(
        query,
        current_user_id,
        100 // Cast wider net to find messages across multiple conversations
      );

      logger.info("📊 RAG search returned messages", {
        messageCount: relevantMessages.length,
        messages: relevantMessages.map(m => ({
          id: m.id,
          conversationId: m.conversationId || m.metadata?.conversationId,
          relevanceScore: m.relevanceScore || m.score,
          text: m.content?.text?.substring(0, 50),
        })),
      });

      if (relevantMessages.length === 0) {
        logger.warn("⚠️ No messages found from RAG search", {
          query: query.substring(0, 100),
          userId: current_user_id,
        });
        return this.noResultsResponse(query);
      }

      // Step 2: Group by conversation with scoring
      const conversations = this.groupAndScoreConversations(
        relevantMessages,
        time_window_hours
      );

      logger.info("📊 Grouped conversations", {
        conversationCount: conversations.length,
        conversations: conversations.map(c => ({
          conversationId: c.conversationId,
          messageCount: c.messages.length,
          relevanceScore: c.relevanceScore,
          lastActive: c.lastActive,
        })),
      });

      if (conversations.length === 0) {
        logger.warn("⚠️ No conversations after grouping", {
          originalMessageCount: relevantMessages.length,
          timeWindowHours: time_window_hours,
        });
        return this.noResultsResponse(query);
      }

      // Step 3: Get conversation details for top results
      await this.enrichConversationDetails(
        conversations.slice(0, max_conversations),
        current_user_id
      );

      // Step 4: Handle based on result count
      if (conversations.length === 1) {
        // Single clear result - analyze it directly
        return await this.analyzeSingleConversation(
          conversations[0],
          query,
          current_user_id,
          context
        );
      }

      // Step 4.5: Check if query is asking about people (who/everyone)
      // If so, aggregate across all conversations automatically
      const isAggregationQuery = this.shouldAggregateResults(query);
      
      if (isAggregationQuery && conversations.length <= 3) {
        logger.info("🔄 Auto-aggregating results across conversations", {
          query: query.substring(0, 100),
          conversationCount: conversations.length,
        });
        
        return await this.analyzeMultipleConversations(
          conversations.slice(0, max_conversations),
          query,
          current_user_id,
          context
        );
      }

      // Multiple conversations - request clarification
      return this.requestConversationClarification(
        conversations.slice(0, max_conversations),
        query
      );
    } catch (error) {
      logger.error("❌ Error analyzing multiple conversations:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        query: params.query?.substring(0, 100),
        userId: params.current_user_id,
      });
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Inform user that conversation analysis failed. Suggest they try opening a specific conversation first.",
        confidence: 0,
      };
    }
  }

  /**
   * Group messages by conversation and calculate relevance scores
   */
  private groupAndScoreConversations(
    messages: any[],
    timeWindowHours: number
  ): ConversationGroup[] {
    const cutoffTime = timeWindowHours > 0 
      ? Date.now() - (timeWindowHours * 60 * 60 * 1000)
      : 0;

    logger.info("🔧 Grouping conversations", {
      messageCount: messages.length,
      timeWindowHours,
      cutoffTime,
    });

    // Group by conversation
    const groups = new Map<string, ConversationGroup>();

    for (const msg of messages) {
      try {
        const convId = msg.metadata?.conversationId || msg.conversationId;
        if (!convId) {
          logger.warn("⚠️ Message missing conversationId", {messageId: msg.id});
          continue;
        }

        // Get timestamp - handle multiple formats
        let timestamp = 0;
        if (msg.timestamp?.toMillis) {
          timestamp = msg.timestamp.toMillis();
        } else if (msg.timestamp?._seconds) {
          timestamp = msg.timestamp._seconds * 1000;
        } else if (typeof msg.timestamp === 'number') {
          timestamp = msg.timestamp;
        } else if (msg.timestamp) {
          timestamp = new Date(msg.timestamp).getTime();
        }
        
        // Skip if outside time window
        if (timeWindowHours > 0 && timestamp > 0 && timestamp < cutoffTime) {
          logger.info("⏰ Skipping message outside time window", {
            messageId: msg.id,
            timestamp,
            cutoffTime,
            age: (Date.now() - timestamp) / (60 * 60 * 1000),
          });
          continue;
        }

        if (!groups.has(convId)) {
          groups.set(convId, {
            conversationId: convId,
            messages: [],
            lastActive: timestamp,
            relevanceScore: 0,
          });
        }

        const group = groups.get(convId)!;
        group.messages.push(msg);
        group.relevanceScore += msg.relevanceScore || msg.score || 0.5; // RAG similarity score
        group.lastActive = Math.max(group.lastActive, timestamp);
      } catch (error) {
        logger.error("❌ Error processing message in grouping", {
          error: error instanceof Error ? error.message : String(error),
          messageId: msg.id,
        });
      }
    }

    // Sort by combined score (relevance + recency)
    return Array.from(groups.values())
      .sort((a, b) => {
        // Weight: 70% relevance, 30% recency
        const recencyA = a.lastActive / Date.now();
        const recencyB = b.lastActive / Date.now();
        const scoreA = a.relevanceScore * 0.7 + recencyA * 0.3;
        const scoreB = b.relevanceScore * 0.7 + recencyB * 0.3;
        return scoreB - scoreA;
      });
  }

  /**
   * Enrich conversation groups with details from Firestore
   */
  private async enrichConversationDetails(
    conversations: ConversationGroup[],
    userId: string
  ): Promise<void> {
    const conversationIds = conversations.map(c => c.conversationId);
    
    try {
      const conversationDocs = await Promise.all(
        conversationIds.map(id =>
          admin.firestore()
            .collection("conversations")
            .doc(id)
            .get()
        )
      );

      conversationDocs.forEach((doc, index) => {
        if (doc.exists) {
          const data = doc.data();
          const conversation = conversations[index];
          
          // Verify user has access
          if (data?.participants?.includes(userId)) {
            conversation.title = this.generateConversationTitle(data, userId);
            conversation.participantDetails = data.participantDetails;
          }
        }
      });
    } catch (error) {
      logger.error("Error enriching conversation details:", error);
      // Continue with what we have
    }
  }

  /**
   * Generate a display title for the conversation
   */
  private generateConversationTitle(conversation: any, currentUserId: string): string {
    // Use explicit name/title if available
    if (conversation.name) return conversation.name;
    if (conversation.title) return conversation.title;

    // For direct messages, use the other participant's name
    if (conversation.type === "direct" && conversation.participantDetails) {
      const otherParticipantId = conversation.participants?.find(
        (p: string) => p !== currentUserId
      );
      if (otherParticipantId) {
        const details = conversation.participantDetails[otherParticipantId];
        return details?.displayName || details?.email || "Unknown";
      }
    }

    // For group chats
    const participantCount = conversation.participants?.length || 0;
    return `Group Chat (${participantCount} people)`;
  }

  /**
   * Analyze a single conversation (when only one relevant conversation found)
   */
  private async analyzeSingleConversation(
    conversation: ConversationGroup,
    query: string,
    userId: string,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      logger.info("Single relevant conversation found, analyzing directly", {
        conversationId: conversation.conversationId,
        messageCount: conversation.messages.length,
      });

      // Reuse analyze_conversation logic
      const analyzer = new AnalyzeConversationTool();
      const result = await analyzer.execute({
        conversation_id: conversation.conversationId,
        current_user_id: userId,
        query,
        max_messages: 50,
        use_rag: true,
      }, context);

      // Add metadata about multi-conversation search
      if (result.metadata) {
        result.metadata.searchedMultipleConversations = true;
        result.metadata.conversationsFound = 1;
      }

      return result;
    } catch (error) {
      logger.error("Error analyzing single conversation:", error);
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Failed to analyze the conversation. Inform user to try again.",
        confidence: 0,
      };
    }
  }

  /**
   * Request clarification when multiple conversations found
   */
  private requestConversationClarification(
    conversations: ConversationGroup[],
    query: string
  ): ToolResult {
    logger.info("Multiple relevant conversations found, requesting clarification", {
      conversationCount: conversations.length,
      query: query.substring(0, 50),
    });

    return {
      success: true,
      data: {
        conversations: conversations.map(c => ({
          conversationId: c.conversationId,
          title: c.title || `Conversation ${c.conversationId.slice(0, 8)}`,
          messageCount: c.messages.length,
          relevanceScore: c.relevanceScore,
          lastActive: c.lastActive,
        })),
        query,
      },
      next_action: "clarification_needed",
      clarification: {
        type: "select_conversation",
        question: `I found information about "${query}" in ${conversations.length} conversations. Which one would you like to know about?`,
        options: conversations.map((conv, index) => {
          const title = conv.title || `Conversation ${conv.conversationId.slice(0, 8)}`;
          const snippet = this.extractSnippet(conv.messages[0]);
          const timestamp = this.formatTimestampRelative(conv.lastActive);

          return {
            id: conv.conversationId,
            title,
            subtitle: `${timestamp} - "${snippet}"`,
            confidence: Math.min(conv.relevanceScore / conv.messages.length, 1.0),
            metadata: {
              conversationId: conv.conversationId,
              messageCount: conv.messages.length,
              lastActive: conv.lastActive,
              snippet,
            },
          };
        }),
      },
      instruction_for_ai: `Found ${conversations.length} relevant conversations. User needs to select which one to analyze. Present the options clearly.`,
      confidence: 0.8,
      metadata: {
        toolName: this.name,
        conversationsFound: conversations.length,
        searchQuery: query,
      },
    };
  }

  /**
   * Return no results response
   */
  private noResultsResponse(query: string): ToolResult {
    return {
      success: false,
      data: {},
      next_action: "complete",
      instruction_for_ai: `No relevant conversations found for "${query}". Inform user that you couldn't find any conversations discussing this topic in their recent messages.`,
      confidence: 0,
      metadata: {
        toolName: this.name,
        searchQuery: query,
        conversationsFound: 0,
      },
    };
  }

  /**
   * Extract a snippet from a message for preview
   */
  private extractSnippet(message: any): string {
    if (!message) return "No preview available";

    let text = "";
    if (message.content?.text) {
      text = message.content.text;
    } else if (message.content?.type === "image") {
      text = message.content.caption || "[Image]";
    } else if (message.text) {
      text = message.text;
    } else {
      text = "[Media message]";
    }

    // Truncate to 60 characters
    return text.length > 60 ? text.substring(0, 60) + "..." : text;
  }

  /**
   * Format timestamp for display (override base class method)
   */
  protected formatTimestampRelative(timestamp: number): string {
    if (!timestamp) return "Unknown time";

    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Check if query should aggregate results across conversations
   * Queries asking "who" or "everyone" benefit from aggregation
   */
  private shouldAggregateResults(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    
    // Queries that benefit from aggregation
    const aggregationKeywords = [
      'who is', 'who are', 'who\'s', 'who all',
      'everyone', 'everybody', 'all who',
      'list everyone', 'list all',
      'how many people', 'how many are',
    ];
    
    return aggregationKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Analyze multiple conversations and aggregate results
   */
  private async analyzeMultipleConversations(
    conversations: ConversationGroup[],
    query: string,
    userId: string,
    context: ToolContext
  ): Promise<ToolResult> {
    try {
      logger.info("🔄 Analyzing multiple conversations for aggregation", {
        conversationCount: conversations.length,
        query: query.substring(0, 100),
      });

      // Analyze each conversation in parallel, keeping track of which conversation each result belongs to
      const analyzer = new AnalyzeConversationTool();
      const analysisPromises = conversations.map(async (conv) => {
        try {
          const result = await analyzer.execute({
            conversation_id: conv.conversationId,
            current_user_id: userId,
            query,
            max_messages: 50,
            use_rag: true,
          }, context);
          
          // Attach conversation metadata to result
          return {
            ...result,
            conversationId: conv.conversationId,
            conversationTitle: conv.title,
          };
        } catch (error) {
          logger.error("Error analyzing conversation", {
            conversationId: conv.conversationId,
            error,
          });
          return null;
        }
      });

      const results = await Promise.all(analysisPromises);
      const successfulResults = results.filter(r => r && r.success);

      if (successfulResults.length === 0) {
        return {
          success: false,
          data: {},
          next_action: "error",
          error: "Failed to analyze conversations",
          instruction_for_ai: "Unable to analyze the conversations. Please try again.",
          confidence: 0,
        };
      }

      // Aggregate answers (now each result has its conversation metadata)
      const aggregatedAnswer = this.aggregateAnswers(
        successfulResults,
        query
      );

      // Calculate total messages analyzed
      const totalMessagesAnalyzed = successfulResults.reduce((sum, r) => {
        return sum + (r?.data?.message_count_analyzed || 0);
      }, 0);

      // Collect all relevant messages
      const allRelevantMessages: string[] = [];
      successfulResults.forEach(r => {
        if (r?.data?.relevant_messages) {
          allRelevantMessages.push(...r.data.relevant_messages);
        }
      });

      return {
        success: true,
        data: {
          answer: aggregatedAnswer.answer,
          confidence: 0.85,
          relevant_messages: allRelevantMessages.length > 0 ? allRelevantMessages : undefined,
          message_count_analyzed: totalMessagesAnalyzed,
          conversation_id: "multiple", // Indicate multiple conversations
          query: query,
          used_rag: true,
          // Additional fields for aggregated results
          sources: aggregatedAnswer.sources,
          conversationCount: successfulResults.length,
          aggregated: true,
        },
        next_action: "complete",
        instruction_for_ai: aggregatedAnswer.answer,
        confidence: 0.85,
        metadata: {
          toolName: this.name,
          conversationsAnalyzed: successfulResults.length,
          aggregated: true,
        },
      };
    } catch (error) {
      logger.error("Error in multi-conversation analysis", {error});
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Failed to aggregate results. Please try selecting a specific conversation.",
        confidence: 0,
      };
    }
  }

  /**
   * Aggregate answers from multiple conversation analyses
   * Each result now includes conversationId and conversationTitle metadata
   */
  private aggregateAnswers(
    results: any[],
    query: string
  ): {answer: string; sources: string[]} {
    const sources: string[] = [];
    const answers: string[] = [];

    results.forEach((result, index) => {
      if (result.data?.answer) {
        // Use the conversation metadata attached to the result
        const source = result.conversationTitle || `Conversation ${index + 1}`;
        sources.push(source);
        answers.push(`**From ${source}:**\n${result.data.answer}`);
      }
    });

    // Combine answers
    let combinedAnswer = `I found information in ${sources.length} conversation${sources.length > 1 ? 's' : ''}:\n\n`;
    combinedAnswer += answers.join('\n\n');
    
    // Add summary footer
    if (sources.length > 1) {
      combinedAnswer += `\n\n*Sources: ${sources.join(', ')}*`;
    }

    return {
      answer: combinedAnswer,
      sources,
    };
  }
}

