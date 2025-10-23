# Implementation Task List
**Messaging App with AI Layer - iOS MVP**

Last Updated: October 22, 2025

---

## Table of Contents
1. [Project Setup](#project-setup)
2. [Phase 1: Core Infrastructure](#phase-1-core-infrastructure)
3. [Phase 2: One-on-One Messaging](#phase-2-one-on-one-messaging)
4. [Phase 3: Presence & Ephemeral Data](#phase-3-presence--ephemeral-data)
5. [Phase 4: Media & Group Chat](#phase-4-media--group-chat)
6. [Phase 5: Push Notifications](#phase-5-push-notifications)
7. [Phase 6: Polish & Testing](#phase-6-polish--testing)
8. [Phase 7: AI Integration](#phase-7-ai-integration-post-mvp)
9. [Testing Checklist](#testing-checklist)
10. [Deployment Checklist](#deployment-checklist)

---

## Project Setup

### Prerequisites
- [x] macOS system confirmed (required for iOS development)
- [x] Xcode installed (latest version from App Store)
- [x] Node.js 20+ installed (`node --version`)
- [x] npm or yarn installed
- [x] Git installed and configured
- [x] Firebase account created (free tier)
- [ ] Anthropic/OpenAI account created (for AI phase)
- [x] Physical iOS device for on-device testing (Expo Go)

### Environment Setup
- [x] Install Expo CLI globally: `npm install -g expo-cli eas-cli`
- [x] Install Firebase CLI: `npm install -g firebase-tools`
- [x] Verify installations:
  ```bash
  expo --version
  eas --version
  firebase --version
  ```

### Repository Initialization
- [x] Create GitHub repository (private)
- [x] Initialize local project directory structure:
  ```
  whatsapp-clone/
  ├── _docs/                    # Documentation
  ├── mobile/                   # React Native app
  ├── functions/                # Firebase Cloud Functions
  ├── .gitignore
  └── README.md
  ```
- [x] Set up `.gitignore` (Node, Expo, Firebase, macOS)
- [x] Initial commit and push to GitHub

### Firebase Project Setup
- [x] Create new Firebase project in console
- [x] Enable Authentication (Email/Password)
- [x] Create Firestore database (start in test mode, region: us-central)
- [x] Create Realtime Database (start in test mode, region: us-central)
- [x] Enable Firebase Storage
- [x] Register iOS app in Firebase project
- [x] Download `GoogleService-Info.plist`
- [x] Enable Firebase Cloud Messaging
- [x] Note project ID and configuration values

### Expo Project Initialization
- [x] Navigate to project directory
- [x] Create new Expo project:
  ```bash
  npx create-expo-app mobile --template blank-typescript
  cd mobile
  ```
- [x] Install core dependencies:
  ```bash
  npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
  npx expo install firebase
  npx expo install expo-sqlite
  npx expo install @tanstack/react-query
  npx expo install zustand
  npx expo install expo-image-picker
  npx expo install expo-notifications
  npx expo install expo-device
  ```
- [x] Configure `app.json` for Expo Router and iOS bundle identifier
- [x] Test initial app runs: `npx expo start`

### Firebase Functions Setup
- [x] Initialize Firebase in project root:
  ```bash
  firebase init
  # Select: Functions, Firestore, Database, Storage
  # Choose TypeScript for Functions
  # Choose existing project
  ```
- [x] Navigate to functions directory: `cd functions`
- [x] Install additional dependencies:
  ```bash
  npm install expo-server-sdk
  npm install @anthropic-ai/sdk  # For future AI phase
  ```
- [x] Configure `functions/tsconfig.json` for strict mode
- [x] Create `functions/.env` for API keys (add to .gitignore)

### Project Structure Setup
- [x] Create mobile app folder structure:
  ```
  mobile/
  ├── app/                      # Expo Router pages
  │   ├── (auth)/
  │   │   ├── login.tsx
  │   │   └── register.tsx
  │   ├── (tabs)/
  │   │   ├── chats.tsx
  │   │   └── profile.tsx
  │   ├── conversation/
  │   │   └── [id].tsx
  │   └── _layout.tsx
  ├── src/
  │   ├── components/           # Reusable components
  │   ├── hooks/                # Custom React hooks
  │   ├── services/             # Firebase, SQLite services
  │   ├── store/                # Zustand stores
  │   ├── types/                # TypeScript types
  │   ├── utils/                # Helper functions
  │   └── constants/            # App constants
  ├── assets/                   # Images, fonts
  └── app.json
  ```
- [x] Create TypeScript types file: `src/types/index.ts`
- [x] Create constants file: `src/constants/index.ts`

### Configuration Files
- [x] Create `mobile/firebase.config.ts`:
  ```typescript
  import { initializeApp } from 'firebase/app';
  import { getAuth } from 'firebase/auth';
  import { getFirestore } from 'firebase/firestore';
  import { getDatabase } from 'firebase/database';
  import { getStorage } from 'firebase/storage';
  
  const firebaseConfig = {
    // Your Firebase config
  };
  
  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const firestore = getFirestore(app);
  export const realtimeDb = getDatabase(app);
  export const storage = getStorage(app);
  ```
- [x] Create `mobile/src/constants/index.ts`:
  ```typescript
  export const MAX_GROUP_SIZE = 20;
  export const MAX_MESSAGE_LENGTH = 5000;
  export const MAX_IMAGE_SIZE_MB = 10;
  export const TYPING_INDICATOR_TIMEOUT = 5000;
  ```
- [ ] Create EAS build configuration: `eas.json`

### Security Rules Setup
- [x] Create `firestore.rules` (from architecture doc)
- [x] Create `database.rules.json` (from architecture doc)
- [x] Create `storage.rules` (basic read/write for authenticated users)
- [x] Deploy rules: `firebase deploy --only firestore:rules,database,storage`

**Checkpoint**: ✅ Project structure created, Firebase configured, dependencies installed

---

## Phase 1: Core Infrastructure

**Goal**: Set up authentication, navigation, and local storage foundation

### TypeScript Type Definitions
- [x] Create `src/types/index.ts` with core interfaces:
  ```typescript
  // User types
  export interface User { ... }
  export interface UserProfile { ... }
  
  // Message types
  export interface Message { ... }
  export interface MessageContent { ... }
  
  // Conversation types
  export interface Conversation { ... }
  export interface DirectConversation extends Conversation { ... }
  export interface GroupConversation extends Conversation { ... }
  
  // State types
  export interface AppState { ... }
  export interface AuthState { ... }
  ```
- [x] Export all types from central location

### SQLite Database Setup
- [x] Create `src/services/database.ts`
- [x] Implement database initialization function
- [x] Create tables for: messages, conversations, users
- [x] Create indexes for query optimization
- [x] Implement migration system for future schema changes
- [x] Write database helper functions:
  - [x] `insertMessage()`
  - [x] `updateMessage()`
  - [x] `getConversationMessages()`
  - [x] `deleteMessage()`
- [x] Test database operations in isolation

### Firebase Service Layer
- [x] Create `src/services/firebase-auth.ts`:
  - [x] `signUp(email, password, displayName)`
  - [x] `signIn(email, password)`
  - [x] `signOut()`
  - [x] `getCurrentUser()`
  - [x] `updateProfile(displayName, photoURL)`
  - [x] `onAuthStateChanged()` listener wrapper
- [x] Create `src/services/firebase-firestore.ts`:
  - [x] `createUser(userId, userData)`
  - [x] `getUser(userId)`
  - [x] `updateUser(userId, data)`
  - [x] `createConversation(participants)`
  - [x] `getConversation(conversationId)`
  - [x] `sendMessage(conversationId, message)`
  - [x] `subscribeToConversation(conversationId, callback)`
  - [x] `subscribeToMessages(conversationId, callback)`
- [x] Create `src/services/firebase-rtdb.ts`:
  - [x] `setPresence(userId, online)`
  - [x] `subscribeToPresence(userId, callback)`
  - [x] `setTyping(conversationId, userId, isTyping)`
  - [x] `subscribeToTyping(conversationId, callback)`
  - [x] Set up `onDisconnect()` handlers
- [x] Create `src/services/firebase-storage.ts`:
  - [x] `uploadImage(uri, path)`
  - [x] `getDownloadURL(path)`
  - [x] `deleteFile(path)`

### State Management Setup
- [x] Create Zustand store: `src/store/auth-store.ts`
  ```typescript
  interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
  }
  ```
- [x] Create Zustand store: `src/store/message-store.ts`
  ```typescript
  interface MessageStore {
    optimisticMessages: Message[];
    addOptimisticMessage: (message: Message) => void;
    updateOptimisticMessage: (localId: string, updates: Partial<Message>) => void;
    removeOptimisticMessage: (localId: string) => void;
  }
  ```
- [x] Set up React Query provider in `app/_layout.tsx`
- [x] Create query client configuration with retry logic

### Authentication Flow
- [x] Create `app/(auth)/_layout.tsx` (stack navigator)
- [x] Build Login screen: `app/(auth)/login.tsx`
  - [x] Email input field
  - [x] Password input field (secure)
  - [x] "Sign In" button
  - [x] "Don't have an account?" link to register
  - [x] Error handling UI
  - [x] Loading state
- [x] Build Register screen: `app/(auth)/register.tsx`
  - [x] Display name input
  - [x] Email input
  - [x] Password input (with confirmation)
  - [x] "Create Account" button
  - [x] "Already have an account?" link to login
  - [x] Password validation (min 6 chars)
  - [x] Error handling UI
- [x] Implement auth persistence check in `app/_layout.tsx`
- [x] Create protected route wrapper
- [x] Test sign up flow end-to-end
- [x] Test sign in flow end-to-end
- [x] Test auth persistence (close/reopen app)

### Main Navigation Structure
- [x] Create `app/(tabs)/_layout.tsx` (tab navigator)
- [x] Build Chats List screen: `app/(tabs)/chats.tsx`
  - [x] Empty state ("No conversations yet")
  - [x] Floating action button (new conversation)
  - [x] Header with "Chats" title
- [x] Build Profile screen: `app/(tabs)/profile.tsx`
  - [x] Display current user name and email
  - [x] Profile picture placeholder
  - [x] "Sign Out" button
  - [x] App version info
- [x] Configure tab bar icons and labels
- [x] Test navigation between tabs

### Error Handling & Utilities
- [x] Create `src/utils/error-handler.ts`:
  - [x] Firebase error code mapping to user-friendly messages
  - [x] Global error boundary component
- [x] Create `src/utils/validators.ts`:
  - [x] Email validation
  - [x] Password strength validation
  - [x] Message length validation
- [x] Create `src/utils/date-formatter.ts`:
  - [x] Format timestamp to "1:45 PM"
  - [x] Format date to "Yesterday", "Monday", etc.
  - [x] Relative time ("2 minutes ago")

**Checkpoint**: ✅ User can sign up, sign in, and navigate basic app structure

---

## Phase 2: One-on-One Messaging

**Goal**: Core messaging functionality between two users with real-time sync

### User Discovery & Conversation Creation
- [x] Create `src/services/user-search.ts`:
  - [x] `searchUsersByEmail(query)`
  - [x] `searchUsersByDisplayName(query)`
- [x] Build "New Conversation" screen: `app/new-conversation.tsx`
  - [x] Search input field
  - [x] User list results
  - [x] Tap user to start conversation
  - [x] Check if conversation already exists
  - [x] Create new conversation if needed
  - [x] Navigate to conversation screen
- [x] Implement conversation creation logic:
  - [x] Create Firestore conversation document
  - [x] Add both participants
  - [x] Initialize conversation metadata
  - [x] Handle duplicate prevention

### Conversation Screen Foundation
- [x] Create `app/conversation/[id].tsx` (dynamic route)
- [x] Build conversation header:
  - [x] Back button
  - [x] Other user's name
  - [x] Online/offline indicator (placeholder for Phase 3)
  - [x] Avatar/profile picture
- [x] Build message input component: `src/components/MessageInput.tsx`
  - [x] Text input field
  - [x] Send button
  - [x] Character count (show when approaching limit)
  - [x] Disable send if empty or too long
- [x] Build message list component: `src/components/MessageList.tsx`
  - [x] FlatList with inverted prop
  - [x] Empty state ("No messages yet")
  - [x] Loading state while fetching
  - [x] Pull-to-refresh (future: load older messages)

### Message Rendering
- [x] Create message bubble component: `src/components/MessageBubble.tsx`
  - [x] Different styles for sent vs received messages
  - [x] Display message text
  - [x] Display timestamp
  - [x] Display sender name (for future group chats)
  - [x] Status indicator (sending, sent, delivered, read)
  - [x] Long-press menu (placeholder for Phase 6)
- [x] Implement message grouping by time (10-minute intervals)
- [x] Add date dividers ("Today", "Yesterday", specific dates)
- [x] Handle long messages (proper text wrapping)
- [x] Handle links in messages (detect and make tappable)

### Send Message Flow (Optimistic Updates)
- [x] Implement message send handler:
  1. [x] Generate temporary `localId` (UUID)
  2. [x] Create message object with `status: 'sending'`
  3. [x] Insert into SQLite immediately
  4. [x] Add to Zustand optimistic message store
  5. [x] UI shows message instantly (gray checkmark)
  6. [x] Initiate Firebase write
  7. [x] On success:
     - [x] Update SQLite with server `id`
     - [x] Update status to `'sent'`
     - [x] Remove from optimistic store
     - [x] Update UI (checkmark changes)
  8. [x] On failure:
     - [x] Update status to `'failed'`
     - [x] Show retry button
     - [x] Keep in optimistic store
- [x] Implement retry logic for failed messages
- [x] Test message send with good network
- [x] Test message send with airplane mode (should queue)

### Receive Message Flow
- [x] Set up Firestore real-time listener in conversation screen:
  - [x] Subscribe to `/conversations/{id}/messages`
  - [x] Order by timestamp descending
  - [x] Limit to last 50 messages initially
- [x] Implement message receive handler:
  1. [x] New message arrives via listener
  2. [x] Check if message already in SQLite (deduplication)
  3. [x] Insert new message into SQLite
  4. [x] React Query cache invalidation
  5. [x] UI updates automatically
- [x] Implement auto-scroll to bottom on new message (if already at bottom)
- [x] Show "scroll to bottom" button if user scrolled up
- [x] Test receiving messages in real-time

### Message Persistence & Offline Support
- [x] Implement conversation list data loading:
  - [x] Load from SQLite first (instant display)
  - [x] Fetch from Firestore in background
  - [x] Merge and update SQLite
- [x] Implement message history loading:
  - [x] Load last 50 messages from SQLite
  - [x] Load last 50 from Firestore (on initial load)
  - [x] Sync newer messages from server
  - [x] Store in SQLite
- [x] Handle offline message queue:
  - [x] Detect network state
  - [x] Queue messages with `syncStatus: 'pending'`
  - [x] Auto-retry when network returns
  - [x] Show "Waiting for network" indicator
- [x] Implement conversation list sync:
  - [x] Subscribe to user's conversations
  - [x] Update local cache
  - [x] Show unread count badges

### Conversation List Enhancement
- [x] Update `app/(tabs)/chats.tsx` with real data:
  - [x] Load conversations from SQLite
  - [x] Subscribe to Firestore updates
  - [x] Display conversation items with:
    - [x] Other user's avatar
    - [x] Other user's name
    - [x] Last message preview
    - [x] Timestamp of last message
    - [x] Unread count badge
    - [ ] Online indicator (Phase 3)
  - [x] Sort by last message timestamp
  - [x] Tap to navigate to conversation
- [x] Implement pull-to-refresh
- [ ] Add swipe actions (archive/delete - placeholder for Phase 6)

### React Query Integration
- [x] Create custom hooks:
  - [x] `useConversations()` - fetches user's conversation list
  - [x] `useConversation(id)` - fetches single conversation
  - [x] `useMessages(conversationId)` - fetches messages with pagination
  - [x] `useSendMessage(conversationId)` - mutation for sending
- [x] Configure query cache invalidation strategy
- [x] Set up optimistic updates with React Query
- [x] Add error handling and retry logic

### Testing Two-User Flow
- [ ] Create two test accounts
- [ ] Send messages from User A to User B
- [ ] Verify User B receives in real-time
- [ ] Reply from User B to User A
- [ ] Verify message history persists after app restart
- [ ] Test offline send and sync
- [ ] Verify SQLite contains all messages

### Additional Enhancements (Completed)
- [x] Create universal layout system with safe areas (`src/constants/layout.ts`)
- [x] Apply iOS safe area spacing to all screens
- [x] Add back button to new conversation screen
- [x] Update root navigation to use Stack (enables back buttons)
- [x] Create conversation service (`src/services/conversation-service.ts`)
- [x] Create message service (`src/services/message-service.ts`)

### Production Readiness Refactors (Completed)
- [x] Enable Firestore offline persistence:
  - [x] Switch from `getFirestore()` to `initializeFirestore()` with `persistentLocalCache()`
  - [x] Enables faster queries and better offline support
  - [x] Modified: `mobile/firebase.config.ts`
- [x] Add Error Boundary component:
  - [x] Created `ErrorBoundary` component to catch unhandled errors
  - [x] Wrapped app in error boundary at root layout
  - [x] Prevents app crashes with user-friendly recovery screen
  - [x] New: `mobile/src/components/ErrorBoundary.tsx`
  - [x] Modified: `mobile/app/_layout.tsx`
- [x] Implement network state detection:
  - [x] Installed `@react-native-community/netinfo` package
  - [x] Created `useNetworkStatus` hook for real-time monitoring
  - [x] Created `OfflineBanner` component (shows red banner when offline)
  - [x] Added banner to Chats and Conversation screens
  - [x] New: `mobile/src/hooks/useNetworkStatus.ts`
  - [x] New: `mobile/src/components/OfflineBanner.tsx`
- [x] Fix Firestore listener cleanup:
  - [x] Fixed useEffect dependency (currentUser → currentUser?.id)
  - [x] Added isMounted flag to prevent state updates after unmount
  - [x] Prevents memory leaks and duplicate listeners
  - [x] Modified: `mobile/app/conversation/[id].tsx`

**Checkpoint**: ✅ Two users can chat in real-time with persistence + production-ready error handling and offline support

---

## Phase 3: Presence & Ephemeral Data

**Goal**: Show who's online and typing indicators

### Presence System (Firebase RTDB)
- [x] Update `src/services/firebase-rtdb.ts` with presence logic:
  - [x] `initializePresence(userId)` - called on app launch
  - [x] Set `/presence/{userId}` to `{ online: true, lastSeen: timestamp }`
  - [x] Configure `onDisconnect()` to set `{ online: false, lastSeen: timestamp }`
  - [x] Handle multiple device connections (use connection IDs)
- [x] Create presence hook: `src/hooks/usePresence.ts`
  - [x] Subscribe to user's presence
  - [x] Return `{ online: boolean, lastSeen: Date | null }`
  - [x] Cleanup subscription on unmount
- [x] Update conversation header:
  - [x] Show green dot if user is online
  - [x] Show "last seen X minutes ago" if offline
  - [x] Update in real-time as status changes
- [x] Update conversation list items:
  - [x] Small green dot next to avatar if online
- [x] Test presence across multiple devices:
  - [x] Open app on two devices with same account
  - [x] Verify "online" shows when at least one is active
  - [x] Close both apps
  - [x] Verify "last seen" appears

### Typing Indicators
- [x] Implement typing detection in `MessageInput.tsx`:
  - [x] Debounce text input changes (300ms)
  - [x] On typing start: Set `/typing/{conversationId}/{userId}` to `{ isTyping: true, timestamp }`
  - [x] On typing stop (5s timeout): Remove from RTDB
  - [x] On input blur: Remove from RTDB
  - [x] On message send: Remove from RTDB immediately
- [x] Create typing indicator hook: `src/hooks/useTypingIndicators.ts`
  - [x] Subscribe to `/typing/{conversationId}`
  - [x] Filter out current user
  - [x] Return list of users currently typing
  - [x] Auto-remove stale indicators (>5s old)
- [x] Update conversation screen:
  - [x] Show "John is typing..." above message input
  - [x] Show "John and Sarah are typing..." for multiple users
  - [x] Animate typing indicator (three dots animation)
- [x] Test typing indicators:
  - [x] Start typing from User A
  - [x] Verify User B sees indicator within 300ms
  - [x] Stop typing from User A
  - [x] Verify indicator disappears after 5s
  - [x] Send message from User A
  - [x] Verify indicator disappears immediately

### Connection State Handling
- [x] Monitor Firebase RTDB connection state:
  - [x] Subscribe to `/.info/connected`
  - [x] Show "Connecting..." banner when disconnected
  - [x] Auto-hide when reconnected
  - [x] Don't show for brief disconnections (<3s)
- [x] Update presence when connection state changes
- [x] Implement exponential backoff for reconnection attempts
- [x] Test with airplane mode toggles

### Presence Edge Cases
- [x] Handle app backgrounding:
  - [x] On app background: Keep connection for 30s, then disconnect
  - [x] On app foreground: Immediately reconnect and set online
- [x] Handle app termination:
  - [x] `onDisconnect()` should handle this automatically
  - [x] Verify "last seen" updates correctly
- [x] Handle multiple conversations open:
  - [x] Ensure typing in one doesn't show in another
- [x] Clean up old typing indicators on component unmount

**Checkpoint**: ✅ Users can see online status and typing indicators

---

## Phase 4: Media & Group Chat

**Goal**: Send images and support group conversations

### Image Upload & Display

#### Image Selection
- [x] Update `MessageInput.tsx` to include image picker button
- [x] Implement image selection handler:
  - [x] Request media library permissions
  - [x] Open Expo Image Picker
  - [x] Allow single image selection (MVP)
  - [x] Validate image size (<10MB)
  - [x] Show error if too large
- [x] Display selected image preview before sending:
  - [x] Thumbnail preview above input
  - [x] Remove button to deselect
  - [x] Caption input (optional)

#### Image Upload Flow
- [x] Create image upload service: `src/services/image-service.ts`
  - [x] Compress image if >1MB (reduce quality)
  - [x] Generate unique filename
  - [x] Upload to Firebase Storage at `/message-media/{conversationId}/{filename}`
  - [x] Get download URL
  - [x] Generate thumbnail (200x200)
- [x] Implement optimistic image message:
  1. [x] Show image in chat with loading indicator
  2. [x] Upload to Firebase Storage
  3. [x] Create message with `mediaUrl`
  4. [x] On success: Replace loading indicator
  5. [x] On failure: Show retry button
- [x] Update message model to support media:
  ```typescript
  content: {
    text: string;
    type: 'text' | 'image';
    mediaUrl?: string;
    thumbnailUrl?: string;
  }
  ```

#### Image Display in Messages
- [x] Update `MessageBubble.tsx` to handle image messages:
  - [x] Render image with proper aspect ratio
  - [x] Show loading skeleton while downloading
  - [ ] Tap to view full-screen (Phase 6 enhancement)
  - [x] Show caption below image if present
  - [x] Limit max width/height in chat
- [x] Implement image caching (Expo Image handles this)
- [x] Test image send/receive:
  - [x] Send image from User A
  - [x] Verify User B receives and can view
  - [x] Test with poor network (slow upload)
  - [x] Test offline send (should queue)

### Group Chat Foundation

#### Group Creation
- [x] Create "New Group" screen: `app/new-group.tsx`
  - [x] Group name input
  - [x] Member selection (multi-select)
  - [x] Show selected members with remove option
  - [x] "Create Group" button (disabled until ≥2 members)
  - [x] Enforce MAX_GROUP_SIZE (20 users)
  - [x] Show error if limit exceeded
- [x] Implement group creation logic:
  - [x] Create conversation with `type: 'group'`
  - [x] Set `participants` array (include creator)
  - [x] Set group `name`
  - [x] Set `createdBy` to creator's user ID
  - [x] Initialize `unreadCount` for all participants
  - [x] Navigate to group conversation
- [x] Update conversation list to show group names and icons

#### Group Conversation UI
- [x] Update conversation header for groups:
  - [x] Show group name instead of user name
  - [x] Show participant count (e.g., "12 members")
  - [ ] Tap header to view group info (Phase 6)
  - [x] Remove online indicator (not applicable)
- [x] Update message bubbles for groups:
  - [x] Show sender's name above message (if not current user)
  - [ ] Show sender's avatar to the left of bubble (Phase 6 enhancement)
  - [ ] Color-code avatars or names for easy identification (Phase 6 enhancement)

#### Group Messaging Logic
- [x] Update send message flow for groups:
  - [x] Message sent to conversation (same as 1-on-1)
  - [x] All participants receive via Firestore listener
  - [x] No special fanout needed (Firestore subcollection handles this)
- [ ] Update read receipts for groups:
  - [ ] Track which users have read the message (Phase 6)
  - [ ] Show read count ("Read by 8/12") (Phase 6)
  - [ ] Tap to view list of who read (Phase 6)
- [ ] Handle group-specific edge cases:
  - [ ] User leaves group (soft delete messages for that user) (Phase 6)
  - [ ] User removed from group (handled in Phase 6)

### Group Chat Testing
- [ ] Create group with 3 users (A, B, C) - Manual testing pending
- [ ] Send messages from each user - Manual testing pending
- [ ] Verify all users receive in real-time - Manual testing pending
- [ ] Verify sender names appear correctly - Manual testing pending
- [ ] Test with 10-user group - Manual testing pending
- [ ] Test with 20-user group (max limit) - Manual testing pending
- [ ] Verify group appears in conversation list for all members - Manual testing pending
- [ ] Test image sharing in groups - Manual testing pending

### Cloud Functions for Media Processing (Optional MVP)
- [ ] Create Cloud Function: `processMediaUpload` (Skipped for MVP - thumbnail generated client-side)
  - [ ] Trigger on new file in Storage
  - [ ] Generate thumbnail (200x200)
  - [ ] Store thumbnail in `/thumbnails/` path
  - [ ] Update message document with thumbnail URL
- [ ] Deploy function: `firebase deploy --only functions`
- [ ] Test thumbnail generation

**Checkpoint**: ✅ Users can send images and chat in groups (up to 20)

---

## Phase 5: Push Notifications

**Goal**: Notify users of new messages when app is closed or backgrounded

### Expo Push Notification Setup
- [x] Register for push notifications in `app/_layout.tsx`:
  - [x] Request notification permissions (iOS)
  - [x] Get Expo push token
  - [x] Store token in Firestore `/users/{userId}/pushToken`
  - [x] Update token on app launch (in case it changes)
- [x] Create `src/services/notifications.ts`:
  - [x] `registerForPushNotifications(userId)`
  - [x] `handleNotificationReceived(notification)`
  - [x] `handleNotificationResponse(response)` - tap to open
- [x] Set up notification listeners:
  - [x] Foreground notification handler (show in-app alert)
  - [x] Background/killed notification handler (deep link to conversation)
- [ ] Test push token registration:
  - [ ] Open app on device (requires physical iPhone)
  - [ ] Verify pushToken saved in Firestore

### Cloud Function for Push Notifications
- [x] Create Cloud Function: `functions/src/index.ts` (sendMessageNotification)
  - [x] Triggers on `/conversations/{conversationId}/messages/{messageId}` creation
  - [x] Get conversation participants
  - [x] Exclude message sender
  - [x] Get push tokens for recipients
  - [x] Validate Expo push tokens
  - [x] Check notification preferences (`notificationsEnabled`)
  - [x] Send push via Expo Push API
  - [ ] Check if recipients are active in conversation (optional - not implemented)
- [x] Implement notification payload:
  - [x] Title: sender name or group name
  - [x] Body: message text or "📷 Image"
  - [x] Data: conversationId, messageId, senderId, senderName, type: 'new_message'
  - [x] Sound: 'default'
  - [x] Badge: 1 (hardcoded - actual unread count not implemented)
  - [x] Priority: 'high'
- [x] Handle batch sending for groups (uses `expo.chunkPushNotifications()`)
- [x] Add retry logic for failed sends (handled by Expo SDK)
- [x] Deploy function: `firebase deploy --only functions` (deployed October 22, 2025)

### Notification Handling in App
- [x] Implement deep linking:
  - [x] Configure URL scheme in `app.json` (scheme: "whatsappclone")
  - [x] Handle notification tap → navigate to conversation
  - [x] Extract `conversationId` from notification data
  - [x] Navigate using Expo Router
- [x] Update badge count on app icon:
  - [ ] Calculate total unread across all conversations (not implemented - hardcoded to 1)
  - [x] Set badge number using Expo Notifications (Cloud Function sets badge: 1)
  - [ ] Clear badge when app opens (not implemented - optional enhancement)
- [ ] Implement notification suppression (optional - not implemented):
  - [ ] Don't send notification if user is actively viewing the conversation
  - [ ] Track "active conversation" in RTDB or Firestore
  - [ ] Cloud Function checks before sending

### Notification Preferences (Basic)
- [x] Add notification toggle to profile settings:
  - [x] Enable/disable all notifications
  - [x] Store preference in Firestore (`notificationsEnabled` field)
  - [x] Cloud Function respects this setting
- [x] Test notification preferences (requires physical device):
  - [x] OS-level toggle (iPhone Settings) - Working ✅
  - [x] In-app toggle (Profile screen) - Fixed and deployed ✅
  - [x] Verify Cloud Function respects preference - Working ✅

### Testing Push Notifications (All require physical iPhone device)
- [x] **Foreground notifications**:
  - [x] App open, conversation closed
  - [x] Verify banner appears
  - [x] Tap banner → navigate to conversation
- [x] **Background notifications**:
  - [x] App in background
  - [x] Send message from another device
  - [x] Verify iOS notification appears
  - [x] Tap notification → app opens to conversation
- [x] **Killed app notifications**:
  - [x] Force quit app
  - [x] Send message
  - [x] Verify notification appears
  - [x] Tap → app launches to conversation
- [x] **Group notifications**:
  - [x] Send group message
  - [x] Verify all members receive notification
  - [x] Verify sender doesn't receive own notification
- [ ] **Notification while in conversation** (optional - suppression not implemented):
  - [ ] User A viewing conversation with User B
  - [ ] User B sends message
  - [ ] Currently WILL send notification (suppression not implemented)

### iOS-Specific Requirements
- [x] Ensure `GoogleService-Info.plist` is properly configured
- [x] Verify APNs key is set up in Firebase Console
- [x] Configure notification capabilities in Xcode (happens automatically with EAS build)
- [x] Test on physical iOS device (push doesn't work in simulator)

**Checkpoint**: ✅ Push notifications working for all message scenarios

---

## Phase 6: Polish & Testing

**Goal**: Refine UX, add essential features, optimize performance for production use

### UI/UX Polish

#### Visual Design
- [ ] Design and implement app icon
- [ ] Design and implement splash screen
- [ ] Choose and implement color scheme:
  - [ ] Primary color (brand color)
  - [ ] Secondary color
  - [ ] Message bubble colors (sent vs received)
  - [ ] Background colors
  - [ ] Text colors (ensure WCAG contrast)
- [ ] Typography:
  - [ ] Choose font family (system default or custom)
  - [ ] Define font sizes for headers, body, captions
  - [ ] Implement consistent text styles
- [ ] Spacing and layout:
  - [ ] Define spacing scale (4px, 8px, 16px, 24px, etc.)
  - [ ] Ensure consistent padding/margins
  - [ ] Proper safe area handling (iPhone notches)

#### Animation & Transitions
- [ ] Add message send animation (slide in from bottom)
- [ ] Add message receive animation (slide in from top)
- [ ] Smooth scroll-to-bottom animation
- [ ] Typing indicator animation (three bouncing dots)
- [ ] Skeleton loaders for images
- [ ] Pull-to-refresh animation on conversation list
- [ ] Tab bar icon animations

#### Micro-interactions
- [ ] Haptic feedback on message send
- [ ] Haptic feedback on button presses
- [ ] Visual feedback on message long-press
- [ ] Swipe gestures on conversation list items
- [ ] Confirm dialogs with proper animations

### Message Actions & Features
- [ ] Implement message long-press menu:
  - [ ] Copy text
  - [ ] Delete for me
  - [ ] Delete for everyone (if sender, within 1 hour)
  - [ ] Reply (quoted reply - optional)
  - [ ] Forward (Phase 7 or post-MVP)
- [ ] Implement message deletion:
  - [ ] "Delete for me" → soft delete (add userId to deletedFor array)
  - [ ] "Delete for everyone" → set deletedAt timestamp, hide for all
  - [ ] Update UI immediately
  - [ ] Sync with Firestore
- [ ] Add "Copy" action for text messages
- [ ] Add "Save" action for images (save to Photos)

### Profile & Settings
- [ ] Profile screen enhancements:
  - [ ] Upload profile picture
  - [ ] Edit display name
  - [ ] Show email (read-only)
  - [ ] About/status text (optional)
- [ ] Settings screen: `app/(tabs)/settings.tsx`
  - [ ] Notification preferences
  - [ ] Theme selection (light/dark - if implementing)
  - [ ] Data usage settings (auto-download images)
  - [ ] Privacy settings placeholder
  - [ ] Help & Support section
  - [ ] About app (version, licenses)

### Error Handling & Edge Cases

#### Network Errors
- [ ] Handle Firestore connection loss:
  - [ ] Show "No connection" banner
  - [ ] Queue outbound messages
  - [ ] Auto-retry on reconnection
  - [ ] Don't show error for transient network issues
- [ ] Handle Firebase Storage upload failures:
  - [ ] Show error message
  - [ ] Allow retry
  - [ ] Don't lose the image
- [ ] Handle Cloud Function errors:
  - [ ] Log to console for debugging
  - [ ] Show user-friendly error message
  - [ ] Implement fallback behavior where possible

#### Data Validation
- [ ] Validate message length before send
- [ ] Validate image size before upload
- [ ] Validate group size before creation
- [ ] Sanitize user input (prevent XSS if rendering HTML)
- [ ] Handle malformed Firestore data gracefully

#### Authentication Edge Cases
- [ ] Handle token expiration:
  - [ ] Detect auth state change
  - [ ] Redirect to login
  - [ ] Show "Session expired" message
- [ ] Handle simultaneous login on multiple devices (should work)
- [ ] Handle account deletion (Phase 7 or post-MVP)

#### Message Delivery Edge Cases
- [ ] Handle duplicate messages (deduplication via message ID)
- [ ] Handle out-of-order messages (sort by timestamp)
- [ ] Handle messages sent while offline (queue and send on reconnect)
- [ ] Handle conversation deleted by other user (graceful error)

### Performance Optimization
- [ ] Optimize conversation list rendering:
  - [ ] Use `FlatList` with `getItemLayout` for performance
  - [ ] Implement windowing (render only visible items)
  - [ ] Memoize expensive computations
- [ ] Optimize message list rendering:
  - [ ] Paginate messages (load 50 at a time)
  - [ ] Implement "Load more" on scroll to top
  - [ ] Memoize message bubbles with `React.memo`
- [ ] Optimize image loading:
  - [ ] Use Expo Image with caching
  - [ ] Lazy load images as user scrolls
  - [ ] Compress images before upload
- [ ] Optimize Firestore queries:
  - [ ] Use indexes for complex queries
  - [ ] Limit query results
  - [ ] Use query cursors for pagination
- [ ] Reduce bundle size:
  - [ ] Analyze bundle with `npx expo-doctor`
  - [ ] Remove unused dependencies
  - [ ] Use tree-shaking where possible

### Accessibility
- [ ] Add accessibility labels to all interactive elements
- [ ] Ensure proper color contrast (WCAG AA)
- [ ] Support VoiceOver (iOS screen reader)
- [ ] Test with larger text sizes
- [ ] Add keyboard navigation support (where applicable)
- [ ] Ensure tap targets are ≥44x44 points

### Testing & Quality Assurance
- [ ] Manual testing scenarios:
  - [ ] Test all happy paths (sign up → send message → receive)
  - [ ] Test error scenarios (wrong password, network loss)
  - [ ] Test edge cases (empty messages, long messages, special characters)
- [ ] Device testing:
  - [ ] Test on physical iPhone (required for push)
  - [ ] Test on multiple iOS versions (if possible)
  - [ ] Test on different screen sizes (iPhone SE, iPhone 14, iPhone 14 Pro Max)
- [ ] Network condition testing:
  - [ ] Good network (WiFi)
  - [ ] 3G simulation
  - [ ] Airplane mode toggling
  - [ ] Intermittent connectivity
- [ ] Performance testing:
  - [ ] Measure app launch time
  - [ ] Measure time-to-first-message
  - [ ] Check for memory leaks
  - [ ] Profile with React DevTools
- [ ] Create test user accounts (at least 5)
- [ ] Populate test data (conversations, messages)
- [ ] Test multi-device scenarios

### Bug Fixes & Cleanup
- [ ] Review and fix all console warnings
- [ ] Remove debug `console.log` statements
- [ ] Fix TypeScript `any` types (strict mode)
- [ ] Clean up unused imports and variables
- [ ] Ensure all async functions have proper error handling
- [ ] Review and update Firebase security rules (ensure production-ready)
- [ ] Review and update `.env` files (ensure no secrets committed)

**Checkpoint**: ✅ App is polished, tested, and ready for TestFlight

---

## Phase 7: AI Integration (Generic Features)

**Goal**: Add AI assistance features for all users (incremental implementation)

**Note:** For specialized parent-caregiver AI features, see `task-list-appendix-b.md`

### AI Infrastructure Setup
- [ ] Set up Anthropic/OpenAI API keys in Firebase Functions
- [ ] Create Cloud Function: `processAIAction`
- [ ] Set up Pinecone (or alternative) for vector storage
- [ ] Create Firestore collection: `/actionQueue`
- [ ] Create Firestore collection: `/conversationContext`
- [ ] Install Vercel AI SDK in Cloud Functions
- [ ] Configure AI model (OpenAI GPT-4 recommended)

### Conversation History Embeddings (RAG Pipeline)
- [ ] Create Cloud Function: `generateEmbeddings`
  - [ ] Trigger on new message creation
  - [ ] Batch messages (every 10 messages)
  - [ ] Generate embeddings using OpenAI embedding model
  - [ ] Store in Pinecone with metadata
  - [ ] Update `conversationContext` with last update time
- [ ] Create embedding search function:
  - [ ] Query Pinecone with user question
  - [ ] Retrieve top-k relevant message chunks
  - [ ] Fetch full messages from Firestore
  - [ ] Return ranked results

### AI Assistant Chat Interface
- [ ] Create AI chat screen: `app/ai-assistant.tsx`
  - [ ] Similar to conversation screen
  - [ ] Special "AI Assistant" header with icon
  - [ ] Message input for user questions
  - [ ] Display AI responses with streaming
- [ ] Implement AI message handler:
  - [ ] User sends question
  - [ ] Create action in `/actionQueue`
  - [ ] Cloud Function processes
  - [ ] Retrieve relevant conversation history (RAG)
  - [ ] Construct prompt for OpenAI
  - [ ] Stream response back to user
  - [ ] Display in chat with typing indicator
- [ ] Add context menu to messages:
  - [ ] "Ask AI about this" button
  - [ ] Pre-fills AI chat with context

### AI Features: Translation
- [ ] Add "Translate" to message long-press menu
- [ ] Implement translation flow:
  - [ ] Create action: `{ type: 'translate', messageId, targetLanguage }`
  - [ ] Cloud Function calls AI with prompt
  - [ ] Store translation in message metadata
  - [ ] Display translation below original message
  - [ ] Cache translation for future views
- [ ] Add language selection UI
- [ ] Support auto-detect source language

### AI Features: Summarization
- [ ] Add "Summarize" button to conversation header menu
- [ ] Implement summarization flow:
  - [ ] Fetch last N messages from conversation
  - [ ] Create action: `{ type: 'summarize', conversationId, messageIds }`
  - [ ] Cloud Function calls AI with messages
  - [ ] Generate summary (150-200 words)
  - [ ] Store in `/conversationContext`
  - [ ] Display in modal or dedicated screen
- [ ] Add "Summary" tab in conversation info
- [ ] Auto-update summary periodically (every 50 messages)

### AI Features: Smart Replies
- [ ] Implement smart reply suggestions:
  - [ ] On message receive, generate 3 quick replies
  - [ ] Use last 5 messages as context
  - [ ] Display as chips above message input
  - [ ] Tap to auto-fill input
  - [ ] Expire after 1 minute or on input focus
- [ ] Optimize for speed (use caching)
- [ ] Make opt-in via user preferences

### AI Features: Action Item Extraction
- [ ] Implement action item detection:
  - [ ] Scan messages for action-oriented language
  - [ ] Extract tasks, deadlines, assignments
  - [ ] Store in `/conversationContext/actionItems`
  - [ ] Display in conversation info screen
  - [ ] Allow marking as complete
- [ ] Create "Action Items" view:
  - [ ] List all extracted action items
  - [ ] Group by conversation
  - [ ] Filter by completion status

### Feature Flags & Rollout
- [ ] Implement feature flag system:
  - [ ] Per-user AI feature toggles
  - [ ] Per-conversation AI enablement
  - [ ] A/B testing capability
- [ ] Add AI settings to profile:
  - [ ] Enable/disable AI assistant
  - [ ] Enable/disable auto-translate
  - [ ] Enable/disable smart replies
  - [ ] Enable/disable action extraction
- [ ] Implement usage tracking:
  - [ ] Count AI API calls per user
  - [ ] Calculate cost per user
  - [ ] Enforce rate limits

### AI Cost Management
- [ ] Implement rate limiting:
  - [ ] Max 50 AI calls per user per day (configurable)
  - [ ] Show usage in settings
  - [ ] Display warning at 80% usage
  - [ ] Block further calls at 100%
- [ ] Cache AI responses:
  - [ ] Store translations for reuse
  - [ ] Store summaries (update periodically)
  - [ ] Store embeddings (avoid re-computing)
- [ ] Monitor costs in Firebase Console
- [ ] Set up budget alerts

### Testing AI Features
- [ ] Test RAG pipeline:
  - [ ] Ask question about past messages
  - [ ] Verify relevant context retrieved
  - [ ] Verify answer accuracy
- [ ] Test translation:
  - [ ] Translate various languages
  - [ ] Verify quality of translations
  - [ ] Test caching (same message twice)
- [ ] Test summarization:
  - [ ] Summarize short conversation (5 messages)
  - [ ] Summarize long conversation (100+ messages)
  - [ ] Verify key points captured
- [ ] Test smart replies:
  - [ ] Verify relevance to context
  - [ ] Verify variety in suggestions
  - [ ] Test latency (should be <2s)
- [ ] Test rate limiting:
  - [ ] Exceed daily limit
  - [ ] Verify blocking works
  - [ ] Verify reset after 24 hours

**Checkpoint**: ✅ AI features integrated and functional

---

## Testing Checklist

### Unit Testing (Optional for MVP)
- [ ] Set up Jest and React Native Testing Library
- [ ] Write tests for utility functions
- [ ] Write tests for custom hooks
- [ ] Write tests for state management (Zustand stores)
- [ ] Write tests for Firebase service functions (with mocks)

### Integration Testing
- [ ] Test authentication flow end-to-end
- [ ] Test message send/receive flow
- [ ] Test group creation and messaging
- [ ] Test image upload and display
- [ ] Test push notification delivery
- [ ] Test presence updates
- [ ] Test typing indicators
- [ ] Test offline message queue
- [ ] Test conversation sync after app restart

### User Acceptance Testing (UAT)
- [ ] Recruit 5-10 alpha testers
- [ ] Provide testing guidelines/scenarios
- [ ] Collect feedback via form or interviews
- [ ] Track bugs and feature requests
- [ ] Iterate based on feedback

### Performance Testing
- [ ] Test with 100 messages in a conversation
- [ ] Test with 20 conversations in list
- [ ] Test with 20-user group chat
- [ ] Measure app launch time (<3s)
- [ ] Measure time-to-first-message (<1s)
- [ ] Check memory usage (should stay under 200MB)
- [ ] Profile with Xcode Instruments

### Security Testing
- [ ] Verify Firebase security rules block unauthorized access
- [ ] Test that users can't read others' messages
- [ ] Test that users can't modify others' profiles
- [ ] Verify API keys are not exposed in client code
- [ ] Test authentication token expiration handling
- [ ] Verify images are not publicly accessible without auth

---

## On-Device Testing & Deployment Checklist

### Pre-Testing
- [x] Review all Firebase security rules (production-ready)
- [x] Review all environment variables (no hardcoded secrets)
- [ ] Update app version in `app.json`
- [x] Test on physical iOS device via Expo Go
- [x] Fix all critical bugs from testing
- [x] Ensure push notifications work on physical device

### Expo Go Testing
- [x] Install Expo Go app on iOS device
- [x] Connect to same network as development machine
- [x] Run `npx expo start`
- [x] Scan QR code with Expo Go app
- [x] Test all core features on device
- [x] Test push notifications (requires physical device)
- [ ] Test on multiple iOS devices and versions (if available)

### Production Monitoring
- [ ] Monitor Firebase Console for errors
- [ ] Monitor Firestore usage (reads/writes)
- [ ] Monitor Cloud Functions logs
- [ ] Monitor Firebase Storage usage
- [ ] Track push notification delivery rates
- [ ] Collect crash reports (if any)
- [ ] Create GitHub issues for reported bugs

### Iteration & Updates
- [ ] Fix critical bugs discovered in testing
- [ ] Update version in `app.json`
- [ ] Re-test on device via Expo Go
- [ ] Repeat until stable

---

## Key Milestones

| Milestone | Description | Status | Target | Actual |
|-----------|-------------|--------|--------|--------|
| M1: Project Setup | Environment configured, repos created | ✅ Complete | Week 1 | Week 1 |
| M2: Authentication Working | Users can sign up and sign in | ✅ Complete | Week 2 | Week 2 |
| M3: One-on-One Chat | Two users can message in real-time | ✅ Complete | Week 4 | Week 2 |
| M4: Presence & Typing | Online indicators and typing working | ✅ Complete | Week 5 | Week 2 |
| M5: Groups & Media | Group chats and image sharing | ✅ Complete | Week 7 | Week 2 |
| M6: Push Notifications | Notifications working on device | ✅ Complete | Week 8 | Week 2 |
| M7: Polish & Testing | Quick polish phase complete | 🎯 In Progress | Week 3 | - |
| M8: MVP Complete | All core features stable and tested | 🔜 Not Started | Week 3 | - |
| M9: AI Integration | Generic AI features implemented | 🎯 Next | Week 4-8 | - |

---

## Development Tips & Best Practices

### Git Workflow
- Commit frequently with clear messages
- Use feature branches for major features
- Create pull requests for code review (if team)
- Tag releases (e.g., `v1.0.0-alpha`)

### Code Organization
- Keep components small and focused (single responsibility)
- Extract reusable logic into custom hooks
- Use TypeScript strictly (avoid `any`)
- Document complex logic with comments
- Use constants for magic numbers and strings

### Firebase Best Practices
- Always use security rules (never start in production mode)
- Use indexes for complex queries
- Batch writes when possible
- Denormalize data for read efficiency
- Clean up listeners on component unmount

### React Native Performance
- Use `React.memo` for expensive components
- Avoid inline functions in render (use `useCallback`)
- Use `FlatList` for long lists (not `ScrollView`)
- Optimize images (compress, cache, lazy load)
- Profile with Flipper or React DevTools

### Debugging Tips
- Use React Native Debugger
- Enable Firestore debug logging: `setLogLevel('debug')`
- Use `console.log` with prefixes for easier filtering
- Test on real devices for push notifications
- Use Firebase Emulator Suite for local development

### Common Pitfalls to Avoid
- Don't store sensitive data in Firestore without proper rules
- Don't forget to clean up Firestore listeners
- Don't hardcode API keys (use environment variables)
- Don't over-denormalize (balance reads vs writes)
- Don't skip error handling (especially network errors)
- Don't forget to test offline scenarios

---

## Support & Resources

### Documentation
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community
- [Expo Forums](https://forums.expo.dev/)
- [React Native Community](https://www.reactnative.community/)
- [Firebase Slack](https://firebase.community/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

### Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) (Meta's debugging tool)
- [Postman](https://www.postman.com/) (API testing)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

---

**Last Updated**: October 22, 2025  
**Status**: Phase 6 In Progress - Quick Polish  
**Version**: 2.0 - Updated for on-device testing (removed TestFlight)
