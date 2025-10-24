# React Hooks Conditional Call Fix - Multiple Presence

**Date:** October 24, 2025  
**Issue:** Conditional hook calls and changing dependency arrays  
**Status:** ✅ Fixed

---

## Problem Description

After the initial fix, we encountered two new React hooks violations:

1. **Conditional Hook Calls**: "Should have a queue. You are likely calling Hooks conditionally"
2. **Changing Dependency Array**: "The final argument passed to %s changed size between renders"

### Root Cause Analysis

The issue was in this code:
```typescript
const groupMemberPresence = isGroup && conversation ? 
  conversation.participants.reduce((acc, participantId) => {
    acc[participantId] = usePresence(participantId); // ❌ Conditional hook calls
    return acc;
  }, {} as Record<string, any>) : {};
```

**Problems:**
1. **Conditional Execution**: Hooks were only called when `isGroup && conversation` was true
2. **Dynamic Array Size**: `conversation.participants` could change size between renders
3. **Hook Order Changes**: Different numbers of participants caused different hook call orders

---

## Solution Implemented

### 1. Created New Hook: `useMultiplePresence`

**File:** `mobile/src/hooks/useMultiplePresence.ts`

```typescript
import { useState, useEffect } from 'react';
import { subscribeToPresence } from '../services/firebase-rtdb';
import { Presence } from '../types';

/**
 * Hook to subscribe to multiple users' presence (online/offline status)
 * @param userIds - Array of user IDs to monitor
 * @returns Record of user ID to Presence object
 */
export const useMultiplePresence = (userIds: string[]): Record<string, Presence> => {
  const [presences, setPresences] = useState<Record<string, Presence>>({});

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPresences({});
      return;
    }

    console.log('👁️ Subscribing to presence for users:', userIds);

    const subscriptions: Array<() => void> = [];

    // Subscribe to each user's presence
    userIds.forEach((userId) => {
      if (!userId) return;

      const unsubscribe = subscribeToPresence(userId, (presence) => {
        setPresences(prev => ({
          ...prev,
          [userId]: presence
        }));
      });

      subscriptions.push(unsubscribe);
    });

    // Cleanup function
    return () => {
      console.log('👁️ Unsubscribing from presence for users:', userIds);
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [JSON.stringify(userIds)]); // Use JSON.stringify to ensure stable dependency

  return presences;
};
```

### 2. Updated Conversation Screen

**File:** `mobile/app/conversation/[id].tsx`

**Before (Problematic):**
```typescript
// Get presence for all group members (only for group chats)
const groupMemberPresence = isGroup && conversation ? 
  conversation.participants.reduce((acc, participantId) => {
    acc[participantId] = usePresence(participantId); // ❌ Conditional hooks
    return acc;
  }, {} as Record<string, any>) : {};
```

**After (Fixed):**
```typescript
import { useMultiplePresence } from '../../src/hooks/useMultiplePresence';

// Get presence for all group members (only for group chats)
const groupMemberPresence = useMultiplePresence(
  isGroup && conversation ? conversation.participants : []
);
```

---

## Technical Implementation

### Hook Design Principles

**1. Always Called:**
- Hook is always called regardless of conditions
- Empty array passed when not needed
- No conditional hook execution

**2. Stable Dependencies:**
- Uses `JSON.stringify(userIds)` for stable dependency comparison
- Handles empty arrays gracefully
- Consistent dependency array size

**3. Proper Cleanup:**
- Subscribes to all users in single effect
- Properly unsubscribes from all subscriptions
- Handles subscription array cleanup

### Data Flow

```typescript
// Input: Array of user IDs (can be empty)
const userIds = isGroup && conversation ? conversation.participants : [];

// Hook: Always called with stable input
const groupMemberPresence = useMultiplePresence(userIds);

// Output: Record of user ID to presence data
// { "userId1": { online: true, lastSeen: Date }, ... }
```

### Performance Optimizations

**1. Single Effect:**
- One `useEffect` handles all subscriptions
- Reduces effect overhead
- Centralized subscription management

**2. Efficient Updates:**
- Uses functional state updates
- Preserves existing presence data
- Only updates changed users

**3. Proper Cleanup:**
- Unsubscribes from all subscriptions
- Prevents memory leaks
- Handles component unmounting

---

## Rules of Hooks Compliance

### ✅ Fixed Violations

**1. Conditional Hook Calls:**
- **Before**: Hooks called conditionally based on `isGroup && conversation`
- **After**: Hook always called, empty array passed when not needed

**2. Changing Dependency Arrays:**
- **Before**: `conversation.participants` could change size
- **After**: Stable dependency using `JSON.stringify(userIds)`

**3. Hook Order Consistency:**
- **Before**: Different numbers of participants caused different hook orders
- **After**: Single hook call maintains consistent order

### ✅ Best Practices Applied

**1. Top Level Only:**
```typescript
// Always called at component top level
const groupMemberPresence = useMultiplePresence(userIds);
```

**2. Stable Dependencies:**
```typescript
// Stable dependency comparison
}, [JSON.stringify(userIds)]);
```

**3. Consistent Order:**
```typescript
// Same hook call order every render
const presence = usePresence(otherParticipantId);
const groupMemberPresence = useMultiplePresence(userIds);
```

---

## Error Prevention Strategies

### Dependency Stability
```typescript
// Use JSON.stringify for array dependencies
}, [JSON.stringify(userIds)]);

// Handle empty arrays gracefully
if (!userIds || userIds.length === 0) {
  setPresences({});
  return;
}
```

### Conditional Logic
```typescript
// Pass empty array instead of conditional hook calls
const userIds = isGroup && conversation ? conversation.participants : [];
const groupMemberPresence = useMultiplePresence(userIds);
```

### Hook Order
```typescript
// Always call hooks in same order
const presence = usePresence(otherParticipantId);           // Always called
const groupMemberPresence = useMultiplePresence(userIds);   // Always called
```

---

## Testing Scenarios

### Before Fix
- ❌ **Crash**: "Should have a queue" error
- ❌ **Crash**: "Changed size between renders" error
- ❌ **Unstable**: Different hook call orders
- ❌ **Unusable**: Group member avatars broken

### After Fix
- ✅ **Stable**: No hook violations
- ✅ **Consistent**: Same hook call order every render
- ✅ **Functional**: Group member avatars work correctly
- ✅ **Performant**: Efficient presence subscriptions

### Edge Cases Handled
- ✅ **Empty Groups**: Handles groups with no participants
- ✅ **Missing Conversation**: Handles undefined conversation
- ✅ **Direct Chats**: Passes empty array for non-group chats
- ✅ **Participant Changes**: Handles participants joining/leaving

---

## Performance Impact

### Before (Problematic)
- **Multiple Effects**: One effect per participant
- **Conditional Subscriptions**: Inconsistent subscription patterns
- **Memory Leaks**: Potential cleanup issues
- **Re-render Issues**: Unstable dependencies

### After (Optimized)
- **Single Effect**: One effect handles all participants
- **Consistent Subscriptions**: Predictable subscription pattern
- **Proper Cleanup**: All subscriptions cleaned up
- **Stable Dependencies**: Consistent re-render behavior

---

## Code Quality Improvements

### Maintainability
- ✅ **Single Responsibility**: One hook handles multiple presences
- ✅ **Clear Interface**: Simple input/output contract
- ✅ **Proper Documentation**: Clear JSDoc comments
- ✅ **Type Safety**: Proper TypeScript typing

### Reusability
- ✅ **Generic Hook**: Can be used for any user ID array
- ✅ **Flexible Input**: Handles empty arrays gracefully
- ✅ **Consistent Output**: Always returns presence record
- ✅ **Easy Integration**: Simple to use in components

---

## Future Considerations

### Potential Enhancements
1. **Memoization**: Could add `useMemo` for expensive operations
2. **Debouncing**: Could debounce rapid participant changes
3. **Caching**: Could cache presence data across components
4. **Batch Updates**: Could batch presence updates for performance

### Advanced Features
1. **Presence History**: Track presence changes over time
2. **Custom Events**: Emit events for presence changes
3. **Retry Logic**: Handle subscription failures gracefully
4. **Analytics**: Track presence subscription patterns

---

## Summary

Successfully fixed React hooks violations by:

1. **Created New Hook**: `useMultiplePresence` for handling multiple user presences
2. **Eliminated Conditional Calls**: Hook always called with stable input
3. **Stabilized Dependencies**: Used `JSON.stringify` for consistent dependency comparison
4. **Proper Cleanup**: Centralized subscription management with proper cleanup

**Result**: Group member avatars now work correctly without any React hooks violations, providing stable presence data for all group members.

**Technical**: Fixed by following React's Rules of Hooks - ensuring hooks are always called in the same order with stable dependencies, while maintaining efficient subscription management for multiple users.
