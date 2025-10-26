/**
 * RAG Helper Service
 *
 * Enhances AI prompts with conversation context using RAG pipeline
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {generateQueryEmbedding} from "./embeddings";
import {searchConversationHistory} from "./pinecone";

/**
 * Enhance AI prompt with relevant conversation context
 * @param {string} prompt Original AI prompt
 * @param {string} userId User ID for context filtering
 * @param {string} conversationId Optional specific conversation ID
 * @param {number} maxContextMessages Maximum context messages to include
 * @return {Promise<string>} Enhanced prompt with context
 */
export async function enhancePromptWithContext(
  prompt: string,
  userId: string,
  conversationId?: string,
  maxContextMessages = 10
): Promise<string> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(prompt);

    // Search for relevant messages
    const relevantMessages = await searchConversationHistory(
      queryEmbedding,
      maxContextMessages,
      conversationId ? {conversationId: {$eq: conversationId}} : {userId: {$eq: userId}}
    );

    if (relevantMessages.length === 0) {
      logger.info("No relevant context found for prompt", {userId, conversationId});
      return prompt;
    }

    // Fetch full message details from Firestore
    const contextMessages = await fetchMessageDetails(relevantMessages);

    // Build context string
    const contextString = buildContextString(contextMessages);

    // Enhance prompt with context
    const enhancedPrompt = `${prompt}

Relevant conversation context:
${contextString}

Please use this context to provide more accurate and relevant responses.`;

    logger.info("Enhanced prompt with context", {
      userId,
      conversationId,
      contextMessageCount: contextMessages.length,
      originalPromptLength: prompt.length,
      enhancedPromptLength: enhancedPrompt.length,
    });

    return enhancedPrompt;
  } catch (error) {
    logger.error("Error enhancing prompt with context", {error, userId, conversationId});
    // Return original prompt if context enhancement fails
    return prompt;
  }
}

/**
 * Fetch full message details from Firestore
 * @param {Array} messageIds Array of message IDs with metadata
 * @return {Promise<Array>} Full message details
 */
async function fetchMessageDetails(messageIds: Array<{id: string, score?: number, metadata: any}>): Promise<any[]> {
  const messages: any[] = [];

  for (const item of messageIds) {
    try {
      const messageDoc = await admin.firestore()
        .collection("conversations")
        .doc(item.metadata.conversationId)
        .collection("messages")
        .doc(item.id)
        .get();

      if (messageDoc.exists) {
        const messageData = messageDoc.data();
        messages.push({
          id: item.id,
          ...messageData,
          relevanceScore: item.score || 0,
        });
      }
    } catch (error) {
      logger.warn("Error fetching message details", {error, messageId: item.id});
    }
  }

  return messages;
}

/**
 * Build context string from messages
 * @param {Array} messages Array of message objects
 * @return {string} Formatted context string
 */
function buildContextString(messages: any[]): string {
  // Sort by timestamp (oldest first for chronological context)
  const sortedMessages = messages.sort((a, b) => {
    const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
    const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
    return timestampA.getTime() - timestampB.getTime();
  });

  return sortedMessages
    .map((msg: any, index) => {
      const timestamp = msg.timestamp?.toDate?.() || new Date(msg.timestamp || new Date());
      const senderName = msg.senderName || "User";
      const text = msg.content?.text || "";

      return `${index + 1}. [${timestamp.toISOString().split("T")[0]}] ${senderName}: ${text}`;
    })
    .join("\n");
}

/**
 * Get conversation summary for context
 * @param {string} conversationId Conversation ID
 * @param {string} userId User ID
 * @param {number} maxMessages Maximum messages to include
 * @return {Promise<string>} Conversation summary
 */
export async function getConversationSummary(
  conversationId: string,
  userId: string,
  maxMessages = 20
): Promise<string> {
  try {
    // Get recent messages from conversation
    const messagesSnapshot = await admin.firestore()
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(maxMessages)
      .get();

    const messages = messagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    if (messages.length === 0) {
      return "No recent messages in this conversation.";
    }

    // Build summary
    const summary = messages
      .reverse() // Reverse to get chronological order
      .map((msg: any, index) => {
        const timestamp = msg.timestamp?.toDate?.() || new Date(msg.timestamp || new Date());
        const senderName = msg.senderName || "User";
        const text = msg.content?.text || "";

        return `${index + 1}. [${timestamp.toLocaleDateString()}] ${senderName}: ${text}`;
      })
      .join("\n");

    return `Recent conversation activity:\n${summary}`;
  } catch (error) {
    logger.error("Error getting conversation summary", {error, conversationId, userId});
    return "Unable to retrieve conversation context.";
  }
}

/**
 * Search for specific information across all user conversations
 * @param {string} query Search query
 * @param {string} userId User ID
 * @param {number} maxResults Maximum results to return
 * @return {Promise<Array>} Search results with context
 */
export async function searchUserConversations(
  query: string,
  userId: string,
  maxResults = 10
): Promise<any[]> {
  try {
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search across all user conversations
    const searchResults = await searchConversationHistory(
      queryEmbedding,
      maxResults,
      {userId: {$eq: userId}}
    );

    // Fetch full message details
    const results = await fetchMessageDetails(searchResults);

    logger.info("Search completed", {
      userId,
      query: query.substring(0, 100),
      resultCount: results.length,
    });

    return results;
  } catch (error) {
    logger.error("Error searching user conversations", {error, userId, query});
    return [];
  }
}
