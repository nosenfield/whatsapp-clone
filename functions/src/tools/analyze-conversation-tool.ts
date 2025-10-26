/**
 * Analyze Conversation Tool
 *
 * Extracts specific information from conversation messages using AI and RAG.
 * Useful for queries like "Who is coming?", "What did X say about Y?", etc.
 * 
 * Leverages RAG pipeline for semantic search across conversation history.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import {getOpenAIApiKey} from "../services/env-config";
import {searchUserConversations} from "../services/rag-helper";

export class AnalyzeConversationTool extends BaseAITool {
  name = "analyze_conversation";
  description = "Extract specific information from conversation messages. Use for queries like 'Who confirmed?', 'What did John say about X?', 'When is the deadline?', 'Who is coming?'";

  parameters: ToolParameter[] = [
    {
      name: "conversation_id",
      type: "string",
      description: "The conversation ID to analyze",
      required: true,
    },
    {
      name: "current_user_id",
      type: "string",
      description: "The current user ID for context",
      required: true,
    },
    {
      name: "query",
      type: "string",
      description: "The specific question to answer from the conversation (e.g., 'Who is coming to the party?')",
      required: true,
    },
    {
      name: "max_messages",
      type: "number",
      description: "Maximum number of recent messages to analyze",
      required: false,
      default: 50,
    },
    {
      name: "use_rag",
      type: "boolean",
      description: "Whether to use RAG semantic search (recommended for large conversations)",
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        conversation_id,
        current_user_id,
        query,
        max_messages = 50,
        use_rag = true
      } = params;

      logger.info("Analyzing conversation for specific query", {
        conversationId: conversation_id,
        userId: current_user_id,
        query: query.substring(0, 100),
        maxMessages: max_messages,
        useRAG: use_rag,
      });

      // Step 1: Get conversation messages (with RAG if enabled)
      let messages;
      if (use_rag) {
        messages = await this.getMessagesWithRAG(
          conversation_id,
          current_user_id,
          query,
          max_messages
        );
      } else {
        messages = await this.getConversationMessages(
          conversation_id,
          current_user_id,
          max_messages
        );
      }

      if (messages.length === 0) {
        return {
          success: false,
          data: {},
          next_action: "error",
          error: "No messages found in conversation",
          instruction_for_ai: "Inform user that no messages were found.",
          confidence: 0,
        };
      }

      // Step 2: Get conversation details for participant information
      const conversationData = await this.getConversationDetails(conversation_id, current_user_id);

      // Step 3: Extract information using AI
      const analysis = await this.analyzeWithAI(messages, query, current_user_id, conversationData);

      // Step 4: Format result
      const result = {
        answer: analysis.answer,
        confidence: analysis.confidence,
        relevant_messages: analysis.relevantMessages,
        message_count_analyzed: messages.length,
        conversation_id: conversation_id,
        query: query,
        used_rag: use_rag,
      };

      return {
        success: true,
        data: result,
        next_action: "complete",
        instruction_for_ai: `Answer: ${analysis.answer}`,
        confidence: analysis.confidence,
        metadata: {
          toolName: this.name,
          messagesAnalyzed: messages.length,
          relevantMessagesFound: analysis.relevantMessages?.length || 0,
          usedRAG: use_rag,
        },
      };
    } catch (error) {
      logger.error("Error analyzing conversation:", error);
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Inform user that conversation analysis failed.",
        confidence: 0,
      };
    }
  }

  /**
   * Get messages using RAG semantic search (more relevant for specific queries)
   */
  private async getMessagesWithRAG(
    conversationId: string,
    userId: string,
    query: string,
    maxMessages: number
  ): Promise<any[]> {
    try {
      logger.info("Using RAG semantic search for conversation analysis", {
        conversationId,
        query: query.substring(0, 50),
      });

      // Use RAG to find semantically relevant messages
      const relevantMessages = await searchUserConversations(
        query,
        userId,
        maxMessages
      );

      // Filter to only messages from this conversation
      const conversationMessages = relevantMessages.filter(
        msg => msg.metadata?.conversationId === conversationId || 
               msg.conversationId === conversationId
      );

      logger.info("RAG search completed", {
        totalResults: relevantMessages.length,
        conversationResults: conversationMessages.length,
      });

      // If RAG didn't find enough messages, fall back to recent messages
      if (conversationMessages.length < 5) {
        logger.info("RAG found few results, supplementing with recent messages");
        const recentMessages = await this.getConversationMessages(
          conversationId,
          userId,
          Math.max(20, maxMessages)
        );
        
        // Merge and deduplicate
        const messageMap = new Map();
        [...conversationMessages, ...recentMessages].forEach(msg => {
          messageMap.set(msg.id, msg);
        });
        
        return Array.from(messageMap.values());
      }

      return conversationMessages;
    } catch (error) {
      logger.warn("RAG search failed, falling back to recent messages", {error});
      return this.getConversationMessages(conversationId, userId, maxMessages);
    }
  }

  /**
   * Get conversation messages (fallback or non-RAG mode)
   */
  private async getConversationMessages(
    conversationId: string,
    userId: string,
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

      // Query messages
      const query = admin.firestore()
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(maxMessages);

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

  private async analyzeWithAI(
    messages: any[],
    query: string,
    userId: string,
    conversationData?: any
  ): Promise<{ answer: string; confidence: number; relevantMessages?: any[] }> {
    try {
      // Initialize OpenAI client
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
        .sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.timestamp || 0;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp || 0;
          return timeA - timeB;
        })
        .map(msg => {
          const sender = getParticipantName(msg.senderId);
          const timestamp = new Date(msg.timestamp?.toMillis?.() || msg.timestamp || Date.now()).toLocaleString();
          
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

      const prompt = `You are analyzing a conversation to answer a specific question.

Conversation:
${formattedMessages}

Question: ${query}

Instructions:
1. Read through the conversation carefully
2. Identify relevant information that answers the question
3. Provide a clear, concise answer
4. If multiple people are involved, list them clearly
5. If the answer is unclear or not found, say so honestly

Answer the question directly and specifically. Format your response as:

ANSWER: [Your clear answer here]
CONFIDENCE: [0-100, how confident you are in this answer]
RELEVANT_MESSAGES: [List any specific messages that support your answer]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that extracts specific information from conversations. Be precise and cite relevant messages when answering."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || "";
      
      // Parse the structured response
      // Use [\s\S] instead of . with s flag for ES2017 compatibility
      const answerMatch = response.match(/ANSWER:\s*([\s\S]+?)(?=\nCONFIDENCE:|$)/);
      const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/);
      const relevantMatch = response.match(/RELEVANT_MESSAGES:\s*([\s\S]+?)$/);
      
      return {
        answer: answerMatch ? answerMatch[1].trim() : response,
        confidence: confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.7,
        relevantMessages: relevantMatch ? [relevantMatch[1].trim()] : undefined,
      };
    } catch (error) {
      logger.error("Error analyzing with AI:", error);
      throw new Error("Failed to analyze conversation");
    }
  }
}

