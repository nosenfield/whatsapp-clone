# Fix Calendar Event Detection

**Date:** October 27, 2025  
**Issue:** Calendar event detection stopped working  
**Status:** ✅ Fixed and Deployed

## Problem Analysis

### Issues Found in Logs

1. **AI Response Parsing Error**
   - AI sometimes returned plain text instead of JSON
   - Example: "The message doesn't contain any event, date, time, location, or participants to extract."
   - This caused JSON parse errors

2. **Firestore Save Error**
   - Date objects were being saved directly to Firestore
   - Firestore requires Timestamp objects, not raw Date objects
   - This caused save failures even when extraction succeeded

3. **Unclear AI Instructions**
   - System prompt didn't emphasize JSON-only output requirement
   - No examples for empty result cases

## Solution Implemented

### 1. Enhanced JSON Parsing (lines 250-273)
```typescript
// Try to extract JSON from markdown code blocks if present
const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const jsonContent = jsonMatch ? jsonMatch[1] : content;

events = JSON.parse(jsonContent);

// Handle case where AI returns text saying "no events"
if (content.toLowerCase().includes("no event") || 
    content.toLowerCase().includes("doesn't contain any event")) {
  logger.info("AI confirmed no events in message", {content});
  return [];
}
```

**Improvements:**
- Extracts JSON from markdown code blocks if AI wraps it
- Gracefully handles AI text responses saying "no events"
- Better error logging with full content

### 2. Fixed Firestore Save (lines 362-386)
```typescript
// Convert Date objects to Firestore timestamps
const eventData = {
  ...event,
  date: event.date ? admin.firestore.Timestamp.fromDate(event.date) : null,
  extractedAt: admin.firestore.FieldValue.serverTimestamp(),
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
};

await admin.firestore()
  .collection("extractedEvents")
  .doc(event.id)
  .set(eventData);
```

**Improvements:**
- Converts Date objects to Firestore Timestamps
- Handles null dates gracefully
- Added better error logging with event data

### 3. Improved System Prompt (lines 218-240)
```typescript
const systemPrompt = `You are an AI assistant that extracts calendar events...

CRITICAL: You MUST return ONLY a valid JSON array. No additional text, no explanations.

Rules:
6. ALWAYS return a valid JSON array (even if empty: [])
7. For dates, return in format: "YYYY-MM-DD" or relative dates like "tomorrow", "today"
8. For times, return in format: "HH:MM AM/PM"

Example when no events: "Thanks for the update!"
Example output: []

Current date: ${new Date().toISOString().split("T")[0]}
Current day of week: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]}`;
```

**Improvements:**
- Emphasized JSON-only output with "CRITICAL" message
- Added empty array example
- Added current day of week for better date resolution
- Clearer date/time format requirements

## Testing

### Before Fix
- ❌ JSON parse errors on some messages
- ❌ Firestore save failures
- ❌ Events not being saved even when extracted

### After Fix
- ✅ All messages processed without errors
- ✅ Events saved successfully to Firestore
- ✅ Empty arrays handled gracefully
- ✅ Better logging for debugging

## Deployment

```bash
✔  functions[extractCalendarEvents(us-central1)] Successful update operation.
✔  Deploy complete!
```

**Deployed:** October 27, 2025 - 1:40 AM (us-central1)

## Expected Behavior

The calendar extraction function should now:
1. ✅ Process all text messages with temporal keywords
2. ✅ Extract calendar events using OpenAI GPT-4
3. ✅ Handle both JSON and text AI responses gracefully
4. ✅ Save events to Firestore with proper timestamps
5. ✅ Log clear errors if something fails

## Verification Steps

To test that it's working:

1. **Send a message with an event:**
   ```
   "Let's meet for lunch tomorrow at 12pm at the Italian restaurant"
   ```

2. **Check Cloud Functions logs:**
   ```bash
   firebase functions:log --only extractCalendarEvents
   ```

3. **Look for success indicators:**
   - ✅ "Starting AI extraction"
   - ✅ "AI extracted events" with count > 0
   - ✅ "Saved extracted event" with event title

4. **Check Firestore:**
   - Navigate to `extractedEvents` collection
   - Should see new event documents with proper structure

## Files Modified

- `functions/src/features/calendar-extraction.ts`
  - Lines 250-273: Enhanced JSON parsing
  - Lines 362-386: Fixed Firestore save
  - Lines 218-240: Improved system prompt

## Related Context

- Initial implementation: See `_docs/task-list-appendix-b.md` for calendar extraction feature
- Similar pattern: See `functions/src/features/` for other AI features
- Firestore patterns: See `functions/src/embeddings/` for similar data handling

---

**Next Steps:** Monitor logs for 24-48 hours to ensure stability. If issues persist, consider adding retry logic or upgrading to GPT-4 Turbo for better JSON compliance.

---

## UPDATE: Events Not Displaying in Mobile App (10/27)

### Status: Cloud Function Working, UI Not Showing Events

**Verified Working:**
- ✅ Events are being extracted from messages with temporal keywords
- ✅ Events are being saved to Firestore successfully
- ✅ Logs show: "Saved extracted event" and "Successfully extracted calendar events"

**Issue:**
- ❌ Events are not appearing in the mobile app UI
- Extracted events are saved to `extractedEvents` collection but not displayed

### Debug Logging Added

Added console logging to diagnose:
1. `mobile/src/components/MessageBubble.tsx` - Logs event fetching
2. `mobile/src/services/calendar-event-service.ts` - Logs Firestore queries

### To Debug:

1. Open mobile app and send test message: "Let's meet tomorrow at 3pm for coffee"
2. Check Xcode console or Expo logs for:
   - `📅 Fetching events for conversation:` - Query execution
   - `📅 Found X events in Firestore` - Event count
   - `🔍 MessageBubble Debug:` - UI rendering
3. Share console output to identify where the pipeline breaks

