# AI Context Debugging - Group Conversation Screen Issue

**Date:** October 24, 2025  
**Issue:** AI still receiving "chats" as screen when on group conversation screen  
**Status:** 🔍 Debugging Added

---

## Problem Description

Despite the previous fix, the AI is still receiving "chats" as the screen context when the user is on a group conversation screen, instead of the expected "conversation" context.

### Issue Analysis

The user reported that when taking action on the "group conversation" screen, the AI still receives "chats" as the screen context. This suggests there might be:

1. **Timing Issue**: Context not updated when navigating to conversation screen
2. **Pathname Issue**: Pathname not being detected correctly for group conversations
3. **Context Propagation Issue**: Context not being passed correctly through the component chain
4. **Race Condition**: Context being set before navigation completes

---

## Debugging Implementation

### 1. Added Debug Logging to useAICommandContext

**File:** `mobile/src/hooks/useAICommandContext.ts`

```typescript
useEffect(() => {
  // Debug logging
  console.log('🔍 useAICommandContext Debug:');
  console.log('  - pathname:', pathname);
  
  // Determine current screen based on pathname
  let currentScreen: AICommandContext['currentScreen'] = 'Other';
  let currentConversationId: string | undefined;

  if (pathname === '/chats' || pathname === '/(tabs)/chats') {
    currentScreen = 'ConversationList';
    console.log('  - Detected: ConversationList');
  } else if (pathname?.startsWith('/conversation/')) {
    currentScreen = 'ConversationView';
    console.log('  - Detected: ConversationView');
    // Extract conversation ID from pathname
    const match = pathname.match(/\/conversation\/(.+)/);
    if (match) {
      currentConversationId = match[1];
      console.log('  - Extracted conversationId:', currentConversationId);
    }
  } else if (pathname === '/profile' || pathname === '/(tabs)/profile') {
    currentScreen = 'Profile';
    console.log('  - Detected: Profile');
  } else {
    console.log('  - Detected: Other');
  }

  const finalContext = {
    currentScreen,
    currentConversationId,
    currentUserId: user?.id,
  };
  
  console.log('  - Final context:', finalContext);
  setContext(finalContext);
}, [pathname, user?.id]);
```

### 2. Added Debug Logging to AICommandButton

**File:** `mobile/src/components/AICommandButton.tsx`

```typescript
// Debug logging
console.log('🔍 AICommandButton Debug:');
console.log('  - currentConversationId:', currentConversationId);
console.log('  - appContext:', appContext);
console.log('  - appContext.currentScreen:', appContext?.currentScreen);
console.log('  - appContext.currentConversationId:', appContext?.currentConversationId);

const { executeCommand, isProcessing, error } = useAICommands(currentConversationId, appContext);
```

### 3. Added Debug Logging to useAICommands

**File:** `mobile/src/hooks/useAICommands.ts`

```typescript
// Debug logging
console.log('🔍 AI Command Debug:');
console.log('  - currentConversationId:', currentConversationId);
console.log('  - appContext:', appContext);
console.log('  - appContext.currentScreen:', appContext?.currentScreen);
console.log('  - appContext.currentConversationId:', appContext?.currentConversationId);

// Use the passed appContext if available, otherwise create a fallback
const contextToUse = appContext ? {
  currentScreen: appContext.currentScreen === 'ConversationList' ? 'chats' : 
                appContext.currentScreen === 'ConversationView' ? 'conversation' :
                appContext.currentScreen === 'Profile' ? 'profile' : 'settings',
  currentConversationId: appContext.currentConversationId,
  currentUserId: user.id,
  recentConversations: [],
  deviceInfo: {
    platform: 'ios' as const,
    version: '1.0.0',
  },
} : {
  currentScreen: currentConversationId ? 'conversation' : 'chats',
  currentConversationId,
  currentUserId: user.id,
  recentConversations: [],
  deviceInfo: {
    platform: 'ios' as const,
    version: '1.0.0',
  },
};

console.log('  - Final contextToUse:', contextToUse);
```

---

## Expected Debug Output

### For Group Conversation Screen
When user is on `/conversation/group123`, we should see:

```
🔍 useAICommandContext Debug:
  - pathname: /conversation/group123
  - Detected: ConversationView
  - Extracted conversationId: group123
  - Final context: { currentScreen: 'ConversationView', currentConversationId: 'group123', currentUserId: 'user123' }

🔍 AICommandButton Debug:
  - currentConversationId: group123
  - appContext: { currentScreen: 'ConversationView', currentConversationId: 'group123', currentUserId: 'user123' }
  - appContext.currentScreen: ConversationView
  - appContext.currentConversationId: group123

🔍 AI Command Debug:
  - currentConversationId: group123
  - appContext: { currentScreen: 'ConversationView', currentConversationId: 'group123', currentUserId: 'user123' }
  - appContext.currentScreen: ConversationView
  - appContext.currentConversationId: group123
  - Final contextToUse: { currentScreen: 'conversation', currentConversationId: 'group123', currentUserId: 'user123', ... }
```

### For Conversation List Screen
When user is on `/chats`, we should see:

```
🔍 useAICommandContext Debug:
  - pathname: /chats
  - Detected: ConversationList
  - Final context: { currentScreen: 'ConversationList', currentConversationId: undefined, currentUserId: 'user123' }

🔍 AICommandButton Debug:
  - currentConversationId: undefined
  - appContext: { currentScreen: 'ConversationList', currentConversationId: undefined, currentUserId: 'user123' }
  - appContext.currentScreen: ConversationList
  - appContext.currentConversationId: undefined

🔍 AI Command Debug:
  - currentConversationId: undefined
  - appContext: { currentScreen: 'ConversationList', currentConversationId: undefined, currentUserId: 'user123' }
  - appContext.currentScreen: ConversationList
  - appContext.currentConversationId: undefined
  - Final contextToUse: { currentScreen: 'chats', currentConversationId: undefined, currentUserId: 'user123', ... }
```

---

## Potential Issues to Investigate

### 1. Timing Issues
- **Context Update Delay**: Context might not update immediately when navigating
- **Component Render Order**: AICommandButton might render before context updates
- **Navigation State**: Router state might not be updated when context is checked

### 2. Pathname Issues
- **Route Matching**: Pathname might not match expected patterns
- **Dynamic Routes**: `/conversation/[id]` might not be detected correctly
- **Route Parameters**: Conversation ID extraction might fail

### 3. Context Propagation Issues
- **Component Chain**: Context might not be passed correctly through components
- **State Updates**: React state updates might not propagate correctly
- **Hook Dependencies**: useEffect dependencies might not trigger updates

### 4. Race Conditions
- **Navigation vs Context**: Context might be checked before navigation completes
- **Async Operations**: Context might be set before async operations complete
- **State Synchronization**: Multiple state updates might conflict

---

## Debugging Strategy

### Step 1: Check Pathname Detection
- Verify that `/conversation/group123` is correctly detected
- Check if pathname starts with `/conversation/`
- Verify conversation ID extraction works

### Step 2: Check Context Updates
- Verify that `useAICommandContext` updates when pathname changes
- Check if context state is properly set
- Verify useEffect dependencies trigger correctly

### Step 3: Check Context Propagation
- Verify that `aiContext` is passed correctly to `AICommandButton`
- Check if `appContext` parameter is received correctly
- Verify that context is passed to `useAICommands`

### Step 4: Check Context Mapping
- Verify that `'ConversationView'` maps to `'conversation'`
- Check if mapping logic works correctly
- Verify final context sent to AI

---

## Next Steps

1. **Run Debug Logs**: Execute AI command on group conversation screen
2. **Analyze Output**: Check debug logs to identify where context breaks
3. **Identify Issue**: Determine if it's pathname, context, or mapping issue
4. **Implement Fix**: Apply appropriate fix based on debug findings
5. **Remove Debug Logs**: Clean up debug logging after fix is confirmed

---

## Expected Outcomes

### If Pathname Issue
- Debug will show incorrect pathname detection
- Fix: Update pathname matching logic

### If Context Issue
- Debug will show context not updating
- Fix: Update context update logic or dependencies

### If Propagation Issue
- Debug will show context not being passed correctly
- Fix: Update component prop passing

### If Mapping Issue
- Debug will show incorrect context mapping
- Fix: Update mapping logic in useAICommands

---

## Summary

Added comprehensive debug logging to trace the AI context flow from pathname detection through to final AI command execution. This will help identify exactly where the context differentiation is failing for group conversation screens.

**Debug Points Added:**
1. **useAICommandContext**: Pathname detection and context setting
2. **AICommandButton**: Context reception and passing
3. **useAICommands**: Context mapping and final context creation

**Next Action**: Run AI command on group conversation screen and analyze debug output to identify the root cause of the context issue.
