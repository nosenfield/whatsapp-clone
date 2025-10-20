# Active Context

**Last Updated:** October 20, 2025  
**Current Phase:** Phase 2 - One-on-One Messaging  
**Status:** In Progress

---

## Current Focus

We are currently implementing **Phase 2: One-on-One Messaging**, which is the core messaging functionality between two users with real-time synchronization.

**Primary Goal**: Enable two users to send and receive text messages in real-time with optimistic UI updates, message persistence, and offline support.

---

## What We're Working On Right Now

### Active Tasks (Phase 2)

Based on the task-list.md, Phase 2 consists of:

1. **User Discovery & Conversation Creation** - ⏳
   - Building the "New Conversation" screen
   - Implementing user search functionality
   - Creating conversation logic in Firestore

2. **Conversation Screen Foundation** - ⏳
   - Dynamic conversation route with Expo Router
   - Message input component
   - Message list component with FlatList

3. **Message Rendering** - ⏳
   - Message bubble component (sent vs received styles)
   - Message grouping and date dividers
   - Status indicators

4. **Send Message Flow (Optimistic Updates)** - ⏳
   - Implementing optimistic UI pattern
   - SQLite integration
   - Firebase sync
   - Retry logic for failures

5. **Receive Message Flow** - ⏳
   - Firestore real-time listeners
   - Deduplication logic
   - Auto-scroll behavior

6. **Message Persistence & Offline Support** - ⏳
   - Conversation list data loading
   - Message history from SQLite
   - Offline message queue
   - Network state detection

7. **Conversation List Enhancement** - ⏳
   - Real data integration
   - Conversation items with metadata
   - Pull-to-refresh

8. **React Query Integration** - ⏳
   - Custom hooks for data fetching
   - Cache invalidation
   - Optimistic updates

---

## Recent Changes

### Completed
- ✅ **Phase 1: Core Infrastructure** (Checkpoint reached)
  - Authentication flow working
  - Navigation structure in place
  - SQLite database setup
  - Firebase service layer created
  - State management (Zustand + React Query) configured

### In Progress
- Currently focused on Phase 2 tasks
- All Phase 2 sub-tasks are in progress (none marked complete yet)

### Blocked
- No blockers currently identified

---

## Active Decisions & Considerations

### Architecture Decisions Already Made
1. **Dual Database Pattern**: Using both Firestore (persistent) and RTDB (ephemeral)
2. **Optimistic UI**: Messages appear instantly before server confirmation
3. **Local-First**: Always read from SQLite cache first
4. **React Query + Zustand**: Server state vs client state separation

### Current Technical Decisions

**Decision: Message ID Strategy**
- **Approach**: Generate temporary `localId` (UUID) for optimistic messages
- **Rationale**: Allows instant UI updates while Firebase assigns server ID
- **Challenge**: Must handle ID replacement when server responds
- **Status**: Implementing now

**Decision: Message Deduplication**
- **Approach**: Check SQLite before inserting messages from Firestore listener
- **Rationale**: Prevents duplicate messages when switching between online/offline
- **Implementation**: Query by message ID or localId before insert

**Decision: Conversation Creation**
- **Approach**: Check if direct conversation exists before creating new one
- **Rationale**: Prevent multiple conversations between same two users
- **Implementation**: Query Firestore for existing conversation with both participant IDs

---

## Key Patterns to Follow

### Message Send Flow (Critical)
```
1. User presses send
2. Generate localId (UUID)
3. Insert to SQLite (status: 'sending')
4. Add to Zustand optimistic store
5. UI updates instantly
6. Firebase write initiated
7. On success:
   - Replace localId with serverId
   - Update status to 'sent'
   - Remove from optimistic store
8. On failure:
   - Update status to 'failed'
   - Show retry button
```

### Data Access Pattern
```
Always:
1. Read from SQLite first (instant)
2. Subscribe to Firestore (background)
3. Merge updates into SQLite
4. React Query re-fetches
5. UI updates automatically
```

---

## Next Immediate Steps

### Short-term (This Session)
1. Complete current Phase 2 task being worked on
2. Test with two user accounts
3. Verify real-time message delivery
4. Document any issues or decisions made

### Medium-term (Next Few Sessions)
1. Complete all Phase 2 sub-tasks
2. Reach Phase 2 checkpoint: "Two users can chat in real-time with persistence"
3. Create context summary for Phase 2
4. Begin Phase 3: Presence & Ephemeral Data

### Long-term (Next Milestones)
- **M3**: One-on-One Chat working (Week 4 target)
- **M4**: Presence & Typing indicators (Week 5 target)
- **M5**: Groups & Media (Week 7 target)

---

## Important Context for Next Session

### What to Remember
1. **Phase 2 is the foundation**: Everything else builds on messaging working correctly
2. **Optimistic UI is critical**: This is what makes the app feel fast
3. **Offline support is non-negotiable**: App must work without network
4. **Test with two accounts**: Always verify bidirectional messaging

### Files Being Modified Frequently
- `mobile/src/components/MessageBubble.tsx`
- `mobile/src/components/MessageList.tsx`
- `mobile/src/components/MessageInput.tsx`
- `mobile/src/services/firebase-firestore.ts`
- `mobile/src/services/database.ts`
- `mobile/src/store/message-store.ts`
- `mobile/app/conversation/[id].tsx`

### Testing Checklist for Phase 2
- [ ] Send message from User A to User B
- [ ] Verify User B receives in <300ms
- [ ] Send message from User B to User A
- [ ] Restart app - verify messages persist
- [ ] Turn on airplane mode
- [ ] Send message - should queue
- [ ] Turn off airplane mode
- [ ] Verify message sends automatically

---

## Questions & Open Issues

### Open Questions
1. Should we implement pagination for message history now or in Phase 6?
   - **Leaning towards**: Basic implementation now (load 50), enhance later

2. How to handle conversation list ordering when offline?
   - **Approach**: Use lastMessageAt from SQLite, update when online

### Known Issues
- None identified yet (Phase 2 just starting)

---

## References

- **Task Details**: `_docs/task-list.md` → Phase 2 section
- **Architecture Patterns**: `memory-bank/systemPatterns.md`
- **Technical Setup**: `memory-bank/techContext.md`
- **Progress Tracking**: `memory-bank/progress.md`

---

**This file should be updated**:
- After completing each Phase 2 sub-task
- When making important technical decisions
- When encountering blockers
- At the start of each new work session
