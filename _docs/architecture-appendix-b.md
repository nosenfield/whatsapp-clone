# Architecture Appendix B: Parent-Caregiver AI Specialization (Optional)

**Parent Document:** [architecture.md](./architecture.md)  
**Task Reference:** [task-list-appendix-b.md](./task-list-appendix-b.md)  
**Source:** Adapted from `phase2-parent-caregiver-architecture.md`  
**Last Updated:** October 22, 2025  
**Status:** Optional Enhancement - Reference Architecture

---

## Overview

This document provides the architectural foundation for **specialized AI features targeting busy parents and caregivers**. These extensions are **optional** and build upon the generic AI infrastructure from Phase 7.

### Architectural Principles

1. **AI-Augmented, Not AI-Dependent**: Core messaging works without AI
2. **Proactive, Not Reactive**: Anticipate needs before user asks
3. **Privacy-First**: User data never shared; all AI processing respects privacy
4. **Cost-Conscious**: Optimize AI usage for sustainability
5. **Progressive Enhancement**: Features layer onto existing messaging foundation

---

## System Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     iOS App (React Native)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           Messaging UI Layer (EXISTING)                  │ │
│  │  • Conversation Screen                                   │ │
│  │  • Message Bubbles                                       │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │      AI Feature UI Layer (NEW - OPTIONAL)                │ │
│  │  • Calendar View                                         │ │
│  │  • Decisions Tab                                         │ │
│  │  • Deadlines Screen                                      │ │
│  │  • RSVP Widgets                                          │ │
│  │  • Conflict Alerts                                       │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    │ Firebase SDK
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                 Firebase Backend                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Firestore (Persistent Data)                     │ │
│  │                                                           │ │
│  │  EXISTING COLLECTIONS:                                   │ │
│  │  • /users/{userId}                                       │ │
│  │  • /conversations/{conversationId}                       │ │
│  │    • /messages/{messageId}                               │ │
│  │                                                           │ │
│  │  NEW COLLECTIONS (OPTIONAL AI Features):                 │ │
│  │  • /extractedEvents/{eventId}                            │ │
│  │  • /decisions/{decisionId}                               │ │
│  │  • /deadlines/{deadlineId}                               │ │
│  │  • /rsvpTrackers/{trackerId}                             │ │
│  │  • /schedulingConflicts/{conflictId}                     │ │
│  │  • /scheduledReminders/{reminderId}                      │ │
│  │  • /messageEmbeddings/{messageId}                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │     Cloud Functions (AI Processing) (NEW)                │ │
│  │                                                           │ │
│  │  MESSAGE TRIGGERS:                                       │ │
│  │  • extractCalendarEvents (on message create)             │ │
│  │  • analyzePriority (on message create)                   │ │
│  │  • extractDeadlines (on message create)                  │ │
│  │  • trackRSVPs (on message create)                        │ │
│  │  • generateEmbeddings (on message create)                │ │
│  │                                                           │ │
│  │  SCHEDULED FUNCTIONS:                                    │ │
│  │  • summarizeDecisions (every 6 hours)                    │ │
│  │  • sendScheduledReminders (every 15 minutes)             │ │
│  │  • remindPendingRSVPs (daily 9am)                        │ │
│  │                                                           │ │
│  │  EVENT TRIGGERS:                                         │ │
│  │  • detectConflicts (on event create)                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ API Calls
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│               External Services                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Anthropic API (Claude Sonnet 4.5)                       │ │
│  │  • Event extraction                                      │ │
│  │  • Decision summarization                                │ │
│  │  • Priority analysis                                     │ │
│  │  • Deadline extraction                                   │ │
│  │  • Conflict resolution                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Pinecone (Vector Database)                              │ │
│  │  • Message embeddings storage                            │ │
│  │  • Conversation history search                           │ │
│  │  • RAG pipeline foundation                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  OpenAI API (Optional)                                   │ │
│  │  • Text embeddings (text-embedding-3-small)              │ │
│  │  • Cost: $0.0001 per 1K tokens                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Google Calendar API (Optional)                          │ │
│  │  • Event export                                          │ │
│  │  • Bidirectional sync                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Models (NEW Collections)

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string;
  conversationId: string;
  messageId: string;              // Source message
  title: string;                  // "Soccer practice"
  date: Timestamp;                // Date of event
  time?: string;                  // "3:00 PM" (optional)
  endTime?: string;               // "4:00 PM" (optional)
  location?: string;              // "Park", "123 Main St"
  participants: string[];         // User IDs involved
  status: 'proposed' | 'confirmed' | 'cancelled';
  extractedBy: 'ai' | 'user';
  confidence: number;             // 0-1 AI confidence score
  
  // Google Calendar Integration (Optional)
  googleCalendarId?: string;
  googleCalendarSyncedAt?: Timestamp;
  syncStatus?: 'synced' | 'pending' | 'failed';
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Decision

```typescript
interface Decision {
  id: string;
  conversationId: string;
  messageIds: string[];           // Messages that led to decision
  summary: string;                // "Decided to meet Saturday at 3pm"
  participants: string[];         // Who was involved
  decidedBy: string[];           // Who confirmed/agreed
  outcome: string;                // Final decision text
  actionItems?: string[];         // Extracted to-dos
  relatedEventIds?: string[];     // Linked calendar events
  status: 'active' | 'completed' | 'cancelled';
  completedAt?: Timestamp;
  createdAt: Timestamp;
}
```

### Priority (Embedded in Message)

```typescript
interface MessagePriority {
  level: 'urgent' | 'high' | 'normal';
  reason: string;                 // "Contains urgent keywords"
  keywords: string[];             // ["emergency", "hospital"]
  confidence: number;             // 0-1 AI confidence
  analyzedAt: Timestamp;
  suggestedAction?: string;       // "Call immediately"
}

// Stored in message document:
// /conversations/{conversationId}/messages/{messageId}
// {
//   content: {
//     text: "Emergency! Need pickup now",
//     metadata: {
//       priority: MessagePriority  // Added here
//     }
//   }
// }
```

### RSVPTracker

```typescript
interface RSVPTracker {
  id: string;
  conversationId: string;
  eventId: string;                // Link to CalendarEvent
  messageId: string;              // Original invitation
  hostUserId: string;
  invitees: string[];             // All participants
  responses: {
    [userId: string]: {
      status: 'yes' | 'no' | 'maybe' | 'pending';
      respondedAt?: Timestamp;
      messageId?: string;         // Message with response
    };
  };
  reminderSentAt?: Timestamp;
  createdAt: Timestamp;
}
```

### Deadline

```typescript
interface Deadline {
  id: string;
  conversationId: string;
  messageId: string;
  task: string;                   // "Submit permission slip"
  deadline: Timestamp;            // Due date/time
  assignedTo?: string;            // User ID if specified
  priority: 'urgent' | 'high' | 'normal';
  status: 'pending' | 'completed' | 'overdue';
  relatedEventId?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}
```

### ScheduledReminder

```typescript
interface ScheduledReminder {
  id: string;
  deadlineId: string;
  conversationId: string;
  userId: string;
  reminderTime: Timestamp;        // When to send
  task: string;
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: Timestamp;
  createdAt: Timestamp;
}
```

### SchedulingConflict

```typescript
interface SchedulingConflict {
  id: string;
  eventId: string;                // New event causing conflict
  conflictingEventIds: string[];  // Events it conflicts with
  participants: string[];         // Affected users
  detectedAt: Timestamp;
  status: 'unresolved' | 'resolved' | 'ignored';
  solutions?: ConflictSolution[];
  selectedSolution?: string;      // Solution ID
  resolvedAt?: Timestamp;
}

interface ConflictSolution {
  id: string;
  action: string;                 // "Reschedule soccer to 4pm"
  reasoning: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  automated: boolean;             // Can be done automatically
  actions: Array<{
    type: 'reschedule' | 'cancel' | 'notify';
    eventId: string;
    newTime?: Timestamp;
  }>;
}
```

### MessageEmbedding (RAG Pipeline)

```typescript
interface MessageEmbedding {
  messageId: string;              // Primary key
  conversationId: string;
  embedding: number[];            // 1536-dim vector (not stored in Firestore)
  embeddedAt: Timestamp;
  model: string;                  // "text-embedding-3-small"
  
  // Metadata for Pinecone filtering
  messageType?: 'event' | 'decision' | 'question' | 'statement';
  hasEvent: boolean;
  hasDecision: boolean;
  timestamp: number;              // Unix timestamp for time-based search
}
```

---

## RAG Pipeline Architecture

### Why RAG for Parent-Caregiver Features

RAG (Retrieval-Augmented Generation) enables context-aware AI that can:
- Answer questions about past plans: "When did we decide on the dentist?"
- Provide context for decisions: "Why Saturday for soccer?"
- Recall past events: "What time was last month's conference?"
- Detect similar conflicts: "We had this issue before..."

### RAG Flow

```
1. Message Created
   │
   ├─► Normal Message Flow (existing)
   │
   └─► Background Processing:
       │
       ├─► Should Embed? (skip if <10 chars, emoji-only)
       │   └─► YES
       │
       ├─► Generate Embedding
       │   └─► OpenAI text-embedding-3-small (1536 dims)
       │
       ├─► Store in Pinecone
       │   • messageId (unique ID)
       │   • embedding vector (1536 floats)
       │   • metadata: conversationId, timestamp, type
       │
       └─► Track in Firestore
           └─► /messageEmbeddings/{messageId}

2. AI Feature Needs Context (e.g., Decision Summarization)
   │
   └─► Query Pinecone
       │
       ├─► Generate query embedding
       │   └─► "decisions about weekend plans"
       │
       ├─► Search similar messages
       │   • Top 10 most relevant
       │   • Filter by conversationId
       │   • Filter by date range (optional)
       │
       ├─► Fetch full message content
       │   └─► From Firestore using messageIds
       │
       └─► Include in AI prompt
           └─► Enhanced context = better results
```

### RAG Implementation Services

**functions/src/services/embeddings.ts:**
```typescript
import OpenAI from 'openai';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}
```

**functions/src/services/pinecone.ts:**
```typescript
import { Pinecone } from '@pinecone-database/pinecone';

export async function upsertToPinecone(vector: {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}) {
  await index.upsert([vector]);
}

export async function searchConversationHistory(
  query: string,
  conversationId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const queryEmbedding = await generateQueryEmbedding(query);
  const results = await index.query({
    vector: queryEmbedding,
    topK: limit,
    filter: { conversationId: { $eq: conversationId } },
    includeMetadata: true,
  });
  return results.matches;
}
```

**functions/src/services/rag-helper.ts:**
```typescript
export async function enhancePromptWithContext(
  prompt: string,
  conversationId: string,
  query: string
): Promise<string> {
  const relevantMessages = await searchConversationHistory(
    query,
    conversationId,
    10
  );
  
  if (relevantMessages.length === 0) return prompt;
  
  const messages = await Promise.all(
    relevantMessages.map(r => fetchMessage(r.messageId))
  );
  
  const contextSection = `
CONVERSATION HISTORY (Most Relevant):
${messages.map((m, i) => `
[${i + 1}] ${formatDate(m.timestamp)} - ${m.senderName}:
${m.content.text}
`).join('\n')}

---
`;
  
  return contextSection + prompt;
}
```

---

## AI Processing Pipeline

### Event Extraction Pipeline

```
Message Created → Pre-filter (temporal keywords)
   │
   ├─► NO keywords → Skip
   │
   └─► HAS keywords
       │
       ├─► Enhance with RAG context
       │   └─► Query: "similar events and plans"
       │
       ├─► Call Claude API
       │   • Model: claude-sonnet-4.5
       │   • Prompt: EVENT_EXTRACTION_PROMPT
       │   • Context: Message + conversation history
       │
       ├─► Parse Response
       │   • Extract: title, date, time, location
       │   • Validate: date is future, time is valid
       │   • Confidence: 0-1 score
       │
       ├─► Save to /extractedEvents
       │
       └─► Notify participants
           └─► Show EventCard in UI
```

### Priority Analysis Pipeline

```
Message Created → Quick keyword check
   │
   ├─► NO urgent keywords → Set priority: normal
   │
   └─► HAS urgent keywords
       │
       ├─► Call Claude API for refined analysis
       │   • Prompt: PRIORITY_ANALYSIS_PROMPT
       │   • Consider: time sensitivity, impact, tone
       │
       ├─► Update message document
       │   └─► content.metadata.priority
       │
       └─► IF urgent:
           ├─► Send priority push notification
           └─► Custom sound + high priority flag
```

### Decision Summarization Pipeline (Scheduled)

```
Every 6 hours:
   │
   ├─► Get active conversations
   │
   └─► For each conversation:
       │
       ├─► Fetch last 50 messages
       │
       ├─► Pre-filter (decision keywords)
       │   └─► NO keywords → Skip
       │
       ├─► Enhance with RAG context
       │   └─► Query: "decisions and agreements"
       │
       ├─► Call Claude API
       │   • Prompt: DECISION_PROMPT
       │   • Context: Recent messages + history
       │
       ├─► Parse decisions
       │   • summary, outcome, action items
       │
       └─► Save to /decisions
           └─► Notify participants
```

---

## Cost Analysis

### AI Usage Estimates (100 users, 1 month)

| Feature | Trigger | Calls/User/Month | Total Calls | Cost |
|---------|---------|------------------|-------------|------|
| Calendar Extraction | Per message w/ temporal keywords | 30 | 3,000 | $9.00 |
| Priority Analysis | Per message w/ urgent keywords | 10 | 1,000 | $3.00 |
| Decision Summarization | Scheduled (every 6 hours) | 5 | 500 | $1.50 |
| Deadline Extraction | Per message w/ deadline keywords | 15 | 1,500 | $4.50 |
| RSVP Tracking | Pattern matching (no AI) | 0 | 0 | $0.00 |
| Conflict Detection | Per event creation | 3 | 300 | $0.90 |
| **Subtotal AI Calls** | | | **6,300** | **$18.90** |

### RAG Pipeline Costs

| Component | Usage | Cost/User/Month |
|-----------|-------|-----------------|
| OpenAI Embeddings | 100 messages | $0.015 |
| Pinecone Storage | ~1,000 vectors | $0.096 |
| Pinecone Queries | ~50 queries | $0.002 |
| **RAG Subtotal** | | **$0.113** |

### Total Cost

- **AI Features:** $0.19/user/month
- **RAG Pipeline:** $0.11/user/month
- **Total:** **$0.30/user/month**

### Cost Optimization Strategies

1. **Pre-filtering:** Only call AI when keywords detected (saves 70-80% of calls)
2. **Batch processing:** Process decisions in batches vs. per-message
3. **Caching:** Cache similar AI responses
4. **Smart triggers:** Only embed substantial messages (>10 chars)
5. **Metadata filtering:** Use Pinecone filters to reduce search space

---

## Security & Privacy

### Data Privacy Principles

1. **User data never leaves Firebase/AI services**
   - No third-party analytics
   - No data selling
   - No cross-user training

2. **AI processing is ephemeral**
   - Messages sent to Claude API for processing
   - Anthropic doesn't train on API data
   - Results stored in Firebase only

3. **Embeddings are private**
   - Stored in Pinecone with user isolation
   - Conversations filtered by conversationId
   - No cross-conversation leakage

### Security Rules Extensions

**Firestore Security Rules:**
```javascript
// New collections (add to existing rules)

match /extractedEvents/{eventId} {
  allow read: if isParticipant(resource.data.conversationId);
  allow write: if isParticipant(request.resource.data.conversationId);
}

match /decisions/{decisionId} {
  allow read: if isParticipant(resource.data.conversationId);
  allow write: if isParticipant(request.resource.data.conversationId);
}

match /deadlines/{deadlineId} {
  allow read: if isParticipant(resource.data.conversationId)
                || request.auth.uid == resource.data.assignedTo;
  allow write: if isParticipant(request.resource.data.conversationId);
}

match /rsvpTrackers/{trackerId} {
  allow read: if isParticipant(resource.data.conversationId);
  allow write: if isParticipant(request.resource.data.conversationId);
}

match /schedulingConflicts/{conflictId} {
  allow read: if request.auth.uid in resource.data.participants;
  allow write: if request.auth.uid in request.resource.data.participants;
}

function isParticipant(conversationId) {
  return request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
}
```

---

## Performance Considerations

### Latency Targets

| Operation | Target | Actual (Expected) |
|-----------|--------|-------------------|
| Event extraction | <2s | 1-1.5s |
| Priority analysis | <1s | 0.5-1s |
| Decision summarization | N/A (background) | 3-5s |
| RAG search | <500ms | 200-400ms |
| Conflict detection | <2s | 1-2s |

### Optimization Strategies

1. **Pre-filtering reduces AI calls by 70-80%**
2. **Parallel processing** for multiple AI tasks
3. **Caching** for repeated queries
4. **Lazy loading** for UI components
5. **Batch operations** for scheduled functions

---

## Integration with Existing Architecture

### Minimal Changes to Core App

**✅ Zero breaking changes to existing features**

**New additions:**
- 6 new Firestore collections (optional)
- 8 new Cloud Functions (optional)
- 6 new UI components (optional)
- 3 new screens (optional)

**Graceful degradation:**
- If AI features disabled: Core messaging works perfectly
- If RAG fails: AI features work without context (reduced quality)
- If Pinecone down: No embeddings, but features still function

---

## References

- **Full Implementation Spec:** See `phase2-parent-caregiver-tasks.md` (2,400 lines)
- **Task Breakdown:** See `task-list-appendix-b.md`
- **Core Architecture:** See `architecture.md`
- **Generic AI (Phase 7):** See `task-list.md` Phase 7

---

**Document Status:** Reference Architecture (optional implementation)  
**Last Updated:** October 22, 2025  
**Version:** 1.0

