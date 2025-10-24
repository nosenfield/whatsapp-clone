# AI Development Guide

> **Purpose**: Best practices and patterns for AI integration in the WhatsApp Clone  
> **Audience**: AI development agents and human developers  
> **Last Updated**: October 24, 2025

---

## 🚨 Critical Anti-Patterns

### ❌ NEVER Include Tool Definitions in Prompts

**What NOT to do:**
```typescript
const systemPrompt = `You have access to these tools:
- lookup_contacts: Search for contacts/users with flexible matching
- send_message: Send a message to a conversation
- get_conversations: Get user's conversations
...`;
```

**Why this is wrong:**
- **Redundant**: Tools are already passed via the `tools` parameter
- **Token waste**: Consumes unnecessary tokens
- **Maintenance burden**: Must keep prompt in sync with tool definitions
- **Confusion**: AI might get conflicting information

**✅ Correct approach:**
```typescript
const systemPrompt = `You are an AI assistant for a WhatsApp-like messaging app.

IMPORTANT: When sending messages to people by name, you MUST first use lookup_contacts to find their user ID, then use send_message with the recipient_id.

Examples of proper tool chaining:
- "Tell John hello" → FIRST: lookup_contacts(query="John") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")
- "Say hello to Sarah" → FIRST: lookup_contacts(query="Sarah") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")

Always use the appropriate tools in the correct sequence to accomplish the user's request.`;
```

---

## ✅ Best Practices

### 1. Focus Prompts on Strategy, Not Definitions

**Good prompts explain:**
- **HOW** to use tools (strategy and sequencing)
- **WHEN** to use each tool
- **WHAT** the expected flow should be
- **EXAMPLES** of proper tool chaining

**Bad prompts include:**
- Tool names and descriptions
- Parameter lists
- Schema definitions
- Redundant information

### 2. Use Clear Tool Chaining Examples

**Example for messaging commands:**
```typescript
const examples = `
Examples of proper tool chaining:
- "Tell John hello" → FIRST: lookup_contacts(query="John") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")
- "Say hello to Sarah" → FIRST: lookup_contacts(query="Sarah") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")
- "Find my conversation with Mike" → lookup_contacts(query="Mike") then resolve_conversation
- "Show me my recent conversations" → get_conversations
`;
```

### 3. Implement Graceful Fallbacks

**Always provide fallback mechanisms:**
```typescript
// Enhanced AI command with fallback
try {
  const result = await processEnhancedAICommand(request);
  if (!result.success && result.error?.includes('AI service not configured')) {
    return await fallbackToSimpleParser(command, appContext);
  }
  return result;
} catch (error) {
  return await fallbackToSimpleParser(command, appContext);
}
```

### 4. Test Tool Schemas Thoroughly

**Ensure array parameters have proper `items` definitions:**
```typescript
// ❌ Wrong - missing items definition
{
  name: "search_fields",
  type: "array",
  description: "Fields to search in",
}

// ✅ Correct - includes items definition
{
  name: "search_fields",
  type: "array",
  description: "Fields to search in",
  items: {
    type: "string",
    enum: ["displayName", "email", "phoneNumber"]
  }
}
```

### 5. Log Tool Execution for Debugging

**Use LangSmith or similar for debugging:**
```typescript
const runTree = new RunTree({
  name: "AI Command Processing",
  run_type: "chain",
  inputs: { command, userId, screen },
  project_name: "whatsapp-clone-ai",
  tags: ["ai-command", "tool-calling"],
});
```

---

## 🔧 Tool Schema Patterns

### Array Parameters
```typescript
interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: any;
  items?: {
    type: "string" | "number" | "boolean";
    enum?: string[];
  };
}
```

### Schema Generation
```typescript
const toolDefinitions = availableTools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: tool.parameters.reduce((props, param) => {
        const paramDef: any = {
          type: param.type,
          description: param.description,
        };
        
        // Add items property for array types
        if (param.type === "array" && param.items) {
          paramDef.items = {
            type: param.items.type,
          };
          if (param.items.enum) {
            paramDef.items.enum = param.items.enum;
          }
        }
        
        props[param.name] = paramDef;
        return props;
      }, {} as any),
      required: tool.parameters.filter((p) => p.required).map((p) => p.name),
    },
  },
}));
```

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid schema for function: array schema missing items"
**Cause**: Array parameters missing `items` definition  
**Solution**: Add `items` property to array parameters

### Issue: AI calls wrong tool or skips tool chaining
**Cause**: Unclear prompt or missing examples  
**Solution**: Add clear examples showing proper tool sequencing

### Issue: AI service not configured error
**Cause**: Missing or invalid API keys  
**Solution**: Implement graceful fallback to simpler parser

### Issue: Tool execution fails with "No conversation ID provided"
**Cause**: AI not providing required parameters  
**Solution**: Improve prompt examples and parameter requirements

---

## 📊 Performance Considerations

### Token Usage
- **Keep prompts concise**: Every token costs money
- **Avoid redundancy**: Don't repeat information already in tool definitions
- **Use examples efficiently**: Show patterns, not exhaustive lists

### Tool Chaining
- **Minimize tool calls**: Use the minimum number of tools needed
- **Parallel execution**: When possible, run independent tools in parallel
- **Error handling**: Always handle tool failures gracefully

### Caching
- **Cache tool results**: Store frequently accessed data
- **Use conversation context**: Leverage existing conversation data
- **Optimize lookups**: Use efficient search patterns

---

## 🧪 Testing AI Features

### Unit Testing
```typescript
// Test tool schema generation
test('tool schema includes array items', () => {
  const tool = new LookupContactsTool();
  const schema = generateToolSchema(tool);
  expect(schema.function.parameters.properties.search_fields.items).toBeDefined();
});
```

### Integration Testing
```typescript
// Test tool chaining
test('tell command chains tools correctly', async () => {
  const result = await processAICommand('Tell John hello', context);
  expect(result.toolChain).toHaveLength(2);
  expect(result.toolChain[0].tool).toBe('lookup_contacts');
  expect(result.toolChain[1].tool).toBe('send_message');
});
```

### Manual Testing
1. **Test various command formats**: "Tell John hello", "Say hello to John", etc.
2. **Test error scenarios**: Invalid names, missing users, API failures
3. **Test tool chaining**: Verify proper sequence of tool calls
4. **Test fallbacks**: Ensure fallback works when AI service fails

---

## 📝 Code Review Checklist

### AI Integration Code Review
- [ ] **No tool definitions in prompts**: Verify prompts focus on strategy only
- [ ] **Proper tool schemas**: Array parameters have `items` definitions
- [ ] **Graceful fallbacks**: Error handling and fallback mechanisms in place
- [ ] **Clear examples**: Prompts include proper tool chaining examples
- [ ] **Token efficiency**: Prompts are concise and non-redundant
- [ ] **Error handling**: All AI operations have proper error handling
- [ ] **Logging**: Tool execution is logged for debugging
- [ ] **Testing**: Unit and integration tests for AI features

---

## 🎯 Success Metrics

### AI Command Success Rate
- **Target**: >95% successful command execution
- **Measurement**: Commands that complete without errors
- **Monitoring**: LangSmith traces and error logs

### Tool Chaining Accuracy
- **Target**: >90% correct tool sequence
- **Measurement**: Commands that use tools in proper order
- **Monitoring**: Tool chain analysis in LangSmith

### Response Time
- **Target**: <2s for simple commands, <5s for complex chains
- **Measurement**: End-to-end command execution time
- **Monitoring**: LangSmith latency metrics

---

## 🔄 Continuous Improvement

### Monitoring
1. **Track command success rates**: Monitor failed commands
2. **Analyze tool usage patterns**: Identify common tool chains
3. **Monitor token usage**: Track costs and optimize prompts
4. **User feedback**: Collect feedback on AI command accuracy

### Iteration
1. **Refine prompts**: Improve based on failure patterns
2. **Add new tools**: Extend capabilities based on user needs
3. **Optimize schemas**: Improve tool parameter definitions
4. **Enhance fallbacks**: Improve error handling and recovery

---

**Remember**: The goal is to create AI features that are reliable, efficient, and user-friendly. Always prioritize clarity, error handling, and graceful degradation over complexity.

---

**Last Updated**: October 24, 2025  
**Version**: 1.0  
**Status**: Active Development Guide
