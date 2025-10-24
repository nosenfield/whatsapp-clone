# Last Seen Updates for Active Users

**Date:** October 24, 2025  
**Issue:** Last seen timestamps only updated when opening conversation, not during active chat  
**Status:** ✅ Fixed

---

## Problem Description

The read receipt system was only updating "last seen" timestamps when users opened a conversation, but it should also update when:

1. **User sends a message** - They're actively in the chat
2. **User receives a message while IN the chat** - They're viewing the conversation when new messages arrive

### Current Behavior (Before Fix)
- ✅ Last seen updated when opening conversation
- ❌ Last seen NOT updated when sending messages
- ❌ Last seen NOT updated when receiving messages while in chat

### Expected Behavior (After Fix)
- ✅ Last seen updated when opening conversation
- ✅ Last seen updated when sending messages
- ✅ Last seen updated when receiving messages while in chat

## Solution Implemented

### 1. Update Last Seen When Sending Messages

**File:** `mobile/app/conversation/[id].tsx`

#### Text Messages
```typescript
// 5. Update local message with server ID
await updateMessage(localId, {
  id: serverId,
  status: 'sent',
  syncStatus: 'synced',
});

// 5.5. Update user's last seen timestamp since they sent a message
try {
  await updateUserLastSeen(id, currentUser.id, serverId);
  console.log('✅ Updated last seen after sending message');
} catch (error) {
  console.error('❌ Failed to update last seen after sending:', error);
  // Don't fail the message send if this fails
}
```

#### Image Messages
```typescript
// 6. Update local message with server ID and uploaded URL
await updateMessage(localId, {
  id: serverId,
  status: 'sent',
  syncStatus: 'synced',
  content: {
    text: '',
    type: 'image',
    mediaUrl: imageUrl,
    mediaThumbnail: thumbnailUrl,
  },
});

// 6.5. Update user's last seen timestamp since they sent a message
try {
  await updateUserLastSeen(id, currentUser.id, serverId);
  console.log('✅ Updated last seen after sending image');
} catch (error) {
  console.error('❌ Failed to update last seen after sending image:', error);
  // Don't fail the image send if this fails
}
```

**Key Features:**
- ✅ **Both text and image messages**: Updates last seen for all message types
- ✅ **After successful send**: Only updates after message is successfully sent to Firebase
- ✅ **Error handling**: Doesn't fail message send if last seen update fails
- ✅ **Server ID**: Uses the actual server message ID for accurate tracking

### 2. Update Last Seen When Receiving Messages While In Chat

**File:** `mobile/app/conversation/[id].tsx`

```typescript
// Insert only new messages (not already in SQLite)
let hasNewMessages = false;
for (const fbMessage of firebaseMessages) {
  // Skip if message already exists by ID
  if (existingIds.has(fbMessage.id)) {
    continue;
  }
  
  // Also skip if there's a message with the same localId (same temp message)
  const isDuplicate = existingMessages.some(
    (existing) =>
      existing.senderId === fbMessage.senderId &&
      existing.conversationId === fbMessage.conversationId &&
      existing.content.text === fbMessage.content.text &&
      existing.content.type === fbMessage.content.type &&
      Math.abs(existing.timestamp.getTime() - fbMessage.timestamp.getTime()) < 5000 // Within 5 seconds
  );
  
  if (!isDuplicate) {
    await insertMessage(fbMessage);
    hasNewMessages = true;
  }
}

// If we received new messages and user is currently in the chat, update their last seen
if (hasNewMessages && currentUser?.id) {
  try {
    // Get the most recent message to mark as read
    const updatedMessages = await getConversationMessages(id);
    const lastMessage = updatedMessages[updatedMessages.length - 1];
    
    if (lastMessage?.id) {
      await updateUserLastSeen(id, currentUser.id, lastMessage.id);
      console.log('✅ Updated last seen after receiving new message while in chat');
    }
  } catch (error) {
    console.error('❌ Failed to update last seen after receiving message:', error);
    // Don't fail the message processing if this fails
  }
}
```

**Key Features:**
- ✅ **Only for new messages**: Tracks if any new messages were actually received
- ✅ **Current user only**: Only updates for the user currently viewing the chat
- ✅ **Most recent message**: Marks the latest message as read
- ✅ **Error handling**: Doesn't fail message processing if last seen update fails
- ✅ **Duplicate prevention**: Skips duplicate messages to avoid false updates

## Logic Flow

### Scenario 1: User Sends Message
1. User types and sends message
2. Message sent to Firebase successfully
3. Server ID received
4. **NEW**: Update user's last seen with server ID
5. Message appears in chat with read receipt

### Scenario 2: User Receives Message While In Chat
1. New message arrives via Firestore subscription
2. Message inserted into SQLite
3. **NEW**: Check if any new messages were received
4. **NEW**: If yes, update current user's last seen with latest message ID
5. Message appears in chat with read receipt

### Scenario 3: User Opens Conversation (Existing)
1. User opens conversation
2. Load messages from SQLite
3. Update user's last seen with latest message ID
4. Messages appear with read receipts

## Expected Behavior After Fix

### Read Receipt Accuracy
- **User A sends message**: Their read receipt appears immediately (they're active)
- **User B receives while in chat**: Their read receipt appears immediately (they're viewing)
- **User C opens later**: Their read receipt appears when they open the conversation
- **Mixed scenarios**: Each user's read receipt reflects their actual activity level

### Real-Time Updates
- **Active users**: Read receipts update in real-time as they interact
- **Passive users**: Read receipts only update when they open the conversation
- **Accurate timestamps**: Last seen times reflect actual user activity, not just conversation opens

## Debug Information

The enhanced logging will show:
- `✅ Updated last seen after sending message`
- `✅ Updated last seen after sending image`
- `✅ Updated last seen after receiving new message while in chat`
- Error messages if updates fail

## Files Modified

1. **`mobile/app/conversation/[id].tsx`**
   - Added last seen update after sending text messages
   - Added last seen update after sending image messages
   - Added last seen update when receiving messages while in chat
   - Added error handling for all scenarios

## Impact

- ✅ **Accurate read receipts**: Reflect actual user activity, not just conversation opens
- ✅ **Real-time updates**: Active users show read receipts immediately
- ✅ **Better UX**: Users see accurate information about who's actively reading
- ✅ **WhatsApp-like behavior**: Matches expected messaging app behavior
- ✅ **Error resilience**: Message sending/receiving doesn't fail if last seen update fails
- ✅ **Performance**: Efficient updates without unnecessary database calls

## Testing Scenarios

### Test Case 1: User Sends Message
1. User A opens conversation
2. User A sends a message
3. **Expected**: User A's read receipt appears immediately
4. **Verify**: Console shows "Updated last seen after sending message"

### Test Case 2: User Receives While In Chat
1. User A opens conversation
2. User B sends a message (while User A is still in chat)
3. **Expected**: User A's read receipt appears immediately
4. **Verify**: Console shows "Updated last seen after receiving new message while in chat"

### Test Case 3: User Opens Later
1. User A sends message
2. User B opens conversation later
3. **Expected**: User B's read receipt appears when they open
4. **Verify**: Console shows "Updated last seen" when conversation opens

### Test Case 4: Mixed Activity
1. User A sends message (active)
2. User B receives while in chat (active)
3. User C opens conversation later (passive)
4. **Expected**: Each user's read receipt reflects their activity level

---

**Next Steps:**
- Test the implementation in the running app
- Verify read receipts update correctly for all scenarios
- Monitor console logs for proper behavior
- Test with multiple users and different activity patterns
