# RAG Pipeline Integration Guide

## Overview

This guide explains how the RAG (Retrieval-Augmented Generation) pipeline is integrated into the WhatsApp Clone app and how to use it for AI features.

## Architecture

```
User Message → Firestore → Cloud Function (generateMessageEmbedding)
                                    ↓
                            OpenAI Embeddings API
                                    ↓
                            Pinecone Vector DB
                                    ↓
                            Message Embeddings Stored

AI Query → enhancePromptWithContext → Search Pinecone → Fetch Messages → Enhanced Prompt
```

## Components

### 1. Embedding Generation (`functions/src/services/embeddings.ts`)

**Purpose**: Convert text messages into vector embeddings using OpenAI

**Key Functions**:
- `generateEmbedding(text)` - Generate embedding for a message
- `generateQueryEmbedding(query)` - Generate embedding for search queries
- `generateBatchEmbeddings(texts[])` - Batch process multiple messages
- `shouldEmbedText(text)` - Filter out unsuitable messages (too short, emoji-only)

**Model**: `text-embedding-3-small` (1536 dimensions)

**Usage Example**:
```typescript
import { generateEmbedding } from './services/embeddings';

const text = "Let's meet at the park tomorrow at 3pm";
const embedding = await generateEmbedding(text);
// Returns: number[] with 1536 dimensions
```

### 2. Vector Storage (`functions/src/services/pinecone.ts`)

**Purpose**: Store and search message embeddings in Pinecone vector database

**Key Functions**:
- `upsertToPinecone(id, embedding, metadata)` - Store a message embedding
- `searchConversationHistory(queryEmbedding, topK, filter)` - Search for relevant messages
- `searchAcrossConversations(queryEmbedding, userId, topK)` - Search all user conversations
- `deleteConversationEmbeddings(conversationId)` - Clean up deleted conversations
- `getEmbeddingStats(userId)` - Get usage statistics

**Index Configuration**:
- Name: `conversation-history`
- Dimensions: 1536
- Metric: cosine similarity

**Usage Example**:
```typescript
import { upsertToPinecone, searchConversationHistory } from './services/pinecone';

// Store embedding
await upsertToPinecone('msg-123', embedding, {
  conversationId: 'conv-456',
  senderId: 'user-789',
  timestamp: new Date().toISOString(),
  text: 'Message preview...',
});

// Search for relevant messages
const results = await searchConversationHistory(queryEmbedding, 10);
// Returns: [{ id, score, metadata }, ...]
```

### 3. RAG Helper (`functions/src/services/rag-helper.ts`)

**Purpose**: Enhance AI prompts with relevant conversation context

**Key Functions**:
- `enhancePromptWithContext(prompt, userId, conversationId?, maxMessages)` - Main RAG function
- `getConversationSummary(conversationId, userId, maxMessages)` - Get recent conversation context
- `searchUserConversations(query, userId, maxResults)` - Search across all user messages

**Usage Example**:
```typescript
import { enhancePromptWithContext } from './services/rag-helper';

const prompt = "What events do I have scheduled?";
const userId = "user-123";

const enhancedPrompt = await enhancePromptWithContext(prompt, userId);
// Returns: Original prompt + relevant conversation context
```

### 4. Cloud Function (`functions/src/embeddings/generate-message-embedding.ts`)

**Purpose**: Automatically generate embeddings for new messages

**Trigger**: Firestore document creation at `/conversations/{conversationId}/messages/{messageId}`

**Process**:
1. New message created in Firestore
2. Cloud Function triggered automatically
3. Check if message is text (skip images)
4. Filter out unsuitable text (too short, emoji-only)
5. Generate embedding via OpenAI
6. Store in Pinecone with metadata
7. Store reference in Firestore `/messageEmbeddings` collection

**Metadata Stored**:
```typescript
{
  conversationId: string;
  messageId: string;
  senderId: string;
  timestamp: Date;
  messageType: 'text' | 'image';
  text: string; // First 500 chars
  userId: string; // For filtering
}
```

## Setup Instructions

### 1. Prerequisites

✅ Already installed:
- `@pinecone-database/pinecone` - Vector database client
- `openai` - OpenAI API client
- All TypeScript types and interfaces

### 2. Configure Pinecone

Follow `PINECONE_SETUP.md` for detailed instructions:

1. Create Pinecone account
2. Create index named `conversation-history` (dimension: 1536)
3. Get API key
4. Set Firebase secret: `firebase functions:secrets:set PINECONE_API_KEY`

### 3. Configure OpenAI

1. Get OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Set Firebase secret: `firebase functions:secrets:set OPENAI_API_KEY`

### 4. Test the Pipeline

```bash
cd functions
npm run test:rag
```

This comprehensive test will:
- ✅ Verify environment configuration
- ✅ Test embedding generation
- ✅ Test Pinecone connection
- ✅ Test vector search
- ✅ Test context enhancement
- ✅ Measure search accuracy
- ✅ Measure latency

### 5. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This deploys:
- `generateMessageEmbedding` - Auto-generates embeddings for new messages
- All existing Cloud Functions

## Using RAG in AI Features

### Example 1: AI Assistant with Conversation Context

```typescript
import { enhancePromptWithContext } from './services/rag-helper';
import Anthropic from '@anthropic-ai/sdk';

export async function aiAssistant(
  userQuery: string,
  userId: string,
  conversationId?: string
) {
  // Enhance prompt with relevant conversation history
  const enhancedPrompt = await enhancePromptWithContext(
    userQuery,
    userId,
    conversationId
  );

  // Call AI with enhanced prompt
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: enhancedPrompt
    }]
  });

  return response.content[0].text;
}
```

### Example 2: Smart Calendar Extraction

```typescript
import { searchUserConversations } from './services/rag-helper';

export async function findScheduledEvents(userId: string) {
  // Search for messages mentioning dates/times
  const results = await searchUserConversations(
    "scheduled events, meetings, appointments, playdates",
    userId,
    20
  );

  // Filter for temporal keywords
  const eventMessages = results.filter(msg => {
    const text = msg.content?.text || '';
    return /\b(tomorrow|today|next week|at \d+pm|on \w+day)\b/i.test(text);
  });

  return eventMessages;
}
```

### Example 3: Conversation Summarization

```typescript
import { getConversationSummary } from './services/rag-helper';
import Anthropic from '@anthropic-ai/sdk';

export async function summarizeConversation(
  conversationId: string,
  userId: string
) {
  // Get conversation context
  const context = await getConversationSummary(conversationId, userId, 50);

  // Ask AI to summarize
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Please summarize the following conversation:\n\n${context}`
    }]
  });

  return response.content[0].text;
}
```

## Performance Considerations

### Latency Targets

- **Embedding Generation**: <1s per message
- **Vector Search**: <500ms for top-10 results
- **Context Enhancement**: <2s total (embedding + search + fetch)

### Optimization Tips

1. **Batch Processing**: Use `generateBatchEmbeddings()` for multiple messages
2. **Caching**: Cache frequently accessed embeddings
3. **Filtering**: Use Pinecone metadata filters to reduce search space
4. **Pagination**: Limit `topK` parameter (10-20 is usually sufficient)
5. **Async Processing**: Don't block message sending on embedding generation

### Cost Management

**OpenAI Costs** (text-embedding-3-small):
- $0.00002 per 1K tokens
- Average message: ~50 tokens = $0.000001
- 1000 messages: ~$0.001

**Pinecone Costs** (Free Tier):
- 1 index (enough for this project)
- 100,000 vectors
- Unlimited queries

**Estimated Monthly Cost (100 users)**:
- 3,000 messages/month: $0.003 (OpenAI)
- Vector storage: $0 (free tier)
- **Total: ~$0.003/month**

## Monitoring and Debugging

### Check Embedding Generation

```bash
# View Cloud Function logs
firebase functions:log --only generateMessageEmbedding

# Check Firestore collection
# Navigate to: /messageEmbeddings in Firebase Console
```

### Check Pinecone Index

```bash
# Get index stats
curl -X GET "https://api.pinecone.io/indexes/conversation-history/describe_index_stats" \
  -H "Api-Key: YOUR_PINECONE_API_KEY"
```

### Test Search Quality

```bash
cd functions
npm run test:rag
```

## Troubleshooting

### Issue: Embeddings not being generated

**Symptoms**: Messages sent but no embeddings in Pinecone

**Solutions**:
1. Check Cloud Function logs: `firebase functions:log`
2. Verify function is deployed: `firebase functions:list`
3. Check message format (must be type: 'text')
4. Verify OpenAI API key is set

### Issue: Search returns no results

**Symptoms**: RAG search returns empty array

**Solutions**:
1. Wait 1-2 seconds after upserting (Pinecone indexing delay)
2. Check index name is exactly `conversation-history`
3. Verify embeddings were stored (check Pinecone console)
4. Try broader search query

### Issue: High latency

**Symptoms**: Context enhancement takes >3s

**Solutions**:
1. Reduce `topK` parameter (try 5-10 instead of 20)
2. Check Pinecone region matches Firebase region
3. Use metadata filters to narrow search
4. Consider upgrading Pinecone pod type

### Issue: Dimension mismatch error

**Symptoms**: "Dimension mismatch" error from Pinecone

**Solutions**:
1. Verify index created with dimension 1536
2. Check using correct OpenAI model (text-embedding-3-small)
3. Delete and recreate index if wrong dimension

## Next Steps

After RAG pipeline is working:

1. ✅ **Test with real data**: Send messages and verify embeddings are generated
2. ✅ **Implement AI features**: Use RAG in AI assistant, summarization, etc.
3. ✅ **Monitor costs**: Track OpenAI and Pinecone usage
4. ✅ **Optimize performance**: Measure latency and optimize queries
5. ✅ **Add feature flags**: Gradual rollout to users

## Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.anthropic.com/research/retrieval-augmented-generation)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)

## Support

For issues or questions:
1. Check Cloud Function logs
2. Run test suite (`npm run test:rag`)
3. Review this guide and `PINECONE_SETUP.md`
4. Check Firebase Console for errors

