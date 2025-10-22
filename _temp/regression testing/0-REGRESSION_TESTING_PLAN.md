# Regression Testing Plan for WhatsApp Clone

**Project**: WhatsApp Clone - iOS Messaging App  
**Tech Stack**: React Native + Expo + Firebase + TypeScript  
**Testing Framework**: Jest + React Native Testing Library  
**Created**: October 21, 2025  
**Status**: Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Testing State](#current-testing-state)
3. [Testing Strategy](#testing-strategy)
4. [Test Coverage Plan](#test-coverage-plan)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Testing Infrastructure](#testing-infrastructure)
7. [Best Practices & Standards](#best-practices--standards)
8. [Maintenance & CI/CD](#maintenance--cicd)
9. [Appendix](#appendix)

---

## Executive Summary

### Goals

This regression testing plan aims to:

1. **Prevent regressions** in core messaging functionality
2. **Ensure reliability** of critical user flows (auth, messaging, offline mode)
3. **Enable confident refactoring** with comprehensive test coverage
4. **Establish maintainable testing patterns** for ongoing development
5. **Support CI/CD integration** for automated quality gates

### Current State

✅ **What's Working**:
- Jest + React Native Testing Library configured
- Basic test infrastructure in place
- 2 initial test suites (messaging bugs, MessageBubble component)
- Coverage thresholds set (70% global)
- Custom test utilities and fixtures

⚠️ **Gaps**:
- No service layer tests (database, Firebase)
- No hook tests (custom React hooks)
- Limited component coverage
- No integration tests for auth flow
- No E2E tests for critical paths
- No CI/CD integration

### Success Metrics

| Metric | Current | Target (Phase 1) | Target (Phase 2) |
|--------|---------|------------------|------------------|
| **Overall Coverage** | ~10% | 70%+ | 85%+ |
| **Critical Path Coverage** | 30% | 90%+ | 95%+ |
| **Test Suite Size** | 2 suites | 20+ suites | 40+ suites |
| **Test Execution Time** | <5s | <30s | <60s |
| **CI Integration** | None | GitHub Actions | Full pipeline |

---

## Current Testing State

### Existing Test Infrastructure

#### ✅ Configuration Files

```
mobile/
├── jest.config.js          ✅ Configured with jest-expo preset
├── package.json            ✅ Test scripts defined
└── __tests__/
    ├── setup.ts            ✅ Global test setup
    ├── helpers/
    │   └── test-utils.tsx  ✅ Custom render with providers
    └── fixtures/
        └── test-data.ts    ✅ Sample test data
```

#### ✅ Test Scripts

```bash
npm test                  # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
```

#### ✅ Existing Tests

1. **Integration Tests** (`__tests__/integration/messaging/messaging-bugs.test.ts`)
   - Tests for 4 critical bug fixes
   - Message insertion constraints
   - Optimistic update flow
   - Foreign key validation

2. **Component Tests** (`__tests__/unit/components/MessageBubble.test.tsx`)
   - Basic rendering tests
   - Style application tests
   - Timestamp display tests

### Coverage Gaps

| Layer | Current | Needed |
|-------|---------|--------|
| **Services** | 0% | Database, Firebase, Image services |
| **Hooks** | 0% | useMessages, useConversations, usePresence |
| **Components** | 15% | MessageList, MessageInput, ConversationItem |
| **Stores** | 0% | Auth store, Message store |
| **Utils** | 0% | Error handlers, formatters, validators |
| **Integration** | 10% | Auth flow, message flow, offline mode |
| **E2E** | 0% | Complete user journeys |

---

## Testing Strategy

### Testing Pyramid

```
              ┌─────────────────┐
              │   E2E Tests     │  10% of tests
              │  (5-10 tests)   │  Critical user flows
              └─────────────────┘
                     ▲
                     │
          ┌──────────────────────┐
          │  Integration Tests   │  30% of tests
          │    (30-50 tests)     │  Multi-system interactions
          └──────────────────────┘
                     ▲
                     │
       ┌───────────────────────────────┐
       │        Unit Tests             │  60% of tests
       │       (100-150 tests)         │  Individual functions/components
       └───────────────────────────────┘
```

### Test Categories

#### 1. Unit Tests (Fast, Isolated)

**Purpose**: Test individual functions and components in isolation

**Characteristics**:
- Execution time: <100ms per test
- No external dependencies (mocked)
- High coverage of edge cases
- Easy to debug and maintain

**What to Test**:
- Database helper functions
- Service layer methods
- Custom hooks (with renderHook)
- Utility functions
- Component rendering
- Store actions

**Examples**:
```typescript
// Service layer
test('should format timestamp to readable string')
test('should validate email format')
test('should hash message for deduplication')

// Components
test('should render message bubble with text')
test('should show typing indicator')
test('should disable send button when input empty')

// Hooks
test('should return online status from usePresence')
test('should debounce typing indicator')
```

#### 2. Integration Tests (Medium Speed)

**Purpose**: Test multiple systems working together

**Characteristics**:
- Execution time: 100ms-1s per test
- Tests real interactions between layers
- Validates data flow
- May use test database instances

**What to Test**:
- Database + Firebase sync
- Optimistic updates + real updates
- React Query + service layer
- Store + hooks + components
- Offline queue + sync logic

**Examples**:
```typescript
// Messaging flow
test('should insert message to SQLite and sync to Firestore')
test('should handle offline message queue')
test('should update conversation list when new message arrives')

// Auth flow
test('should persist auth state in Zustand store')
test('should redirect to login when token expires')

// Presence
test('should update RTDB when app goes to background')
```

#### 3. E2E Tests (Slow, Comprehensive)

**Purpose**: Test complete user journeys from start to finish

**Characteristics**:
- Execution time: 1-5s per test
- Tests critical paths only
- Uses real (or near-real) services
- Catches integration issues
- Run less frequently (pre-deployment)

**What to Test**:
- User signup → login → send message → logout
- Create conversation → send image → receive reply
- Go offline → queue messages → reconnect → sync
- Receive push notification → open app → view message

**Examples**:
```typescript
test('should complete full messaging flow', async () => {
  // 1. Sign up
  await signUp('test@example.com', 'password');
  
  // 2. Create conversation
  const conversationId = await createConversation('friend-id');
  
  // 3. Send message
  await sendMessage(conversationId, 'Hello!');
  
  // 4. Verify in Firestore
  const messages = await getMessages(conversationId);
  expect(messages[0].text).toBe('Hello!');
  
  // 5. Verify in SQLite
  const localMessages = await getLocalMessages(conversationId);
  expect(localMessages[0].text).toBe('Hello!');
});
```

### Testing Priorities

#### Critical Path (90%+ Coverage)

These flows **must** be tested thoroughly as they are core to the app:

1. **Authentication**
   - Sign up with email/password
   - Login with credentials
   - Logout
   - Auth state persistence
   - Token refresh

2. **Messaging**
   - Send text message
   - Receive text message
   - Optimistic updates
   - SQLite persistence
   - Firestore sync
   - Message status updates

3. **Conversations**
   - Create conversation
   - Load conversation list
   - Update last message
   - Unread count

4. **Offline Mode**
   - Queue messages when offline
   - Sync when reconnected
   - Show network status

#### High Priority (80%+ Coverage)

Important features that should have solid coverage:

1. **Presence System**
   - Online/offline detection
   - Typing indicators
   - Last seen timestamps

2. **Media Handling**
   - Image upload
   - Image display
   - Thumbnail generation

3. **Error Handling**
   - Network errors
   - Database errors
   - Auth errors

#### Medium Priority (70%+ Coverage)

Supporting features with good coverage:

1. **UI Components**
   - MessageBubble
   - MessageList
   - ConversationItem

2. **Utility Functions**
   - Date formatters
   - Validators
   - Error handlers

#### Low Priority (60%+ Coverage)

Nice-to-have coverage for less critical areas:

1. **Profile Management**
2. **Settings**
3. **Edge Cases** (rare scenarios)

---

## Test Coverage Plan

### Phase 1: Core Foundation (Week 1-2)

**Goal**: Achieve 70% coverage on critical paths

#### 1.1 Service Layer Tests

**Priority**: Critical  
**Estimated Tests**: 40-50  
**Time**: 3-4 days

##### Database Service (`src/services/database.ts`)

```typescript
// File: __tests__/unit/services/database.test.ts

describe('Database Service', () => {
  describe('insertMessage', () => {
    test('should insert message with all required fields');
    test('should use INSERT OR IGNORE for duplicates');
    test('should include conversationId');
    test('should handle missing optional fields');
    test('should throw on invalid message structure');
    test('should generate localId if not provided');
  });
  
  describe('upsertConversation', () => {
    test('should insert new conversation');
    test('should update existing conversation');
    test('should upsert participants list');
    test('should update lastMessage metadata');
  });
  
  describe('getConversationMessages', () => {
    test('should return messages ordered by timestamp');
    test('should paginate with limit/offset');
    test('should filter by conversationId');
    test('should return empty array for non-existent conversation');
  });
  
  describe('updateMessageStatus', () => {
    test('should update status from sending to sent');
    test('should not update non-existent message');
    test('should handle concurrent updates');
  });
  
  describe('deleteMessage', () => {
    test('should soft delete message');
    test('should hard delete when requested');
    test('should update conversation if last message');
  });
});
```

##### Firebase Firestore Service (`src/services/firebase-firestore.ts`)

```typescript
// File: __tests__/unit/services/firebase-firestore.test.ts

describe('Firestore Service', () => {
  beforeEach(() => {
    // Mock Firestore
    jest.clearAllMocks();
  });
  
  describe('subscribeToMessages', () => {
    test('should set up real-time listener');
    test('should include conversationId in mapped messages');
    test('should unsubscribe on cleanup');
    test('should handle listener errors');
    test('should filter messages by conversationId');
  });
  
  describe('sendMessage', () => {
    test('should create message document in Firestore');
    test('should update conversation lastMessage');
    test('should increment unread count for recipients');
    test('should handle send failures');
    test('should retry on network error');
  });
  
  describe('createConversation', () => {
    test('should create conversation with participants');
    test('should denormalize participant details');
    test('should prevent duplicate conversations');
    test('should handle group conversations');
  });
});
```

##### Firebase Realtime Database Service (`src/services/firebase-rtdb.ts`)

```typescript
// File: __tests__/unit/services/firebase-rtdb.test.ts

describe('RTDB Service', () => {
  describe('updatePresence', () => {
    test('should set online status to true');
    test('should update lastSeen timestamp');
    test('should set onDisconnect handler');
    test('should handle connection drops');
  });
  
  describe('subscribeToPresence', () => {
    test('should listen to user presence changes');
    test('should return online/offline state');
    test('should clean up on unsubscribe');
  });
  
  describe('setTypingIndicator', () => {
    test('should set typing to true');
    test('should auto-expire after 5 seconds');
    test('should clear on manual stop');
  });
});
```

##### Message Service (`src/services/message-service.ts`)

```typescript
// File: __tests__/unit/services/message-service.test.ts

describe('Message Service', () => {
  describe('sendMessage', () => {
    test('should perform optimistic update');
    test('should insert to SQLite');
    test('should sync to Firestore');
    test('should update status on success');
    test('should mark as failed on error');
    test('should queue message when offline');
  });
  
  describe('syncOfflineMessages', () => {
    test('should retry failed messages');
    test('should preserve order of queued messages');
    test('should update statuses after sync');
    test('should handle partial sync failures');
  });
});
```

#### 1.2 Custom Hooks Tests

**Priority**: High  
**Estimated Tests**: 25-30  
**Time**: 2-3 days

##### useMessages Hook

```typescript
// File: __tests__/unit/hooks/useMessages.test.ts

import { renderHook, waitFor } from '@testing-library/react-native';
import { useMessages } from '../../../src/hooks/useMessages';

describe('useMessages Hook', () => {
  test('should return messages for conversation');
  test('should subscribe to real-time updates');
  test('should update when new message arrives');
  test('should handle loading state');
  test('should handle error state');
  test('should clean up listeners on unmount');
  test('should prevent memory leaks with isMounted flag');
});
```

##### useConversations Hook

```typescript
// File: __tests__/unit/hooks/useConversations.test.ts

describe('useConversations Hook', () => {
  test('should fetch user conversations');
  test('should sort by lastMessageAt');
  test('should update on new conversation');
  test('should show unread counts');
  test('should handle empty state');
});
```

##### usePresence Hook

```typescript
// File: __tests__/unit/hooks/usePresence.test.ts

describe('usePresence Hook', () => {
  test('should return user online status');
  test('should update on presence change');
  test('should handle offline state');
  test('should clean up on unmount');
});
```

##### useNetworkStatus Hook

```typescript
// File: __tests__/unit/hooks/useNetworkStatus.test.ts

describe('useNetworkStatus Hook', () => {
  test('should detect online state');
  test('should detect offline state');
  test('should detect connection type (wifi/cellular)');
  test('should update on network change');
});
```

#### 1.3 Component Tests

**Priority**: Medium  
**Estimated Tests**: 30-40  
**Time**: 3-4 days

##### MessageBubble (Expand Existing)

```typescript
// File: __tests__/unit/components/MessageBubble.test.tsx

describe('MessageBubble', () => {
  // Existing tests...
  
  test('should show different styles for sent vs received');
  test('should display image messages');
  test('should show read receipts');
  test('should handle long press for actions');
  test('should display error state for failed messages');
  test('should show retry button on failure');
});
```

##### MessageList

```typescript
// File: __tests__/unit/components/MessageList.test.tsx

describe('MessageList', () => {
  test('should render list of messages');
  test('should scroll to bottom on new message');
  test('should group messages by date');
  test('should show loading indicator');
  test('should handle empty state');
  test('should display typing indicator');
  test('should optimize with FlatList virtualization');
});
```

##### MessageInput

```typescript
// File: __tests__/unit/components/MessageInput.test.tsx

describe('MessageInput', () => {
  test('should allow text input');
  test('should disable send button when empty');
  test('should enable send button with text');
  test('should call onSend with message text');
  test('should clear input after send');
  test('should trigger typing indicator');
  test('should allow multiline input');
  test('should show image picker button');
});
```

##### ConversationItem

```typescript
// File: __tests__/unit/components/ConversationItem.test.tsx

describe('ConversationItem', () => {
  test('should display conversation name');
  test('should show last message preview');
  test('should display timestamp');
  test('should show unread badge');
  test('should show online status indicator');
  test('should navigate to conversation on press');
});
```

##### OfflineBanner

```typescript
// File: __tests__/unit/components/OfflineBanner.test.tsx

describe('OfflineBanner', () => {
  test('should show when offline');
  test('should hide when online');
  test('should display offline message');
  test('should have correct styling');
});
```

##### ErrorBoundary

```typescript
// File: __tests__/unit/components/ErrorBoundary.test.tsx

describe('ErrorBoundary', () => {
  test('should catch component errors');
  test('should display fallback UI');
  test('should show error message in dev mode');
  test('should hide error details in production');
  test('should provide "Try Again" button');
  test('should reset on try again');
  test('should log errors to console');
});
```

### Phase 2: Integration & Workflows (Week 3-4)

**Goal**: Achieve 85% coverage with integration tests

#### 2.1 Integration Tests

**Priority**: Critical  
**Estimated Tests**: 35-45  
**Time**: 4-5 days

##### Authentication Flow

```typescript
// File: __tests__/integration/auth/auth-flow.test.ts

describe('Authentication Flow', () => {
  test('should sign up new user', async () => {
    const email = 'test@example.com';
    const password = 'password123';
    
    await signUp(email, password);
    
    // Verify user created in Firebase Auth
    // Verify user document in Firestore
    // Verify auth state in Zustand store
  });
  
  test('should login existing user');
  test('should persist auth state');
  test('should logout user');
  test('should redirect to login when token expires');
  test('should handle login failures');
});
```

##### Messaging Flow (Expand Existing)

```typescript
// File: __tests__/integration/messaging/messaging-flow.test.ts

describe('Complete Messaging Flow', () => {
  test('should send and receive message', async () => {
    // 1. Create conversation
    const conversationId = await createConversation(['user1', 'user2']);
    
    // 2. Send message (user1)
    const message = await sendMessage(conversationId, 'Hello!');
    
    // 3. Verify in SQLite
    const localMessages = await getLocalMessages(conversationId);
    expect(localMessages).toContainEqual(expect.objectContaining({
      text: 'Hello!',
      status: 'sent'
    }));
    
    // 4. Verify in Firestore
    const firestoreMessages = await getFirestoreMessages(conversationId);
    expect(firestoreMessages).toHaveLength(1);
    
    // 5. Verify conversation updated
    const conversation = await getConversation(conversationId);
    expect(conversation.lastMessage.text).toBe('Hello!');
  });
  
  test('should handle optimistic updates correctly');
  test('should sync offline messages when reconnected');
  test('should update message status (sending → sent → delivered → read)');
  test('should handle message send failures');
});
```

##### Offline Mode

```typescript
// File: __tests__/integration/offline/offline-mode.test.ts

describe('Offline Mode', () => {
  test('should queue messages when offline', async () => {
    // Simulate offline
    mockNetworkStatus({ isConnected: false });
    
    // Send message
    await sendMessage('conv-123', 'Offline message');
    
    // Verify queued locally
    const pendingMessages = await getPendingMessages();
    expect(pendingMessages).toHaveLength(1);
    
    // Verify NOT in Firestore yet
    const firestoreMessages = await getFirestoreMessages('conv-123');
    expect(firestoreMessages).toHaveLength(0);
  });
  
  test('should sync queued messages when online');
  test('should work with Firestore offline cache');
  test('should display offline banner');
  test('should handle partial sync failures');
});
```

##### Presence System

```typescript
// File: __tests__/integration/presence/presence-system.test.ts

describe('Presence System', () => {
  test('should update presence when app goes to foreground');
  test('should set offline when app goes to background');
  test('should update presence in RTDB');
  test('should show online status in UI');
  test('should show last seen when offline');
  test('should handle typing indicators');
});
```

#### 2.2 Store Tests

**Priority**: Medium  
**Estimated Tests**: 15-20  
**Time**: 2 days

##### Auth Store

```typescript
// File: __tests__/unit/store/auth-store.test.ts

import { useAuthStore } from '../../../src/store/auth-store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({ currentUser: null, isAuthenticated: false });
  });
  
  test('should set current user on login');
  test('should clear user on logout');
  test('should update isAuthenticated flag');
  test('should persist state (if configured)');
  test('should handle multiple tabs (if relevant)');
});
```

##### Message Store

```typescript
// File: __tests__/unit/store/message-store.test.ts

describe('Message Store', () => {
  test('should add optimistic message');
  test('should remove optimistic message after sync');
  test('should update message status');
  test('should handle concurrent updates');
  test('should prevent duplicate messages');
});
```

### Phase 3: End-to-End & Edge Cases (Week 5)

**Goal**: Cover critical user journeys and edge cases

#### 3.1 E2E Tests

**Priority**: High  
**Estimated Tests**: 5-10  
**Time**: 2-3 days

```typescript
// File: __tests__/e2e/critical-flows.test.ts

describe('Critical User Flows', () => {
  test('Complete onboarding and first message', async () => {
    // 1. Sign up
    await signUp('newuser@example.com', 'password');
    
    // 2. Navigate to chats
    await navigateToChats();
    
    // 3. Start new conversation
    await createNewConversation('friend@example.com');
    
    // 4. Send first message
    await sendMessage('Hello, friend!');
    
    // 5. Verify message appears
    expect(screen.getByText('Hello, friend!')).toBeTruthy();
    
    // 6. Verify conversation in list
    await navigateToConversationList();
    expect(screen.getByText('Hello, friend!')).toBeTruthy();
  });
  
  test('Receive push notification and view message');
  test('Go offline, send messages, go online, sync');
  test('Upload image and send in conversation');
  test('Create group conversation and send message');
});
```

#### 3.2 Edge Cases & Error Scenarios

**Priority**: Medium  
**Estimated Tests**: 20-25  
**Time**: 2 days

```typescript
// File: __tests__/integration/edge-cases/error-scenarios.test.ts

describe('Error Handling', () => {
  test('should handle Firestore write failures gracefully');
  test('should retry failed messages');
  test('should handle SQLite write errors');
  test('should show error message to user');
  test('should handle network timeouts');
  test('should handle invalid auth tokens');
  test('should handle missing conversationId');
  test('should handle corrupt local data');
});

describe('Edge Cases', () => {
  test('should handle very long messages (5000 chars)');
  test('should handle rapid message sending');
  test('should handle concurrent message updates');
  test('should handle empty conversations');
  test('should handle deleted users');
  test('should handle app killed mid-send');
});
```

### Summary: Test Suite Sizes

| Phase | Category | Tests | Time |
|-------|----------|-------|------|
| **Phase 1** | Service Layer | 40-50 | 3-4 days |
| | Custom Hooks | 25-30 | 2-3 days |
| | Components | 30-40 | 3-4 days |
| **Phase 2** | Integration | 35-45 | 4-5 days |
| | Stores | 15-20 | 2 days |
| **Phase 3** | E2E | 5-10 | 2-3 days |
| | Edge Cases | 20-25 | 2 days |
| **Total** | | **170-220 tests** | **18-23 days** |

---

## Implementation Roadmap

### Week 1: Service Layer Tests

**Days 1-2: Database Service**
- [ ] Set up test database utilities
- [ ] Test `insertMessage` with all edge cases
- [ ] Test `upsertConversation` 
- [ ] Test `getConversationMessages` with pagination
- [ ] Test message status updates
- [ ] Test soft/hard delete

**Days 3-4: Firebase Services**
- [ ] Mock Firebase SDK
- [ ] Test `subscribeToMessages` real-time listener
- [ ] Test `sendMessage` to Firestore
- [ ] Test `createConversation`
- [ ] Test RTDB presence updates
- [ ] Test typing indicators

**Day 5: Message Service**
- [ ] Test optimistic update flow
- [ ] Test offline message queue
- [ ] Test sync logic
- [ ] Test error handling

### Week 2: Hooks & Components

**Days 1-2: Custom Hooks**
- [ ] Test `useMessages` with renderHook
- [ ] Test `useConversations`
- [ ] Test `usePresence`
- [ ] Test `useNetworkStatus`
- [ ] Test `useTypingIndicators`
- [ ] Test memory leak prevention

**Days 3-5: Components**
- [ ] Expand MessageBubble tests
- [ ] Test MessageList rendering and virtualization
- [ ] Test MessageInput interactions
- [ ] Test ConversationItem
- [ ] Test OfflineBanner
- [ ] Test ErrorBoundary

### Week 3: Integration Tests

**Days 1-2: Auth Flow**
- [ ] Test sign up flow
- [ ] Test login flow
- [ ] Test auth persistence
- [ ] Test logout
- [ ] Test token expiration

**Days 3-5: Messaging & Offline**
- [ ] Test complete messaging flow
- [ ] Test optimistic updates end-to-end
- [ ] Test offline queue
- [ ] Test sync on reconnect
- [ ] Test presence system integration
- [ ] Test conversation updates

### Week 4: Stores & Edge Cases

**Days 1-2: Store Tests**
- [ ] Test auth store
- [ ] Test message store
- [ ] Test store persistence (if applicable)

**Days 3-5: Edge Cases**
- [ ] Test error scenarios
- [ ] Test boundary conditions
- [ ] Test race conditions
- [ ] Test corrupt data handling
- [ ] Test network failures

### Week 5: E2E & Polish

**Days 1-3: E2E Tests**
- [ ] Test complete user onboarding
- [ ] Test conversation creation
- [ ] Test message sending/receiving
- [ ] Test offline scenarios
- [ ] Test push notifications (if testable)

**Days 4-5: CI/CD & Documentation**
- [ ] Set up GitHub Actions
- [ ] Configure test reporting
- [ ] Write testing documentation
- [ ] Create contribution guidelines
- [ ] Review and refactor tests

---

## Testing Infrastructure

### Test File Organization

```
mobile/__tests__/
├── unit/
│   ├── components/
│   │   ├── MessageBubble.test.tsx
│   │   ├── MessageList.test.tsx
│   │   ├── MessageInput.test.tsx
│   │   ├── ConversationItem.test.tsx
│   │   ├── OfflineBanner.test.tsx
│   │   └── ErrorBoundary.test.tsx
│   ├── hooks/
│   │   ├── useMessages.test.ts
│   │   ├── useConversations.test.ts
│   │   ├── usePresence.test.ts
│   │   ├── useNetworkStatus.test.ts
│   │   └── useTypingIndicators.test.ts
│   ├── services/
│   │   ├── database.test.ts
│   │   ├── firebase-firestore.test.ts
│   │   ├── firebase-rtdb.test.ts
│   │   ├── message-service.test.ts
│   │   ├── conversation-service.test.ts
│   │   └── image-service.test.ts
│   ├── store/
│   │   ├── auth-store.test.ts
│   │   └── message-store.test.ts
│   └── utils/
│       ├── error-handler.test.ts
│       ├── date-formatter.test.ts
│       └── validators.test.ts
│
├── integration/
│   ├── auth/
│   │   └── auth-flow.test.ts
│   ├── messaging/
│   │   ├── messaging-flow.test.ts
│   │   └── messaging-bugs.test.ts  # Existing
│   ├── offline/
│   │   └── offline-mode.test.ts
│   ├── presence/
│   │   └── presence-system.test.ts
│   └── edge-cases/
│       └── error-scenarios.test.ts
│
├── e2e/
│   └── critical-flows.test.ts
│
├── fixtures/
│   ├── test-data.ts                # Existing
│   ├── messages.ts
│   ├── users.ts
│   └── conversations.ts
│
├── helpers/
│   ├── test-utils.tsx              # Existing
│   ├── database-helper.ts
│   ├── firebase-mock.ts
│   └── render-hook-wrapper.tsx
│
├── setup.ts                        # Existing
└── README.md                       # Existing
```

### Mock Strategies

#### 1. Firebase SDK Mocks

```typescript
// __tests__/helpers/firebase-mock.ts

export const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      onSnapshot: jest.fn(),
    })),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  })),
};

export const mockAuth = {
  currentUser: { uid: 'test-user-id' },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
};

export const mockRTDB = {
  ref: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    onDisconnect: jest.fn(() => ({
      set: jest.fn(),
    })),
  })),
};
```

#### 2. SQLite Mock

```typescript
// __tests__/helpers/database-helper.ts

let testDb: any = null;

export const initTestDatabase = async () => {
  testDb = await SQLite.openDatabaseAsync(':memory:');
  
  // Run schema creation
  await testDb.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      contentText TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      status TEXT NOT NULL
    );
  `);
  
  await testDb.execAsync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      participants TEXT NOT NULL
    );
  `);
  
  return testDb;
};

export const cleanupTestDatabase = async () => {
  if (testDb) {
    await testDb.closeAsync();
    testDb = null;
  }
};

export const insertTestMessage = async (message: any) => {
  await testDb.runAsync(
    'INSERT INTO messages (id, conversationId, senderId, contentText, timestamp, status) VALUES (?, ?, ?, ?, ?, ?)',
    [message.id, message.conversationId, message.senderId, message.content.text, message.timestamp.getTime(), message.status]
  );
};
```

#### 3. React Query Mock

```typescript
// __tests__/helpers/test-utils.tsx (expanded)

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,        // Don't retry in tests
      cacheTime: 0,        // Don't cache in tests
      staleTime: 0,        // Always refetch
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},      // Suppress error logs in tests
  },
});

export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

#### 4. Network Status Mock

```typescript
// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

export const mockNetworkStatus = (status: {
  isConnected: boolean;
  isInternetReachable?: boolean;
  type?: string;
}) => {
  require('@react-native-community/netinfo').fetch.mockResolvedValue(status);
};
```

### Fixtures & Test Data

```typescript
// __tests__/fixtures/test-data.ts (expand existing)

export const testUser1 = {
  id: 'user-1',
  email: 'user1@example.com',
  displayName: 'Test User 1',
  photoURL: 'https://example.com/photo1.jpg',
};

export const testUser2 = {
  id: 'user-2',
  email: 'user2@example.com',
  displayName: 'Test User 2',
  photoURL: 'https://example.com/photo2.jpg',
};

export const createTestMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}`,
  conversationId: 'conv-1',
  senderId: testUser1.id,
  content: { text: 'Test message', type: 'text' as const },
  timestamp: new Date(),
  status: 'sent' as const,
  localId: undefined,
  ...overrides,
});

export const createTestConversation = (overrides = {}) => ({
  id: `conv-${Date.now()}`,
  type: 'direct' as const,
  participants: [testUser1.id, testUser2.id],
  participantDetails: {
    [testUser1.id]: { displayName: testUser1.displayName },
    [testUser2.id]: { displayName: testUser2.displayName },
  },
  createdAt: new Date(),
  lastMessageAt: new Date(),
  lastMessage: {
    text: 'Last message',
    senderId: testUser1.id,
    timestamp: new Date(),
  },
  unreadCount: {
    [testUser1.id]: 0,
    [testUser2.id]: 1,
  },
  ...overrides,
});

export const createBatchMessages = (count: number, conversationId: string) => {
  return Array.from({ length: count }, (_, i) => 
    createTestMessage({
      id: `msg-${i}`,
      conversationId,
      content: { text: `Message ${i}`, type: 'text' },
      timestamp: new Date(Date.now() + i * 1000),
    })
  );
};
```

---

## Best Practices & Standards

### Testing Principles

1. **AAA Pattern** (Arrange, Act, Assert)
   ```typescript
   test('should do something', () => {
     // Arrange - Set up test data
     const message = createTestMessage();
     
     // Act - Perform action
     const result = sendMessage(message);
     
     // Assert - Verify outcome
     expect(result).toBeDefined();
   });
   ```

2. **Independent Tests**
   - Each test should work in isolation
   - Use `beforeEach` to reset state
   - Don't rely on test execution order

3. **Descriptive Test Names**
   ```typescript
   // ✅ Good
   test('should insert message to SQLite when sending')
   test('should show offline banner when network disconnected')
   
   // ❌ Bad
   test('message test')
   test('it works')
   ```

4. **Test Behavior, Not Implementation**
   ```typescript
   // ✅ Good - Tests outcome
   test('should display message in conversation', () => {
     sendMessage('Hello');
     expect(screen.getByText('Hello')).toBeTruthy();
   });
   
   // ❌ Bad - Tests implementation
   test('should call insertMessage function', () => {
     sendMessage('Hello');
     expect(insertMessage).toHaveBeenCalled();
   });
   ```

5. **Keep Tests Fast**
   - Mock external dependencies
   - Use in-memory database for SQLite
   - Target <100ms for unit tests
   - Avoid unnecessary `await` delays

6. **One Assert Per Concept**
   ```typescript
   // ✅ Good - Tests one concept
   test('should format timestamp correctly', () => {
     const formatted = formatTimestamp(new Date('2025-01-15T10:30:00'));
     expect(formatted).toBe('10:30 AM');
   });
   
   // ❌ Avoid - Tests multiple unrelated things
   test('should handle messages', () => {
     expect(formatTimestamp()).toBeTruthy();
     expect(sendMessage()).toBeTruthy();
     expect(deleteMessage()).toBeTruthy();
   });
   ```

### Code Coverage Guidelines

#### What to Cover

✅ **High Priority**:
- Critical user flows (auth, messaging)
- Data layer (database, Firebase)
- Error handling paths
- Edge cases and boundary conditions

✅ **Medium Priority**:
- UI components
- Custom hooks
- Utility functions

⚠️ **Lower Priority**:
- Simple getters/setters
- Trivial formatters
- Third-party library wrappers

❌ **Don't Test**:
- External libraries (React, Firebase, etc.)
- Mocked functions
- TypeScript type definitions

#### Coverage Metrics

```javascript
// jest.config.js
coverageThresholds: {
  global: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70,
  },
  // Stricter for critical paths
  './src/services/': {
    statements: 85,
    branches: 75,
    functions: 85,
    lines: 85,
  },
}
```

### Async Testing Patterns

```typescript
// ✅ Good - Proper async/await
test('should fetch messages', async () => {
  const messages = await getMessages('conv-1');
  expect(messages).toHaveLength(5);
});

// ✅ Good - Using waitFor for UI updates
test('should display message after send', async () => {
  sendMessage('Hello');
  
  await waitFor(() => {
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});

// ✅ Good - Testing rejections
test('should handle error', async () => {
  await expect(sendMessage(null)).rejects.toThrow('Invalid message');
});

// ❌ Bad - Missing await
test('should fetch messages', () => {
  const messages = getMessages('conv-1');  // Returns Promise, not array!
  expect(messages).toHaveLength(5);        // Will fail
});
```

### Mocking Best Practices

```typescript
// ✅ Good - Mock at the module level
jest.mock('../../services/firebase-firestore', () => ({
  sendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
}));

// ✅ Good - Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// ✅ Good - Verify mock calls
test('should call sendMessage', () => {
  sendMessage('Hello');
  expect(mockSendMessage).toHaveBeenCalledWith('Hello');
  expect(mockSendMessage).toHaveBeenCalledTimes(1);
});

// ⚠️ Caution - Over-mocking
// Don't mock everything - test real logic when possible
```

---

## Maintenance & CI/CD

### Continuous Integration Setup

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Install dependencies
        working-directory: ./mobile
        run: npm ci
      
      - name: Run tests
        working-directory: ./mobile
        run: npm test -- --coverage --maxWorkers=2
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/coverage/lcov.info
          flags: mobile
          name: mobile-coverage
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./mobile/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Pre-commit Hooks

```bash
# .git/hooks/pre-commit

#!/bin/sh
cd mobile && npm test -- --bail --findRelatedTests

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ All tests passed!"
```

### Test Reporting

```typescript
// jest.config.js
module.exports = {
  // ... existing config
  
  coverageReporters: [
    'text',           // Terminal output
    'lcov',           // For CI tools
    'html',           // HTML report
    'json-summary',   // For badges
  ],
  
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml',
    }],
  ],
};
```

### Maintenance Schedule

| Task | Frequency | Responsibility |
|------|-----------|----------------|
| **Review failing tests** | Daily | Developer on-call |
| **Update test fixtures** | Weekly | Feature owner |
| **Refactor slow tests** | Bi-weekly | Team |
| **Review coverage** | Sprint end | Tech lead |
| **Update mocks for new features** | Per feature | Feature developer |
| **Archive obsolete tests** | Monthly | Team |

### Test Health Metrics

Monitor these metrics to ensure test suite health:

```typescript
// Target metrics
const TEST_HEALTH_TARGETS = {
  passRate: 100,              // All tests should pass
  avgExecutionTime: 30000,    // < 30 seconds for full suite
  flakiness: 0,               // No flaky tests
  coverage: {
    statements: 70,
    branches: 60,
    functions: 70,
    lines: 70,
  },
};
```

---

## Appendix

### A. Test Script Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test MessageBubble.test.tsx

# Run tests matching pattern
npm test messaging

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run only changed files
npm test -- --onlyChanged

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Update snapshots
npm test -- -u

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand MessageBubble.test.tsx
```

### B. Common Jest Matchers

```typescript
// Equality
expect(value).toBe(4);                    // Strict equality
expect(obj).toEqual({ a: 1 });            // Deep equality
expect(arr).toStrictEqual([1, 2]);        // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3);           // Floating point

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');

// Arrays
expect(arr).toContain('item');
expect(arr).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ a: 1 });

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);
```

### C. Testing Library Queries

```typescript
// Preferred queries (accessible)
screen.getByRole('button', { name: 'Send' });
screen.getByLabelText('Message input');
screen.getByPlaceholderText('Type a message');
screen.getByText('Hello World');

// Async queries
await screen.findByText('Hello');          // Wait for element

// Query variants
screen.queryByText('Not found');           // Returns null if not found
screen.getAllByTestId('message-bubble');   // Returns array

// User interactions
import { fireEvent } from '@testing-library/react-native';

fireEvent.press(button);
fireEvent.changeText(input, 'New text');
```

### D. Debugging Tests

```bash
# Run single test with verbose output
npm test -- MessageBubble.test.tsx --verbose

# Debug with Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand

# Print console logs
npm test -- --silent=false

# Run with specific timeout
npm test -- --testTimeout=30000

# Clear Jest cache
npx jest --clearCache
```

### E. Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Mock Service Worker (MSW)](https://mswjs.io/) - For API mocking

---

## Summary

This comprehensive regression testing plan provides:

1. ✅ **Clear roadmap** for implementing 170-220 tests over 5 weeks
2. ✅ **Structured approach** with unit, integration, and E2E tests
3. ✅ **Prioritized coverage** focusing on critical paths first
4. ✅ **Reusable infrastructure** with mocks, fixtures, and helpers
5. ✅ **CI/CD integration** for automated testing
6. ✅ **Best practices** for maintainable, reliable tests

**Next Steps**:
1. Review and approve this plan
2. Begin Week 1: Service Layer Tests
3. Track progress using the roadmap
4. Adjust timeline based on actual implementation speed
5. Iterate on test quality and coverage

---

**Document Version**: 1.0  
**Created**: October 21, 2025  
**Status**: Ready for Review  
**Estimated Completion**: 5 weeks (with 1 developer)
