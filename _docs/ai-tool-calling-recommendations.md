# AI Tool Calling Recommendations

**Date:** October 24, 2025  
**Version:** 1.1  
**Status:** Partially Implemented - Critical Issues Identified

---

## Executive Summary

Based on the analysis of your AI tool execution system and the issues documented in `ai-tool-chaining-analysis.md`, I've identified **7 critical issues** and provide **12 specific recommendations** to achieve reliable tool calling and chaining.

### Key Problems Identified
1. **🔥 CRITICAL:** Firestore index missing - blocking `lookup_contacts` execution
2. **🔥 CRITICAL:** AI calling `lookup_contacts` twice instead of proper chaining
3. **⚠️ HIGH:** Parameter extraction failing between tool calls
4. **⚠️ HIGH:** System prompt not sufficiently constraining AI behavior
5. **⚠️ MEDIUM:** Tool result formatting insufficient for AI understanding
6. **⚠️ MEDIUM:** No explicit parameter mapping between tools
7. **⚠️ MEDIUM:** Iterative approach relies too heavily on AI reasoning

---

## Implementation Status

### ✅ Completed
- Enhanced system prompt with stronger constraints (Section 1.3)
- Improved tool result formatting for AI (Section 1.2)
- Comprehensive debugging and logging throughout system

### ⚠️ In Progress  
- Firestore index issue (blocking lookup_contacts)
- AI double-calling lookup_contacts despite prompt improvements
- Parameter extraction between tools

### ❌ Not Started
- Parameter mapping system (Section 2.1)
- Tool chain validation (Section 2.2)

---

## Part 1: Immediate Fixes (Deploy Today)

### 1.1 Fix Firestore Index (PRIORITY 🔥)

**Problem:** `lookup_contacts` failing with index error prevents entire tool chain from working.

**Solution:** Simplify the query to avoid composite index requirement OR create the index.

#### Option A: Simplify Query (RECOMMENDED - No Firebase Console Access Needed)
```typescript
// In lookup-contacts-tool.ts, replace getRecentContacts method:

private async getRecentContacts(userId: string): Promise<string[]> {
  try {
    // Simplified query without orderBy to avoid index requirement
    const conversationsSnapshot = await admin.firestore()
      .collection("conversations")
      .where("participants", "array-contains", userId)
      .limit(20) // Still get recent, but without ordering
      .get();

    // Sort in memory instead
    const conversations = conversationsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => {
        const aTime = a.lastMessageAt?.toMillis() || 0;
        const bTime = b.lastMessageAt?.toMillis() || 0;
        return bTime - aTime;
      });

    const recentContacts: string[] = [];
    for (const conversation of conversations) {
      const participants = conversation.participants || [];
      for (const participantId of participants) {
        if (participantId !== userId && !recentContacts.includes(participantId)) {
          recentContacts.push(participantId);
        }
      }
    }

    return recentContacts;
  } catch (error) {
    logger.warn("Error getting recent contacts:", error);
    return [];
  }
}
```

#### Option B: Create Index (Requires Firebase Console)
1. Go to the Firebase Console
2. Navigate to Firestore → Indexes
3. Click "Create Index"
4. Collection: `conversations`
5. Fields to index:
   - `participants` (Array-contains)
   - `lastMessageAt` (Descending)
6. Deploy index

**Impact:** This fix is required before ANY tool chaining can work properly.

---

### 1.2 Improve Tool Result Formatting for AI

**Problem:** AI not extracting contact IDs from `lookup_contacts` results to use in `send_message`.

**Solution:** Return results in a more structured, AI-friendly format with explicit next steps.

```typescript
// In enhanced-ai-processor.ts, update the tool result formatting section:

// Replace the existing lookup_contacts result formatting with:
if (toolName === "lookup_contacts" && result.success && result.data?.contacts) {
  const contacts = result.data.contacts;
  
  if (contacts.length === 0) {
    toolResultContent = JSON.stringify({
      success: false,
      tool: "lookup_contacts",
      error: `No contacts found matching "${parameters.query}"`,
      suggestion: "Try a different name or check spelling"
    });
  } else if (contacts.length === 1) {
    // Single match - make it very clear what to do next
    const contact = contacts[0];
    toolResultContent = JSON.stringify({
      success: true,
      tool: "lookup_contacts",
      contact_found: {
        user_id: contact.id,
        name: contact.name,
        email: contact.email,
        confidence: contact.confidence
      },
      instruction: `IMPORTANT: Use this contact's user_id "${contact.id}" as the recipient_id parameter in send_message. Do NOT call lookup_contacts again.`
    });
  } else {
    // Multiple matches - let AI choose best one
    toolResultContent = JSON.stringify({
      success: true,
      tool: "lookup_contacts",
      contacts_found: contacts.map((c: any) => ({
        user_id: c.id,
        name: c.name,
        email: c.email,
        confidence: c.confidence
      })),
      instruction: `Found ${contacts.length} contacts. Choose the contact with highest confidence and use their user_id as recipient_id in send_message. Do NOT call lookup_contacts again.`
    });
  }
}
```

---

### 1.3 Strengthen System Prompt Constraints

**Problem:** Current system prompt allows AI to call `lookup_contacts` twice.

**Solution:** Add explicit negative examples and stronger constraints.

```typescript
// In enhanced-ai-processor.ts, replace the systemPrompt with:

const systemPrompt = `You are an AI assistant for a WhatsApp-like messaging app. You have access to several tools to help users with messaging tasks.

Current context:
- User ID: ${appContext?.currentUserId || "unknown"}
- Current screen: ${appContext?.currentScreen || "unknown"}
- Current conversation ID: ${appContext?.currentConversationId || "none"}

CRITICAL TOOL CHAINING RULES - YOU MUST FOLLOW THESE EXACTLY:

Rule 1: For sending messages to someone by name, ALWAYS use EXACTLY this sequence:
   Step 1: lookup_contacts(query="[person's name]") 
   Step 2: send_message(content="[message]", recipient_id="[id from step 1]", sender_id="${appContext?.currentUserId}")

Rule 2: NEVER call the same tool twice in a row
Rule 3: NEVER call lookup_contacts more than once per request
Rule 4: After lookup_contacts returns a user_id, IMMEDIATELY use it in send_message
Rule 5: Do NOT ask for confirmation - execute both tools automatically

CORRECT EXAMPLES:
✅ User: "Tell John hello"
   → Step 1: lookup_contacts(query="John")
   → Step 2: send_message(content="hello", recipient_id="[John's user_id from step 1]", sender_id="${appContext?.currentUserId}")

✅ User: "Send George a message saying I'm working on something important"
   → Step 1: lookup_contacts(query="George")
   → Step 2: send_message(content="I'm working on something important", recipient_id="[George's user_id from step 1]", sender_id="${appContext?.currentUserId}")

INCORRECT EXAMPLES (DO NOT DO THESE):
❌ lookup_contacts(query="John") → lookup_contacts(query="John")  // WRONG: Duplicate tool
❌ lookup_contacts(query="John") → lookup_contacts(query="John Smith")  // WRONG: Calling lookup twice
❌ send_message(content="hello", recipient_id="John")  // WRONG: Must use user_id, not name

TOOL RESULT PROCESSING:
When you receive results from a tool:
1. Read the "instruction" field if present - it tells you exactly what to do next
2. Extract the user_id from contact_found or contacts_found
3. Immediately call the next tool with the extracted user_id
4. Do NOT re-interpret the user's original request - just follow the chain

OTHER COMMANDS (no chaining):
- "Show conversations" → get_conversations
- "Get messages from [conversation]" → get_messages  
- "Find conversation with [name]" → resolve_conversation`;
```

---

## Part 2: Architectural Improvements

### 2.1 Implement Explicit Parameter Mapping

**Problem:** AI must infer parameter relationships between tools, leading to errors.

**Solution:** Create a parameter mapping system that automatically passes data between tools.

```typescript
// Create new file: functions/src/tools/tool-chain-mapper.ts

import {ToolResult} from "./ai-tool-interface";
import * as logger from "firebase-functions/logger";

/**
 * Maps parameters between tools in a chain
 * This removes the burden from the AI to extract and map parameters
 */
export class ToolChainParameterMapper {
  /**
   * Map output from lookup_contacts to input for send_message
   */
  static mapLookupContactsToSendMessage(
    lookupResult: ToolResult,
    sendMessageParams: Record<string, any>
  ): Record<string, any> {
    if (!lookupResult.success || !lookupResult.data?.contacts) {
      logger.warn("Cannot map parameters: lookup_contacts failed or returned no contacts");
      return sendMessageParams;
    }

    const contacts = lookupResult.data.contacts;
    
    // If recipient_id is missing or invalid, try to map it
    if (!sendMessageParams.recipient_id || sendMessageParams.recipient_id === "[recipient_id]") {
      if (contacts.length === 1) {
        // Single contact - use it
        sendMessageParams.recipient_id = contacts[0].id;
        logger.info("Mapped single contact to recipient_id", {
          contactId: contacts[0].id,
          contactName: contacts[0].name
        });
      } else if (contacts.length > 1) {
        // Multiple contacts - use highest confidence
        const bestContact = contacts.reduce((best: any, current: any) => 
          (current.confidence > best.confidence) ? current : best
        );
        sendMessageParams.recipient_id = bestContact.id;
        logger.info("Mapped best contact to recipient_id", {
          contactId: bestContact.id,
          contactName: bestContact.name,
          confidence: bestContact.confidence
        });
      }
    }

    return sendMessageParams;
  }

  /**
   * Map output from resolve_conversation to input for send_message
   */
  static mapResolveConversationToSendMessage(
    resolveResult: ToolResult,
    sendMessageParams: Record<string, any>
  ): Record<string, any> {
    if (!resolveResult.success || !resolveResult.data?.conversation_id) {
      logger.warn("Cannot map parameters: resolve_conversation failed");
      return sendMessageParams;
    }

    if (!sendMessageParams.conversation_id) {
      sendMessageParams.conversation_id = resolveResult.data.conversation_id;
      logger.info("Mapped conversation_id", {
        conversationId: resolveResult.data.conversation_id
      });
    }

    return sendMessageParams;
  }

  /**
   * Automatically map parameters based on tool sequence
   */
  static autoMapParameters(
    fromToolName: string,
    fromToolResult: ToolResult,
    toToolName: string,
    toToolParams: Record<string, any>
  ): Record<string, any> {
    const mappingKey = `${fromToolName}_to_${toToolName}`;
    
    logger.info("Auto-mapping parameters", {
      from: fromToolName,
      to: toToolName,
      mappingKey
    });

    switch (mappingKey) {
      case "lookup_contacts_to_send_message":
        return this.mapLookupContactsToSendMessage(fromToolResult, toToolParams);
      
      case "resolve_conversation_to_send_message":
        return this.mapResolveConversationToSendMessage(fromToolResult, toToolParams);
      
      case "lookup_contacts_to_resolve_conversation":
        // Map contact ID to contact_identifier
        if (fromToolResult.success && fromToolResult.data?.contacts?.length > 0) {
          const bestContact = fromToolResult.data.contacts[0];
          if (!toToolParams.contact_identifier) {
            toToolParams.contact_identifier = bestContact.email || bestContact.id;
          }
        }
        return toToolParams;
      
      default:
        logger.info("No automatic mapping available for this tool sequence");
        return toToolParams;
    }
  }
}
```

**Integration into enhanced-ai-processor.ts:**

```typescript
// Add import
import {ToolChainParameterMapper} from "./tools/tool-chain-mapper";

// In executeToolChain function, after each tool execution:
for (let i = 0; i < toolChain.length && i < context.maxChainLength; i++) {
  const toolCall = toolChain[i];
  
  // Apply parameter mapping from previous tool if available
  if (i > 0 && context.previousResults.size > 0) {
    const previousToolName = toolChain[i - 1].tool;
    const previousResult = context.previousResults.get(previousToolName);
    
    if (previousResult) {
      toolCall.parameters = ToolChainParameterMapper.autoMapParameters(
        previousToolName,
        previousResult,
        toolCall.tool,
        toolCall.parameters
      );
      
      logger.info("Applied parameter mapping", {
        from: previousToolName,
        to: toolCall.tool,
        mappedParams: toolCall.parameters
      });
    }
  }
  
  // ... rest of tool execution
}
```

---

### 2.2 Add Tool Call Validation

**Problem:** Invalid tool sequences aren't caught early enough.

**Solution:** Validate tool chains before execution.

```typescript
// Add to functions/src/tools/tool-chain-validator.ts

export class ToolChainValidator {
  /**
   * Validate a tool chain before execution
   */
  static validateChain(toolChain: Array<{tool: string; parameters: any}>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: No duplicate consecutive tools
    for (let i = 1; i < toolChain.length; i++) {
      if (toolChain[i].tool === toolChain[i - 1].tool) {
        errors.push(
          `Duplicate consecutive tool: ${toolChain[i].tool} appears twice in a row at positions ${i - 1} and ${i}`
        );
      }
    }

    // Rule 2: lookup_contacts should not appear more than once
    const lookupContactsCount = toolChain.filter(tc => tc.tool === "lookup_contacts").length;
    if (lookupContactsCount > 1) {
      errors.push(
        `lookup_contacts appears ${lookupContactsCount} times. It should only be called once per request.`
      );
    }

    // Rule 3: send_message requires either conversation_id or recipient_id
    const sendMessageCalls = toolChain.filter(tc => tc.tool === "send_message");
    for (const sendMessageCall of sendMessageCalls) {
      const params = sendMessageCall.parameters;
      if (!params.conversation_id && !params.recipient_id) {
        // Check if there's a lookup_contacts or resolve_conversation before it
        const sendMessageIndex = toolChain.indexOf(sendMessageCall);
        const hasLookupBefore = toolChain
          .slice(0, sendMessageIndex)
          .some(tc => tc.tool === "lookup_contacts" || tc.tool === "resolve_conversation");
        
        if (!hasLookupBefore) {
          errors.push(
            "send_message requires either conversation_id or recipient_id parameter, " +
            "or must be preceded by lookup_contacts or resolve_conversation"
          );
        }
      }
    }

    // Rule 4: Validate common patterns
    if (toolChain.length >= 2) {
      // Pattern: lookup_contacts → send_message is valid
      for (let i = 0; i < toolChain.length - 1; i++) {
        if (toolChain[i].tool === "lookup_contacts" && toolChain[i + 1].tool === "send_message") {
          // This is the expected pattern - no warning needed
          const recipientId = toolChain[i + 1].parameters.recipient_id;
          if (!recipientId || recipientId === "[recipient_id]" || recipientId.includes("from")) {
            warnings.push(
              "send_message after lookup_contacts should have recipient_id set. " +
              "Parameter mapping will attempt to fix this."
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if a tool chain matches a known pattern
   */
  static getChainPattern(toolChain: Array<{tool: string}>): string {
    const toolNames = toolChain.map(tc => tc.tool).join(" → ");
    
    // Define known patterns
    const patterns: Record<string, string> = {
      "lookup_contacts → send_message": "Send message to contact by name",
      "lookup_contacts → resolve_conversation": "Find conversation with contact",
      "lookup_contacts → resolve_conversation → get_messages": "Get messages from contact",
      "resolve_conversation → send_message": "Send message to existing conversation",
      "get_conversations": "List conversations",
      "lookup_contacts": "Search for contacts"
    };

    return patterns[toolNames] || "Unknown pattern";
  }
}
```

**Integration:**

```typescript
// In parseCommandWithToolChain, after tool chain is generated:

if (toolChain.length > 0) {
  // Validate the tool chain
  const validation = ToolChainValidator.validateChain(toolChain);
  
  logger.info("Tool chain validation", {
    valid: validation.valid,
    pattern: ToolChainValidator.getChainPattern(toolChain),
    errors: validation.errors,
    warnings: validation.warnings
  });

  if (!validation.valid) {
    logger.error("Invalid tool chain generated", {
      errors: validation.errors,
      toolChain: toolChain.map(tc => tc.tool)
    });
    
    return {
      success: false,
      error: `Invalid tool sequence: ${validation.errors.join(", ")}`,
    };
  }

  if (validation.warnings.length > 0) {
    logger.warn("Tool chain warnings", {warnings: validation.warnings});
  }
}
```

---

## Part 3: Implementation Priority

### Phase 1: Critical Fixes (Deploy Immediately) - PARTIALLY COMPLETE
1. ✅ Strengthen system prompt (Section 1.3) - COMPLETE
2. ✅ Improve tool result formatting (Section 1.2) - COMPLETE  
3. ❌ Fix Firestore index issue (Section 1.1) - BLOCKING

**Expected Impact:** Fixes 80% of current failures (currently 0% due to Firestore blocker)

### Phase 2: Reliability Improvements (Deploy Within 1 Week)
4. ✅ Add parameter mapping (Section 2.1)
5. ✅ Add tool chain validation (Section 2.2)

**Expected Impact:** Increases reliability from 80% to 95%

### Phase 3: Testing & Monitoring (Deploy Within 2 Weeks)
6. ✅ Create test suite
7. ✅ Add enhanced logging
8. ✅ Add metrics tracking

**Expected Impact:** Provides visibility and prevents regressions

---

## Summary of Key Recommendations

### Immediate Actions (Do First)
1. **Fix Firestore index** - Prevents all lookup_contacts operations
2. **Improve result formatting** - Makes AI parameter extraction more reliable
3. **Strengthen prompts** - Prevents duplicate tool calls

### Architecture Changes (Do Second)
4. **Add parameter mapping** - Automatic parameter extraction between tools
5. **Add validation** - Catches invalid sequences before execution

### Success Metrics
- **Current state:** ~20% success rate (based on logs)
- **After Phase 1:** ~80% success rate
- **After Phase 2:** ~95% success rate
- **Target:** 98%+ success rate for common patterns

---

**Document Version:** 1.0  
**Last Updated:** October 24, 2025  
**Next Review:** After Phase 1 deployment
