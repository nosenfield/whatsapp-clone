# System Patterns

**Last Updated:** October 20, 2025

---

## Architectural Overview

The system uses a three-tier architecture with local-first data access:

```
┌─────────────────────────────────────┐
│      React Native Mobile App        │
│  (UI Layer + Client State)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Local Data Layer (SQLite)      │
│  (Cache + Offline Queue)            │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│      Firebase Backend               │
│  (Firestore + RTDB + Functions)     │
└─────────────────────────────────────┘
```

---

## Core Design Patterns

### 1. Dual Database Pattern

**Pattern**: Use two complementary databases for different access patterns

**Implementation**:
- **Firestore**: Persistent, queryable data (messages, users, conversations)
- **Realtime Database (RTDB)**: Ephemeral, high-frequency data (presence, typing)

**Why**:
- Firestore excels at complex queries but has higher latency (~100-300ms)
- RTDB excels at speed (<50ms) but limited query capability
- Different data has different requirements

**Example**:
```typescript
// Persistent message data → Firestore
await firestore
  .collection('conversations').doc(conversationId)
  .collection('messages').add(message);

// Ephemeral typing status → RTDB
await realtimeDb
  .ref(`typing/${conversationId}/${userId}`)
  .set({ isTyping: true, timestamp: Date.now() });
```

**Trade-offs**:
- ✅ Optimized for each use case
- ✅ Cost-effective (RTDB cheaper for high-frequency writes)
- ❌ More complex setup
- ❌ Two databases to maintain

---

### 2. Optimistic UI Pattern

**Pattern**: Update UI immediately, sync with server in background

**Flow**:
```
User Action → Instant UI Update → Background Server Sync → Reconcile
```

**Implementation**:
1. Generate temporary local ID
2. Insert into SQLite with `status: 'sending'`
3. Update UI immediately (appears sent)
4. Initiate Firebase write
5. On success: Replace local ID with server ID
6. On failure: Show retry option

**Example**:
```typescript
// 1. Optimistic update
const tempId = generateTempId();
const optimisticMessage = {
  localId: tempId,
  status: 'sending',
  ...messageData
};

// 2. Update local state immediately
await database.insertMessage(optimisticMessage);
messageStore.addOptimisticMessage(optimisticMessage);

// 3. Sync to server in background
try {
  const serverMessage = await firestore.addMessage(messageData);
  await database.updateMessage(tempId, { id: serverMessage.id, status: 'sent' });
  messageStore.removeOptimisticMessage(tempId);
} catch (error) {
  await database.updateMessage(tempId, { status: 'failed' });
}
```

**Benefits**:
- ✅ Instant user feedback
- ✅ App feels fast
- ✅ Works offline

**Challenges**:
- ❌ Must handle sync conflicts
- ❌ Need retry logic
- ❌ Complexity in error states

---

### 3. Local-First Data Access

**Pattern**: Always read from local cache first, sync in background

**Flow**:
```
Read Request → SQLite (instant) → Firestore (background) → Merge & Update
```

**Implementation**:
```typescript
// Hook pattern for data access
function useConversationMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    // 1. Load from SQLite immediately
    database.getMessages(conversationId).then(setMessages);
    
    // 2. Subscribe to Firestore updates
    const unsubscribe = firestore
      .collection('conversations').doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        // 3. Merge with local data
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            database.insertMessage(change.doc.data());
          }
        });
        
        // 4. Re-query local database
        database.getMessages(conversationId).then(setMessages);
      });
    
    return unsubscribe;
  }, [conversationId]);
  
  return messages;
}
```

**Benefits**:
- ✅ Instant app startup
- ✅ Works offline
- ✅ Smooth UX

---

### 4. Service Layer Pattern

**Pattern**: Encapsulate all external dependencies behind service interfaces

**Structure**:
```
src/services/
├── firebase-auth.ts         # Authentication operations
├── firebase-firestore.ts    # Firestore CRUD
├── firebase-rtdb.ts         # Realtime Database operations
├── firebase-storage.ts      # File upload/download
└── database.ts              # SQLite operations
```

**Example**:
```typescript
// Service interface
export const FirestoreService = {
  async sendMessage(conversationId: string, message: Message) {
    // Centralized error handling
    try {
      return await firestore
        .collection('conversations').doc(conversationId)
        .collection('messages').add(message);
    } catch (error) {
      logger.error('Failed to send message', error);
      throw new MessageSendError(error);
    }
  }
};

// Usage in components
import { FirestoreService } from '@/services/firebase-firestore';
await FirestoreService.sendMessage(conversationId, message);
```

**Benefits**:
- ✅ Testability (mock services)
- ✅ Centralized error handling
- ✅ Easy to swap implementations
- ✅ Type safety

---

### 5. State Management Pattern

**Pattern**: Use appropriate state management for different data types

**Strategy**:
```
Server State (messages, users) → React Query
Client State (UI, optimistic) → Zustand
Form State (inputs) → Local useState
```

**Implementation**:
```typescript
// React Query for server-synced state
const { data: messages } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => FirestoreService.getMessages(conversationId),
  staleTime: 30000,
});

// Zustand for client state
interface MessageStore {
  optimisticMessages: Message[];
  addOptimisticMessage: (message: Message) => void;
}

const useMessageStore = create<MessageStore>((set) => ({
  optimisticMessages: [],
  addOptimisticMessage: (message) => 
    set((state) => ({ 
      optimisticMessages: [...state.optimisticMessages, message] 
    })),
}));
```

**Rationale**:
- React Query handles caching, refetching, deduplication
- Zustand for simple client state without React Query overhead
- Local state for ephemeral UI state

---

### 6. Presence Management Pattern

**Pattern**: Automatic online/offline tracking with connection state management

**Implementation**:
```typescript
// On app foreground
await realtimeDb.ref(`presence/${userId}`).set({
  online: true,
  lastSeen: serverTimestamp()
});

// On app background/disconnect (automatic)
await realtimeDb.ref(`presence/${userId}`).onDisconnect().set({
  online: false,
  lastSeen: serverTimestamp()
});

// Monitor connection state
realtimeDb.ref('.info/connected').on('value', (snapshot) => {
  if (snapshot.val() === true) {
    // Connected - set presence
  } else {
    // Disconnected - onDisconnect handles cleanup
  }
});
```

**Key Features**:
- Automatic cleanup on disconnect (Firebase SDK handles this)
- Multiple device support via connection IDs
- Sub-50ms updates via RTDB

---

### 7. Push Notification Pattern

**Pattern**: Server-side notification triggers with client-side handling

**Flow**:
```
Message Created → Cloud Function → Expo Push API → APNs → Device
```

**Implementation**:
```typescript
// Cloud Function (server-side)
export const sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap) => {
    const message = snap.data();
    
    // Get recipient push tokens
    const recipients = await getRecipients(conversationId, message.senderId);
    
    // Send via Expo Push API
    await expo.sendPushNotificationsAsync(
      recipients.map(token => ({
        to: token,
        title: message.senderName,
        body: message.text,
        data: { conversationId }
      }))
    );
  });

// Client-side (mobile app)
Notifications.addNotificationReceivedListener(notification => {
  // Handle foreground notification
  showInAppAlert(notification);
});

Notifications.addNotificationResponseReceivedListener(response => {
  // User tapped notification - navigate to conversation
  router.push(`/conversation/${response.notification.data.conversationId}`);
});
```

---

### 8. Error Handling Pattern

**Pattern**: Layered error handling with user-friendly messages

**Layers**:
1. **Service Layer**: Catch and classify errors
2. **Component Layer**: Display appropriate UI
3. **Global Boundary**: Catch unexpected errors

**Implementation**:
```typescript
// Custom error types
class MessageSendError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

// Service layer
async function sendMessage(data: Message) {
  try {
    return await firestore.addMessage(data);
  } catch (error) {
    if (error.code === 'permission-denied') {
      throw new MessageSendError('You cannot send messages to this conversation', 'PERMISSION_DENIED');
    }
    throw new MessageSendError('Failed to send message. Please try again.', 'UNKNOWN');
  }
}

// Component layer
try {
  await sendMessage(message);
} catch (error) {
  if (error instanceof MessageSendError) {
    showErrorToast(error.message);
  } else {
    showErrorToast('Something went wrong. Please try again.');
  }
}
```

---

## Component Patterns

### Message Bubble Component

**Responsibility**: Display single message with proper styling

**Props**:
```typescript
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSender: boolean;      // For group chats
  onLongPress?: () => void;
}
```

**Styling Pattern**:
```typescript
// Different styles based on sender
const bubbleStyle = isOwnMessage 
  ? styles.ownMessageBubble    // Right-aligned, blue
  : styles.otherMessageBubble; // Left-aligned, gray
```

### Message List Component

**Responsibility**: Virtualized list of messages with optimizations

**Key Features**:
- Inverted FlatList (scrolls from bottom)
- Windowing (only render visible items)
- Date dividers
- Message grouping

**Implementation**:
```typescript
<FlatList
  data={messages}
  inverted              // Newest at bottom
  keyExtractor={item => item.id || item.localId}
  renderItem={({ item }) => <MessageBubble message={item} />}
  getItemLayout={getItemLayout}  // Optimization
  removeClippedSubviews         // Memory optimization
/>
```

---

## Data Flow Patterns

### Message Send Flow

```
User Types → Input Component
                    ↓
            User Presses Send
                    ↓
         Generate Local Message
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
SQLite Insert              Zustand Update
(status: sending)          (optimistic)
    ↓                               ↓
    └───────────────┬───────────────┘
                    ↓
            UI Updates Instantly
                    ↓
        Firebase Write (background)
                    ↓
    ┌───────────────┴───────────────┐
    ↓ Success                    ↓ Failure
Update SQLite              Update SQLite
(with server ID)          (status: failed)
    ↓                               ↓
Remove optimistic          Show retry button
```

### Message Receive Flow

```
Firestore Listener Fires
         ↓
    New Message Doc
         ↓
Check if Already in SQLite
         ↓
    ┌────┴────┐
    ↓ No      ↓ Yes
Insert      Skip
    ↓
React Query Invalidates
    ↓
UI Re-renders
    ↓
If Conversation Open → Auto-scroll
If App Foreground → Update badge
```

---

## Security Patterns

### Firestore Security Rules

```javascript
// Rule pattern: Only conversation participants can access
match /conversations/{conversationId} {
  allow read: if request.auth.uid in resource.data.participants;
  allow write: if request.auth.uid in resource.data.participants;
  
  match /messages/{messageId} {
    // Inherit parent rules + verify sender
    allow create: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants
                     && request.resource.data.senderId == request.auth.uid;
  }
}
```

---

## Performance Patterns

### Message List Optimization

```typescript
// 1. Memoize expensive components
const MessageBubble = React.memo(({ message }) => {
  // Only re-render if message changes
}, (prev, next) => prev.message.id === next.message.id);

// 2. Use getItemLayout for FlatList
const getItemLayout = (data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});

// 3. Limit initial query
const messages = await firestore
  .collection('messages')
  .limit(50)           // Only fetch recent messages
  .orderBy('timestamp', 'desc')
  .get();
```

---

## Testing Patterns

### Service Layer Testing

```typescript
// Mock Firebase for unit tests
jest.mock('./firebase-config', () => ({
  firestore: {
    collection: jest.fn(() => ({
      add: jest.fn(() => Promise.resolve({ id: 'mock-id' }))
    }))
  }
}));

// Test service function
test('sendMessage creates message in Firestore', async () => {
  const message = { text: 'Hello', senderId: 'user1' };
  const result = await FirestoreService.sendMessage('conv1', message);
  expect(result.id).toBe('mock-id');
});
```

---

## Key Trade-offs Made

| Decision | Pro | Con | Rationale |
|----------|-----|-----|-----------|
| Dual Database | Optimal for use case | More complexity | Different data needs different tools |
| Optimistic UI | Feels fast | Harder to implement | UX worth the complexity |
| Expo Push | Simple setup | Extra hop | Simplicity wins for MVP |
| 20-user limit | Manageable fanout | Can't scale to 100s | Prove concept first |
| TypeScript strict | Type safety | Slower initial dev | Fewer bugs long-term |

---

These patterns form the foundation of the system. When implementing new features, follow these established patterns for consistency and maintainability.
