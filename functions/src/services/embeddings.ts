/**
 * OpenAI Embedding Service
 *
 * Handles text embedding generation for RAG pipeline
 */

import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import {getOpenAIApiKey} from "./env-config";

let openai: OpenAI | null = null;

/**
 * Initialize OpenAI client
 * @return {OpenAI} OpenAI client instance
 */
function initializeOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = getOpenAIApiKey();
    openai = new OpenAI({
      apiKey,
    });
  }
  return openai;
}

/**
 * Generate embedding for text
 * @param {string} text Text to embed
 * @return {Promise<number[]>} Embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = initializeOpenAI();

    // Clean and truncate text
    const cleanText = text.trim().substring(0, 8000); // OpenAI limit

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanText,
      // Using default 1536 dimensions to match Pinecone index
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("No embedding returned from OpenAI");
    }

    logger.info("Successfully generated embedding", {
      textLength: cleanText.length,
      embeddingLength: embedding.length,
    });

    return embedding;
  } catch (error) {
    logger.error("Error generating embedding", {error, textLength: text.length});
    throw error;
  }
}

/**
 * Generate embedding for query text (optimized for search)
 * @param {string} query Query text to embed
 * @return {Promise<number[]>} Query embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const client = initializeOpenAI();

    // Clean and optimize query for search
    const cleanQuery = query.trim().substring(0, 8000);

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanQuery,
      // Using default 1536 dimensions to match Pinecone index
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("No embedding returned from OpenAI");
    }

    logger.info("Successfully generated query embedding", {
      queryLength: cleanQuery.length,
      embeddingLength: embedding.length,
    });

    return embedding;
  } catch (error) {
    logger.error("Error generating query embedding", {error, queryLength: query.length});
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts Array of texts to embed
 * @return {Promise<number[][]>} Array of embedding vectors
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const client = initializeOpenAI();

    // Clean and truncate texts
    const cleanTexts = texts.map((text) => text.trim().substring(0, 8000));

    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanTexts,
      // Using default 1536 dimensions to match Pinecone index
    });

    const embeddings = response.data.map((item) => item.embedding);

    logger.info("Successfully generated batch embeddings", {
      textCount: cleanTexts.length,
      embeddingLength: embeddings[0]?.length || 0,
    });

    return embeddings;
  } catch (error) {
    logger.error("Error generating batch embeddings", {error, textCount: texts.length});
    throw error;
  }
}

/**
 * Check if text is suitable for embedding
 * @param {string} text Text to check
 * @return {boolean} Whether text should be embedded
 */
export function shouldEmbedText(text: string): boolean {
  // Skip very short texts, emoji-only, or non-meaningful content
  if (!text || text.length < 10) return false;

  // Skip if mostly emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiRegex) || []).length;
  if (emojiCount > text.length * 0.5) return false;

  // Skip if mostly special characters
  const specialCharCount = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;
  if (specialCharCount > text.length * 0.7) return false;

  return true;
}
