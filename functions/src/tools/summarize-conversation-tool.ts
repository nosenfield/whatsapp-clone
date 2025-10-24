/**
 * Summarize Conversation Tool
 *
 * Summarizes conversation messages using AI to provide concise overviews.
 * Supports time filtering and context-aware summarization.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";

export class SummarizeConversationTool extends BaseAITool {
  name = "summarize_conversation";
  description = "Summarize conversation messages to provide a concise overview. Supports time filtering and context-aware summarization.";

  parameters: ToolParameter[] = [
    {
      name: "conversation_id",
      type: "string",
      description: "The conversation ID to summarize",
      required: true,
    },
    {
      name: "current_user_id",
      type: "string",
      description: "The current user ID for context",
      required: true,
    },
    {
      name: "time_filter",
      type: "string",
      description: "Time range to summarize (1day, 1week, 1month, all)",
      required: false,
      default: "all",
    },
    {
      name: "max_messages",
      type: "number",
      description: "Maximum number of messages to include in summary",
      required: false,
      default: 50,
    },
    {
      name: "summary_length",
      type: "string",
      description: "Desired summary length (short, medium, long)",
      required: false,
      default: "medium",
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        conversation_id,
        current_user_id,
        time_filter = "all",
        max_messages = 50,
        summary_length = "medium"
      } = params;

      logger.info("Summarizing conversation", {
        conversationId: conversation_id,
        userId: current_user_id,
        timeFilter: time_filter,
        maxMessages: max_messages,
        summaryLength: summary_length,
      });

      // Step 1: Get conversation messages
      const messages = await this.getConversationMessages(
        conversation_id, 
        current_user_id, 
        time_filter, 
        max_messages
      );

      if (messages.length === 0) {
        return {
          success: false,
          error: "No messages found in the specified time range",
          confidence: 0,
        };
      }

      // Step 2: Generate summary using OpenAI
      const summary = await this.generateSummary(messages, summary_length, current_user_id);

      // Step 3: Format result
      const result = {
        summary: summary,
        message_count: messages.length,
        time_range: this.formatTimeRange(time_filter),
        conversation_id: conversation_id,
        summary_length: summary_length,
        participants: this.extractParticipants(messages),
        key_topics: this.extractKeyTopics(messages),
      };

      return {
        success: true,
        data: result,
        confidence: 0.9,
        metadata: {
          messagesProcessed: messages.length,
          timeFilter: time_filter,
          summaryLength: summary_length,
        },
      };
    } catch (error) {
      logger.error("Error summarizing conversation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      };
    }
  }

  private async getConversationMessages(
    conversationId: string, 
    userId: string, 
    timeFilter: string, 
    maxMessages: number
  ): Promise<any[]> {
    try {
      // Verify user has access to conversation
      const conversationDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        throw new Error("Conversation not found");
      }

      const conversationData = conversationDoc.data();
      if (!conversationData?.participants?.includes(userId)) {
        throw new Error("Access denied to conversation");
      }

      // Calculate time filter
      const timeFilterDate = this.getTimeFilterDate(timeFilter);
      
      // Query messages
      let query = admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(maxMessages);

      if (timeFilterDate) {
        query = query.where("timestamp", ">=", timeFilterDate);
      }

      const messagesSnapshot = await query.get();
      
      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      logger.error("Error getting conversation messages:", error);
      throw error;
    }
  }

  private async generateSummary(messages: any[], summaryLength: string, userId: string): Promise<string> {
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Format messages for AI processing
      const formattedMessages = messages
        .reverse() // Show in chronological order
        .map(msg => {
          const sender = msg.senderId === userId ? "You" : msg.senderName || "Other";
          const timestamp = new Date(msg.timestamp?.toMillis() || msg.timestamp).toLocaleString();
          return `${sender} (${timestamp}): ${msg.text || '[Media message]'}`;
        })
        .join('\n');

      // Determine summary length
      const lengthInstructions = {
        short: "in 2-3 sentences",
        medium: "in 4-6 sentences", 
        long: "in 8-10 sentences"
      };

      const prompt = `Please summarize the following conversation ${lengthInstructions[summaryLength as keyof typeof lengthInstructions]}. Focus on key topics, decisions made, and important information shared.

Conversation:
${formattedMessages}

Summary:`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes conversations concisely and accurately. Focus on the most important information and maintain context."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: summaryLength === "long" ? 500 : summaryLength === "medium" ? 300 : 150,
      });

      return completion.choices[0]?.message?.content || "Unable to generate summary";
    } catch (error) {
      logger.error("Error generating summary:", error);
      throw new Error("Failed to generate summary");
    }
  }

  private getTimeFilterDate(timeFilter: string): Date | null {
    const now = new Date();
    switch (timeFilter) {
      case "1day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "1week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "1month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "all":
      default:
        return null;
    }
  }

  private formatTimeRange(timeFilter: string): string {
    switch (timeFilter) {
      case "1day":
        return "Last 24 hours";
      case "1week":
        return "Last week";
      case "1month":
        return "Last month";
      case "all":
      default:
        return "All time";
    }
  }

  private extractParticipants(messages: any[]): string[] {
    const participants = new Set<string>();
    messages.forEach(msg => {
      if (msg.senderName) {
        participants.add(msg.senderName);
      }
    });
    return Array.from(participants);
  }

  private extractKeyTopics(messages: any[]): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const wordCounts: Record<string, number> = {};
    
    messages.forEach(msg => {
      if (msg.text) {
        const words = msg.text.toLowerCase().split(/\W+/);
        words.forEach((word: string) => {
          if (word.length > 3 && !commonWords.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]: [string, number]) => word);
  }
}
