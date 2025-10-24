# AI Command Clarification Fix

**Date:** October 24, 2025  
**Issue:** Multi-step prompt ambiguity causing "unknown" recipient in conversations  
**Status:** ✅ Fixed

---

## Problem Description

The AI command system was not properly handling ambiguous contact names like "John" when multiple users with similar names existed. The system would:

1. Successfully execute the `lookup_contacts` tool
2. Find multiple matches or low-confidence matches
3. **Fail to invoke the `request_clarification` tool** when needed
4. Proceed with `send_message` using an ambiguous or incorrect contact
5. Create conversations with "unknown" recipients
6. Cause TypeError in `useConversationDisplay.ts` due to undefined `participantDetails`

## Root Cause Analysis

### Issue 1: AI Processor Not Handling Clarification Flag
The `lookup_contacts` tool correctly identified when clarification was needed and returned:
- `needs_clarification: true`
- `clarification_reason: "Multiple contacts with similar confidence scores"`
- `clarification_options: [...]`

However, the AI processor in `enhanced-ai-processor.ts` was only checking the number of contacts found, not the `needs_clarification` flag.

### Issue 2: Conversation Display Error
The `useConversationDisplay.ts` hook was accessing `conversation?.participantDetails[otherParticipant]` without checking if `participantDetails` exists, causing a TypeError when the conversation object was incomplete.

## Solution Implemented

### 1. Enhanced AI Processor Logic
**File:** `functions/src/enhanced-ai-processor.ts`

**Changes:**
- Added explicit check for `needs_clarification` flag in `lookup_contacts` results
- Enhanced tool result formatting to include clarification instructions
- Updated system prompt to emphasize clarification handling

**Key Changes:**
```typescript
// Before: Only checked contact count
if (contacts.length === 0) { ... }
else if (contacts.length === 1) { ... }
else { ... }

// After: Check clarification flag first
if (contacts.length === 0) { ... }
else if (needsClarification) {
  // Instruct AI to call request_clarification tool
  toolResultContent = JSON.stringify({
    success: true,
    tool: "lookup_contacts",
    needs_clarification: true,
    clarification_reason: clarificationReason,
    clarification_options: clarificationOptions,
    instruction: `CLARIFICATION NEEDED: Call request_clarification tool...`
  });
}
else if (contacts.length === 1) { ... }
else { ... }
```

### 2. Updated System Prompt
**Enhanced Instructions:**
```
CRITICAL RULE: For ANY command that involves sending a message to someone by name:

1. FIRST: Call lookup_contacts(query="[person's name]") to find their user ID
2. CHECK: If lookup_contacts returns needs_clarification=true, you MUST call request_clarification tool BEFORE proceeding
3. SECOND: Use the results from step 1 (or user selection from clarification) to call send_message

CLARIFICATION HANDLING:
- If lookup_contacts returns needs_clarification=true, you MUST call request_clarification tool
- Do NOT proceed with send_message until user provides clarification
- ALWAYS respect clarification requests - do not guess which contact the user meant
```

### 3. Fixed Conversation Display Error
**File:** `mobile/src/hooks/conversation/useConversationDisplay.ts`

**Changes:**
- Added null-safe access to `participantDetails` using optional chaining
- Fixed both display name and photo URL access

**Key Changes:**
```typescript
// Before: Unsafe access
conversation?.participantDetails[otherParticipant]

// After: Safe access with optional chaining
conversation?.participantDetails?.[otherParticipant]
```

## Expected Behavior After Fix

### Scenario: "Tell John I'm going to need his signature on something"

**When Multiple Johns Exist:**
1. ✅ `lookup_contacts(query="John")` finds multiple matches
2. ✅ Tool returns `needs_clarification: true` with options
3. ✅ AI processor instructs AI to call `request_clarification` tool
4. ✅ AI calls `request_clarification` with contact options
5. ✅ User sees clarification dialog: "Which contact did you mean?"
6. ✅ User selects correct John
7. ✅ AI proceeds with `send_message` using selected contact
8. ✅ Conversation created with correct recipient
9. ✅ No TypeError in conversation display

**When Single John Exists with High Confidence:**
1. ✅ `lookup_contacts(query="John")` finds single match
2. ✅ Tool returns `needs_clarification: false`
3. ✅ AI proceeds directly to `send_message`
4. ✅ Conversation created with correct recipient

**When No John Exists:**
1. ✅ `lookup_contacts(query="John")` finds no matches
2. ✅ AI shows error: "No contacts found matching 'John'"
3. ✅ Suggests: "Try a different name or check spelling"

## Technical Details

### Clarification Logic in LookupContactsTool
The tool determines clarification is needed when:
- **Multiple contacts with similar confidence** (difference < 0.2)
- **Single contact with low confidence** (< 0.6)

### Tool Chain Flow
```
User Command → lookup_contacts → [needs_clarification?] → request_clarification → send_message
                                    ↓ No
                                 send_message
```

### Error Prevention
- Added null-safe access patterns throughout conversation display logic
- Enhanced error handling in AI processor
- Clear instruction formatting for AI decision-making

## Testing Recommendations

### Manual Testing Scenarios
1. **Multiple Johns:** Create users "John Smith" and "John Doe", test "Tell John hello"
2. **Low Confidence Match:** Create user "Jonathon" (similar to "John"), test "Tell John hello"
3. **No Match:** Test "Tell NonExistentUser hello"
4. **High Confidence Match:** Test with exact name match

### Expected Results
- ✅ Clarification dialogs appear for ambiguous cases
- ✅ No "unknown" recipients in conversations
- ✅ No TypeError crashes in conversation display
- ✅ Proper conversation names and participant details

## Files Modified

1. **`functions/src/enhanced-ai-processor.ts`**
   - Enhanced `lookup_contacts` result handling
   - Added clarification instruction logic
   - Updated system prompt for better AI behavior

2. **`mobile/src/hooks/conversation/useConversationDisplay.ts`**
   - Added null-safe access to `participantDetails`
   - Fixed both display name and photo URL access

## Impact

- ✅ **Resolves multi-step prompt ambiguity issue**
- ✅ **Prevents "unknown" recipient conversations**
- ✅ **Eliminates TypeError crashes**
- ✅ **Improves AI command reliability**
- ✅ **Enhances user experience with clarification dialogs**

The AI command system now properly handles ambiguous contact names by requesting user clarification when needed, ensuring accurate message delivery and preventing UI errors.
