# AI Improvements: Handling Contextual Queries Without Explicit Conversation Context

**Status:** Proposed  
**Priority:** High  
**Complexity:** Medium  
**Date:** October 26, 2025

## Problem Statement

When a user issues a contextual query like "Who is coming to the party tonight?" from the ConversationList screen (not inside a specific conversation), the enhanced AI processor fails with:

```
No appropriate tools found for this command
```

**Root Cause Analysis:**

1. The `analyze_conversation` tool is perfect for answering this type of query
2. However, it requires a `conversation_id` parameter
3. User is on the ConversationList screen (`appContext.currentConversationId: undefined`)
4. The AI has no mechanism to:
   - Identify which conversation likely contains the answer
   - Search across multiple conversations
   - Prompt the user to specify which conversation

## Current System Behavior

### What Happens Now:
```
User: "Who is coming to the party tonight?"
Location: ConversationList screen
Result: "No appropriate tools found for this command"
```

### What the AI System Has:
- ✅ `analyze_conversation` - Perfect tool for extracting specific info
- ✅ `search_conversations` - Can search for conversations by keyword
- ✅ RAG pipeline - Can semantically search messages
- ❌ No bridge between conversation search and analysis

## Recommended Solutions

### Solution 1: Implicit Conversation Resolution (Recommended)

**Approach:** Automatically identify the relevant conversation(s) and analyze them.

#### Implementation Steps:

1. **Add `analyze_conversations_multi` tool** (plural):
   ```typescript
   {
     name: "analyze_conversations_multi",
     description: "Extract information from recent conversations when user isn't in a specific conversation. Searches across multiple conversations to find relevant information.",
     parameters: [
       {
         name: "query",
         type: "string",
         description: "The question to answer",
         required: true
       },
       {
         name: "current_user_id",
         type: "string", 
         description: "Current user ID",
         required: true
       },
       {
         name: "max_conversations",
         type: "number",
         description: "Max conversations to search",
         default: 5
       },
       {
         name: "time_window_hours",
         type: "number",
         description: "Only analyze conversations with activity in last N hours",
         default: 48
       }
     ]
   }
   ```

2. **Tool Execution Logic:**
   ```typescript
   async execute(params, context): Promise<ToolResult> {
     // Step 1: Use RAG to find relevant messages across all conversations
     const relevantMessages = await searchUserConversations(
       params.query,
       params.current_user_id,
       50 // Get more results to span conversations
     );
     
     // Step 2: Group by conversation, prioritize by recency + relevance
     const conversationGroups = groupMessagesByConversation(relevantMessages);
     
     // Step 3: If only one conversation has relevant results, analyze it
     if (conversationGroups.length === 1) {
       return await analyzeConversation(
         conversationGroups[0].conversationId,
         params.query,
         conversationGroups[0].messages
       );
     }
     
     // Step 4: If multiple conversations, request clarification
     if (conversationGroups.length > 1) {
       return {
         success: true,
         next_action: "clarification_needed",
         clarification: {
           question: "I found information in multiple conversations. Which one?",
           options: conversationGroups.map(group => ({
             id: group.conversationId,
             title: group.conversationTitle,
             subtitle: `Last active: ${group.lastActive}`,
             metadata: { conversationId: group.conversationId }
           }))
         }
       };
     }
     
     // Step 5: If no relevant conversations found
     return {
       success: false,
       next_action: "error",
       error: "No relevant conversations found"
     };
   }
   ```

3. **Update system prompt:**
   ```typescript
   // Add new pattern to buildOptimizedSystemPrompt()
   
   ## Pattern 4: Extract Information Without Conversation Context
   User asks information questions but is NOT in a conversation.
   User: "Who is coming to the party tonight?"
   Context: User is on chats list, currentConversationId is undefined
   
   Tools:
   1. analyze_conversations_multi({ 
        query: "[user's exact question]",
        current_user_id: "${userId}",
        max_conversations: 5,
        time_window_hours: 48
      })
      → Returns either:
         a) Direct answer if only one relevant conversation
         b) Clarification options if multiple conversations
         c) Error if no relevant conversations
   ```

#### Advantages:
- ✅ Seamless UX - no manual conversation selection needed
- ✅ Leverages existing RAG infrastructure
- ✅ Handles ambiguity with clarification flow
- ✅ Time-aware (recent conversations prioritized)

#### Disadvantages:
- Slightly more complex than explicit selection
- May require tuning relevance scoring

---

### Solution 2: Explicit Conversation Selection

**Approach:** Ask user to specify which conversation before analyzing.

#### Implementation Steps:

1. **Add pattern detection in system prompt:**
   ```typescript
   // In buildOptimizedSystemPrompt()
   
   ## Pattern: Information Query Without Context
   User asks: "Who confirmed?", "What time?", "Who is coming?"
   Context: User is NOT in a conversation (currentConversationId is undefined)
   
   Action: Call search_conversations to show user their recent conversations,
   then ask them to select which one they want to analyze.
   
   Tools:
   1. search_conversations({ 
        user_id: "${userId}",
        limit: 10,
        sort_by: "recent"
      })
      → Returns conversation list
      → AI should respond: "I found these recent conversations. 
         Which one contains information about [topic]?"
   ```

2. **No new tools needed** - uses existing `search_conversations`

3. **After user selects:**
   - User taps on conversation OR says "the first one"
   - App navigates to conversation
   - User can re-ask question, now with `currentConversationId` set
   - Normal `analyze_conversation` flow executes

#### Advantages:
- ✅ Simple implementation - no new tools
- ✅ Clear user control over which conversation
- ✅ Less chance of AI misidentifying conversation

#### Disadvantages:
- ❌ Extra step for user (breaks flow)
- ❌ User has to re-state their question
- ❌ Doesn't leverage RAG for conversation discovery

---

### Solution 3: Hybrid Approach (Best of Both)

**Approach:** Try implicit resolution first, fall back to explicit selection if ambiguous.

#### Implementation:

1. **Use `analyze_conversations_multi` from Solution 1**

2. **Enhanced clarification flow:**
   ```typescript
   // When multiple conversations found:
   clarification: {
     question: "I found information about 'party tonight' in multiple conversations:",
     clarification_type: "conversation_selection",
     options: [
       {
         id: "conv1",
         title: "Group: Weekend Plans",
         subtitle: "Last message: 2 hours ago - 'See you tonight!'",
         confidence: 0.9,
         metadata: { 
           conversationId: "conv1",
           snippets: ["coming to party", "7pm tonight"]
         }
       },
       {
         id: "conv2", 
         title: "Sarah Thompson",
         subtitle: "Last message: 5 hours ago - 'Maybe I can make it'",
         confidence: 0.6,
         metadata: { conversationId: "conv2" }
       }
     ],
     allow_all: true // Option to analyze all conversations
   }
   ```

3. **Handle "all" selection:**
   ```typescript
   // If user selects "All conversations"
   const allResults = await Promise.all(
     conversationGroups.map(group => 
       analyzeConversation(group.conversationId, query)
     )
   );
   
   // Merge and deduplicate results
   return {
     answer: mergeResults(allResults),
     sources: conversationGroups.map(g => g.conversationTitle)
   };
   ```

#### Advantages:
- ✅ Best of both worlds
- ✅ Seamless when unambiguous
- ✅ User control when needed
- ✅ Can aggregate across conversations

#### Disadvantages:
- More implementation complexity
- Need robust result merging logic

---

## Recommended Implementation Plan

### Phase 1: Foundation (Week 1)
**Goal:** Get basic cross-conversation search working

1. ✅ Create `analyze_conversations_multi` tool file
2. ✅ Implement RAG-based conversation discovery
3. ✅ Add basic clarification for multiple conversations
4. ✅ Update system prompt with Pattern 4
5. ✅ Register tool in `tools/index.ts`

**Files to Create/Modify:**
- `functions/src/tools/analyze-conversations-multi-tool.ts` (new)
- `functions/src/tools/index.ts` (add tool registration)
- `functions/src/enhanced-ai-processor.ts` (update system prompt)

**Testing:**
```typescript
// Test case 1: Unambiguous query
User: "Who is coming to the party tonight?"
Expected: Direct answer from most relevant conversation

// Test case 2: Ambiguous query  
User: "What time is the meeting?"
Expected: Clarification with 2-3 conversation options

// Test case 3: No relevant conversations
User: "Who won the game?"
Expected: "I couldn't find any conversations about that topic"
```

### Phase 2: Refinement (Week 2)
**Goal:** Improve accuracy and UX

1. ✅ Add time-based relevance scoring
2. ✅ Implement conversation grouping heuristics
3. ✅ Add "analyze all" option in clarifications
4. ✅ Tune RAG relevance thresholds
5. ✅ Add metadata snippets to clarification options

**Metrics to Track:**
- % of queries that get direct answer (target: >70%)
- % requiring clarification (target: <25%)
- % with no results (target: <5%)
- User satisfaction with answers (qualitative)

### Phase 3: Polish (Week 3)
**Goal:** Production-ready refinements

1. ✅ Add result caching for repeated queries
2. ✅ Implement progressive disclosure (show top 3, "see more")
3. ✅ Add confidence indicators to clarification options
4. ✅ Better error messages with suggestions
5. ✅ Performance optimization (parallel searches)

---

## Technical Architecture

### New Tool: `analyze-conversations-multi-tool.ts`

```typescript
/**
 * Analyze Multiple Conversations Tool
 * 
 * Searches across user's recent conversations to extract information
 * when user isn't in a specific conversation.
 * 
 * Use cases:
 * - User on ConversationList asks "Who confirmed?"
 * - User wants to aggregate info across conversations
 * - User doesn't remember which conversation has the info
 */

export class AnalyzeConversationsMultiTool extends BaseAITool {
  name = "analyze_conversations_multi";
  description = "Extract information from recent conversations when not in a specific conversation. Searches semantically across multiple conversations.";
  
  async execute(params, context): Promise<ToolResult> {
    // 1. RAG search across all conversations
    const relevantMessages = await searchUserConversations(
      params.query,
      params.current_user_id,
      100 // Cast wider net
    );
    
    // 2. Group by conversation with scoring
    const conversations = this.groupAndScoreConversations(
      relevantMessages,
      params.time_window_hours
    );
    
    // 3. Handle based on result count
    if (conversations.length === 0) {
      return this.noResultsResponse(params.query);
    }
    
    if (conversations.length === 1) {
      return this.analyzeSingleConversation(conversations[0], params.query);
    }
    
    // Multiple conversations - request clarification
    return this.requestConversationClarification(conversations, params.query);
  }
  
  private groupAndScoreConversations(messages: any[], timeWindowHours: number) {
    const cutoffTime = Date.now() - (timeWindowHours * 60 * 60 * 1000);
    
    // Group by conversation
    const groups = new Map<string, any>();
    
    for (const msg of messages) {
      const convId = msg.conversationId || msg.metadata?.conversationId;
      if (!convId) continue;
      
      const timestamp = msg.timestamp?.toMillis?.() || msg.timestamp || 0;
      if (timestamp < cutoffTime) continue; // Outside time window
      
      if (!groups.has(convId)) {
        groups.set(convId, {
          conversationId: convId,
          messages: [],
          lastActive: timestamp,
          relevanceScore: 0
        });
      }
      
      const group = groups.get(convId)!;
      group.messages.push(msg);
      group.relevanceScore += msg.score || 0.5; // RAG similarity score
      group.lastActive = Math.max(group.lastActive, timestamp);
    }
    
    // Sort by combined score (relevance + recency)
    return Array.from(groups.values())
      .sort((a, b) => {
        const scoreA = a.relevanceScore * 0.7 + (a.lastActive / Date.now()) * 0.3;
        const scoreB = b.relevanceScore * 0.7 + (b.lastActive / Date.now()) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 5); // Top 5 conversations
  }
  
  private async analyzeSingleConversation(
    conversation: any, 
    query: string
  ): Promise<ToolResult> {
    // Reuse analyze_conversation logic
    const analyzer = new AnalyzeConversationTool();
    return analyzer.execute({
      conversation_id: conversation.conversationId,
      query,
      // Pass pre-fetched messages to avoid re-fetching
      _prefetched_messages: conversation.messages
    }, this.context);
  }
  
  private requestConversationClarification(
    conversations: any[],
    query: string
  ): Promise<ToolResult> {
    return {
      success: true,
      next_action: "clarification_needed",
      clarification: {
        question: `I found information about "${query}" in multiple conversations. Which one?`,
        clarification_type: "conversation_selection",
        options: conversations.map(conv => ({
          id: conv.conversationId,
          title: conv.title || `Conversation ${conv.conversationId.slice(0, 8)}`,
          subtitle: this.formatTimestamp(conv.lastActive),
          confidence: Math.min(conv.relevanceScore, 1.0),
          metadata: {
            conversationId: conv.conversationId,
            messageCount: conv.messages.length,
            snippet: this.extractSnippet(conv.messages[0])
          }
        })),
        allow_multiple: false // For now, single selection
      },
      instruction_for_ai: "User needs to select which conversation to analyze",
      confidence: 0.8
    };
  }
}
```

---

## System Prompt Updates

### Current Prompt Gap

The current prompt has this pattern:

```typescript
## Pattern 3: Extract Information from Conversation
User asks: "Who is coming?", ...
Context: User is in conversation ${currentConvId}
Tools: analyze_conversation...

// BUT if user is NOT in conversation:
User asks information questions but is NOT in a conversation.
Action: Inform user they need to be in a specific conversation...
```

**This is too rigid!** We should enable cross-conversation search instead of forcing users to navigate manually.

### Proposed Prompt Addition

```typescript
## Pattern 4: Extract Information (No Conversation Context)
${!inConversation ? `
User asks: "Who is coming?", "What did John say?", "When is the meeting?"
Context: User is on chats list (currentConversationId is undefined)

Tools:
1. analyze_conversations_multi({
     query: "[user's exact question]",
     current_user_id: "${userId}",
     max_conversations: 5,
     time_window_hours: 48
   })
   
Result handling:
- If next_action = "complete" → Present answer directly
- If next_action = "clarification_needed" → Show conversation options
- If next_action = "error" → Suggest user open a conversation first

Examples:
- "Who confirmed for tonight?" → Search recent conversations for confirmation patterns
- "What time did we agree on?" → Find conversations with time mentions
- "Did anyone respond about the budget?" → Search for budget-related messages
` : ''}

# CRITICAL: Pattern Selection Logic
1. If currentConversationId exists → Use Pattern 3 (analyze_conversation)
2. If currentConversationId is undefined → Use Pattern 4 (analyze_conversations_multi)
3. Never tell user to "open a conversation first" - always try Pattern 4
```

---

## Error Handling & Edge Cases

### Edge Case 1: User has no recent conversations
```typescript
Result: {
  success: false,
  error: "No recent conversations found",
  instruction_for_ai: "Suggest: 'I don't see any recent conversations. Try asking about something more specific or start a conversation first.'"
}
```

### Edge Case 2: Query is too vague
```typescript
User: "What did they say?"
// No context about who "they" are or what topic

Result: {
  success: false,
  error: "Query too vague",
  instruction_for_ai: "Ask user to be more specific: 'Could you provide more context? For example, who are you asking about or what topic?'"
}
```

### Edge Case 3: Information spans multiple conversations
```typescript
User: "Who all is coming to the party?"
// Person A confirmed in group chat
// Person B confirmed in 1:1 chat
// Person C confirmed in different group

Result: {
  answer: "Based on your conversations:\n- Alice (from Weekend Plans group)\n- Bob (from your 1:1 chat)\n- Carol (from College Friends group)",
  sources: ["Weekend Plans", "Bob", "College Friends"],
  aggregated: true
}
```

### Edge Case 4: Time-sensitive queries
```typescript
User: "Who is coming tonight?"
// Should prioritize today's conversations over last week's party

Implementation:
- Add temporal keyword detection ("tonight", "tomorrow", "today")
- Boost relevance for conversations with recent activity
- Filter out conversations older than query time reference
```

---

## Success Metrics

### Quantitative Metrics

1. **Resolution Rate**
   - Target: >75% of queries get an answer without clarification
   - Measure: `successful_direct_answers / total_queries`

2. **Clarification Rate** 
   - Target: <20% of queries need clarification
   - Measure: `clarification_requests / total_queries`

3. **Failure Rate**
   - Target: <5% of queries fail completely
   - Measure: `error_responses / total_queries`

4. **Response Time**
   - Target: <3 seconds for direct answers
   - Target: <5 seconds when clarification needed
   - Measure: Tool execution time

5. **Relevance Accuracy**
   - Target: >90% of answers are from correct conversation
   - Measure: User feedback + manual review

### Qualitative Metrics

1. **User Satisfaction**
   - Post-query thumbs up/down feedback
   - Track "try again" rate (user rephrases after bad answer)

2. **Conversation Accuracy**
   - When clarification offered, does user select top suggestion?
   - Track position of selected option (1st, 2nd, 3rd, etc.)

3. **Query Patterns**
   - What types of queries are most common?
   - Which fail most often?
   - Inform future improvements

---

## Testing Strategy

### Unit Tests

```typescript
// Test 1: Single relevant conversation
describe("analyze_conversations_multi - single result", () => {
  it("should return direct answer when only one conversation relevant", async () => {
    const result = await tool.execute({
      query: "Who is coming to the party?",
      current_user_id: "user123",
      max_conversations: 5
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.next_action).toBe("complete");
    expect(result.data.answer).toContain("Alice");
  });
});

// Test 2: Multiple conversations
describe("analyze_conversations_multi - multiple results", () => {
  it("should request clarification with top 3 conversations", async () => {
    const result = await tool.execute({
      query: "What time is the meeting?",
      current_user_id: "user123"
    }, context);
    
    expect(result.success).toBe(true);
    expect(result.next_action).toBe("clarification_needed");
    expect(result.clarification.options).toHaveLength(3);
    expect(result.clarification.options[0].confidence).toBeGreaterThan(0.5);
  });
});

// Test 3: No results
describe("analyze_conversations_multi - no results", () => {
  it("should return helpful error when no conversations found", async () => {
    const result = await tool.execute({
      query: "Who won the Super Bowl?",
      current_user_id: "user123"
    }, context);
    
    expect(result.success).toBe(false);
    expect(result.next_action).toBe("error");
    expect(result.instruction_for_ai).toContain("no conversations");
  });
});
```

### Integration Tests

```typescript
// Test full flow: query → clarification → answer
describe("Full contextual query flow", () => {
  it("should handle query, clarification, and final answer", async () => {
    // Step 1: User asks question from chats list
    const step1 = await processEnhancedAICommand({
      command: "Who confirmed for the party?",
      appContext: {
        currentScreen: "chats",
        currentConversationId: undefined,
        currentUserId: "user123"
      }
    });
    
    expect(step1.requires_clarification).toBe(true);
    expect(step1.clarification_data.options.length).toBeGreaterThan(0);
    
    // Step 2: User selects a conversation
    const selectedOption = step1.clarification_data.options[0];
    const step2 = await processEnhancedAICommand({
      command: "Who confirmed for the party?", // Same query
      appContext: {
        currentScreen: "chats",
        currentUserId: "user123",
        clarification_response: {
          clarification_type: "conversation_selection",
          selected_option: selectedOption,
          original_clarification_data: step1.clarification_data
        }
      }
    });
    
    expect(step2.success).toBe(true);
    expect(step2.action).toBe("show_summary");
    expect(step2.result.answer).toBeTruthy();
  });
});
```

### Manual Test Cases

| Test Case | User Context | Query | Expected Behavior |
|-----------|--------------|-------|-------------------|
| TC1 | Chats list, 1 party conversation | "Who is coming tonight?" | Direct answer listing attendees |
| TC2 | Chats list, 3 conversations mention "meeting" | "What time is the meeting?" | Clarification with 3 options |
| TC3 | Chats list, no sports conversations | "Who won the game?" | Error: "No relevant conversations found" |
| TC4 | Chats list, party discussed across 2 groups | "Who confirmed?" | Aggregated answer from both groups |
| TC5 | Chats list, vague query | "What did they say?" | Request for more specific query |

---

## Migration Path

### Step 1: Deploy with Feature Flag
```typescript
// In enhanced-ai-processor.ts
const ENABLE_MULTI_CONVERSATION_ANALYSIS = 
  process.env.ENABLE_MULTI_CONV_ANALYSIS === "true" || false;

// In buildOptimizedSystemPrompt()
if (ENABLE_MULTI_CONVERSATION_ANALYSIS && !inConversation) {
  // Include Pattern 4
} else {
  // Use old behavior (tell user to open conversation)
}
```

### Step 2: Gradual Rollout
- Week 1: Enable for 10% of users
- Week 2: 25% of users (monitor metrics)
- Week 3: 50% of users  
- Week 4: 100% rollout if metrics good

### Step 3: Monitor & Iterate
- Track success/failure rates daily
- Collect user feedback
- Adjust RAG relevance thresholds
- Tune time window defaults
- Add new edge case handling

---

## Alternative Approaches Considered

### Approach A: Always navigate to conversation first
**Rejected:** Too many steps, poor UX

### Approach B: Show all messages matching query
**Rejected:** Too noisy, doesn't answer the question

### Approach C: Always require manual conversation selection  
**Rejected:** Doesn't leverage AI capabilities, feels dumb

### Approach D: Aggregate across all conversations always
**Rejected:** Too slow, high compute cost, may give wrong answers

**Selected Approach:** Hybrid with intelligent conversation discovery and selective clarification

---

## Future Enhancements

### Phase 4: Smart Aggregation (Post-MVP)
- "Show me all budget discussions this week" → Results from multiple conversations
- "Who mentioned the project deadline?" → List of people across conversations
- Structured data extraction (dates, people, decisions)

### Phase 5: Proactive Suggestions (Post-MVP)  
- "I noticed you asked about the party in 3 conversations. Would you like a summary?"
- Learn common query patterns per user
- Suggest clarifications before user asks

### Phase 6: Multi-Modal (Post-MVP)
- Search image captions and media
- Audio message transcription search
- Link and attachment content search

---

## Dependencies

### Required:
- ✅ RAG pipeline (already implemented)
- ✅ Firestore conversation queries
- ✅ OpenAI API integration
- ✅ Clarification flow (already implemented)

### Optional (for better UX):
- Conversation title/name resolution
- Participant name caching
- Query intent classification
- Temporal expression parsing ("tonight", "tomorrow")

---

## Rollback Plan

If issues arise post-deployment:

1. **Immediate:**
   - Set `ENABLE_MULTI_CONV_ANALYSIS=false` environment variable
   - Redeploy functions
   - System reverts to old behavior (tell user to open conversation)

2. **Data:**
   - No database migrations needed
   - No data cleanup required
   - Safe rollback

3. **Monitoring:**
   - Watch error rates in Cloud Functions logs
   - Track user feedback scores
   - Check RAG query performance

---

## Summary

**Recommended Approach:** Solution 3 (Hybrid)

**Key Benefits:**
- ✅ Seamless UX for unambiguous queries
- ✅ Intelligent clarification when needed  
- ✅ Leverages existing RAG infrastructure
- ✅ Minimal breaking changes
- ✅ Feature-flagged rollout possible

**Implementation Effort:**
- New tool file: ~300 lines
- System prompt updates: ~50 lines  
- Testing: ~200 lines
- Total: ~550 lines of code

**Timeline:**
- Phase 1 (Foundation): 1 week
- Phase 2 (Refinement): 1 week
- Phase 3 (Polish): 1 week
- **Total: 3 weeks to production-ready**

**Next Steps:**
1. Review and approve this proposal
2. Create `analyze-conversations-multi-tool.ts` 
3. Update system prompts with Pattern 4
4. Write unit + integration tests
5. Deploy behind feature flag
6. Monitor metrics and iterate

---

## Questions for Discussion

1. **Time Window Default:** 48 hours reasonable? Or should we make it adaptive based on user activity?

2. **Clarification Limit:** Show top 3 conversations or top 5? Progressive disclosure?

3. **Confidence Threshold:** What minimum confidence score should trigger "no results found" vs "here are some options"?

4. **Aggregation:** Should Phase 1 include cross-conversation aggregation or defer to Phase 4?

5. **Cost:** RAG searches are relatively expensive. Should we cache recent queries?

---

**Document Owner:** Noah Rosenfield  
**Last Updated:** October 26, 2025  
**Status:** Awaiting approval
