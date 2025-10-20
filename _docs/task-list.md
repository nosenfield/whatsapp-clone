# Implementation Task List
**Messaging App with AI Layer - iOS MVP**

Last Updated: October 20, 2025

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
- [ ] macOS system confirmed (required for iOS development)
- [ ] Xcode installed (latest version from App Store)
- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] Git installed and configured
- [ ] Apple Developer account ($99/year) - required for TestFlight
- [ ] Firebase account created (free tier)
- [ ] Anthropic/OpenAI account created (for future AI phase)

### Environment Setup
- [ ] Install Expo CLI globally: `npm install -g expo-cli eas-cli`
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Verify installations:
  ```bash
  expo --version
  eas --version
  firebase --version
  ```

### Repository Initialization
- [ ] Create GitHub repository (private)
- [ ] Initialize local project directory structure:
  ```
  whatsapp-clone/
  ├── _docs/                    # Documentation
  ├── mobile/                   # React Native app
  ├── functions/                # Firebase Cloud Functions
  ├── .gitignore
  └── README.md
  ```
- [ ] Set up `.gitignore` (Node, Expo, Firebase, macOS)
- [ ] Initial commit and push to GitHub

### Firebase Project Setup
- [ ] Create new Firebase project in console
- [ ] Enable Authentication (Email/Password)
- [ ] Create Firestore database (start in test mode, region: us-central)
- [ ] Create Realtime Database (start in test mode, region: us-central)
- [ ] Enable Firebase Storage
- [ ] Register iOS app in Firebase project
- [ ] Download `GoogleService-Info.plist`
- [ ] Enable Firebase Cloud Messaging
- [ ] Note project ID and configuration values

### Expo Project Initialization
- [ ] Navigate to project directory
- [ ] Create new Expo project:
  ```bash
  npx create-expo-app mobile --template blank-typescript
  cd mobile
  ```
- [ ] Install core dependencies:
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
- [ ] Configure `app.json` for Expo Router and iOS bundle identifier
- [ ] Test initial app runs: `npx expo start`

### Firebase Functions Setup
- [ ] Initialize Firebase in project root:
  ```bash
  firebase init
  # Select: Functions, Firestore, Database, Storage
  # Choose TypeScript for Functions
  # Choose existing project
  ```
- [ ] Navigate to functions directory: `cd functions`
- [ ] Install additional dependencies:
  ```bash
  npm install expo-server-sdk
  npm install @anthropic-ai/sdk  # For future AI phase
  ```
- [ ] Configure `functions/tsconfig.json` for strict mode
- [ ] Create `functions/.env` for API keys (add to .gitignore)

### Project Structure Setup
- [ ] Create mobile app folder structure:
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
- [ ] Create TypeScript types file: `src/types/index.ts`
- [ ] Create constants file: `src/constants/index.ts`

### Configuration Files
- [ ] Create `mobile/firebase.config.ts`:
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
- [ ] Create `mobile/src/constants/index.ts`:
  ```typescript
  export const MAX_GROUP_SIZE = 20;
  export const MAX_MESSAGE_LENGTH = 5000;
  export const MAX_IMAGE_SIZE_MB = 10;
  export const TYPING_INDICATOR_TIMEOUT = 5000;
  ```
- [ ] Create EAS build configuration: `eas.json`

### Security Rules Setup
- [ ] Create `firestore.rules` (from architecture doc)
- [ ] Create `database.rules.json` (from architecture doc)
- [ ] Create `storage.rules` (basic read/write for authenticated users)
- [ ] Deploy rules: `firebase deploy --only firestore:rules,database,storage`

**Checkpoint**: ✅ Project structure created, Firebase configured, dependencies installed

---

## Phase 1: Core Infrastructure

**Goal**: Set up authentication, navigation, and local storage foundation

### TypeScript Type Definitions
- [ ] Create `src/types/index.ts` with core interfaces:
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
- [ ] Export all types from central location

### SQLite Database Setup
- [ ] Create `src/services/database.ts`
- [ ] Implement database initialization function
- [ ] Create tables for: messages, conversations, users
- [ ] Create indexes for query optimization
- [ ] Implement migration system for future schema changes
- [ ] Write database helper functions:
  - [ ] `insertMessage()`
  - [ ] `updateMessage()`
  - [ ] `getConversationMessages()`
  - [ ] `deleteMessage()`
- [ ] Test database operations in isolation

### Firebase Service Layer
- [ ] Create `src/services/firebase-auth.ts`:
  - [ ] `signUp(email, password, displayName)`
  - [ ] `signIn(email, password)`
  - [ ] `signOut()`
  - [ ] `getCurrentUser()`
  - [ ] `updateProfile(displayName, photoURL)`
  - [ ] `onAuthStateChanged()` listener wrapper
- [ ] Create `src/services/firebase-firestore.ts`:
  - [ ] `createUser(userId, userData)`
  - [ ] `getUser(userId)`
  - [ ] `updateUser(userId, data)`
  - [ ] `createConversation(participants)`
  - [ ] `getConversation(conversationId)`
  - [ ] `sendMessage(conversationId, message)`
  - [ ] `subscribeToConversation(conversationId, callback)`
  - [ ] `subscribeToMessages(conversationId, callback)`
- [ ] Create `src/services/firebase-rtdb.ts`:
  - [ ] `setPresence(userId, online)`
  - [ ] `subscribeToPresence(userId, callback)`
  - [ ] `setTyping(conversationId, userId, isTyping)`
  - [ ] `subscribeToTyping(conversationId, callback)`
  - [ ] Set up `onDisconnect()` handlers
- [ ] Create `src/services/firebase-storage.ts`:
  - [ ] `uploadImage(uri, path)`
  - [ ] `getDownloadURL(path)`
  - [ ] `deleteFile(path)`

### State Management Setup
- [ ] Create Zustand store: `src/store/auth-store.ts`
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
- [ ] Create Zustand store: `src/store/message-store.ts`
  ```typescript
  interface MessageStore {
    optimisticMessages: Message[];
    addOptimisticMessage: (message: Message) => void;
    updateOptimisticMessage: (localId: string, updates: Partial<Message>) => void;
    removeOptimisticMessage: (localId: string) => void;
  }
  ```
- [ ] Set up React Query provider in `app/_layout.tsx`
- [ ] Create query client configuration with retry logic

### Authentication Flow
- [ ] Create `app/(auth)/_layout.tsx` (stack navigator)
- [ ] Build Login screen: `app/(auth)/login.tsx`
  - [ ] Email input field
  - [ ] Password input field (secure)
  - [ ] "Sign In" button
  - [ ] "Don't have an account?" link to register
  - [ ] Error handling UI
  - [ ] Loading state
- [ ] Build Register screen: `app/(auth)/register.tsx`
  - [ ] Display name input
  - [ ] Email input
  - [ ] Password input (with confirmation)
  - [ ] "Create Account" button
  - [ ] "Already have an account?" link to login
  - [ ] Password validation (min 6 chars)
  - [ ] Error handling UI
- [ ] Implement auth persistence check in `app/_layout.tsx`
- [ ] Create protected route wrapper
- [ ] Test sign up flow end-to-end
- [ ] Test sign in flow end-to-end
- [ ] Test auth persistence (close/reopen app)

### Main Navigation Structure
- [ ] Create `app/(tabs)/_layout.tsx` (tab navigator)
- [ ] Build Chats List screen: `app/(tabs)/chats.tsx`
  - [ ] Empty state ("No conversations yet")
  - [ ] Floating action button (new conversation)
  - [ ] Header with "Chats" title
- [ ] Build Profile screen: `app/(tabs)/profile.tsx`
  - [ ] Display current user name and email
  - [ ] Profile picture placeholder
  - [ ] "Sign Out" button
  - [ ] App version info
- [ ] Configure tab bar icons and labels
- [ ] Test navigation between tabs

### Error Handling & Utilities
- [ ] Create `src/utils/error-handler.ts`:
  - [ ] Firebase error code mapping to user-friendly messages
  - [ ] Global error boundary component
- [ ] Create `src/utils/validators.ts`:
  - [ ] Email validation
  - [ ] Password strength validation
  - [ ] Message length validation
- [ ] Create `src/utils/date-formatter.ts`:
  - [ ] Format timestamp to "1:45 PM"
  - [ ] Format date to "Yesterday", "Monday", etc.
  - [ ] Relative time ("2 minutes ago")

**Checkpoint**: ✅ User can sign up, sign in, and navigate basic app structure

---

## Phase 2: One-on-One Messaging

**Goal**: Core messaging functionality between two users with real-time sync

### User Discovery & Conversation Creation
- [ ] Create `src/services/user-search.ts`:
  - [ ] `searchUsersByEmail(query)`
  - [ ] `searchUsersByDisplayName(query)`
- [ ] Build "New Conversation" screen: `app/new-conversation.tsx`
  - [ ] Search input field
  - [ ] User list results
  - [ ] Tap user to start conversation
  - [ ] Check if conversation already exists
  - [ ] Create new conversation if needed
  - [ ] Navigate to conversation screen
- [ ] Implement conversation creation logic:
  - [ ] Create Firestore conversation document
  - [ ] Add both participants
  - [ ] Initialize conversation metadata
  - [ ] Handle duplicate prevention

### Conversation Screen Foundation
- [ ] Create `app/conversation/[id].tsx` (dynamic route)
- [ ] Build conversation header:
  - [ ] Back button
  - [ ] Other user's name
  - [ ] Online/offline indicator (placeholder for Phase 3)
  - [ ] Avatar/profile picture
- [ ] Build message input component: `src/components/MessageInput.tsx`
  - [ ] Text input field
  - [ ] Send button
  - [ ] Character count (show when approaching limit)
  - [ ] Disable send if empty or too long
- [ ] Build message list component: `src/components/MessageList.tsx`
  - [ ] FlatList with inverted prop
  - [ ] Empty state ("No messages yet")
  - [ ] Loading state while fetching
  - [ ] Pull-to-refresh (future: load older messages)

### Message Rendering
- [ ] Create message bubble component: `src/components/MessageBubble.tsx`
  - [ ] Different styles for sent vs received messages
  - [ ] Display message text
  - [ ] Display timestamp
  - [ ] Display sender name (for future group chats)
  - [ ] Status indicator (sending, sent, delivered, read)
  - [ ] Long-press menu (placeholder for Phase 6)
- [ ] Implement message grouping by time (10-minute intervals)
- [ ] Add date dividers ("Today", "Yesterday", specific dates)
- [ ] Handle long messages (proper text wrapping)
- [ ] Handle links in messages (detect and make tappable)

### Send Message Flow (Optimistic Updates)
- [ ] Implement message send handler:
  1. [ ] Generate temporary `localId` (UUID)
  2. [ ] Create message object with `status: 'sending'`
  3. [ ] Insert into SQLite immediately
  4. [ ] Add to Zustand optimistic message store
  5. [ ] UI shows message instantly (gray checkmark)
  6. [ ] Initiate Firebase write
  7. [ ] On success:
     - [ ] Update SQLite with server `id`
     - [ ] Update status to `'sent'`
     - [ ] Remove from optimistic store
     - [ ] Update UI (checkmark changes)
  8. [ ] On failure:
     - [ ] Update status to `'failed'`
     - [ ] Show retry button
     - [ ] Keep in optimistic store
- [ ] Implement retry logic for failed messages
- [ ] Test message send with good network
- [ ] Test message send with airplane mode (should queue)

### Receive Message Flow
- [ ] Set up Firestore real-time listener in conversation screen:
  - [ ] Subscribe to `/conversations/{id}/messages`
  - [ ] Order by timestamp descending
  - [ ] Limit to last 50 messages initially
- [ ] Implement message receive handler:
  1. [ ] New message arrives via listener
  2. [ ] Check if message already in SQLite (deduplication)
  3. [ ] Insert new message into SQLite
  4. [ ] React Query cache invalidation
  5. [ ] UI updates automatically
- [ ] Implement auto-scroll to bottom on new message (if already at bottom)
- [ ] Show "scroll to bottom" button if user scrolled up
- [ ] Test receiving messages in real-time

### Message Persistence & Offline Support
- [ ] Implement conversation list data loading:
  - [ ] Load from SQLite first (instant display)
  - [ ] Fetch from Firestore in background
  - [ ] Merge and update SQLite
- [ ] Implement message history loading:
  - [ ] Load last 50 messages from SQLite
  - [ ] Load last 50 from Firestore (on initial load)
  - [ ] Sync newer messages from server
  - [ ] Store in SQLite
- [ ] Handle offline message queue:
  - [ ] Detect network state
  - [ ] Queue messages with `syncStatus: 'pending'`
  - [ ] Auto-retry when network returns
  - [ ] Show "Waiting for network" indicator
- [ ] Implement conversation list sync:
  - [ ] Subscribe to user's conversations
  - [ ] Update local cache
  - [ ] Show unread count badges

### Conversation List Enhancement
- [ ] Update `app/(tabs)/chats.tsx` with real data:
  - [ ] Load conversations from SQLite
  - [ ] Subscribe to Firestore updates
  - [ ] Display conversation items with:
    - [ ] Other user's avatar
    - [ ] Other user's name
    - [ ] Last message preview
    - [ ] Timestamp of last message
    - [ ] Unread count badge
    - [ ] Online indicator (Phase 3)
  - [ ] Sort by last message timestamp
  - [ ] Tap to navigate to conversation
- [ ] Implement pull-to-refresh
- [ ] Add swipe actions (archive/delete - placeholder for Phase 6)

### React Query Integration
- [ ] Create custom hooks:
  - [ ] `useConversations()` - fetches user's conversation list
  - [ ] `useConversation(id)` - fetches single conversation
  - [ ] `useMessages(conversationId)` - fetches messages with pagination
  - [ ] `useSendMessage(conversationId)` - mutation for sending
- [ ] Configure query cache invalidation strategy
- [ ] Set up optimistic updates with React Query
- [ ] Add error handling and retry logic

### Testing Two-User Flow
- [ ] Create two test accounts
- [ ] Send messages from User A to User B
- [ ] Verify User B receives in real-time
- [ ] Reply from User B to User A
- [ ] Verify message history persists after app restart
- [ ] Test offline send and sync
- [ ] Verify SQLite contains all messages

**Checkpoint**: ✅ Two users can chat in real-time with persistence

---

## Phase 3: Presence & Ephemeral Data

**Goal**: Show who's online and typing indicators

### Presence System (Firebase RTDB)
- [ ] Update `src/services/firebase-rtdb.ts` with presence logic:
  - [ ] `initializePresence(userId)` - called on app launch
  - [ ] Set `/presence/{userId}` to `{ online: true, lastSeen: timestamp }`
  - [ ] Configure `onDisconnect()` to set `{ online: false, lastSeen: timestamp }`
  - [ ] Handle multiple device connections (use connection IDs)
- [ ] Create presence hook: `src/hooks/usePresence.ts`
  - [ ] Subscribe to user's presence
  - [ ] Return `{ online: boolean, lastSeen: Date | null }`
  - [ ] Cleanup subscription on unmount
- [ ] Update conversation header:
  - [ ] Show green dot if user is online
  - [ ] Show "last seen X minutes ago" if offline
  - [ ] Update in real-time as status changes
- [ ] Update conversation list items:
  - [ ] Small green dot next to avatar if online
- [ ] Test presence across multiple devices:
  - [ ] Open app on two devices with same account
  - [ ] Verify "online" shows when at least one is active
  - [ ] Close both apps
  - [ ] Verify "last seen" appears

### Typing Indicators
- [ ] Implement typing detection in `MessageInput.tsx`:
  - [ ] Debounce text input changes (300ms)
  - [ ] On typing start: Set `/typing/{conversationId}/{userId}` to `{ isTyping: true, timestamp }`
  - [ ] On typing stop (5s timeout): Remove from RTDB
  - [ ] On input blur: Remove from RTDB
  - [ ] On message send: Remove from RTDB immediately
- [ ] Create typing indicator hook: `src/hooks/useTypingIndicators.ts`
  - [ ] Subscribe to `/typing/{conversationId}`
  - [ ] Filter out current user
  - [ ] Return list of users currently typing
  - [ ] Auto-remove stale indicators (>5s old)
- [ ] Update conversation screen:
  - [ ] Show "John is typing..." above message input
  - [ ] Show "John and Sarah are typing..." for multiple users
  - [ ] Animate typing indicator (three dots animation)
- [ ] Test typing indicators:
  - [ ] Start typing from User A
  - [ ] Verify User B sees indicator within 300ms
  - [ ] Stop typing from User A
  - [ ] Verify indicator disappears after 5s
  - [ ] Send message from User A
  - [ ] Verify indicator disappears immediately

### Connection State Handling
- [ ] Monitor Firebase RTDB connection state:
  - [ ] Subscribe to `/.info/connected`
  - [ ] Show "Connecting..." banner when disconnected
  - [ ] Auto-hide when reconnected
  - [ ] Don't show for brief disconnections (<3s)
- [ ] Update presence when connection state changes
- [ ] Implement exponential backoff for reconnection attempts
- [ ] Test with airplane mode toggles

### Presence Edge Cases
- [ ] Handle app backgrounding:
  - [ ] On app background: Keep connection for 30s, then disconnect
  - [ ] On app foreground: Immediately reconnect and set online
- [ ] Handle app termination:
  - [ ] `onDisconnect()` should handle this automatically
  - [ ] Verify "last seen" updates correctly
- [ ] Handle multiple conversations open:
  - [ ] Ensure typing in one doesn't show in another
- [ ] Clean up old typing indicators on component unmount

**Checkpoint**: ✅ Users can see online status and typing indicators

---

## Phase 4: Media & Group Chat

**Goal**: Send images and support group conversations

### Image Upload & Display

#### Image Selection
- [ ] Update `MessageInput.tsx` to include image picker button
- [ ] Implement image selection handler:
  - [ ] Request media library permissions
  - [ ] Open Expo Image Picker
  - [ ] Allow single image selection (MVP)
  - [ ] Validate image size (<10MB)
  - [ ] Show error if too large
- [ ] Display selected image preview before sending:
  - [ ] Thumbnail preview above input
  - [ ] Remove button to deselect
  - [ ] Caption input (optional)

#### Image Upload Flow
- [ ] Create image upload service: `src/services/image-upload.ts`
  - [ ] Compress image if >1MB (reduce quality)
  - [ ] Generate unique filename
  - [ ] Upload to Firebase Storage at `/message-media/{conversationId}/{filename}`
  - [ ] Get download URL
  - [ ] Generate thumbnail (optional, or use original for MVP)
- [ ] Implement optimistic image message:
  1. [ ] Show image in chat with loading indicator
  2. [ ] Upload to Firebase Storage
  3. [ ] Create message with `mediaUrl`
  4. [ ] On success: Replace loading indicator
  5. [ ] On failure: Show retry button
- [ ] Update message model to support media:
  ```typescript
  content: {
    text: string;
    type: 'text' | 'image';
    mediaUrl?: string;
  }
  ```

#### Image Display in Messages
- [ ] Update `MessageBubble.tsx` to handle image messages:
  - [ ] Render image with proper aspect ratio
  - [ ] Show loading skeleton while downloading
  - [ ] Tap to view full-screen (Phase 6 enhancement)
  - [ ] Show caption below image if present
  - [ ] Limit max width/height in chat
- [ ] Implement image caching (Expo Image handles this)
- [ ] Test image send/receive:
  - [ ] Send image from User A
  - [ ] Verify User B receives and can view
  - [ ] Test with poor network (slow upload)
  - [ ] Test offline send (should queue)

### Group Chat Foundation

#### Group Creation
- [ ] Create "New Group" screen: `app/new-group.tsx`
  - [ ] Group name input
  - [ ] Member selection (multi-select)
  - [ ] Show selected members with remove option
  - [ ] "Create Group" button (disabled until ≥2 members)
  - [ ] Enforce MAX_GROUP_SIZE (20 users)
  - [ ] Show error if limit exceeded
- [ ] Implement group creation logic:
  - [ ] Create conversation with `type: 'group'`
  - [ ] Set `participants` array (include creator)
  - [ ] Set group `name`
  - [ ] Set `createdBy` to creator's user ID
  - [ ] Initialize `unreadCount` for all participants
  - [ ] Navigate to group conversation
- [ ] Update conversation list to show group names and icons

#### Group Conversation UI
- [ ] Update conversation header for groups:
  - [ ] Show group name instead of user name
  - [ ] Show participant count (e.g., "12 members")
  - [ ] Tap header to view group info (Phase 6)
  - [ ] Remove online indicator (not applicable)
- [ ] Update message bubbles for groups:
  - [ ] Show sender's name above message (if not current user)
  - [ ] Show sender's avatar to the left of bubble
  - [ ] Color-code avatars or names for easy identification

#### Group Messaging Logic
- [ ] Update send message flow for groups:
  - [ ] Message sent to conversation (same as 1-on-1)
  - [ ] All participants receive via Firestore listener
  - [ ] No special fanout needed (Firestore subcollection handles this)
- [ ] Update read receipts for groups:
  - [ ] Track which users have read the message
  - [ ] Show read count ("Read by 8/12")
  - [ ] Tap to view list of who read (Phase 6)
- [ ] Handle group-specific edge cases:
  - [ ] User leaves group (soft delete messages for that user)
  - [ ] User removed from group (handled in Phase 6)

### Group Chat Testing
- [ ] Create group with 3 users (A, B, C)
- [ ] Send messages from each user
- [ ] Verify all users receive in real-time
- [ ] Verify sender names appear correctly
- [ ] Test with 10-user group
- [ ] Test with 20-user group (max limit)
- [ ] Verify group appears in conversation list for all members
- [ ] Test image sharing in groups

### Cloud Functions for Media Processing (Optional MVP)
- [ ] Create Cloud Function: `processMediaUpload`
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
- [ ] Register for push notifications in `app/_layout.tsx`:
  - [ ] Request notification permissions (iOS)
  - [ ] Get Expo push token
  - [ ] Store token in Firestore `/users/{userId}/pushToken`
  - [ ] Update token on app launch (in case it changes)
- [ ] Create `src/services/notifications.ts`:
  - [ ] `registerForPushNotifications(userId)`
  - [ ] `handleNotificationReceived(notification)`
  - [ ] `handleNotificationResponse(response)` - tap to open
- [ ] Set up notification listeners:
  - [ ] Foreground notification handler (show in-app alert)
  - [ ] Background/killed notification handler (deep link to conversation)
- [ ] Test push token registration:
  - [ ] Open app on device
  - [ ] Verify pushToken saved in Firestore

### Cloud Function for Push Notifications
- [ ] Create Cloud Function: `functions/src/sendMessageNotification.ts`
  ```typescript
  export const sendMessageNotification = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const conversationId = context.params.conversationId;
      
      // Get conversation participants
      // Exclude message sender
      // Get push tokens for recipients
      // Check if recipients are active in this conversation (don't notify if open)
      // Send push via Expo Push API
    });
  ```
- [ ] Implement notification payload:
  ```typescript
  {
    to: userPushToken,
    title: senderName,
    body: messagePreview,
    data: {
      conversationId: conversationId,
      messageId: messageId,
      type: 'new_message'
    },
    sound: 'default',
    badge: unreadCount
  }
  ```
- [ ] Handle batch sending for groups (use Expo's batch API)
- [ ] Add retry logic for failed sends
- [ ] Deploy function: `firebase deploy --only functions`

### Notification Handling in App
- [ ] Implement deep linking:
  - [ ] Configure URL scheme in `app.json`
  - [ ] Handle notification tap → navigate to conversation
  - [ ] Extract `conversationId` from notification data
  - [ ] Navigate using Expo Router
- [ ] Update badge count on app icon:
  - [ ] Calculate total unread across all conversations
  - [ ] Set badge number using Expo Notifications
  - [ ] Clear badge when app opens
- [ ] Implement notification suppression:
  - [ ] Don't send notification if user is actively viewing the conversation
  - [ ] Track "active conversation" in RTDB or Firestore
  - [ ] Cloud Function checks before sending

### Notification Preferences (Basic)
- [ ] Add notification toggle to profile settings:
  - [ ] Enable/disable all notifications
  - [ ] Store preference in Firestore
  - [ ] Cloud Function respects this setting
- [ ] Test notification preferences:
  - [ ] Disable notifications
  - [ ] Send message from another user
  - [ ] Verify no notification received
  - [ ] Re-enable and verify notifications work

### Testing Push Notifications
- [ ] **Foreground notifications**:
  - [ ] App open, conversation closed
  - [ ] Verify banner appears
  - [ ] Tap banner → navigate to conversation
- [ ] **Background notifications**:
  - [ ] App in background
  - [ ] Send message from another device
  - [ ] Verify iOS notification appears
  - [ ] Tap notification → app opens to conversation
- [ ] **Killed app notifications**:
  - [ ] Force quit app
  - [ ] Send message
  - [ ] Verify notification appears
  - [ ] Tap → app launches to conversation
- [ ] **Group notifications**:
  - [ ] Send group message
  - [ ] Verify all members receive notification
  - [ ] Verify sender doesn't receive own notification
- [ ] **Notification while in conversation**:
  - [ ] User A viewing conversation with User B
  - [ ] User B sends message
  - [ ] Verify User A doesn't get notification (already viewing)

### iOS-Specific Requirements
- [ ] Ensure `GoogleService-Info.plist` is properly configured
- [ ] Verify APNs key is set up in Firebase Console
- [ ] Configure notification capabilities in Xcode (when building EAS)
- [ ] Test on physical iOS device (push doesn't work in simulator)

**Checkpoint**: ✅ Push notifications working for all message scenarios

---

## Phase 6: Polish & Testing

**Goal**: Refine UX, handle edge cases, prepare for TestFlight

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

## Phase 7: AI Integration (Post-MVP)

**Goal**: Add AI assistance layer on top of core messaging

### AI Infrastructure Setup
- [ ] Set up Anthropic/OpenAI API keys in Firebase Functions
- [ ] Create Cloud Function: `processAIAction`
- [ ] Set up Pinecone (or alternative) for vector storage
- [ ] Create Firestore collection: `/actionQueue`
- [ ] Create Firestore collection: `/conversationContext`
- [ ] Install Vercel AI SDK in Cloud Functions
- [ ] Configure AI model (Claude 3.5 Sonnet recommended)

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
  - [ ] Construct prompt for Claude
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

## Deployment Checklist

### Pre-Deployment
- [ ] Review all Firebase security rules (production-ready)
- [ ] Review all environment variables (no hardcoded secrets)
- [ ] Update app version in `app.json`
- [ ] Update privacy policy and terms of service (if applicable)
- [ ] Test on multiple iOS devices and versions
- [ ] Fix all critical bugs from testing
- [ ] Ensure push notifications work on physical device
- [ ] Prepare app screenshots for TestFlight (optional)

### EAS Build Configuration
- [ ] Configure `eas.json`:
  ```json
  {
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal"
      },
      "preview": {
        "distribution": "internal",
        "ios": {
          "simulator": false
        }
      },
      "production": {
        "distribution": "store",
        "ios": {
          "simulator": false
        }
      }
    }
  }
  ```
- [ ] Set up iOS credentials: `eas credentials`
- [ ] Configure iOS bundle identifier (must match Firebase)
- [ ] Configure app icon and splash screen in `app.json`

### Build for TestFlight
- [ ] Build iOS app: `eas build --platform ios --profile preview`
- [ ] Wait for build to complete (15-30 minutes)
- [ ] Download IPA or get build URL
- [ ] Submit to TestFlight: `eas submit --platform ios`
- [ ] Wait for Apple review (1-2 days typically)

### TestFlight Setup
- [ ] Log in to App Store Connect
- [ ] Navigate to TestFlight section
- [ ] Add internal testers (up to 100)
- [ ] Set up external testing groups (optional, requires Apple review)
- [ ] Add tester emails
- [ ] Send invitations
- [ ] Provide testing instructions in TestFlight notes

### Post-Deployment Monitoring
- [ ] Monitor Firebase Console for errors
- [ ] Monitor Firestore usage (reads/writes)
- [ ] Monitor Cloud Functions logs
- [ ] Monitor Firebase Storage usage
- [ ] Track push notification delivery rates
- [ ] Collect crash reports (if any)
- [ ] Gather user feedback from TestFlight
- [ ] Create GitHub issues for reported bugs

### Iteration & Updates
- [ ] Fix critical bugs reported by testers
- [ ] Build new version: Update version in `app.json`, run `eas build`
- [ ] Submit update to TestFlight
- [ ] Notify testers of updates
- [ ] Repeat until stable

---

## Key Milestones

| Milestone | Description | Estimated Completion |
|-----------|-------------|---------------------|
| M1: Project Setup | Environment configured, repos created | Week 1 |
| M2: Authentication Working | Users can sign up and sign in | Week 2 |
| M3: One-on-One Chat | Two users can message in real-time | Week 4 |
| M4: Presence & Typing | Online indicators and typing working | Week 5 |
| M5: Groups & Media | Group chats and image sharing | Week 7 |
| M6: Push Notifications | Notifications working on device | Week 8 |
| M7: TestFlight Alpha | App deployed to 5-100 testers | Week 10 |
| M8: MVP Complete | All core features stable and tested | Week 10 |
| M9: AI Integration | AI assistant and features live | Post-MVP |

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

**Last Updated**: October 20, 2025  
**Status**: Ready for Implementation  
**Version**: 1.0
