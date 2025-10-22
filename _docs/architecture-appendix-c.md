# AI Command Architecture

**Parent Document:** [architecture.md](./architecture.md)  
**Task Reference:** [task-list.md](./task-list.md) Phase 7  
**Last Updated:** October 22, 2025  
**Status:** Implementation Ready

---

## Overview

This document defines the architecture for AI-powered contextual commands in the messaging app. The system supports natural language commands that can be executed anywhere in the app or within specific conversation contexts.

### Core Principles

1. **Context-Aware**: Commands understand current app state (conversation, user location)
2. **Tool-Based**: Each command maps to specific app functions via tool calling
3. **Fallback-Safe**: Graceful degradation when AI services are unavailable
4. **Privacy-First**: All AI processing respects user data boundaries
5. **Cost-Conscious**: Optimize AI usage for sustainability

---

## Command Categories

### Global Commands (Anywhere in App)

| Command Pattern | Function | Tool Required |
|----------------|----------|--------------|
| "Start a new conversation with [Contact]" | Create new conversation | `createConversation` |
| "Open my conversation with [Contact]" | Find or create conversation | `findOrCreateConversation` |
| "Summarize my recent conversation with [Contact]" | Summarize conversation | `summarizeConversation` |
| "Tell [Contact] I'm on my way" | Send message | `sendMessageToContact` |
| "Summarize the most recent message" | Summarize latest received | `summarizeLatestReceivedMessage` |
| "Summarize my most recent message" | Summarize latest sent | `summarizeLatestSentMessage` |

### Contextual Commands (In Conversation Screen)

| Command Pattern | Function | Tool Required |
|----------------|----------|--------------|
| "Summarize the most recent message" | Summarize latest in current conversation | `summarizeLatestInConversation` |
| "Summarize my most recent message" | Summarize latest sent in current conversation | `summarizeLatestSentInConversation` |
| "Summarize this conversation" | Summarize entire current conversation | `summarizeCurrentConversation` |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     iOS App (React Native)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              AI Command Interface                       │ │
│  │  • Voice input (future)                                 │ │
│  │  • Text input                                           │ │
│  │  • Context detection                                    │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │           AI Command Processor                           │ │
│  │  • Command parsing                                       │ │
│  │  • Context injection                                     │ │
│  │  • Tool selection                                        │ │
│  │  • Response handling                                     │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │              Tool Registry                               │ │
│  │  • Conversation tools                                    │ │
│  │  • Message tools                                         │ │
│  │  • Contact tools                                         │ │
│  │  • Summarization tools                                   │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │ HTTP/WebSocket
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                 Firebase Backend                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Cloud Functions (AI Processing)                │ │
│  │                                                           │ │
│  │  AI COMMAND PROCESSING:                                  │ │
│  │  • processAICommand                                      │ │
│  │  • executeTool                                           │ │
│  │  • generateSummary                                       │ │
│  │  • resolveContact                                        │ │
│  │                                                           │ │
│  │  TOOL IMPLEMENTATIONS:                                   │ │
│  │  • createConversation                                    │ │
│  │  • findOrCreateConversation                              │ │
│  │  • sendMessageToContact                                  │ │
│  │  • summarizeConversation                                 │ │
│  │  • summarizeMessage                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Firestore (Data Access)                          │ │
│  │  • /users/{userId}                                        │ │
│  │  • /conversations/{conversationId}                        │ │
│  │  • /conversations/{conversationId}/messages/{messageId}   │ │
│  │  • /aiCommands/{commandId} (audit log)                    │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ API Calls
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│               External Services                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  OpenAI API (GPT-4)                                        │ │
│  │  • Command parsing and intent recognition                 │ │
│  │  • Tool calling                                          │ │
│  │  • Message summarization                                 │ │
│  │  • Response generation                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tool Definitions

### Conversation Management Tools

#### `createConversation`
**Purpose**: Create a new conversation with a specified contact

**Parameters**:
```typescript
interface CreateConversationParams {
  contactName: string;        // Display name of contact
  currentUserId: string;      // ID of user making request
  appContext?: {              // Current app state
    currentConversationId?: string;
    currentScreen: 'chats' | 'conversation' | 'profile';
  };
}
```

**Returns**:
```typescript
interface CreateConversationResult {
  success: boolean;
  conversationId?: string;
  error?: string;
  action: 'navigate_to_conversation' | 'show_error';
}
```

**Implementation**:
1. Search for contact by display name
2. Check if conversation already exists
3. Create new conversation if none found
4. Return conversation ID for navigation

#### `findOrCreateConversation`
**Purpose**: Find existing conversation or create new one with contact

**Parameters**:
```typescript
interface FindOrCreateConversationParams {
  contactName: string;
  currentUserId: string;
  appContext?: AppContext;
}
```

**Returns**:
```typescript
interface FindOrCreateConversationResult {
  success: boolean;
  conversationId: string;
  wasCreated: boolean;
  error?: string;
  action: 'navigate_to_conversation';
}
```

#### `sendMessageToContact`
**Purpose**: Send a message to a contact (create conversation if needed)

**Parameters**:
```typescript
interface SendMessageToContactParams {
  contactName: string;
  messageText: string;
  currentUserId: string;
  appContext?: AppContext;
}
```

**Returns**:
```typescript
interface SendMessageToContactResult {
  success: boolean;
  conversationId: string;
  messageId: string;
  error?: string;
  action: 'navigate_to_conversation' | 'show_error';
}
```

### Message Summarization Tools

#### `summarizeConversation`
**Purpose**: Summarize conversation with time filtering

**Parameters**:
```typescript
interface SummarizeConversationParams {
  conversationId: string;
  timeFilter?: '1day' | '1week' | '1month' | 'all';
  currentUserId: string;
  appContext?: AppContext;
}
```

**Returns**:
```typescript
interface SummarizeConversationResult {
  success: boolean;
  summary?: string;
  messageCount: number;
  timeRange: string;
  error?: string;
  action: 'show_summary' | 'show_error';
}
```

#### `summarizeMessage`
**Purpose**: Summarize a specific message

**Parameters**:
```typescript
interface SummarizeMessageParams {
  messageId: string;
  currentUserId: string;
  appContext?: AppContext;
}
```

**Returns**:
```typescript
interface SummarizeMessageResult {
  success: boolean;
  summary?: string;
  originalMessage: string;
  error?: string;
  action: 'show_summary' | 'show_error';
}
```

#### `summarizeLatestReceivedMessage`
**Purpose**: Summarize the most recent message received by user

**Parameters**:
```typescript
interface SummarizeLatestReceivedParams {
  currentUserId: string;
  appContext?: AppContext;
}
```

#### `summarizeLatestSentMessage`
**Purpose**: Summarize the most recent message sent by user

**Parameters**:
```typescript
interface SummarizeLatestSentParams {
  currentUserId: string;
  appContext?: AppContext;
}
```

---

## AI Command Processing Flow

### 1. Command Input
```
User: "Tell John I'm on my way"
     ↓
AI Command Interface captures input
     ↓
Command sent to Cloud Function with context
```

### 2. Command Processing
```typescript
// Cloud Function: processAICommand
export const processAICommand = functions.https.onCall(async (data, context) => {
  const { command, appContext, currentUserId } = data;
  
  // 1. Parse command with OpenAI
  const parsedCommand = await parseCommandWithOpenAI(command, appContext);
  
  // 2. Select appropriate tool
  const tool = selectTool(parsedCommand.intent);
  
  // 3. Execute tool with parameters
  const result = await executeTool(tool, parsedCommand.parameters);
  
  // 4. Generate response
  const response = await generateResponse(result, parsedCommand);
  
  return {
    success: true,
    result,
    response,
    action: result.action
  };
});
```

### 3. Tool Execution
```typescript
// Example: sendMessageToContact tool
async function executeSendMessageToContact(params: SendMessageToContactParams) {
  // 1. Find contact by name
  const contact = await findContactByName(params.contactName, params.currentUserId);
  if (!contact) {
    return { success: false, error: 'Contact not found' };
  }
  
  // 2. Find or create conversation
  let conversation = await findConversation(params.currentUserId, contact.id);
  if (!conversation) {
    conversation = await createConversation([params.currentUserId, contact.id]);
  }
  
  // 3. Send message
  const message = await sendMessage({
    conversationId: conversation.id,
    senderId: params.currentUserId,
    content: { text: params.messageText, type: 'text' },
    timestamp: new Date()
  });
  
  return {
    success: true,
    conversationId: conversation.id,
    messageId: message.id,
    action: 'navigate_to_conversation'
  };
}
```

### 4. Response Handling
```typescript
// Client-side response handling
const handleAICommandResponse = (response: AICommandResponse) => {
  switch (response.action) {
    case 'navigate_to_conversation':
      router.push(`/conversation/${response.result.conversationId}`);
      break;
    case 'show_summary':
      showSummaryModal(response.result.summary);
      break;
    case 'show_error':
      showErrorAlert(response.result.error);
      break;
  }
};
```

---

## Data Models

### AI Command Audit Log
```typescript
interface AICommand {
  id: string;
  userId: string;
  command: string;
  parsedIntent: {
    action: string;
    parameters: Record<string, any>;
    confidence: number;
  };
  toolUsed: string;
  result: {
    success: boolean;
    data?: any;
    error?: string;
  };
  timestamp: Date;
  appContext: AppContext;
}
```

### App Context
```typescript
interface AppContext {
  currentScreen: 'chats' | 'conversation' | 'profile' | 'settings';
  currentConversationId?: string;
  currentUserId: string;
  recentConversations: string[];
  deviceInfo: {
    platform: 'ios' | 'android';
    version: string;
  };
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. **AI Command Interface**
   - Text input component
   - Command history
   - Loading states

2. **Cloud Function Setup**
   - `processAICommand` function
   - Tool registry
   - Error handling

3. **Basic Tools**
   - `createConversation`
   - `findOrCreateConversation`
   - `sendMessageToContact`

### Phase 2: Summarization Tools (Week 2)
1. **Message Summarization**
   - `summarizeMessage`
   - `summarizeConversation`
   - Time filtering support

2. **Latest Message Tools**
   - `summarizeLatestReceivedMessage`
   - `summarizeLatestSentMessage`

### Phase 3: UI Integration (Week 3)
1. **Command Input UI**
   - Floating action button
   - Command suggestions
   - Voice input (optional)

2. **Response Handling**
   - Summary modals
   - Navigation actions
   - Error states

### Phase 4: Testing & Polish (Week 4)
1. **Command Testing**
   - All command patterns
   - Edge cases
   - Error scenarios

2. **Performance Optimization**
   - Caching
   - Rate limiting
   - Cost optimization

---

## Cost Analysis

### AI Usage Estimates (100 users, 1 month)

| Command Type | Usage/User/Month | Total Calls | Cost |
|--------------|------------------|-------------|------|
| Conversation Management | 20 | 2,000 | $6.00 |
| Message Summarization | 30 | 3,000 | $9.00 |
| Latest Message Summary | 15 | 1,500 | $4.50 |
| **Total** | | **6,500** | **$19.50** |

**Per User:** $0.20/month

### Cost Optimization Strategies

1. **Command Caching**: Cache recent command results
2. **Smart Parsing**: Pre-filter commands to reduce AI calls
3. **Batch Processing**: Group similar commands
4. **Rate Limiting**: Limit commands per user per day
5. **Context Reuse**: Reuse parsed context for related commands

---

## Security & Privacy

### Data Privacy
- Commands processed ephemerally (not stored)
- Only necessary data sent to AI service
- User data never leaves Firebase/AI services
- Audit log for debugging (anonymized)

### Security Rules
```javascript
// Firestore security rules for AI commands
match /aiCommands/{commandId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

### Rate Limiting
- Max 50 AI commands per user per day
- Exponential backoff for failed commands
- User notification at 80% usage limit

---

## Testing Strategy

### Unit Tests
- Tool parameter validation
- Command parsing accuracy
- Error handling scenarios

### Integration Tests
- End-to-end command execution
- Context injection accuracy
- Response handling

### User Acceptance Tests
- Natural language command recognition
- Tool execution accuracy
- User experience flow

---

## Future Enhancements

### Phase 2 Features
- Voice input support
- Command suggestions
- Multi-language support
- Advanced summarization options

### Phase 3 Features
- Custom command creation
- Command shortcuts
- Integration with external services
- Advanced AI features (translation, etc.)

---

**Document Status:** Implementation Ready  
**Last Updated:** October 22, 2025  
**Version:** 1.0
