# Default Avatar Display Fix

**Date:** October 23, 2025  
**Issue:** Users with default avatars (no photoURL) were not showing avatars in the chat screen header  
**Status:** ✅ Fixed

## Problem Description

In the conversation screen header, avatars were only displayed when `otherParticipantPhotoURL` existed. For users with default avatars (no profile photo), no avatar was shown at all, creating an inconsistent UI experience.

## Root Cause

The conversation screen header had this conditional logic:
```typescript
{!isGroup && otherParticipantPhotoURL && (
  <Image source={{ uri: otherParticipantPhotoURL }} style={styles.headerPhoto} />
)}
```

This meant that if `otherParticipantPhotoURL` was `null` or `undefined`, no avatar would be rendered at all.

## Solution

Updated the conversation screen header to always show an avatar for direct chats, with a fallback to a default person icon when no photoURL is available:

```typescript
{!isGroup && (
  <View style={styles.headerAvatarContainer}>
    {otherParticipantPhotoURL ? (
      <Image source={{ uri: otherParticipantPhotoURL }} style={styles.headerPhoto} />
    ) : (
      <View style={styles.headerDefaultAvatar}>
        <MaterialIcons name="person" size={18} color="#fff" />
      </View>
    )}
  </View>
)}
```

## Changes Made

1. **Updated conversation screen header logic** (`mobile/app/conversation/[id].tsx`)
   - Added MaterialIcons import
   - Modified headerTitle to always show avatar for direct chats
   - Added fallback default avatar with person icon
   - Added new styles for avatar container and default avatar

2. **Added new styles:**
   - `headerAvatarContainer`: Container for the avatar with proper spacing
   - `headerDefaultAvatar`: Styled default avatar with blue background and white person icon

## Consistency Check

Verified that other components handle default avatars correctly:
- ✅ `Avatar.tsx` component: Shows person icon when no photoURL
- ✅ `ConversationItem.tsx`: Shows person icon when no photoURL  
- ✅ Conversation screen header: Now fixed to show person icon when no photoURL

## Testing

- [ ] Test with users who have profile photos (should show photo)
- [ ] Test with users who have default avatars (should show person icon)
- [ ] Test group conversations (should not show individual avatars)

## Files Modified

- `mobile/app/conversation/[id].tsx` - Fixed header avatar display logic and added styles

## Impact

- ✅ Consistent avatar display across all screens
- ✅ Better UX for users without profile photos
- ✅ Maintains existing functionality for users with photos
- ✅ No breaking changes to existing features
