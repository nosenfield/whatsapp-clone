/**
 * Pinecone Vector Database Service
 *
 * Handles vector operations for RAG pipeline
 */

import {Pinecone} from "@pinecone-database/pinecone";
import * as logger from "firebase-functions/logger";
import {getPineconeApiKey} from "./env-config";

let pinecone: Pinecone | null = null;

/**
 * Initialize Pinecone client
 * @return {Pinecone} Pinecone client instance
 */
function initializePinecone(): Pinecone {
  if (!pinecone) {
    const apiKey = getPineconeApiKey();
    if (!apiKey) {
      throw new Error("PINECONE_API_KEY environment variable is required");
    }

    pinecone = new Pinecone({
      apiKey,
    });
  }
  return pinecone;
}

/**
 * Upsert embedding to Pinecone
 * @param {string} id Vector ID
 * @param {number[]} embedding Vector embedding
 * @param {Object} metadata Metadata to store with vector
 * @return {Promise<void>}
 */
export async function upsertToPinecone(
  id: string,
  embedding: number[],
  metadata: Record<string, any>
): Promise<void> {
  try {
    const pc = initializePinecone();
    const index = pc.index("conversation-history");

    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
        },
      },
    ]);

    logger.info("Successfully upserted embedding to Pinecone", {id});
  } catch (error) {
    logger.error("Error upserting to Pinecone", {error, id});
    throw error;
  }
}

/**
 * Search conversation history using vector similarity
 * @param {number[]} queryEmbedding Query vector
 * @param {number} topK Number of results to return
 * @param {Object} filter Optional metadata filter
 * @return {Promise<Array>} Search results
 */
export async function searchConversationHistory(
  queryEmbedding: number[],
  topK = 10,
  filter?: Record<string, any>
): Promise<any[]> {
  try {
    const pc = initializePinecone();
    const index = pc.index("conversation-history");

    const searchRequest: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    };

    if (filter) {
      searchRequest.filter = filter;
    }

    logger.info("🔍 Pinecone query request", {
      topK,
      filter: JSON.stringify(filter),
      embeddingLength: queryEmbedding.length,
    });

    const response = await index.query(searchRequest);

    logger.info("📊 Pinecone query response", {
      matchCount: response.matches?.length || 0,
      matches: response.matches?.slice(0, 3).map(m => ({
        id: m.id,
        score: m.score,
        hasMetadata: !!m.metadata,
        participants: m.metadata?.participants,
        conversationId: m.metadata?.conversationId,
      })),
    });

    return response.matches?.map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
    })) || [];
  } catch (error) {
    logger.error("❌ Error searching conversation history", {error, filter});
    throw error;
  }
}

/**
 * Search across all conversations for a user
 * @param {number[]} queryEmbedding Query vector
 * @param {string} userId User ID to filter by
 * @param {number} topK Number of results to return
 * @return {Promise<Array>} Search results
 */
export async function searchAcrossConversations(
  queryEmbedding: number[],
  userId: string,
  topK = 20
): Promise<any[]> {
  const filter = {
    participants: {$in: [userId]},
  };

  return searchConversationHistory(queryEmbedding, topK, filter);
}

/**
 * Delete embeddings for a specific conversation
 * @param {string} conversationId Conversation ID
 * @return {Promise<void>}
 */
export async function deleteConversationEmbeddings(
  conversationId: string
): Promise<void> {
  try {
    const pc = initializePinecone();
    const index = pc.index("conversation-history");

    // Delete all vectors with conversationId in metadata
    await index.deleteMany({
      filter: {
        conversationId: {$eq: conversationId},
      },
    });

    logger.info("Successfully deleted conversation embeddings", {conversationId});
  } catch (error) {
    logger.error("Error deleting conversation embeddings", {error, conversationId});
    throw error;
  }
}

/**
 * Get embedding statistics for a user
 * @param {string} userId User ID
 * @return {Promise<Object>} Statistics
 */
export async function getEmbeddingStats(userId: string): Promise<{
  totalEmbeddings: number;
  conversations: string[];
}> {
  try {
    const pc = initializePinecone();
    const index = pc.index("conversation-history");

    // Query with filter to get user's embeddings
    const response = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata query
      topK: 10000, // Large number to get all results
      filter: {
        participants: {$in: [userId]},
      },
      includeMetadata: true,
    });

    const conversations = new Set<string>();
    response.matches?.forEach((match) => {
      if (match.metadata?.conversationId && typeof match.metadata.conversationId === "string") {
        conversations.add(match.metadata.conversationId);
      }
    });

    return {
      totalEmbeddings: response.matches?.length || 0,
      conversations: Array.from(conversations),
    };
  } catch (error) {
    logger.error("Error getting embedding stats", {error, userId});
    throw error;
  }
}
