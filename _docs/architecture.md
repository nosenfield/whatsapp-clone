# Tech Stack and Architecture
**Messaging App with AI Layer - iOS MVP**

---

## Table of Contents
1. [Tech Stack Overview](#tech-stack-overview)
2. [Architectural Decisions](#architectural-decisions)
3. [System Architecture](#system-architecture)
4. [Data Models](#data-models)
5. [Real-Time Data Flow](#real-time-data-flow)
6. [AI Integration Foundation](#ai-integration-foundation)
7. [Constraints and Limits](#constraints-and-limits)

---

## Tech Stack Overview

### Mobile Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React Native + Expo | Cross-platform mobile framework | SDK 51+ |
| TypeScript | Type-safe development | 5.x (strict mode) |
| Expo Router | File-based navigation | Latest |
| Expo SQLite | Local message persistence | Latest |
| React Query | Server state synchronization | 5.x |
| Zustand | Client state management | 4.x |
| Firebase SDK (React Native) | Backend integration | 10.x |
| Expo Push Notifications | Push notification service | Latest |
| Expo Image Picker | Media selection | Latest |

### Backend Services
| Service | Purpose | Notes |
|---------|---------|-------|
| Firebase Firestore | Persistent data storage | Messages, users, conversations |
| Firebase Realtime Database | Ephemeral data | Presence, typing indicators |
| Firebase Cloud Functions | Serverless backend logic | TypeScript, Node 20 |
| Firebase Auth | User authentication | Email/password initially |
| Firebase Storage | Media file storage | Images, future: videos/files |
| Expo Push Service | Push notifications | Simplifies APNs configuration |

### AI Layer (Future Phase)
| Technology | Purpose | Notes |
|------------|---------|-------|
| Vercel AI SDK | AI integration framework | TypeScript-native, streaming |
| Anthropic Claude 3.5 Sonnet | LLM provider | Instruction-following优秀 |
| Pinecone | Vector database | RAG pipeline for conversation history |
| LangChain | Agent orchestration | Optional, if complex workflows needed |

### Development Tools
- **Expo Go**: Initial development and testing
- **EAS Build**: TestFlight deployment pipeline
- **Expo Dev Client**: Custom native module support (if needed)
- **Firebase Emulator Suite**: Local backend testing
- **TypeScript Compiler**: Strict mode enabled

---

## Architectural Decisions

### 1. React Native + Expo (Not Swift)
**Decision**: Use React Native with Expo managed workflow

**Rationale**:
- Leverages existing TypeScript expertise
- Faster development cycle than learning Swift
- Unified codebase for iOS (and potential Android future)
- Expo simplifies push notifications, deployment, and OTA updates
- Firebase SDK well-supported in React Native ecosystem

**Trade-offs**:
- Slightly larger bundle size than native Swift
- Some native iOS features require custom dev client
- Performance differences negligible for messaging app use case

---

### 2. Dual Database Strategy
**Decision**: Firebase Firestore + Firebase Realtime Database

**Rationale**:
- **Firestore** for persistent data requiring complex queries
  - Messages with pagination
  - User profiles with search
  - Conversation metadata
  - Read receipts (persistent state)
  
- **RTDB** for ephemeral, high-frequency updates
  - Typing indicators (auto-cleanup)
  - Online/offline presence
  - "Viewing conversation" status
  - Connection state

**Why not Firestore-only?**
- Typing indicators would cost 10-100x more in Firestore
- RTDB has lower latency for presence updates
- RTDB's automatic connection state management
- Cost optimization for high-frequency ephemeral writes

**Structure**:
```
Firestore: /users, /conversations, /messages
RTDB: /presence/{userId}, /typing/{conversationId}/{userId}
```

---

### 3. Expo Push Notifications (Not FCM Directly)
**Decision**: Use Expo Push Notification service

**Rationale**:
- Abstracts APNs certificate complexity
- Works immediately with Expo Go during development
- Unified API for iOS and Android
- Simpler Cloud Function integration
- Can migrate to FCM later if needed without major refactor

**Flow**:
```
Cloud Function → Expo Push API → APNs → iOS Device
```

**Trade-offs**:
- Additional hop adds minor latency (~50-100ms)
- Dependency on Expo infrastructure
- Less control over advanced notification features initially

---

### 4. Optimistic UI with Local SQLite
**Decision**: SQLite for local persistence, optimistic updates pattern

**Rationale**:
- Messages appear instantly when sent
- App works offline with full chat history
- SQLite provides relational querying for complex filtering
- Temporary local IDs replaced with server IDs on sync

**Pattern**:
1. User sends message → immediately inserted into SQLite with `status: 'sending'`
2. UI renders message from SQLite
3. Firebase write initiated
4. On success: Update SQLite with server ID and `status: 'sent'`
5. On failure: Mark as failed, allow retry

---

### 5. 20-User Group Chat Limit
**Decision**: Maximum 20 users per group for MVP

**Rationale**:
- Avoids message fanout complexity (20 writes vs 100 per message)
- Reduces read receipt aggregation overhead
- Keeps typing indicator broadcasts manageable
- Proves infrastructure without excessive Firestore costs
- Architecture designed for future expansion

**Implementation**:
```typescript
const MAX_GROUP_SIZE = 20; // Hardcoded business rule
```

---

### 6. AI-Ready Data Architecture
**Decision**: Build extensible data models for future AI integration

**Rationale**:
- `metadata` fields in messages for AI annotations
- Separate `ConversationContext` collection for summaries/embeddings
- `ActionQueue` pattern for async AI processing
- Feature flags for gradual AI rollout

**Benefits**:
- Add AI features without schema migrations
- Decouple AI processing from core messaging
- Enable/disable AI per user or conversation
- Test AI features safely in production

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    iOS Device (React Native App)            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              UI Layer (React Components)            │    │
│  │  - Chat List Screen                                 │    │
│  │  - Conversation Screen                              │    │
│  │  - Profile Screen                                   │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐    │
│  │         State Management Layer                      │    │
│  │                                                      │    │
│  │  ┌─────────────────┐      ┌────────────────────┐  │    │
│  │  │  React Query    │      │     Zustand        │  │    │
│  │  │  (Server Sync)  │      │  (Client State)    │  │    │
│  │  │  - Messages     │      │  - UI state        │  │    │
│  │  │  - Users        │      │  - Optimistic msgs │  │    │
│  │  └─────────────────┘      └────────────────────┘  │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│  ┌───────────────────▼────────────────────────────────┐    │
│  │          Local Storage (SQLite)                     │    │
│  │  - Messages cache                                   │    │
│  │  - User profiles cache                              │    │
│  │  - Conversation metadata                            │    │
│  │  - Pending outbound messages                        │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       │ Firebase SDK
                       │ (WebSocket + REST)
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                     Firebase Backend                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Firebase Firestore                       │   │
│  │  (Persistent Data)                                    │   │
│  │                                                        │   │
│  │  /users/{userId}                                      │   │
│  │    - profile, pushToken, preferences                  │   │
│  │                                                        │   │
│  │  /conversations/{conversationId}                      │   │
│  │    - participants, metadata, lastMessage              │   │
│  │    /messages/{messageId} [subcollection]              │   │
│  │      - content, sender, timestamp, status             │   │
│  │                                                        │   │
│  │  /conversationContext/{conversationId} [Future AI]    │   │
│  │    - summary, embeddings, preferences                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Firebase Realtime Database                    │   │
│  │  (Ephemeral Data)                                     │   │
│  │                                                        │   │
│  │  /presence/{userId}                                   │   │
│  │    - online: boolean, lastSeen: timestamp             │   │
│  │                                                        │   │
│  │  /typing/{conversationId}/{userId}                    │   │
│  │    - isTyping: boolean, timestamp                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Firebase Cloud Functions                     │   │
│  │  (TypeScript, Node 20)                                │   │
│  │                                                        │   │
│  │  - onMessageCreate: Trigger push notifications        │   │
│  │  - updatePresence: Handle user online/offline         │   │
│  │  - handleGroupMessage: Message fanout for groups      │   │
│  │  - processMediaUpload: Image optimization             │   │
│  │  - [Future] processAIAction: AI feature processing    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Firebase Storage                           │   │
│  │  /profile-images/{userId}/{imageId}                   │   │
│  │  /message-media/{conversationId}/{mediaId}            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Firebase Auth                              │   │
│  │  - Email/password authentication                      │   │
│  │  - User session management                            │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                │ Expo Push API
                                │
                        ┌───────▼────────┐
                        │  Expo Push      │
                        │  Service        │
                        └───────┬────────┘
                                │
                                │ APNs
                                │
                        ┌───────▼────────┐
                        │  Apple Push     │
                        │  Notification   │
                        │  Service        │
                        └────────────────┘
```

---

## Data Models

### Firestore Schema

#### Users Collection
```typescript
// /users/{userId}
interface User {
  id: string;                    // Auth UID
  email: string;
  displayName: string;
  photoURL?: string;             // Firebase Storage URL
  pushToken?: string;            // Expo push token
  createdAt: Timestamp;
  lastActive: Timestamp;
  
  // Future AI features
  preferences?: {
    language?: string;
    aiEnabled?: boolean;
    autoTranslate?: boolean;
  };
}
```

#### Conversations Collection
```typescript
// /conversations/{conversationId}
interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];        // Array of user IDs
  participantDetails: {          // Denormalized for quick access
    [userId: string]: {
      displayName: string;
      photoURL?: string;
    };
  };
  
  // Group-specific fields
  name?: string;                 // Group name (if type === 'group')
  createdBy?: string;            // User ID
  
  // Metadata
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: Timestamp;
  };
  
  // Message counts per user for badge indicators
  unreadCount: {
    [userId: string]: number;
  };
}
```

#### Messages Subcollection
```typescript
// /conversations/{conversationId}/messages/{messageId}
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  
  content: {
    text: string;
    type: 'text' | 'image' | 'file';
    mediaUrl?: string;           // Firebase Storage URL
    mediaThumbnail?: string;     // Compressed thumbnail
    
    // Future AI features
    metadata?: {
      translation?: {
        [language: string]: string;
      };
      sentiment?: 'positive' | 'neutral' | 'negative';
      aiSuggestions?: string[];
    };
  };
  
  timestamp: Timestamp;
  
  // Delivery tracking
  status: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredTo: string[];         // User IDs who received
  readBy: {                      // Read receipts
    [userId: string]: Timestamp;
  };
  
  // Optimistic updates
  localId?: string;              // Temporary ID before server confirmation
  
  // Soft delete
  deletedAt?: Timestamp;
  deletedFor?: string[];         // User IDs who deleted this message
}
```

#### Conversation Context Collection (Future AI)
```typescript
// /conversationContext/{conversationId}
interface ConversationContext {
  conversationId: string;
  
  // AI-generated summaries
  summary?: {
    text: string;
    generatedAt: Timestamp;
    messageCount: number;        // # of messages summarized
  };
  
  // Vector embeddings for RAG
  lastEmbeddingUpdate?: Timestamp;
  embeddingVersion?: string;
  
  // Participant preferences
  participantPreferences?: {
    [userId: string]: {
      language?: string;
      tone?: 'formal' | 'casual';
      aiAssistantEnabled?: boolean;
    };
  };
  
  // Action items extracted by AI
  actionItems?: Array<{
    text: string;
    extractedAt: Timestamp;
    assignedTo?: string;
    completed?: boolean;
  }>;
}
```

### Firebase Realtime Database Schema

```javascript
// Presence tracking
/presence/{userId}
{
  online: true,
  lastSeen: 1729456789000,      // Timestamp
  connections: {                 // Multiple device support
    "connection-id-1": true
  }
}

// Typing indicators
/typing/{conversationId}/{userId}
{
  isTyping: true,
  timestamp: 1729456789000       // Auto-expire after 5 seconds
}

// Connection state (managed by Firebase)
/.info/connected                 // Special Firebase path for connection status
```

### Local SQLite Schema

```sql
-- Messages table (mirrors Firestore with additional local state)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  localId TEXT UNIQUE,           -- Temporary ID for optimistic updates
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  contentText TEXT NOT NULL,
  contentType TEXT DEFAULT 'text',
  mediaUrl TEXT,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL,          -- 'sending' | 'sent' | 'delivered' | 'read'
  syncStatus TEXT DEFAULT 'synced', -- 'pending' | 'synced' | 'failed'
  createdAt INTEGER DEFAULT (strftime('%s', 'now')),
  
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);

-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  participants TEXT NOT NULL,    -- JSON array
  name TEXT,
  lastMessageText TEXT,
  lastMessageAt INTEGER,
  unreadCount INTEGER DEFAULT 0,
  createdAt INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Users cache
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  displayName TEXT NOT NULL,
  email TEXT NOT NULL,
  photoURL TEXT,
  lastSynced INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversationId, timestamp DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_sync ON messages(syncStatus);
```

---

## Real-Time Data Flow

### Message Send Flow

```
User Types → Presses Send
       │
       ├──[1]──► Insert into SQLite (status: 'sending', localId: 'temp-123')
       │
       ├──[2]──► UI renders message immediately (optimistic update)
       │
       ├──[3]──► Zustand stores optimistic message in state
       │
       └──[4]──► Firebase SDK writes to Firestore
                        │
                        ├─[SUCCESS]──► Cloud Function triggered
                        │                    │
                        │                    ├──► Send push notification to recipients
                        │                    │
                        │                    └──► Update conversation lastMessage
                        │
                        ├──[5]──► Update SQLite (replace localId with serverId, status: 'sent')
                        │
                        └──[6]──► React Query invalidates, UI re-renders with server data
                        
                        ├─[FAILURE]──► Update SQLite (status: 'failed')
                                       │
                                       └──► Show retry button in UI
```

### Message Receive Flow

```
Sender's Device → Firestore Write
                        │
                        ├──[1]──► Cloud Function sends push notification
                        │
                        └──[2]──► Firestore listener on recipient's device fires
                                         │
                                         ├──[3]──► React Query cache updated
                                         │
                                         ├──[4]──► SQLite updated
                                         │
                                         └──[5]──► UI re-renders with new message
                                         
                                         ├──[6]──► If app in foreground + conversation open:
                                                         │
                                                         ├──► Mark as 'read' immediately
                                                         │
                                                         └──► Update message.readBy in Firestore
```

### Presence Update Flow

```
App State Change (foreground/background)
       │
       ├──[Online]──► Write to RTDB /presence/{userId}
       │                    │
       │                    └──► { online: true, lastSeen: timestamp }
       │
       └──[Offline]──► Firebase SDK automatically updates
                             │
                             └──► onDisconnect() hook sets { online: false }

Other Users' Devices
       │
       └──► RTDB listener fires
              │
              └──► UI updates presence indicator (green dot / "last seen")
```

### Typing Indicator Flow

```
User Types in Input Field
       │
       └──► Debounced function (300ms)
              │
              ├──[Start Typing]──► Write to RTDB /typing/{conversationId}/{userId}
              │                          │
              │                          └──► { isTyping: true, timestamp }
              │
              └──[Stop Typing (after 5s)]──► Remove from RTDB
                                                  │
                                                  └──► Auto-cleanup via timestamp check

Other Participants
       │
       └──► RTDB listener fires
              │
              └──► UI shows "John is typing..." indicator
```

---

## AI Integration Foundation

### Design Principles
1. **Decouple AI from core messaging**: AI failures don't break chat
2. **Async processing**: AI happens in background via Cloud Functions
3. **Opt-in features**: Users can disable AI per conversation
4. **Cost-aware**: Rate limiting and caching to control API costs

### Action Queue Pattern

```typescript
// Firestore collection: /actionQueue/{actionId}
interface AIAction {
  id: string;
  type: 'summarize' | 'translate' | 'extract_action_items' | 'generate_reply';
  conversationId: string;
  messageIds?: string[];         // Relevant messages
  requestedBy: string;           // User ID
  
  parameters?: {
    targetLanguage?: string;
    tone?: 'formal' | 'casual';
  };
  
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;                  // AI output
  error?: string;
  
  createdAt: Timestamp;
  processedAt?: Timestamp;
}
```

### Cloud Function for AI Processing

```typescript
// Cloud Function triggered by actionQueue creation
export const processAIAction = functions.firestore
  .document('actionQueue/{actionId}')
  .onCreate(async (snap, context) => {
    const action = snap.data() as AIAction;
    
    try {
      await snap.ref.update({ status: 'processing' });
      
      // Fetch relevant conversation history
      const messages = await fetchConversationHistory(
        action.conversationId,
        action.messageIds
      );
      
      // Call AI service (Anthropic Claude via Vercel AI SDK)
      const result = await callAIService(action.type, messages, action.parameters);
      
      // Store result
      await snap.ref.update({
        status: 'completed',
        result: result,
        processedAt: FieldValue.serverTimestamp()
      });
      
      // Optionally: Update conversationContext with embeddings
      if (action.type === 'summarize') {
        await updateConversationContext(action.conversationId, result);
      }
      
    } catch (error) {
      await snap.ref.update({
        status: 'failed',
        error: error.message
      });
    }
  });
```

### RAG Pipeline (Future)

```
User asks AI: "What did we decide about the meeting?"
       │
       ├──[1]──► Generate query embedding (OpenAI text-embedding-3-small)
       │
       ├──[2]──► Search Pinecone for relevant message chunks
       │                │
       │                └──► Returns top 10 similar messages
       │
       ├──[3]──► Fetch full message context from Firestore
       │
       ├──[4]──► Construct prompt with context for Claude
       │
       └──[5]──► Stream AI response back to user
```

### Feature Flags

```typescript
// /users/{userId}/preferences
interface AIPreferences {
  aiEnabled: boolean;
  features: {
    autoSummarize: boolean;      // Summarize long conversations
    smartReplies: boolean;       // Suggest quick replies
    autoTranslate: boolean;      // Translate incoming messages
    actionItemExtraction: boolean;
  };
  
  // Usage tracking for cost management
  aiCallsThisMonth: number;
  lastResetDate: Timestamp;
}
```

---

## Constraints and Limits

### Business Rules
| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max group size | 20 users | Reduces fanout complexity, cost optimization |
| Max message length | 5,000 characters | Prevents abuse, UI readability |
| Max image size | 10 MB | Storage costs, upload speed |
| Message retention | Unlimited (MVP) | Add archival policy post-MVP |
| Typing indicator timeout | 5 seconds | Balance responsiveness vs noise |

### Technical Limits
| Resource | Limit | Notes |
|----------|-------|-------|
| Firestore reads/day | 50,000 (free tier) | Monitor usage, upgrade if needed |
| Firestore writes/day | 20,000 (free tier) | Efficient for 5-100 users |
| Cloud Functions executions | 125,000/month (free) | Should be sufficient for MVP |
| Firebase Storage | 5 GB (free tier) | ~500-1000 images |
| Expo Push Notifications | Unlimited | Free service |

### Rate Limits (To Implement)
```typescript
// Per-user rate limits
const RATE_LIMITS = {
  messagesPerMinute: 30,         // Prevent spam
  groupCreationsPerHour: 5,      // Prevent abuse
  mediaUploadsPerHour: 20,
  
  // AI features (future)
  aiCallsPerDay: 50,             // Cost control
  aiCallsPerConversation: 10     // Prevent runaway costs
};
```

---

## Security Rules

### Firestore Security Rules (Basic)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Conversations: Only participants can read
    match /conversations/{conversationId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.participants;
      
      // Messages: Only conversation participants can read/write
      match /messages/{messageId} {
        allow read: if request.auth != null && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        allow create: if request.auth != null && 
                         request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants &&
                         request.resource.data.senderId == request.auth.uid;
        allow update: if request.auth != null && 
                         request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### RTDB Security Rules

```json
{
  "rules": {
    "presence": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    },
    "typing": {
      "$conversationId": {
        "$userId": {
          ".read": true,
          ".write": "$userId === auth.uid"
        }
      }
    }
  }
}
```

---

## Development Phases

### Phase 1: Core Infrastructure (Week 1-2)
- ✅ Firebase project setup
- ✅ React Native + Expo project initialization
- ✅ Authentication flow (email/password)
- ✅ Basic navigation structure
- ✅ SQLite local storage setup

### Phase 2: One-on-One Messaging (Week 3-4)
- ✅ Send/receive text messages
- ✅ Real-time Firestore listeners
- ✅ Optimistic UI updates
- ✅ Message persistence (SQLite)
- ✅ Delivery status indicators

### Phase 3: Presence & Ephemeral Data (Week 5)
- ✅ Online/offline indicators (RTDB)
- ✅ Typing indicators
- ✅ "Last seen" timestamps
- ✅ Connection state management

### Phase 4: Media & Group Chat (Week 6-7)
- ✅ Image upload/download
- ✅ Group creation (up to 20 users)
- ✅ Group message handling
- ✅ Read receipts

### Phase 5: Push Notifications (Week 8)
- ✅ Expo push token registration
- ✅ Cloud Function for push triggers
- ✅ Notification handling (foreground/background)
- ✅ Deep linking to conversations

### Phase 6: Polish & Testing (Week 9-10)
- ✅ Error handling
- ✅ Offline mode
- ✅ TestFlight deployment
- ✅ Alpha testing with 5-100 users

### Phase 7: AI Integration (Post-MVP)
- ⏳ Action queue implementation
- ⏳ RAG pipeline for conversation search
- ⏳ AI assistant chat interface
- ⏳ Translation/summarization features
- ⏳ Feature flags and A/B testing

---

## Deployment Strategy

### Development
```bash
# Run on Expo Go
npx expo start

# Test on physical iOS device
# Scan QR code with Camera app
```

### TestFlight (Alpha Testing)
```bash
# Build for iOS
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios

# Invite 5-100 alpha testers via email
```

### Backend Deployment
```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy RTDB rules
firebase deploy --only database
```

---

## Monitoring & Observability

### Metrics to Track
- **Messaging reliability**: Message delivery success rate
- **Latency**: Time from send to recipient notification
- **Firestore usage**: Reads/writes per day
- **Storage usage**: Media file storage growth
- **Push notification delivery rate**
- **Crash rate**: Via Expo/Sentry
- **Active users**: Daily/weekly/monthly

### Tools
- Firebase Console (usage metrics)
- Expo Application Services (crash reporting)
- Custom Cloud Function logging
- (Future) Sentry for error tracking

---

## References & Documentation

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Expo Documentation](https://docs.expo.dev/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Document Version**: 1.0  
**Last Updated**: October 20, 2025  
**Status**: Approved for Implementation
