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
import {getOpenAIApiKey} from "../services/env-config";

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
          next_action: "error",
          data: {},
          error: "No messages found in the specified time range",
          instruction_for_ai: "Inform user that no messages were found in the specified time range.",
          confidence: 0,
        };
      }

      // Step 2: Get conversation details for participant information
      const conversationData = await this.getConversationDetails(conversation_id, current_user_id);

      // Step 3: Generate summary using OpenAI
      const summary = await this.generateSummary(messages, summary_length, current_user_id, conversationData);

      // Step 4: Format result
      const result = {
        summary: summary,
        message_count: messages.length,
        time_range: this.formatTimeRange(time_filter),
        conversation_id: conversation_id,
        summary_length: summary_length,
        participants: this.extractParticipants(conversationData, messages),
        key_topics: this.extractKeyTopics(messages),
      };

      return {
        success: true,
        next_action: "complete",
        data: result,
        instruction_for_ai: "Summary generated successfully. No further action needed.",
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
        next_action: "error",
        data: {},
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Inform user that the conversation summary could not be generated.",
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

  private async getConversationDetails(conversationId: string, userId: string): Promise<any> {
    try {
      const conversationDoc = await admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .get();

      if (!conversationDoc.exists) {
        throw new Error("Conversation not found");
      }

      const data = conversationDoc.data();
      
      // Verify access
      if (!data?.participants?.includes(userId)) {
        throw new Error("Access denied");
      }

      return data;
    } catch (error) {
      logger.error("Error getting conversation details:", error);
      throw error;
    }
  }

  private async generateSummary(messages: any[], summaryLength: string, userId: string, conversationData?: any): Promise<string> {
    try {
      // Initialize OpenAI client using the environment config service
      const openai = new OpenAI({
        apiKey: getOpenAIApiKey(),
      });

      // Get participant mapping for better names
      const participantDetails = conversationData?.participantDetails || {};
      const getParticipantName = (senderId: string) => {
        if (senderId === userId) return "You";
        const details = participantDetails[senderId];
        return details?.displayName || details?.email || "Other";
      };

      // Format messages for AI processing
      const formattedMessages = messages
        .reverse() // Show in chronological order
        .map(msg => {
          const sender = getParticipantName(msg.senderId);
          const timestamp = new Date(msg.timestamp?.toMillis() || msg.timestamp).toLocaleString();
          
          // Handle different message types
          let content = '';
          if (msg.content?.type === 'text') {
            content = msg.content.text || '[Empty message]';
          } else if (msg.content?.type === 'image') {
            content = `[Image: ${msg.content.caption || 'No caption'}]`;
          } else {
            content = msg.text || '[Media message]';
          }
          
          return `${sender} (${timestamp}): ${content}`;
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

  private extractParticipants(conversationData: any, messages: any[]): string[] {
    const participantNames = new Set<string>();
    
    // First, try to get participants from conversation document
    if (conversationData?.participantDetails) {
      Object.values(conversationData.participantDetails).forEach((details: any) => {
        const name = details.displayName || details.email || 'Unknown';
        participantNames.add(name);
      });
    }
    
    // If still empty, try to extract from messages
    if (participantNames.size === 0) {
      messages.forEach(msg => {
        if (msg.senderName) {
          participantNames.add(msg.senderName);
        }
      });
    }
    
    return Array.from(participantNames);
  }

  private extractKeyTopics(messages: any[]): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const wordCounts: Record<string, number> = {};
    
    messages.forEach(msg => {
      let textToExtract = '';
      
      // Handle different message types
      if (msg.content?.type === 'text' && msg.content.text) {
        textToExtract = msg.content.text;
      } else if (msg.content?.type === 'image' && msg.content.caption) {
        textToExtract = msg.content.caption;
      } else if (msg.text) {
        textToExtract = msg.text;
      }
      
      if (textToExtract) {
        const words = textToExtract.toLowerCase().split(/\W+/);
        words.forEach((word: string) => {
          if (word.length > 3 && !commonWords.has(word)) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
      }
    });

    const topics = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]: [string, number]) => word);
    
    // If no topics found, return empty array
    return topics;
  }
}
