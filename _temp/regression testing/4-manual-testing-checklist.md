# Manual Testing Checklist

**Purpose:** Systematic manual testing procedures for WhatsApp Clone  
**Status:** Phase 3 Complete, Ready for Phase 4  
**Last Updated:** October 21, 2025

---

## Pre-Testing Setup

### Test Accounts
Create two test accounts for messaging tests:

```
Account 1:
- Email: test1@example.com
- Password: TestPassword123!
- Display Name: Alice Test

Account 2:
- Email: test2@example.com
- Password: TestPassword123!
- Display Name: Bob Test
```

### Test Devices
- **Primary Device:** iPhone/iPad with Expo Go (for Account 1)
- **Secondary Device:** Another device or simulator (for Account 2)
- **Network:** WiFi enabled, airplane mode available for offline tests

---

## Phase 1: Authentication (✅ Complete)

### Sign Up Flow
- [ ] Can create new account with valid email/password
- [ ] Shows error for invalid email format
- [ ] Shows error for password < 6 characters
- [ ] Shows error for duplicate email
- [ ] Redirects to app after successful sign up
- [ ] User data created in Firestore

### Sign In Flow
- [ ] Can sign in with correct credentials
- [ ] Shows error for incorrect password
- [ ] Shows error for non-existent account
- [ ] Redirects to app after successful sign in

### Sign Out Flow
- [ ] Sign out button works
- [ ] Redirects to login screen
- [ ] Clears auth state
- [ ] Requires re-login

### Auth Persistence
- [ ] User stays logged in after app restart
- [ ] Token persists across sessions
- [ ] Auto-login on app launch

---

## Phase 2: One-on-One Messaging (✅ Complete)

### Conversation Creation
- [ ] Can search for user by email
- [ ] Shows "User not found" for invalid email
- [ ] Creates conversation when user found
- [ ] Prevents duplicate conversations
- [ ] Navigates to conversation screen
- [ ] Conversation appears in list immediately

### Sending Messages
- [ ] Can type in message input
- [ ] Send button enabled when text present
- [ ] Message appears instantly (optimistic UI)
- [ ] Message shows "sending" status
- [ ] Message updates to "sent" after Firestore sync
- [ ] Message persists after app restart
- [ ] Conversation list updates with last message

### Receiving Messages
- [ ] Receive messages in real-time (<300ms)
- [ ] Messages appear in correct order
- [ ] Sender name/avatar displayed correctly
- [ ] Timestamp formatted correctly
- [ ] Message bubbles styled correctly (left vs right)
- [ ] Auto-scrolls to latest message

### Message Persistence
- [ ] Messages persist in SQLite
- [ ] Messages load from SQLite on app launch
- [ ] No duplicate messages in UI
- [ ] Correct message count displayed

### Offline Support
- [ ] Can send messages while offline
- [ ] Messages queued locally
- [ ] Messages show "pending" status
- [ ] Offline banner appears
- [ ] Messages sync when back online
- [ ] Status updates after sync

### Conversation List
- [ ] Shows all conversations
- [ ] Most recent conversation at top
- [ ] Last message preview displayed
- [ ] Timestamp formatted ("Just now", "5m ago", etc.)
- [ ] Pull-to-refresh works
- [ ] Tap conversation opens chat

### Error Handling
- [ ] Error boundary catches crashes
- [ ] Network errors shown gracefully
- [ ] Failed messages can be retried
- [ ] App remains stable after errors

---

## Phase 3: Presence & Typing Indicators (✅ Complete)

### Online Status
- [ ] Green dot appears when user is online
- [ ] Green dot disappears when user goes offline
- [ ] "Online" text shows in conversation header
- [ ] Online status updates in real-time (<50ms)
- [ ] Multiple devices: online if ANY device active

### Last Seen
- [ ] "Last seen X ago" shows when user offline
- [ ] Time updates correctly (5m ago, 1h ago, etc.)
- [ ] Updates when user comes back online
- [ ] Works in conversation list and header

### Typing Indicators
- [ ] "User is typing..." appears when typing
- [ ] Updates in real-time as other user types
- [ ] Clears after 5 seconds of inactivity
- [ ] Clears when message is sent
- [ ] Clears when user closes keyboard
- [ ] Shows multiple users typing in groups

### Connection State
- [ ] Presence initializes on login
- [ ] Presence clears on logout
- [ ] Reconnects automatically after network loss
- [ ] Handles airplane mode correctly
- [ ] No memory leaks from listeners

---

## Phase 4: Media & Groups (🎯 Next Phase)

### Image Messages (Pending)
- [ ] Can select image from library
- [ ] Image uploads to Firebase Storage
- [ ] Upload progress shown
- [ ] Image displays in message bubble
- [ ] Thumbnail generated correctly
- [ ] Can tap to view full image
- [ ] Image persists after app restart
- [ ] Works offline (queues upload)

### Group Chat Creation (Pending)
- [ ] Can create group conversation
- [ ] Can add multiple participants (up to 20)
- [ ] Can set group name
- [ ] Group appears in conversation list
- [ ] All participants receive group invite

### Group Messaging (Pending)
- [ ] Can send messages to group
- [ ] Sender name shows above message
- [ ] All members receive messages
- [ ] Typing indicators work for groups
- [ ] Read receipts work for groups
- [ ] Can see who read message

---

## Phase 5: Push Notifications (🔜 Not Started)

### Notification Setup (Pending)
- [ ] Push token registered on login
- [ ] Token stored in Firestore
- [ ] Cloud Function configured

### Foreground Notifications (Pending)
- [ ] Banner appears when app is open
- [ ] Notification includes sender and message
- [ ] Tap notification opens conversation

### Background Notifications (Pending)
- [ ] Notification appears when app in background
- [ ] Badge count updates
- [ ] Deep link works correctly

### Killed App Notifications (Pending)
- [ ] Notification appears when app is killed
- [ ] App launches to correct conversation
- [ ] Badge count persists

---

## Regression Testing (After Each Phase)

### Database Bugs (Fixed)
- [ ] No duplicate messages (INSERT OR IGNORE)
- [ ] No NULL conversationId errors
- [ ] No FOREIGN KEY constraint errors
- [ ] Optimistic messages cleared correctly

### Performance
- [ ] App launch < 3 seconds
- [ ] Message send UI < 50ms
- [ ] Message delivery < 300ms
- [ ] Scrolling smooth (60 FPS)
- [ ] No memory leaks

### Edge Cases
- [ ] Very long messages (5000 chars)
- [ ] Special characters in messages
- [ ] Empty messages blocked
- [ ] Network interrupted mid-send
- [ ] App killed mid-send
- [ ] Multiple devices same account

---

## Test Scenarios

### Scenario 1: Complete Messaging Flow
1. User A signs up
2. User B signs up
3. User A searches for User B by email
4. User A sends first message
5. User B receives message
6. User B replies
7. User A receives reply
8. Both users see conversation in list

**Expected Result:** ✅ Full bidirectional messaging works

---

### Scenario 2: Offline Message Queue
1. User A opens app (online)
2. User A enables airplane mode
3. User A sends 3 messages
4. Messages show "pending" status
5. User A disables airplane mode
6. Messages sync to Firestore
7. User B receives all 3 messages

**Expected Result:** ✅ Offline queue works correctly

---

### Scenario 3: Presence Transitions
1. User A and User B both online
2. Both see green dots
3. User B closes app
4. User A sees "Last seen just now"
5. Wait 5 minutes
6. User A sees "Last seen 5m ago"
7. User B reopens app
8. User A sees "Online" immediately

**Expected Result:** ✅ Presence updates in real-time

---

### Scenario 4: Typing Indicators
1. User A and User B in conversation
2. User A starts typing
3. User B sees "Alice is typing..."
4. User A stops typing (5s timeout)
5. Indicator disappears
6. User A sends message
7. Indicator cleared immediately

**Expected Result:** ✅ Typing indicators work correctly

---

### Scenario 5: App Persistence
1. User A sends messages to User B
2. Force quit app completely
3. Relaunch app
4. Messages still visible
5. Conversation list shows last message
6. Can continue conversation

**Expected Result:** ✅ SQLite persistence works

---

### Scenario 6: Error Recovery
1. User A sends message
2. Simulate Firestore error (disconnect wifi during send)
3. Message shows "failed" status
4. User A taps retry
5. Message sends successfully

**Expected Result:** ✅ Retry logic works

---

### Scenario 7: Concurrent Messages
1. User A and User B in conversation
2. Both send messages simultaneously
3. No duplicate messages
4. Correct order maintained
5. No UI glitches

**Expected Result:** ✅ Concurrent operations handled

---

## Bug Tracking Template

When you find a bug, document it:

```
Bug ID: BUG-001
Date: YYYY-MM-DD
Phase: Phase X
Severity: Critical / High / Medium / Low

Description:
[What happened]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Environment:
- Device: [iPhone 13, iOS 17.2]
- Account: [test1@example.com]
- Network: [WiFi / Cellular / Offline]

Screenshots/Logs:
[Attach if available]

Status: Open / Fixed / Won't Fix
Fixed In: [Commit hash or version]
```

---

## Test Completion Checklist

Before marking a phase complete:

### Code Quality
- [ ] TypeScript strict mode (no `any`)
- [ ] No linter warnings
- [ ] No console errors
- [ ] Code compiles successfully

### Functionality
- [ ] All features working as specified
- [ ] No critical bugs
- [ ] Edge cases handled
- [ ] Error messages clear and helpful

### Performance
- [ ] Meets performance targets
- [ ] No memory leaks detected
- [ ] Smooth scrolling/animations
- [ ] Fast loading times

### User Experience
- [ ] UI polished and professional
- [ ] Loading states shown
- [ ] Error states graceful
- [ ] Success feedback clear

### Documentation
- [ ] Context summary created
- [ ] Memory bank updated
- [ ] Known issues documented
- [ ] Next steps clear

---

## Testing Sign-Off

**Phase 1 (Infrastructure):** ✅ Complete  
**Tested By:** [Name]  
**Date:** Week 1  
**Status:** All tests passed

**Phase 2 (Messaging):** ✅ Complete  
**Tested By:** [Name]  
**Date:** Week 2  
**Status:** All tests passed

**Phase 3 (Presence):** ✅ Complete  
**Tested By:** [Name]  
**Date:** Week 2  
**Status:** All tests passed

**Phase 4 (Media/Groups):** ⏳ Pending  
**Tested By:** [Name]  
**Date:** TBD  
**Status:** Not started

---

## Quick Test Commands

Run automated tests before manual testing:

```bash
# Run all tests
cd mobile && npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test database.test.ts

# Watch mode (during development)
npm run test:watch
```

---

## Notes for Testers

### Important Behaviors
1. **Optimistic UI:** Messages appear instantly, then sync in background
2. **Offline Queue:** Messages queue when offline, sync when online
3. **Real-time Sync:** Updates happen automatically, no manual refresh
4. **Presence:** Online status updates in real-time (<50ms)
5. **Typing:** Shows while typing, clears after 5s or on send

### Known Limitations (Current Phase)
- No image messages yet (Phase 4)
- No group chat yet (Phase 4)
- No push notifications yet (Phase 5)
- iOS only (Android possible later)
- 20 user group limit (by design)

### If You Find Issues
1. Try to reproduce consistently
2. Note exact steps and environment
3. Check console for error messages
4. Take screenshots if helpful
5. Document using bug template above
6. Report to development team

---

**Remember:** This is alpha testing. We expect to find bugs. Your feedback is crucial for improving the app!

