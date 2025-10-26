# System Patterns and Architecture

## High-Level Architecture

### Mobile App Structure
```
mobile/
├── app/                    # Expo Router pages (file-based routing)
│   ├── (auth)/            # Authentication stack
│   ├── (tabs)/            # Main app tabs
│   └── conversation/      # Conversation screens
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks (business logic)
│   ├── services/          # Firebase, SQLite, API services
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Helper functions
```

### Cloud Functions Structure
```
functions/
├── src/
│   ├── index.ts           # Main entry, exports all functions
│   ├── notifications/     # Push notification logic
│   ├── embeddings/        # RAG pipeline, embedding generation
│   ├── features/          # Specialized AI features
│   ├── helpers/           # Shared utilities
│   └── enhanced-ai-processor.ts  # AI command processor
```

## Design Patterns

### 1. Service Layer Pattern
**Purpose**: Separate business logic from UI components

```typescript
// services/firebase-firestore.ts
export const firestoreService = {
  createUser: (userId: string, userData: User) => { ... },
  sendMessage: (conversationId: string, message: Message) => { ... }
};

// In components/hooks
import { firestoreService } from '@/services/firebase-firestore';
```

**Benefits**:
- Testable in isolation
- Reusable across components
- Easy to swap implementations
- Type-safe with TypeScript

### 2. Custom Hooks Pattern
**Purpose**: Encapsulate complex logic and state

```typescript
// hooks/useConversations.ts
export function useConversations() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations
  });
  
  return { conversations: data, isLoading, error };
}

// In components
const { conversations, isLoading } = useConversations();
```

**When to Use**:
- Business logic that multiple components share
- Complex state + side effects
- Firebase listener management
- Data fetching and caching

### 3. Optimistic UI Pattern
**Purpose**: Instant user feedback before server confirmation

```typescript
// Implementation flow:
1. User sends message → insert into SQLite with localId
2. UI renders immediately (optimistic state)
3. Write to Firebase in background
4. On success: update SQLite with serverId
5. On failure: mark as failed, show retry
```

**Key Components**:
- SQLite for instant persistence
- Zustand for optimistic state
- React Query for server sync
- Status tracking: sending → sent → delivered → read

### 4. Dual Database Strategy
**Purpose**: Optimize for different data patterns

**Firestore** (Persistent, Queryable):
- Messages with history
- User profiles
- Conversation metadata
- Read receipts

**RTDB** (Fast, Ephemeral):
- Typing indicators
- Online/offline presence
- Connection state

**SQLite** (Local, Offline-First):
- Full message cache
- User profiles cache
- Conversation list cache
- Pending outbound messages

### 5. React Query + Zustand Hybrid
**Purpose**: Separate server state from client state

**React Query** (Server State):
```typescript
// Automatic caching, refetching, invalidation
const { data: messages } = useQuery({
  queryKey: ['messages', conversationId],
  queryFn: () => fetchMessages(conversationId)
});
```

**Zustand** (Client State):
```typescript
// Optimistic messages, UI state
const { optimisticMessages, addOptimisticMessage } = useMessageStore();
```

### 6. Cloud Functions Modular Pattern
**Purpose**: Separate concerns, enable independent deployment

```
functions/src/
├── index.ts               # Main exports
├── notifications/         # Push notification logic
│   └── sendMessageNotification.ts
├── embeddings/           # RAG pipeline
│   └── generateMessageEmbedding.ts
├── features/             # AI features
│   └── calendar-extraction.ts
└── enhanced-ai-processor.ts  # AI command processor
```

Each module:
- Independent and testable
- Can be deployed separately
- Shares helpers/utilities
- Type-safe with TypeScript

## Component Patterns

### 1. Container/Presenter Pattern
**Purpose**: Separate logic from presentation

```typescript
// Container (logic)
function ConversationScreen({ id }: Props) {
  const { messages } = useMessages(id);
  const { sendMessage } = useSendMessage(id);
  
  return <MessageList messages={messages} onSend={sendMessage} />;
}

// Presenter (UI)
function MessageList({ messages, onSend }: Props) {
  return (
    <FlatList
      data={messages}
      renderItem={({ item }) => <MessageBubble message={item} />}
    />
  );
}
```

### 2. Error Boundary Pattern
**Purpose**: Catch unhandled errors gracefully

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to crash reporting
    console.error('Error caught:', error);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorScreen />;
    }
    return this.props.children;
  }
}

// Usage: Wrap entire app in root layout
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 3. Network State Pattern
**Purpose**: Handle offline/online scenarios

```typescript
// hooks/useNetworkStatus.ts
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    return unsubscribe;
  }, []);
  
  return { isOnline };
}

// Usage: Show banner when offline
const { isOnline } = useNetworkStatus();
{!isOnline && <OfflineBanner />}
```

## Data Flow Patterns

### Message Send Flow
```
User Action → Component → Hook → Service → Firebase
                     ↓
                 SQLite (optimistic)
                     ↓
                 Zustand Store
                     ↓
                   UI Update
```

### Message Receive Flow
```
Firebase → Cloud Function → Push Notification
                          ↓
                    Firestore Update
                          ↓
                    React Query Listener
                          ↓
                    SQLite Update
                          ↓
                    UI Re-render
```

### Real-Time Presence Flow
```
App State Change → RTDB Write → Other Devices Listen
                                    ↓
                              UI Updates
```

## Firebase Integration Patterns

### 1. Firestore Listener Pattern
```typescript
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, 'conversations')),
    (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConversations(conversations);
    }
  );
  
  return () => unsubscribe();
}, []);
```

### 2. RTDB Presence Pattern
```typescript
// Initialize presence on app launch
ref(db, `presence/${userId}`).set({
  online: true,
  lastSeen: timestamp
});

// Auto-disconnect when app closes
ref(db, `presence/${userId}`).onDisconnect().set({
  online: false,
  lastSeen: timestamp
});
```

### 3. Cloud Function Trigger Pattern
```typescript
// Trigger on message creation
export const sendMessageNotification = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    // Send push notification to participants
  });
```

## State Management Patterns

### 1. Server State (React Query)
```typescript
// Automatic caching and refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
```

### 2. Client State (Zustand)
```typescript
// Minimal boilerplate, TypeScript-first
interface MessageStore {
  optimisticMessages: Message[];
  addOptimisticMessage: (message: Message) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  optimisticMessages: [],
  addOptimisticMessage: (message) =>
    set((state) => ({
      optimisticMessages: [...state.optimisticMessages, message]
    }))
}));
```

### 3. Local State (React useState)
```typescript
// Component-specific transient state
const [inputValue, setInputValue] = useState('');
const [isTyping, setIsTyping] = useState(false);
```

## Security Patterns

### 1. Firebase Security Rules
```javascript
// Firestore rules: Check user authentication and ownership
match /conversations/{conversationId} {
  allow read: if request.auth != null && 
                 request.auth.uid in resource.data.participants;
  allow create: if request.auth != null;
}
```

### 2. Environment Variables
```typescript
// Never commit secrets
const apiKey = process.env.OPENAI_API_KEY; // In Cloud Functions
```

### 3. Type-Safe API Calls
```typescript
// Validate responses with TypeScript
interface MessageResponse {
  id: string;
  content: MessageContent;
  timestamp: Date;
}

const response = await fetch(...);
const message: MessageResponse = await response.json();
```

## Testing Patterns

### 1. Unit Tests (Services)
```typescript
describe('firestoreService', () => {
  it('should create a user', async () => {
    const userData = { displayName: 'John' };
    await firestoreService.createUser('userId', userData);
    // Assert user created
  });
});
```

### 2. Integration Tests (Hooks)
```typescript
describe('useMessages', () => {
  it('should fetch messages', async () => {
    const { result } = renderHook(() => useMessages('convId'));
    await waitFor(() => expect(result.current.messages).toBeDefined());
  });
});
```

### 3. E2E Tests (Critical Flows)
```typescript
describe('Message Send Flow', () => {
  it('should send message and appear in chat', async () => {
    // Test complete user journey
  });
});
```

## Performance Patterns

### 1. Pagination Pattern
```typescript
// Load messages in chunks
const fetchMessages = async (
  conversationId: string,
  lastMessageId?: string
) => {
  let query = collection(db, `conversations/${conversationId}/messages`);
  query = query(orderBy('timestamp', 'desc')).limit(50);
  
  if (lastMessageId) {
    query = query(startAfter(lastMessageId));
  }
  
  return getDocs(query);
};
```

### 2. Memoization Pattern
```typescript
// Cache expensive computations
const sortedMessages = useMemo(
  () => messages.sort((a, b) => b.timestamp - a.timestamp),
  [messages]
);
```

### 3. Image Optimization Pattern
```typescript
// Compress before upload
const compressedImage = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 800 } }],
  { compress: 0.8 }
);
```

## Error Handling Patterns

### 1. Try-Catch with User Feedback
```typescript
const sendMessage = async (message: string) => {
  try {
    await firestoreService.sendMessage(conversationId, message);
  } catch (error) {
    showErrorToast('Failed to send message. Please try again.');
  }
};
```

### 2. Retry Pattern
```typescript
const retryOperation = async (operation: () => Promise<void>) => {
  for (let i = 0; i < 3; i++) {
    try {
      await operation();
      return;
    } catch (error) {
      if (i === 2) throw error;
      await delay(1000 * (i + 1));
    }
  }
};
```

### 3. Offline Queue Pattern
```typescript
// Queue messages when offline
const queueMessage = async (message: Message) => {
  await sqlite.insertMessage({ ...message, syncStatus: 'pending' });
};

// Retry on reconnect
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    retryPendingMessages();
  }
});
```

## Key Files and Their Roles

### Mobile App
- `app/_layout.tsx`: Root layout, auth initialization
- `app/(tabs)/chats.tsx`: Conversation list screen
- `app/conversation/[id].tsx`: Individual conversation screen
- `src/components/MessageList.tsx`: Message rendering
- `src/hooks/useMessages.ts`: Message fetching logic
- `src/services/firebase-firestore.ts`: Firestore operations
- `src/services/firebase-rtdb.ts`: Presence and typing
- `src/services/database/`: SQLite operations

### Cloud Functions
- `functions/src/index.ts`: Main entry, exports all functions
- `functions/src/notifications/sendMessageNotification.ts`: Push notifications
- `functions/src/embeddings/generateMessageEmbedding.ts`: RAG pipeline
- `functions/src/enhanced-ai-processor.ts`: AI command processor
- `functions/src/features/calendar-extraction.ts`: AI features

## Critical Decisions

1. **Dual Database**: Firestore + RTDB for different use cases
2. **SQLite Caching**: Offline-first, instant loads
3. **Optimistic UI**: Zustand for client state, React Query for server
4. **TypeScript Strict**: Catch errors early, no `any` types
5. **Service Layer**: Business logic separated from UI
6. **Modular Functions**: Cloud Functions split by concern

---

**Last Updated**: Initial Creation - October 2025  
**Version**: 1.0  
**Status**: Active Development
