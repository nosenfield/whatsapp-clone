# Phase 2: Busy Parent/Caregiver - Architecture Appendix

**Persona:** Busy Parent/Caregiver  
**Parent Document:** [architecture.md](./architecture.md)  
**Task Reference:** [phase2-parent-caregiver-tasks.md](./phase2-parent-caregiver-tasks.md)  
**Last Updated:** October 22, 2025

---

## Overview

This document extends the core architecture to support AI-powered features tailored for **Busy Parents/Caregivers** managing complex schedules and family coordination.

### Architectural Principles

1. **AI-Augmented, Not AI-Dependent**: Core messaging works without AI; features gracefully degrade
2. **Proactive, Not Reactive**: Anticipate needs before user asks
3. **Privacy-First**: User data never shared; all AI processing respects privacy
4. **Cost-Conscious**: Optimize AI usage to maintain sustainability
5. **Progressive Enhancement**: Features layer onto existing messaging foundation

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Models](#data-models)
3. [AI Processing Pipeline](#ai-processing-pipeline)
4. [Feature Architecture](#feature-architecture)
5. [Integration Points](#integration-points)
6. [Performance & Scalability](#performance--scalability)
7. [Security & Privacy](#security--privacy)
8. [Cost Management](#cost-management)

---

## System Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     iOS App (React Native)                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           Messaging UI Layer                             │ │
│  │  • Conversation Screen                                   │ │
│  │  • Message Bubbles with AI enhancements                  │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │      AI Feature UI Layer (NEW)                           │ │
│  │  • Calendar View                                         │ │
│  │  • Decisions Tab                                         │ │
│  │  • Deadlines Screen                                      │ │
│  │  • RSVP Widgets                                          │ │
│  │  • Conflict Alerts                                       │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
│  ┌────────────────▼─────────────────────────────────────────┐ │
│  │      State Management                                    │ │
│  │  • React Query (AI data fetching)                        │ │
│  │  • Zustand (AI feature toggles)                          │ │
│  └────────────────┬─────────────────────────────────────────┘ │
│                   │                                             │
└───────────────────┼─────────────────────────────────────────────┘
                    │
                    │ Firebase SDK
                    │
┌───────────────────▼─────────────────────────────────────────────┐
│                 Firebase Backend                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Firestore (Persistent Data)                     │ │
│  │                                                           │ │
│  │  EXISTING COLLECTIONS:                                   │ │
│  │  • /users/{userId}                                       │ │
│  │  • /conversations/{conversationId}                       │ │
│  │    • /messages/{messageId}                               │ │
│  │                                                           │ │
│  │  NEW COLLECTIONS (AI Features):                          │ │
│  │  • /extractedEvents/{eventId}                            │ │
│  │    - Calendar events extracted from messages             │ │
│  │  • /decisions/{decisionId}                               │ │
│  │    - Decision summaries from conversations               │ │
│  │  • /deadlines/{deadlineId}                               │ │
│  │    - Deadlines and reminders                             │ │
│  │  • /rsvpTrackers/{trackerId}                             │ │
│  │    - RSVP tracking for events                            │ │
│  │  • /schedulingConflicts/{conflictId}                     │ │
│  │    - Detected scheduling conflicts                       │ │
│  │  • /scheduledReminders/{reminderId}                      │ │
│  │    - Pending reminder notifications                      │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │     Cloud Functions (AI Processing Layer) (NEW)          │ │
│  │                                                           │ │
│  │  MESSAGE TRIGGERS:                                       │ │
│  │  • extractCalendarEvents                                 │ │
│  │    - Detects dates/times in messages                     │ │
│  │    - Calls Claude API for structured extraction          │ │
│  │    - Saves to /extractedEvents                           │ │
│  │                                                           │ │
│  │  • analyzePriority                                       │ │
│  │    - Detects urgent/important messages                   │ │
│  │    - Updates message metadata                            │ │
│  │    - Triggers priority notification if urgent            │ │
│  │                                                           │ │
│  │  • trackRSVPs                                            │ │
│  │    - Detects invitation messages                         │ │
│  │    - Creates RSVP tracker                                │ │
│  │    - Monitors responses from participants                │ │
│  │                                                           │ │
│  │  • extractDeadlines                                      │ │
│  │    - Detects due dates and tasks                         │ │
│  │    - Schedules reminder notifications                    │ │
│  │                                                           │ │
│  │  EVENT TRIGGERS:                                         │ │
│  │  • detectConflicts                                       │ │
│  │    - Runs when new event created                         │ │
│  │    - Checks for overlapping events                       │ │
│  │    - Generates resolution suggestions with AI            │ │
│  │                                                           │ │
│  │  SCHEDULED FUNCTIONS:                                    │ │
│  │  • summarizeDecisions (every 6 hours)                    │ │
│  │    - Scans conversations for decision patterns           │ │
│  │    - Generates summaries with Claude                     │ │
│  │    - Stores in /decisions                                │ │
│  │                                                           │ │
│  │  • sendScheduledReminders (every 15 minutes)             │ │
│  │    - Checks for due reminders                            │ │
│  │    - Sends push notifications                            │ │
│  │                                                           │ │
│  │  • remindPendingRSVPs (daily at 9am)                     │ │
│  │    - Finds events with pending RSVPs                     │ │
│  │    - Sends reminder notifications                        │ │
│  └──────────────────┬───────────────────────────────────────┘ │
│                     │                                           │
│                     │ Anthropic API                             │
│                     │                                           │
│  ┌──────────────────▼───────────────────────────────────────┐ │
│  │         AI Service Integration                           │ │
│  │  • Claude Sonnet 4.5 (primary model)                     │ │
│  │  • Structured output for consistent parsing              │ │
│  │  • Token usage tracking                                  │ │
│  │  • Error handling & fallback                             │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
User sends message: "Soccer practice tomorrow at 4pm"
       │
       ├──[1]──► Standard message flow (existing)
       │          • Saved to Firestore
       │          • SQLite cache
       │          • Real-time sync
       │
       ├──[2]──► extractCalendarEvents (Cloud Function triggers)
       │          │
       │          ├─► Pre-filter: hasTemporalKeywords(message)
       │          │    └─► Found: "tomorrow", "at", "4pm" ✓
       │          │
       │          ├─► Call Claude API with extraction prompt
       │          │    └─► Returns: { title: "Soccer practice",
       │          │                    date: "2025-10-23",
       │          │                    time: "16:00" }
       │          │
       │          ├─► Save to /extractedEvents
       │          │
       │          └─► Trigger detectConflicts
       │                   │
       │                   └─► Check for overlapping events
       │                        └─► If conflict: Generate solutions with AI
       │
       └──[3]──► UI updates
                  │
                  ├─► Message shows temporal highlighting
                  ├─► Calendar event card appears below message
                  └─► If conflict: Alert modal with solutions
```

---

## Data Models

### New Firestore Collections

#### Calendar Events Collection

```typescript
// /extractedEvents/{eventId}
interface CalendarEvent {
  id: string;
  conversationId: string;
  messageId: string;              // Message that triggered extraction
  
  // Event details
  title: string;
  date: Timestamp;                // ISO 8601 date
  time?: string;                  // HH:MM format (24-hour)
  endTime?: string;               // If specified
  location?: string;              // Physical or virtual location
  description?: string;           // Additional context
  
  // Participants
  participants: string[];         // User IDs involved
  hostUserId?: string;            // Who created/proposed the event
  
  // Status tracking
  status: 'proposed' | 'confirmed' | 'cancelled' | 'completed';
  proposedBy?: string;            // User ID who proposed
  confirmedBy?: string[];         // User IDs who confirmed
  
  // AI metadata
  extractedBy: 'ai' | 'user';     // How event was created
  confidence?: number;            // AI confidence score (0-1)
  extractionVersion?: string;     // AI model version used
  
  // Relationships
  relatedDecisionId?: string;     // Link to decision if applicable
  rsvpTrackerId?: string;         // Link to RSVP tracker if applicable
  conflictIds?: string[];         // Any detected conflicts
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Device calendar sync
  deviceCalendarId?: string;      // If exported to device calendar
  syncedToDeviceAt?: Timestamp;
}
```

#### Decisions Collection

```typescript
// /decisions/{decisionId}
interface Decision {
  id: string;
  conversationId: string;
  
  // Decision content
  summary: string;                // One-sentence summary
  outcome: string;                // What was decided
  context?: string;               // Additional context
  
  // Participants
  decidedBy: string[];            // User IDs who participated
  primaryDecisionMaker?: string;  // Main person who decided
  
  // Related data
  messageIds: string[];           // Messages that formed the decision
  relatedEventIds?: string[];     // Calendar events related to decision
  actionItems?: Array<{
    task: string;
    assignedTo?: string;
    dueDate?: Timestamp;
    completed: boolean;
  }>;
  
  // AI metadata
  confidence: number;             // AI confidence (0-1)
  detectedAt: Timestamp;
  aiModel: string;
  
  // Status
  status: 'active' | 'completed' | 'superseded';
  completedAt?: Timestamp;
  supersededBy?: string;          // ID of decision that replaced this
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Deadlines Collection

```typescript
// /deadlines/{deadlineId}
interface Deadline {
  id: string;
  conversationId: string;
  messageId: string;
  
  // Deadline details
  task: string;
  description?: string;
  deadline: Timestamp;            // Due date/time
  hasSpecificTime: boolean;       // Whether time is specified or just date
  
  // Assignment
  assignedTo?: string;            // User ID responsible
  assignedBy?: string;            // User ID who assigned
  
  // Priority
  priority: 'urgent' | 'high' | 'normal';
  priorityReason?: string;
  
  // Relationships
  relatedEventId?: string;        // Link to calendar event
  relatedDecisionId?: string;     // Link to decision
  
  // Status
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  completedAt?: Timestamp;
  completedBy?: string;
  
  // Reminders
  remindersSent: Timestamp[];     // Track sent reminders
  nextReminderAt?: Timestamp;     // Next scheduled reminder
  remindersSnoozedUntil?: Timestamp;
  
  // AI metadata
  extractedBy: 'ai' | 'user';
  confidence?: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### RSVP Trackers Collection

```typescript
// /rsvpTrackers/{trackerId}
interface RSVPTracker {
  id: string;
  conversationId: string;
  eventId: string;                // Link to calendar event
  messageId: string;              // Invitation message
  
  // Event details (denormalized for quick access)
  eventTitle: string;
  eventDate: Timestamp;
  eventTime?: string;
  
  // Host and invitees
  hostUserId: string;
  invitees: string[];             // All conversation participants
  
  // Responses
  responses: {
    [userId: string]: {
      status: 'yes' | 'no' | 'maybe' | 'pending';
      respondedAt?: Timestamp;
      responseMessageId?: string; // Message where they responded
      notes?: string;             // Any additional notes
    };
  };
  
  // Reminder tracking
  remindersSent: {
    [userId: string]: Timestamp[];
  };
  lastReminderSentAt?: Timestamp;
  
  // Summary stats
  summary: {
    yes: number;
    no: number;
    maybe: number;
    pending: number;
  };
  
  // Status
  status: 'active' | 'closed' | 'cancelled';
  closedAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Scheduling Conflicts Collection

```typescript
// /schedulingConflicts/{conflictId}
interface SchedulingConflict {
  id: string;
  conversationId: string;
  
  // Conflicting events
  newEventId: string;             // Newly created event
  conflictingEventIds: string[];  // Existing events that overlap
  
  // Conflict details
  conflictType: 'time_overlap' | 'same_day' | 'travel_impossible';
  severity: 'major' | 'minor';    // Major = direct time overlap, Minor = tight scheduling
  
  // AI-generated solutions
  suggestedSolutions: Array<{
    id: string;
    action: string;               // Description of solution
    reasoning: string;            // Why this solution works
    difficulty: 'easy' | 'moderate' | 'hard';
    automated: boolean;           // Can be auto-executed
    actions: Array<{
      type: 'reschedule' | 'cancel' | 'delegate' | 'notify';
      eventId: string;
      newTime?: Timestamp;
      delegateTo?: string;
    }>;
  }>;
  
  // Resolution
  status: 'unresolved' | 'resolved' | 'ignored';
  selectedSolution?: string;      // ID of chosen solution
  resolvedAt?: Timestamp;
  resolvedBy?: string;            // User ID who resolved
  
  // Notifications
  participantsNotified: string[];
  notifiedAt: Timestamp;
  
  // Timestamps
  detectedAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Scheduled Reminders Collection

```typescript
// /scheduledReminders/{reminderId}
interface ScheduledReminder {
  id: string;
  
  // What to remind about
  type: 'deadline' | 'event' | 'rsvp';
  referenceId: string;            // ID of deadline/event/rsvp
  conversationId: string;
  
  // Who to remind
  userId: string;
  
  // Reminder details
  title: string;
  body: string;
  reminderTime: Timestamp;        // When to send reminder
  
  // Status
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Timestamp;
  failureReason?: string;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
}
```

### Extended Message Model

```typescript
// Extension to existing /conversations/{conversationId}/messages/{messageId}
interface MessageExtensions {
  content: {
    // ... existing fields ...
    
    metadata?: {
      // Priority detection
      priority?: {
        level: 'urgent' | 'high' | 'normal';
        reason: string;
        keywords: string[];
        analyzedAt: Timestamp;
      };
      
      // Extracted entities
      extractedEntities?: {
        events?: string[];        // IDs of extracted calendar events
        deadlines?: string[];     // IDs of extracted deadlines
        decisions?: string[];     // IDs of related decisions
      };
      
      // RSVP tracking
      isInvitation?: boolean;
      rsvpTrackerId?: string;
      
      // Temporal highlights
      temporalPhrases?: Array<{
        text: string;
        start: number;            // Character offset
        end: number;
        type: 'date' | 'time' | 'duration';
      }>;
    };
  };
}
```

### User Preferences Extension

```typescript
// Extension to /users/{userId}
interface UserExtensions {
  preferences: {
    // ... existing fields ...
    
    aiFeatures?: {
      // Feature toggles
      calendarExtraction: boolean;
      decisionSummarization: boolean;
      priorityHighlighting: boolean;
      rsvpTracking: boolean;
      deadlineReminders: boolean;
      proactiveAssistant: boolean;
      
      // Reminder preferences
      reminderTiming: {
        deadlines: {
          enabled: boolean;
          advanceNotice: number[];  // Hours before deadline
          quietHours: {
            start: string;          // HH:MM
            end: string;            // HH:MM
          };
        };
        events: {
          enabled: boolean;
          advanceNotice: number[];
        };
      };
      
      // AI usage tracking (for rate limiting)
      aiCallsThisMonth: number;
      monthlyLimit: number;
      lastResetDate: Timestamp;
    };
  };
}
```

---

## AI Processing Pipeline

### Architecture Pattern: Event-Driven AI Processing

```
Message Created → Cloud Function Trigger → AI Processing → Result Storage → UI Update
```

### Processing Flow

#### 1. Message Ingestion
```typescript
// Firestore trigger (onCreate)
export const processNewMessage = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    
    // Check user preferences (skip if AI disabled)
    const user = await getUser(message.senderId);
    if (!user.preferences.aiFeatures?.enabled) return;
    
    // Check rate limits
    if (await isRateLimited(message.senderId)) {
      console.log('Rate limit exceeded for user:', message.senderId);
      return;
    }
    
    // Dispatch to feature-specific processors
    await Promise.allSettled([
      extractCalendarEvents(message, context),
      analyzePriority(message, context),
      trackRSVPs(message, context),
      extractDeadlines(message, context)
    ]);
  });
```

#### 2. Pre-Filtering (Cost Optimization)
```typescript
// Avoid unnecessary AI calls with keyword filtering
function shouldProcessForCalendar(text: string): boolean {
  const TEMPORAL_KEYWORDS = [
    'tomorrow', 'today', 'tonight', 'next week',
    'monday', 'tuesday', ':', 'am', 'pm',
    'appointment', 'meeting', 'practice', 'game'
  ];
  
  const lowerText = text.toLowerCase();
  return TEMPORAL_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

// Only call AI if pre-filter passes
if (shouldProcessForCalendar(message.content.text)) {
  const events = await extractWithAI(message.content.text);
  // ... process events
}
```

#### 3. AI Service Call
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function callClaudeForExtraction(
  prompt: string,
  messageText: string
): Promise<any> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0,  // Deterministic for extraction tasks
      messages: [{
        role: 'user',
        content: prompt.replace('${messageText}', messageText)
      }]
    });
    
    // Parse structured JSON response
    const content = message.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('Claude API error:', error);
    
    // Track error for monitoring
    await logAIError(error, 'extraction', messageText);
    
    // Return empty result (fail gracefully)
    return null;
  }
}
```

#### 4. Result Processing & Storage
```typescript
async function saveExtractedEvent(
  event: CalendarEvent,
  messageId: string,
  conversationId: string
): Promise<string> {
  const eventRef = firestore.collection('extractedEvents').doc();
  
  await eventRef.set({
    ...event,
    id: eventRef.id,
    messageId,
    conversationId,
    extractedBy: 'ai',
    extractionVersion: 'v1.0',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  
  // Update original message with reference
  await firestore
    .collection('conversations').doc(conversationId)
    .collection('messages').doc(messageId)
    .update({
      'content.metadata.extractedEntities.events': FieldValue.arrayUnion(eventRef.id)
    });
  
  // Trigger dependent processing
  await checkForConflicts(eventRef.id);
  
  return eventRef.id;
}
```

#### 5. Notification Dispatch
```typescript
async function notifyEventExtracted(
  userId: string,
  event: CalendarEvent
): Promise<void> {
  // Only notify if user has notifications enabled
  const user = await getUser(userId);
  if (!user.preferences.aiFeatures?.notifications) return;
  
  await sendPushNotification(userId, {
    title: '📅 Event Detected',
    body: `${event.title} on ${formatDate(event.date)}`,
    data: {
      type: 'event_extracted',
      eventId: event.id,
      conversationId: event.conversationId
    },
    sound: 'default',
    badge: await getUnreadCount(userId)
  });
}
```

### AI Prompt Engineering

#### Calendar Extraction Prompt
```typescript
const CALENDAR_EXTRACTION_PROMPT = `You are a calendar event extraction assistant for busy parents. Your task is to identify and extract events, appointments, or scheduled activities from casual conversation.

INPUT MESSAGE:
"${messageText}"

INSTRUCTIONS:
1. Identify any events, appointments, or scheduled activities
2. Extract temporal information (dates, times)
3. Identify location if mentioned
4. Determine if event is proposed or confirmed

For each event found, return a JSON object with these fields:
{
  "title": "Brief event name (2-5 words)",
  "date": "ISO 8601 date (YYYY-MM-DD)",
  "time": "24-hour time (HH:MM) or null if not specified",
  "endTime": "End time if specified, else null",
  "location": "Physical or virtual location, else null",
  "isProposed": true if tentative ("maybe", "thinking about"), false if confirmed,
  "confidence": 0.0-1.0 confidence score
}

TEMPORAL PARSING RULES:
- "tomorrow" = next calendar day from TODAY (${new Date().toISOString()})
- "tonight" = today after 6pm
- "next [day]" = next occurrence of that day of week
- "this weekend" = next Saturday or Sunday
- Relative times: "at 3" assumes "3pm" in context

CONTEXT CLUES:
- "dentist", "doctor", "practice", "game" → likely an event
- Question marks often indicate proposals: "Want to meet?"
- Confirmations: "sounds good", "see you then"

RETURN FORMAT:
- Return JSON array of events
- Return empty array [] if no events found
- DO NOT include conversational text in response

EXAMPLES:

Input: "Soccer practice tomorrow at 4pm"
Output: [{"title": "Soccer practice", "date": "2025-10-23", "time": "16:00", "endTime": null, "location": null, "isProposed": false, "confidence": 0.95}]

Input: "Maybe we can meet for coffee this weekend?"
Output: [{"title": "Coffee meeting", "date": "2025-10-26", "time": null, "endTime": null, "location": null, "isProposed": true, "confidence": 0.8}]

Input: "How was your day?"
Output: []

Now process the INPUT MESSAGE above.`;
```

#### Priority Analysis Prompt
```typescript
const PRIORITY_ANALYSIS_PROMPT = `You are a priority assessment assistant for busy parents. Analyze the urgency and importance of this message.

MESSAGE: "${messageText}"
SENDER: ${senderName}
CONVERSATION: ${conversationType} (${participantCount} participants)

PRIORITY LEVELS:
- URGENT: Immediate safety/health concerns, emergencies, critical time-sensitive issues
- HIGH: Important decisions, deadlines today/tonight, significant reminders
- NORMAL: Everything else

ASSESSMENT CRITERIA:
1. Time Sensitivity:
   - Is action needed right now or today?
   - Are there consequences for delay?

2. Impact:
   - Safety or health related?
   - Financial implications?
   - Affects multiple people?

3. Language Indicators:
   - Urgent words: "emergency", "now", "asap", "urgent"
   - Important words: "important", "don't forget", "reminder"
   - Emotional tone: multiple exclamation marks, all caps

4. Context:
   - Time of day (late night messages about kids = likely important)
   - Sender (school, doctor, spouse = higher priority)
   - Recent conversation (follow-up on urgent matter)

RETURN JSON:
{
  "level": "urgent" | "high" | "normal",
  "reason": "One sentence explanation",
  "confidence": 0.0-1.0
}

EXAMPLES:

"Emergency! Kids have fever, heading to ER now"
→ {"level": "urgent", "reason": "Health emergency requiring immediate action", "confidence": 0.99}

"Reminder: school pickup at 3pm today"
→ {"level": "high", "reason": "Time-sensitive reminder for today", "confidence": 0.9}

"What should we have for dinner?"
→ {"level": "normal", "reason": "Routine question with no urgency", "confidence": 0.95}

Now analyze the MESSAGE above.`;
```

#### Conflict Resolution Prompt
```typescript
const CONFLICT_RESOLUTION_PROMPT = `You are a scheduling conflict resolution assistant for busy parents. Generate practical solutions to resolve this scheduling conflict.

NEW EVENT:
- ${newEvent.title} at ${formatDateTime(newEvent.date, newEvent.time)}
- Location: ${newEvent.location || 'Not specified'}
- Participants: ${newEvent.participants.length} people

CONFLICTING EVENTS:
${conflictingEvents.map(e => `- ${e.title} at ${formatDateTime(e.date, e.time)}`).join('\n')}

CONTEXT:
- This is a family coordinating schedules
- Consider: childcare, school, work commitments
- Practical solutions parents can actually execute

GENERATE 3 SOLUTIONS:
For each solution, consider:
1. Can either event be rescheduled without major disruption?
2. Can someone else attend/handle one of the events?
3. Are there nearby time slots (before/after)?
4. Which event is more flexible vs. fixed commitment?

RETURN JSON:
[
  {
    "action": "Brief description of solution (10-15 words)",
    "reasoning": "Why this works (1-2 sentences)",
    "difficulty": "easy" | "moderate" | "hard",
    "automated": true if app can execute automatically, else false,
    "actions": [
      {
        "type": "reschedule" | "cancel" | "delegate" | "notify",
        "eventId": "ID of event to modify",
        "newTime": "ISO timestamp if rescheduling",
        "delegateTo": "userId if delegating"
      }
    ]
  }
]

SOLUTION QUALITY CRITERIA:
- Practical and realistic for parents
- Minimize disruption to fixed commitments (school, work)
- Consider travel time between events
- Prefer simple over complex solutions

Now generate solutions for the conflict above.`;
```

---

## Feature Architecture

### Feature 1: Smart Calendar Extraction

#### Component Hierarchy
```
ConversationScreen
├── MessageList
│   └── MessageBubble
│       ├── MessageText (with temporal highlighting)
│       └── CalendarEventCard (if event extracted)
│           ├── EventHeader (icon + title + status badge)
│           ├── EventDetails (date + time + location)
│           └── EventActions (confirm + dismiss + add to calendar)
└── MessageInput

CalendarScreen
├── MonthView
│   └── DayCell
│       └── EventDot (indicates events on that day)
├── DayView
│   └── EventList
│       └── CalendarEventCard (full detail)
└── FilterBar (by conversation, by status)
```

#### State Management
```typescript
// React Query for event fetching
function useExtractedEvents(conversationId: string) {
  return useQuery({
    queryKey: ['extractedEvents', conversationId],
    queryFn: () => fetchExtractedEvents(conversationId),
    staleTime: 60000,  // 1 minute
    refetchOnWindowFocus: true
  });
}

// Zustand for calendar UI state
interface CalendarStore {
  selectedDate: Date;
  viewMode: 'month' | 'day' | 'list';
  filterByConversation: string | null;
  filterByStatus: string | null;
  setSelectedDate: (date: Date) => void;
  // ... other actions
}
```

### Feature 2: Decision Summarization

#### Processing Architecture
```
Scheduled Function (every 6 hours)
       │
       ├─► Query active conversations
       │
       ├─► For each conversation:
       │    │
       │    ├─► Fetch last 100 messages
       │    │
       │    ├─► Pre-filter: hasDecisionKeywords()
       │    │
       │    ├─► If likely has decision:
       │    │    │
       │    │    ├─► Call Claude with decision extraction prompt
       │    │    │
       │    │    ├─► Parse decisions from response
       │    │    │
       │    │    └─► Save to /decisions collection
       │    │
       │    └─► Track last processed timestamp
       │
       └─► Clean up old processing records
```

#### Decision Detection Patterns
```typescript
const DECISION_INDICATORS = {
  agreement: [
    'sounds good', 'that works', 'perfect', 'deal',
    'okay', 'let\'s do it', 'i\'m in', 'count me in'
  ],
  confirmation: [
    'confirmed', 'decided', 'settled', 'agreed',
    'see you then', 'looking forward', 'it\'s set'
  ],
  assignment: [
    'i\'ll handle', 'you take', 'i\'ll bring',
    'you can grab', 'i\'ll pick up', 'you get'
  ],
  timePlace: [
    'let\'s meet at', 'we\'ll go to', 'at my place',
    'your house', 'the park', 'school pickup'
  ]
};

function calculateDecisionScore(messages: Message[]): number {
  let score = 0;
  const recentMessages = messages.slice(-20);  // Last 20 messages
  
  for (const message of recentMessages) {
    const text = message.content.text.toLowerCase();
    
    // Check for decision indicators
    for (const [category, keywords] of Object.entries(DECISION_INDICATORS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 1;
          break;  // Only count once per category per message
        }
      }
    }
  }
  
  // Threshold: score >= 3 indicates likely decision
  return score;
}
```

### Feature 3: Priority Message Highlighting

#### Real-Time Processing Pipeline
```
Message Created
       │
       ├─[1]─► Quick keyword scan (< 1ms)
       │        │
       │        ├─► If no priority keywords: Skip AI, mark as 'normal'
       │        │
       │        └─► If priority keywords found:
       │             │
       │             ├─[2]─► Call Claude for nuanced analysis
       │             │
       │             ├─[3]─► Update message metadata with priority
       │             │
       │             └─[4]─► If 'urgent': Send enhanced push notification
       │
       └─[5]─► UI re-renders with priority styling
```

#### Priority Styling System
```typescript
const priorityStyles = {
  urgent: {
    messageBubble: {
      borderColor: '#FF3B30',
      borderWidth: 2,
      backgroundColor: '#FFF5F5',
      shadowColor: '#FF3B30',
      shadowOpacity: 0.3,
      shadowRadius: 8
    },
    badge: {
      backgroundColor: '#FF3B30',
      icon: 'alert-circle',
      label: 'URGENT',
      pulse: true  // Pulsing animation
    },
    notification: {
      sound: 'urgent.wav',
      priority: 'high',
      interruptionLevel: 'critical'  // iOS 15+
    }
  },
  high: {
    messageBubble: {
      borderColor: '#FF9500',
      borderWidth: 1,
      backgroundColor: '#FFF9F0'
    },
    badge: {
      backgroundColor: '#FF9500',
      icon: 'flag',
      label: 'Important'
    },
    notification: {
      sound: 'default',
      priority: 'high'
    }
  },
  normal: {
    messageBubble: {}, // No special styling
    badge: null,
    notification: {
      sound: 'default',
      priority: 'default'
    }
  }
};
```

### Feature 4: RSVP Tracking

#### State Machine
```
RSVP Tracker States:
┌─────────────────────────────────────────────────────┐
│ ACTIVE                                              │
│  │                                                   │
│  ├─► All invitees respond → AUTO: CLOSED           │
│  ├─► Host manually closes → CLOSED                 │
│  └─► Event date passes → AUTO: CLOSED              │
│                                                     │
│ CLOSED                                              │
│  │                                                   │
│  └─► Can reopen if needed                          │
│                                                     │
│ CANCELLED                                           │
│  └─► Event cancelled, no further action           │
└─────────────────────────────────────────────────────┘

Individual Response States:
pending → yes/no/maybe → (can change) → yes/no/maybe
```

#### RSVP Detection Logic
```typescript
function detectRSVPResponse(
  message: Message,
  tracker: RSVPTracker
): { response: string; confidence: number } | null {
  const text = message.content.text.toLowerCase();
  const withinTimeWindow = message.timestamp.toDate() > tracker.createdAt.toDate();
  
  if (!withinTimeWindow) return null;  // Message before invitation
  
  // Pattern matching with confidence scores
  const patterns = [
    { regex: /^yes|^yep|^yup|^sure|count me in/i, response: 'yes', confidence: 0.95 },
    { regex: /i'?ll be there|see you there/i, response: 'yes', confidence: 0.9 },
    { regex: /sounds? good|that works/i, response: 'yes', confidence: 0.8 },
    
    { regex: /^no|^nope|can'?t make it/i, response: 'no', confidence: 0.95 },
    { regex: /won'?t be able|have to miss/i, response: 'no', confidence: 0.9 },
    { regex: /sorry.*can'?t/i, response: 'no', confidence: 0.85 },
    
    { regex: /maybe|not sure|possibly/i, response: 'maybe', confidence: 0.9 },
    { regex: /let me check|need to confirm/i, response: 'maybe', confidence: 0.85 }
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      return { response: pattern.response, confidence: pattern.confidence };
    }
  }
  
  return null;  // No clear RSVP detected
}
```

### Feature 5: Deadline/Reminder Extraction

#### Reminder Scheduling Algorithm
```typescript
function calculateReminderTimes(deadline: Deadline): Timestamp[] {
  const reminders: Timestamp[] = [];
  const deadlineDate = deadline.deadline.toDate();
  const now = new Date();
  
  // Don't schedule reminders for past deadlines
  if (deadlineDate <= now) return [];
  
  const hoursUntilDeadline = differenceInHours(deadlineDate, now);
  
  // URGENT (< 3 hours until deadline)
  if (hoursUntilDeadline < 3) {
    // Remind 1 hour before
    if (hoursUntilDeadline >= 1) {
      reminders.push(Timestamp.fromDate(subHours(deadlineDate, 1)));
    }
    // And 15 minutes before
    if (hoursUntilDeadline >= 0.25) {
      reminders.push(Timestamp.fromDate(subMinutes(deadlineDate, 15)));
    }
  }
  
  // HIGH PRIORITY (< 24 hours)
  else if (hoursUntilDeadline < 24) {
    // Morning of deadline (9am)
    reminders.push(Timestamp.fromDate(setHours(deadlineDate, 9)));
    // 2 hours before
    reminders.push(Timestamp.fromDate(subHours(deadlineDate, 2)));
  }
  
  // NORMAL (> 24 hours)
  else {
    // 1 day before at 9am
    reminders.push(Timestamp.fromDate(
      setHours(subDays(deadlineDate, 1), 9)
    ));
    // Morning of deadline
    reminders.push(Timestamp.fromDate(setHours(deadlineDate, 9)));
    // 2 hours before (if specific time)
    if (deadline.hasSpecificTime) {
      reminders.push(Timestamp.fromDate(subHours(deadlineDate, 2)));
    }
  }
  
  return reminders.filter(r => r.toDate() > now);  // Only future reminders
}
```

### Advanced Feature: Proactive Assistant

#### Conflict Detection Algorithm
```typescript
async function detectSchedulingConflicts(
  newEvent: CalendarEvent
): Promise<SchedulingConflict[]> {
  const conflicts: SchedulingConflict[] = [];
  
  // Get all events for participants around this time
  const participantEvents = await Promise.all(
    newEvent.participants.map(userId =>
      getEventsForUser(userId, {
        startDate: subDays(newEvent.date.toDate(), 1),
        endDate: addDays(newEvent.date.toDate(), 1)
      })
    )
  );
  
  const allEvents = participantEvents.flat();
  
  for (const existingEvent of allEvents) {
    // Skip if same event
    if (existingEvent.id === newEvent.id) continue;
    
    // Check for time overlap
    const overlap = calculateOverlap(newEvent, existingEvent);
    
    if (overlap.hasDirectOverlap) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'major',
        conflictingEvent: existingEvent,
        overlapMinutes: overlap.minutes
      });
    } else if (overlap.isTightSchedule) {
      conflicts.push({
        type: 'tight_schedule',
        severity: 'minor',
        conflictingEvent: existingEvent,
        minutesBetween: overlap.gapMinutes
      });
    }
  }
  
  return conflicts;
}

function calculateOverlap(
  event1: CalendarEvent,
  event2: CalendarEvent
): OverlapResult {
  // If neither has time, check if same day
  if (!event1.time && !event2.time) {
    const sameDay = isSameDay(
      event1.date.toDate(),
      event2.date.toDate()
    );
    return {
      hasDirectOverlap: false,
      isTightSchedule: sameDay,
      minutes: 0,
      gapMinutes: sameDay ? 0 : Infinity
    };
  }
  
  // Parse times
  const start1 = parseDateTime(event1.date, event1.time);
  const end1 = event1.endTime 
    ? parseDateTime(event1.date, event1.endTime)
    : addHours(start1, 1);  // Assume 1 hour
  
  const start2 = parseDateTime(event2.date, event2.time);
  const end2 = event2.endTime
    ? parseDateTime(event2.date, event2.endTime)
    : addHours(start2, 1);
  
  // Direct overlap
  if ((start1 < end2) && (start2 < end1)) {
    const overlapStart = max([start1, start2]);
    const overlapEnd = min([end1, end2]);
    const minutes = differenceInMinutes(overlapEnd, overlapStart);
    
    return {
      hasDirectOverlap: true,
      isTightSchedule: false,
      minutes,
      gapMinutes: 0
    };
  }
  
  // Tight schedule (< 30 minutes between)
  const gap = start2 > end1
    ? differenceInMinutes(start2, end1)
    : differenceInMinutes(start1, end2);
  
  return {
    hasDirectOverlap: false,
    isTightSchedule: gap < 30,
    minutes: 0,
    gapMinutes: gap
  };
}
```

#### AI Solution Generation
```typescript
async function generateConflictSolutions(
  conflict: SchedulingConflict
): Promise<Solution[]> {
  const newEvent = await getEvent(conflict.newEventId);
  const conflictingEvents = await getEvents(conflict.conflictingEventIds);
  
  // Get conversation context for better suggestions
  const conversation = await getConversation(conflict.conversationId);
  const recentMessages = await getRecentMessages(conflict.conversationId, 20);
  
  const contextSummary = summarizeContext(recentMessages);
  
  const prompt = CONFLICT_RESOLUTION_PROMPT
    .replace('${newEvent}', JSON.stringify(newEvent))
    .replace('${conflictingEvents}', JSON.stringify(conflictingEvents))
    .replace('${context}', contextSummary);
  
  const solutions = await callClaudeForSolutions(prompt);
  
  // Enhance solutions with actionability assessment
  return solutions.map(solution => ({
    ...solution,
    automated: canBeAutomated(solution),
    estimatedDifficulty: assessDifficulty(solution, conversation)
  }));
}

function canBeAutomated(solution: Solution): boolean {
  // Can only automate rescheduling within same day
  // or canceling tentative events
  for (const action of solution.actions) {
    if (action.type === 'reschedule') {
      const originalEvent = getEvent(action.eventId);
      if (originalEvent.status !== 'proposed') return false;
      if (!isSameDay(originalEvent.date.toDate(), action.newTime.toDate())) {
        return false;
      }
    }
    if (action.type === 'delegate' || action.type === 'cancel') {
      return false;  // Require user confirmation
    }
  }
  return true;
}
```

---

## RAG Pipeline Architecture

### Purpose and Integration

The **RAG (Retrieval-Augmented Generation) pipeline** provides conversation history context to all AI features, enabling smarter, context-aware assistance.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Message Flow with RAG                       │
│                                                                 │
│  User sends message                                            │
│         │                                                       │
│         ├──[Path 1: Standard Flow]──► Firestore ──► Real-time sync
│         │                                                       │
│         └──[Path 2: Background Embedding]                      │
│                     │                                           │
│                     ▼                                           │
│           ┌─────────────────────────┐                          │
│           │ shouldEmbed() check     │                          │
│           │ • Length > 10 chars     │                          │
│           │ • Not just emojis       │                          │
│           │ • Has semantic value    │                          │
│           └────────┬────────────────┘                          │
│                    │ YES                                        │
│                    ▼                                            │
│           ┌─────────────────────────┐                          │
│           │ OpenAI Embeddings API   │                          │
│           │ text-embedding-3-small  │                          │
│           │ → 1536-dim vector       │                          │
│           └────────┬────────────────┘                          │
│                    │                                            │
│                    ▼                                            │
│           ┌─────────────────────────┐                          │
│           │   Pinecone Index        │                          │
│           │   "conversation-history"│                          │
│           │                          │                          │
│           │ Store with metadata:    │                          │
│           │ • messageId             │                          │
│           │ • conversationId        │                          │
│           │ • timestamp             │                          │
│           │ • messageType           │                          │
│           │ • hasEvent (boolean)    │                          │
│           │ • hasDecision (boolean) │                          │
│           └─────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    AI Feature Query Flow                        │
│                                                                 │
│  AI Feature needs context (e.g., Decision Summarization)       │
│         │                                                       │
│         ├──► Construct semantic query                          │
│         │    e.g., "decisions about weekend plans"             │
│         │                                                       │
│         ├──► Generate query embedding                           │
│         │    (OpenAI text-embedding-3-small)                   │
│         │                                                       │
│         ├──► Query Pinecone                                    │
│         │    • Top-K similarity search (K=10)                  │
│         │    • Filter by conversationId                        │
│         │    • Filter by messageType (optional)                │
│         │    • Returns: messageIds + similarity scores         │
│         │                                                       │
│         ├──► Fetch full messages from Firestore                │
│         │    (Batch read for efficiency)                       │
│         │                                                       │
│         ├──► Rank by relevance + recency                       │
│         │    (Combine similarity score with timestamp)         │
│         │                                                       │
│         └──► Include in AI prompt as context                   │
│              "Here's what was discussed before:"               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Models

#### Message Embeddings Collection

```typescript
// /messageEmbeddings/{messageId}
interface MessageEmbedding {
  messageId: string;
  conversationId: string;
  embeddedAt: Timestamp;
  model: 'text-embedding-3-small';
  vectorId: string;               // Pinecone vector ID (same as messageId)
  
  // Metadata for debugging
  textLength: number;
  messageType: 'event' | 'decision' | 'question' | 'statement';
  hasEvent: boolean;
  hasDecision: boolean;
}
```

#### Pinecone Vector Schema

```typescript
interface PineconeVector {
  id: string;                     // messageId
  values: number[];               // 1536-dim embedding
  metadata: {
    conversationId: string;
    senderId: string;
    timestamp: number;            // Unix milliseconds
    messageType: string;
    hasEvent: boolean;
    hasDecision: boolean;
    textPreview: string;          // First 100 chars for debugging
  };
}
```

### RAG Integration Points

#### 1. Decision Summarization
```typescript
async function summarizeDecisions(conversationId: string) {
  // Query: Find messages about decisions and agreements
  const relevantHistory = await searchConversationHistory(
    "decisions agreements plans confirmed",
    conversationId,
    10
  );
  
  const contextualPrompt = `
RELEVANT CONVERSATION HISTORY:
${formatMessagesForContext(relevantHistory)}

Based on the above history and the recent messages below, 
summarize any decisions that have been made.

RECENT MESSAGES:
${formatRecentMessages()}
`;
  
  return await callClaudeAPI(contextualPrompt);
}
```

#### 2. Proactive Conflict Detection
```typescript
async function detectConflictsWithContext(newEvent: CalendarEvent) {
  // Query: Find similar past events
  const similarEvents = await searchConversationHistory(
    `${newEvent.title} ${newEvent.location} ${newEvent.participants.join(' ')}`,
    newEvent.conversationId,
    5
  );
  
  const contextualPrompt = `
NEW EVENT: ${newEvent.title} on ${newEvent.date}

SIMILAR PAST EVENTS:
${formatEventsForContext(similarEvents)}

This appears to be a recurring event. When suggesting conflict resolution:
1. Consider if this is part of a regular schedule
2. Check if similar events were successfully held before
3. Suggest consistent timing based on past patterns
`;
  
  return await generateConflictSolutions(contextualPrompt);
}
```

#### 3. Smart RSVP Reminders
```typescript
async function shouldSendRSVPReminder(trackerId: string): Promise<boolean> {
  const tracker = await getRSVPTracker(trackerId);
  
  // Query: Check if this person usually responds quickly
  const pastRSVPs = await searchConversationHistory(
    `${tracker.userId} RSVP response invitation`,
    tracker.conversationId,
    5
  );
  
  // Calculate average response time
  const avgResponseTime = calculateAverageResponseTime(pastRSVPs);
  
  // Don't nag fast responders too early
  if (avgResponseTime < 24 * 3600 * 1000) {  // 24 hours
    return false;  // Give them time
  }
  
  return true;  // Send reminder
}
```

### Performance Optimizations

#### Embedding Batching
```typescript
// Process embeddings in batches to reduce API calls
export const batchGenerateEmbeddings = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    // Get messages without embeddings
    const pendingMessages = await firestore
      .collection('pendingEmbeddings')
      .limit(100)
      .get();
    
    if (pendingMessages.empty) return;
    
    // Batch embed (OpenAI supports up to 2048 inputs per request)
    const texts = pendingMessages.docs.map(doc => doc.data().text);
    const embeddings = await batchGenerateEmbeddings(texts);
    
    // Upload to Pinecone in batch
    const vectors = embeddings.map((embedding, i) => ({
      id: pendingMessages.docs[i].id,
      values: embedding,
      metadata: pendingMessages.docs[i].data().metadata
    }));
    
    await pinecone.upsert(vectors);
    
    // Clean up pending queue
    const batch = firestore.batch();
    pendingMessages.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

#### Query Caching
```typescript
interface RAGCache {
  queryHash: string;              // Hash of query + conversationId
  results: string[];              // messageIds
  cachedAt: Timestamp;
  expiresAt: Timestamp;
  hitCount: number;
}

async function searchWithCache(
  query: string,
  conversationId: string
): Promise<string[]> {
  const cacheKey = hashQuery(query, conversationId);
  
  // Check cache
  const cached = await getRAGCache(cacheKey);
  if (cached && cached.expiresAt.toDate() > new Date()) {
    console.log('✅ RAG cache hit');
    await incrementHitCount(cacheKey);
    return cached.results;
  }
  
  // Query Pinecone
  const results = await searchConversationHistory(query, conversationId);
  
  // Cache results (5 minute TTL)
  await cacheRAGResults(cacheKey, results, 300);
  
  return results;
}
```

### Cost Analysis

| Component | Usage per User/Month | Unit Cost | Monthly Cost |
|-----------|---------------------|-----------|--------------|
| **Embedding Generation** | 100 messages | $0.0001/1K tokens | $0.015 |
| **Pinecone Storage** | 1000 vectors | $0.096/1M vectors | $0.096 |
| **Pinecone Queries** | 50 searches | $0.04/1K queries | $0.002 |
| **Query Embeddings** | 50 queries | $0.0001/1K tokens | $0.0075 |
| **Total RAG** | - | - | **$0.12/user** |

**Total AI Cost with RAG: $0.31/user/month** (previous $0.19 + $0.12)

### Scaling Considerations

#### For 100 Users
- **Messages/day**: ~50/user = 5,000 total
- **Embeddings/day**: ~2,500 (50% worth embedding)
- **Storage**: ~150K vectors total
- **Queries/day**: ~250 (5 features × 50 users × 0.1 query rate)

**Costs at 100 users: $31/month for RAG**

#### For 10,000 Users
- **Embeddings/month**: ~1.5M
- **Storage**: ~15M vectors
- **Queries/month**: ~750K
- **Cost**: ~$3,100/month
- **Optimization needed**: Implement TTL, archive old embeddings

### Monitoring Metrics

```typescript
interface RAGMetrics {
  // Usage
  embeddingsGenerated: number;
  queriesExecuted: number;
  cacheHitRate: number;           // %
  
  // Performance
  avgEmbeddingTime: number;       // ms
  avgQueryTime: number;           // ms
  
  // Quality
  avgSimilarityScore: number;     // 0-1
  queriesWithNoResults: number;
  
  // Cost
  embeddingCost: number;          // USD
  storageCost: number;
  queryCost: number;
}
```

### Testing RAG Pipeline

#### Unit Tests
- [ ] Embedding generation for various message types
- [ ] Semantic search accuracy (manual validation)
- [ ] Metadata filtering correctness
- [ ] Cache behavior (hit/miss)

#### Integration Tests
- [ ] End-to-end: Message → Embedding → Query → Context
- [ ] Cross-conversation search for users
- [ ] Context enhancement for AI prompts
- [ ] Performance under load (100 concurrent queries)

#### Quality Tests
- [ ] Search for "dentist appointment" finds correct messages
- [ ] Search ignores irrelevant casual chat
- [ ] Recency bias works (recent results ranked higher)
- [ ] Multi-turn conversations grouped correctly

**Checkpoint**: ✅ RAG pipeline provides relevant context to all AI features

---

## Google Calendar Integration

### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                      WhatsApp Clone App                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Event Extracted from Message                               │ │
│  │  /extractedEvents/{eventId}                                 │ │
│  │         │                                                    │ │
│  │         ├──► User Views Event Card                          │ │
│  │         │    • "Add to Google Calendar" button              │ │
│  │         │    • "Auto-sync" toggle in settings               │ │
│  │         │                                                    │ │
│  │         └──► User Action Triggers                           │ │
│  │              │                                               │ │
│  │              ├─[Manual]─► exportToGoogleCalendar()         │ │
│  │              │                                               │ │
│  │              └─[Auto]───► If autoSync enabled               │ │
│  └──────────────────┬──────────────────────────────────────────┘ │
│                     │                                             │
└─────────────────────┼─────────────────────────────────────────────┘
                      │
                      │ OAuth 2.0 + Callable Cloud Function
                      │
┌─────────────────────▼──────────────────────────────────────────────┐
│                  Cloud Functions Layer                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  exportToGoogleCalendar (Callable Function)                  │ │
│  │  1. Verify user authentication                               │ │
│  │  2. Fetch event from Firestore                               │ │
│  │  3. Initialize Google Calendar API with user's OAuth token   │ │
│  │  4. Create event with metadata                               │ │
│  │  5. Update Firestore with Google Calendar ID                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  syncGoogleCalendar (Scheduled - Optional Phase 2)           │ │
│  │  Runs every 6 hours:                                         │ │
│  │  1. Fetch events modified in Google Calendar                 │ │
│  │  2. Update /extractedEvents if changes detected              │ │
│  │  3. Optionally import external events                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────┬───────────────────────────────────────────┘
                         │
                         │ Google Calendar API v3
                         │
┌────────────────────────▼───────────────────────────────────────────┐
│                    Google Calendar                                 │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Primary Calendar (or Family Calendar)                       │ │
│  │                                                               │ │
│  │  Event created with:                                         │ │
│  │  • summary: event.title                                      │ │
│  │  • description: "Extracted from conversation..."             │ │
│  │  • start/end: event.date + time                              │ │
│  │  • location: event.location                                  │ │
│  │  • reminders: [1 hour, 15 min]                               │ │
│  │  • extendedProperties:                                       │ │
│  │     - appEventId: {eventId}                                  │ │
│  │     - appMessageId: {messageId}                              │ │
│  │     - appConversationId: {conversationId}                    │ │
│  │                                                               │ │
│  │  [Event is now visible in Google Calendar app]               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    First-Time Setup                              │
│                                                                  │
│  User: "Connect Google Calendar" (in Profile settings)          │
│         │                                                        │
│         ▼                                                        │
│  GoogleSignin.signIn()                                          │
│         │                                                        │
│         ├──► Opens Google OAuth consent screen                  │
│         │    "Allow WhatsApp Clone to access your Calendar?"    │
│         │                                                        │
│         ├──[User Approves]                                      │
│         │                                                        │
│         └──► Returns:                                           │
│              • accessToken (valid 1 hour)                       │
│              • refreshToken (valid indefinitely)                │
│              • email                                            │
│                                                                  │
│  Store in Firestore /users/{userId}:                           │
│  • googleCalendarConnected: true                                │
│  • googleRefreshToken: {encrypted}                              │
│  • googleEmail: user@gmail.com                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  Subsequent Exports                              │
│                                                                  │
│  User: "Add to Google Calendar"                                 │
│         │                                                        │
│         ├──► getGoogleAccessToken()                             │
│         │    • Check if cached token still valid                │
│         │    • If expired: Use refreshToken to get new one      │
│         │                                                        │
│         ├──► Call Cloud Function with accessToken               │
│         │                                                        │
│         └──► Event created in Google Calendar                   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Model Extensions

#### Extended Calendar Event

```typescript
// Extension to /extractedEvents/{eventId}
interface CalendarEventExtensions {
  // Google Calendar sync
  googleCalendarId?: string;      // ID in Google Calendar
  googleCalendarSyncedAt?: Timestamp;
  googleCalendarEventLink?: string;  // HTML link to event
  syncStatus: 'not_synced' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  lastSyncAttempt?: Timestamp;
  
  // Auto-sync settings
  autoSyncEnabled: boolean;       // Per-event override
}
```

#### User Extensions

```typescript
// Extension to /users/{userId}
interface UserGoogleCalendarSettings {
  googleCalendar?: {
    connected: boolean;
    email: string;
    refreshToken: string;         // Encrypted
    connectedAt: Timestamp;
    lastSyncAt?: Timestamp;
    
    // Preferences
    autoSync: boolean;             // Auto-add extracted events
    defaultCalendarId: string;     // "primary" or specific calendar ID
    importExternalEvents: boolean; // Import non-app events (Phase 2)
    
    // Sync stats
    eventsExported: number;
    lastExportAt?: Timestamp;
  };
}
```

### Bidirectional Sync (Phase 2)

```
┌──────────────────────────────────────────────────────────────────┐
│         Scheduled: syncGoogleCalendar (every 6 hours)            │
│                                                                  │
│  For each user with Google Calendar connected:                  │
│         │                                                        │
│         ├──[1]──► Fetch events modified since last sync         │
│         │         (Use updatedMin parameter)                    │
│         │                                                        │
│         ├──[2]──► For each Google Calendar event:               │
│         │         │                                             │
│         │         ├──► Check extendedProperties.appEventId     │
│         │         │                                             │
│         │         ├─[Has appEventId]──► This is our event      │
│         │         │    │                                        │
│         │         │    ├──► Compare with /extractedEvents      │
│         │         │    │                                        │
│         │         │    ├─[Changed]──► Update Firestore         │
│         │         │    │    • New time/date                    │
│         │         │    │    • New location                     │
│         │         │    │    • Cancelled status                 │
│         │         │    │                                        │
│         │         │    └─[Deleted]──► Soft delete in Firestore│
│         │         │                                             │
│         │         └─[No appEventId]──► External event          │
│         │              │                                        │
│         │              └─[Import enabled]──► Create in app     │
│         │                   • Add to /extractedEvents          │
│         │                   • Post notification to user        │
│         │                                                       │
│         └──[3]──► Update lastSyncAt timestamp                  │
└──────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Strategy

When syncing changes from Google Calendar:

```typescript
enum SyncConflictResolution {
  GOOGLE_WINS,      // Default: Google Calendar is source of truth
  APP_WINS,         // User changed in app after export
  MANUAL_RESOLVE    // Ask user to resolve conflict
}

async function handleSyncConflict(
  appEvent: CalendarEvent,
  googleEvent: GoogleCalendarEvent
): Promise<void> {
  // Compare timestamps
  const appModifiedAt = appEvent.updatedAt.toDate();
  const googleModifiedAt = new Date(googleEvent.updated);
  
  // If Google Calendar changed more recently
  if (googleModifiedAt > appModifiedAt) {
    // Update app event from Google Calendar
    await updateEventFromGoogle(appEvent.id, googleEvent);
    
    // Notify user of change
    await sendPushNotification(appEvent.hostUserId, {
      title: 'Event Updated',
      body: `${appEvent.title} was changed in Google Calendar`,
      data: { eventId: appEvent.id }
    });
  } else {
    // App is more recent, re-export to Google Calendar
    await exportToGoogleCalendar(appEvent.id);
  }
}
```

### Security & Privacy

#### Token Storage
```typescript
// Encrypt refresh token before storing
import * as Crypto from 'expo-crypto';

async function storeRefreshToken(
  userId: string,
  refreshToken: string
): Promise<void> {
  const encrypted = await encryptToken(refreshToken);
  
  await firestore.collection('users').doc(userId).update({
    'googleCalendar.refreshToken': encrypted,
    'googleCalendar.connectedAt': FieldValue.serverTimestamp()
  });
}

async function getRefreshToken(userId: string): Promise<string> {
  const userDoc = await firestore.collection('users').doc(userId).get();
  const encrypted = userDoc.data()?.googleCalendar?.refreshToken;
  
  if (!encrypted) throw new Error('Not connected to Google Calendar');
  
  return await decryptToken(encrypted);
}
```

#### Permissions & Scopes
- **Minimal scope**: Only `https://www.googleapis.com/auth/calendar` (not `calendar.readonly`)
- **User control**: User can disconnect at any time
- **Revocation**: Handle gracefully when user revokes access in Google settings
- **Audit trail**: Log all calendar operations

### Testing

#### OAuth Flow Tests
- [ ] User connects Google Calendar successfully
- [ ] Access token refreshes automatically when expired
- [ ] Graceful handling when user revokes permission
- [ ] Multiple users with different Google accounts

#### Export Tests
- [ ] Event exports to correct calendar (primary vs custom)
- [ ] Extended properties stored correctly
- [ ] Reminders set correctly
- [ ] Event appears in Google Calendar web/mobile
- [ ] Button shows "Synced" after successful export

#### Bidirectional Sync Tests (Phase 2)
- [ ] Event changed in Google Calendar → Updates in app
- [ ] Event deleted in Google Calendar → Soft deleted in app
- [ ] External event created → Imported to app (if enabled)
- [ ] Conflict resolution works correctly

#### Error Handling Tests
- [ ] Network failure during export → Retry logic
- [ ] Invalid OAuth token → Re-authenticate prompt
- [ ] Google Calendar API rate limit → Backoff and retry
- [ ] User disconnects mid-sync → Clean state

### Cost Analysis

| Operation | Frequency | API Calls | Cost |
|-----------|-----------|-----------|------|
| **OAuth Token Refresh** | 1/hour/user | 1 | Free |
| **Event Export** | ~10/user/month | 10 | Free |
| **Bidirectional Sync** | 4/day/user | 4 | Free |
| **Total** | - | ~130/user/month | **$0** |

**Google Calendar API Free Tier: 1M requests/day**  
At 10K users: ~1.3M requests/month = ~43K/day ✅ Well within limit

### Performance Optimizations

#### Batch Operations
```typescript
// Export multiple events in one Cloud Function call
export const batchExportToGoogleCalendar = functions.https.onCall(
  async (data: { eventIds: string[] }, context) => {
    const results = await Promise.allSettled(
      data.eventIds.map(id => exportSingleEvent(id, context.auth.uid))
    );
    
    return {
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    };
  }
);
```

#### Smart Sync
```typescript
// Only sync events that changed recently
async function smartSync(userId: string) {
  const lastSync = await getLastSyncTime(userId);
  
  // Fetch only events modified since last sync
  const response = await calendar.events.list({
    calendarId: 'primary',
    updatedMin: lastSync.toISOString(),
    maxResults: 100
  });
  
  // Process only changed events
  const changedEvents = response.data.items || [];
  await processChangedEvents(userId, changedEvents);
}
```

**Checkpoint**: ✅ Seamless Google Calendar integration with bidirectional sync

---

## Alternative: n8n for Third-Party Integrations

### Strategic Consideration: Native vs. n8n Approach

**Current Architecture**: Direct Google Calendar API integration via Cloud Functions  
**Alternative**: n8n workflow automation platform for integrations

### Architecture Comparison

#### **Option A: Native Integration (Current Design)**
```
App → Cloud Function → Google Calendar API → Google Calendar
```

**Pros:**
- ✅ Full control over integration logic
- ✅ Lowest latency (direct API calls)
- ✅ No additional infrastructure dependencies
- ✅ Type-safe with TypeScript end-to-end
- ✅ Easier debugging (single codebase)
- ✅ No additional costs

**Cons:**
- ❌ Need to implement each integration from scratch
- ❌ OAuth management per service
- ❌ More code to maintain
- ❌ Harder to add new integrations

#### **Option B: n8n Integration Platform**
```
App → Webhook → n8n Workflow → Google Calendar/Slack/Notion/etc.
```

**Pros:**
- ✅ **Visual workflow builder** - Non-developers can modify
- ✅ **300+ pre-built integrations** - Calendar, Slack, Notion, Trello, Todoist, etc.
- ✅ **Rapid prototyping** - Add new integrations in minutes
- ✅ **Centralized OAuth** - n8n handles authentication
- ✅ **Built-in error handling** - Retry logic, failure notifications
- ✅ **Webhook support** - Easy bidirectional sync
- ✅ **Self-hosted option** - Data stays in your infrastructure

**Cons:**
- ❌ Additional infrastructure to manage (Docker container)
- ❌ Extra latency (webhook → n8n → API)
- ❌ Another service to monitor/maintain
- ❌ Learning curve for n8n workflow syntax
- ❌ Potential single point of failure
- ❌ Cost: Self-hosted ($0) or Cloud (starts at $20/month)

### Recommended Hybrid Approach

**Phase 1 (MVP): Native Google Calendar Integration**
- Start with direct Cloud Functions for Google Calendar
- Validate user need and usage patterns
- Keep it simple for initial launch

**Phase 2 (Scale): n8n for Additional Integrations**
- Once Google Calendar integration is validated
- Use n8n to rapidly add more integrations
- Let n8n handle the "long tail" of integrations

### n8n Architecture for Busy Parents

```
┌──────────────────────────────────────────────────────────────────┐
│                      WhatsApp Clone App                          │
│                                                                  │
│  Event Extracted → POST to n8n webhook                          │
│                     /webhook/event-extracted                     │
│                                                                  │
│  Decision Made → POST to n8n webhook                            │
│                  /webhook/decision-made                          │
│                                                                  │
│  Deadline Created → POST to n8n webhook                         │
│                     /webhook/deadline-created                    │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ HTTPS Webhooks
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                    n8n Workflow Engine                           │
│                    (Self-hosted Docker)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Workflow 1: Event → Calendar Sync                         │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Webhook Trigger                                       │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ Filter: Only confirmed events                         │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ Branch:                                               │  │ │
│  │  │   ├─→ Google Calendar (create event)                 │  │ │
│  │  │   ├─→ Apple Calendar (if user has iOS)               │  │ │
│  │  │   └─→ Outlook Calendar (if user has Office 365)      │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ HTTP Request: POST back to app with sync status      │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Workflow 2: Decision → Task Management                   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Webhook Trigger                                       │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ Extract action items from decision                    │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ For each action item:                                 │  │ │
│  │  │   ├─→ Todoist (create task)                          │  │ │
│  │  │   ├─→ Notion (add to family board)                   │  │ │
│  │  │   └─→ Trello (create card)                           │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Workflow 3: Deadline → Multi-Channel Reminders          │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Schedule Trigger (daily at 9am)                       │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ HTTP Request: GET upcoming deadlines from app         │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ For each deadline due today:                          │  │ │
│  │  │   ├─→ Slack (send DM to assigned person)             │  │ │
│  │  │   ├─→ Email (send reminder)                          │  │ │
│  │  │   └─→ SMS via Twilio (if urgent)                     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Workflow 4: RSVP → Group Notifications                  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Webhook Trigger (RSVP received)                       │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ Update Google Sheets (RSVP tracker)                   │  │ │
│  │  │   ↓                                                   │  │ │
│  │  │ If all responses received:                            │  │ │
│  │  │   └─→ Slack (notify organizer + send summary)        │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                         │
                         │ Multiple API Integrations
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Third-Party Services                           │
│                                                                  │
│  [Google Calendar] [Apple Calendar] [Outlook] [Notion]          │
│  [Todoist] [Trello] [Slack] [Email] [SMS] [Zapier] [IFTTT]     │
│  [Airtable] [Asana] [Monday.com] [ClickUp] [Linear]             │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation with n8n

#### Setup Infrastructure
```yaml
# docker-compose.yml for self-hosted n8n
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=America/New_York
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n/workflows:/home/node/.n8n/workflows

volumes:
  n8n_data:
```

#### App Integration Layer
```typescript
// functions/src/services/n8n-integration.ts

interface N8nWebhookPayload {
  eventType: 'event_extracted' | 'decision_made' | 'deadline_created' | 'rsvp_received';
  data: any;
  userId: string;
  conversationId: string;
  timestamp: string;
}

export async function triggerN8nWorkflow(
  workflowType: string,
  data: any
): Promise<void> {
  const webhookUrl = `${process.env.N8N_HOST}/webhook/${workflowType}`;
  
  const payload: N8nWebhookPayload = {
    eventType: workflowType as any,
    data,
    userId: data.userId,
    conversationId: data.conversationId,
    timestamp: new Date().toISOString()
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ n8n workflow triggered:', result);
    
  } catch (error) {
    console.error('❌ n8n webhook error:', error);
    // Fallback: Continue with direct integration
    await fallbackDirectIntegration(workflowType, data);
  }
}

// Example: Trigger n8n when event is extracted
export const onEventExtracted = functions.firestore
  .document('extractedEvents/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data() as CalendarEvent;
    
    // Check if user has n8n integrations enabled
    const user = await getUser(event.hostUserId);
    if (!user.preferences.n8nEnabled) {
      return;  // Use direct integration
    }
    
    // Trigger n8n workflow
    await triggerN8nWorkflow('event-extracted', {
      eventId: context.params.eventId,
      ...event
    });
  });
```

#### n8n Workflow Example (JSON Config)
```json
{
  "name": "Calendar Event Sync",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "event-extracted",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json[\"data\"][\"status\"]}}",
              "operation": "equals",
              "value2": "confirmed"
            }
          ]
        }
      },
      "name": "Filter Confirmed Only",
      "type": "n8n-nodes-base.if",
      "position": [450, 300]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "resource": "event",
        "operation": "create",
        "calendarId": "primary",
        "start": "={{$json[\"data\"][\"date\"]}}",
        "end": "={{$json[\"data\"][\"date\"]}}",
        "summary": "={{$json[\"data\"][\"title\"]}}",
        "description": "Extracted from conversation",
        "location": "={{$json[\"data\"][\"location\"]}}"
      },
      "name": "Google Calendar",
      "type": "n8n-nodes-base.googleCalendar",
      "credentials": {
        "googleCalendarOAuth2Api": {
          "id": "1",
          "name": "Google Calendar OAuth"
        }
      },
      "position": [650, 300]
    },
    {
      "parameters": {
        "url": "={{$env.APP_WEBHOOK_URL}}/calendar-sync-status",
        "options": {
          "bodyParameters": {
            "parameters": [
              {
                "name": "eventId",
                "value": "={{$json[\"data\"][\"eventId\"]}}"
              },
              {
                "name": "googleCalendarId",
                "value": "={{$json[\"id\"]}}"
              },
              {
                "name": "status",
                "value": "synced"
              }
            ]
          }
        }
      },
      "name": "Notify App",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Filter Confirmed Only", "type": "main", "index": 0}]]
    },
    "Filter Confirmed Only": {
      "main": [[{"node": "Google Calendar", "type": "main", "index": 0}]]
    },
    "Google Calendar": {
      "main": [[{"node": "Notify App", "type": "main", "index": 0}]]
    }
  }
}
```

### Advanced Use Cases with n8n

#### 1. Multi-Calendar Sync
```
Event Created 
    ↓
n8n Workflow:
    ├─→ Google Calendar (personal)
    ├─→ Apple Calendar (family shared)
    ├─→ Outlook (work)
    └─→ Family Dashboard (Notion)
```

#### 2. Smart Task Distribution
```
Decision with Action Items
    ↓
n8n Workflow:
    ├─→ Parse action items with AI
    ├─→ Assign based on person mentioned
    ├─→ For Mom: Add to Todoist
    ├─→ For Dad: Add to Trello
    └─→ Notify via Slack DM
```

#### 3. RSVP Aggregation
```
RSVP Received
    ↓
n8n Workflow:
    ├─→ Update Google Sheets tracker
    ├─→ If 80% responded: Send Slack summary
    ├─→ If 100% responded: Finalize event in all calendars
    └─→ If deadline passed: Send reminder to non-responders
```

#### 4. Deadline Cascade
```
Deadline Created
    ↓
n8n Workflow:
    ├─→ Create Google Calendar event
    ├─→ Add to Todoist with subtasks
    ├─→ Schedule Slack reminders (24h, 2h before)
    └─→ If urgent: Send SMS via Twilio
```

### Decision Matrix: When to Use n8n

| Scenario | Native | n8n | Recommendation |
|----------|--------|-----|----------------|
| **Google Calendar only** | ✅ Simple | ❌ Overkill | Native |
| **2-3 integrations** | ⚠️ Moderate | ✅ Easy | Either |
| **5+ integrations** | ❌ Complex | ✅ Perfect | n8n |
| **Frequent changes** | ❌ Code changes | ✅ Visual editor | n8n |
| **Non-dev team members** | ❌ Need devs | ✅ Self-serve | n8n |
| **Low latency critical** | ✅ Direct | ❌ Extra hop | Native |
| **MVP/prototype** | ✅ Faster start | ⚠️ Infrastructure | Native |
| **Scale (10K+ users)** | ✅ Proven | ⚠️ Needs testing | Native |

### Recommended Implementation Path

#### **Phase 1: MVP (Week 1-8)**
**Use Native Integration for Google Calendar**
- Fastest to implement
- Fewer moving parts
- Validate user demand
- Easier to debug

#### **Phase 2: Expansion (Week 9-12)**
**Add n8n for Additional Integrations**
```typescript
// Feature flag for integration method
interface UserPreferences {
  integrations: {
    method: 'native' | 'n8n';
    enabled: {
      googleCalendar: boolean;
      appleCalendar?: boolean;   // Only via n8n
      outlook?: boolean;          // Only via n8n
      notion?: boolean;           // Only via n8n
      todoist?: boolean;          // Only via n8n
      slack?: boolean;            // Only via n8n
    };
  };
}
```

**Gradual Migration:**
1. Deploy n8n for beta users
2. Mirror Google Calendar integration through n8n
3. Test in parallel with native integration
4. Add new integrations (Notion, Todoist, etc.)
5. Migrate stable users to n8n
6. Keep native as fallback

#### **Phase 3: Enterprise (Month 4+)**
**Hybrid Architecture**
```
Critical Path (low latency):
  App → Native → Google Calendar

Power Users (many integrations):
  App → n8n → [10+ services]

Automation (scheduled tasks):
  n8n Cron → Process → Multiple services
```

### Cost Comparison

| Approach | Infrastructure | Development | Monthly (100 users) |
|----------|---------------|-------------|---------------------|
| **Native Only** | Firebase only | 40 hours | $0 (free tier) |
| **n8n Self-Hosted** | Firebase + Docker VPS | 20 hours (faster) | $10-20 (VPS) |
| **n8n Cloud** | Firebase + n8n SaaS | 10 hours (fastest) | $20-50 (n8n plan) |

### Monitoring & Observability with n8n

```typescript
// Track n8n workflow success rate
interface N8nMetrics {
  workflowExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  failedWorkflows: Array<{
    workflowId: string;
    error: string;
    timestamp: Date;
  }>;
}

// n8n provides webhook for execution status
export const handleN8nWebhook = functions.https.onRequest(
  async (req, res) => {
    const { workflowId, success, executionTime, error } = req.body;
    
    await firestore.collection('n8nMetrics').add({
      workflowId,
      success,
      executionTime,
      error: error || null,
      timestamp: FieldValue.serverTimestamp()
    });
    
    if (!success) {
      // Alert on failure
      await sendAdminAlert(`n8n workflow failed: ${workflowId}`);
    }
    
    res.sendStatus(200);
  }
);
```

### Final Recommendation

**Start Native, Evolve to Hybrid**

1. **MVP (Now - Week 8)**: Native Google Calendar integration
   - Validate feature utility
   - Build user base
   - Keep architecture simple

2. **Enhancement (Week 9-16)**: Add n8n in parallel
   - Deploy n8n for power users
   - Add Notion, Todoist, Slack integrations
   - Gather feedback on multi-service value

3. **Scale (Month 5+)**: Hybrid approach
   - Keep native for Google Calendar (proven, fast)
   - Use n8n for "long tail" integrations
   - Let users choose their integration suite

**Key Insight**: n8n is **phenomenal for breadth** (adding many integrations quickly), but native is **better for depth** (single integration with high reliability). For busy parents, start with depth (Google Calendar done well), then add breadth as they demand more integrations.

---

## Architecture Preparation for n8n Integration

### Design Principles for Easy n8n Transition

To ensure a smooth transition from native to n8n (or hybrid), we need to **architect for flexibility from day one**.

### 1. Event-Driven Architecture Pattern

#### Current Risk: Tight Coupling
```typescript
// ❌ BAD: Direct API calls embedded in feature logic
export const extractCalendarEvents = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const event = await extractWithAI(snap.data());
    
    // Directly calling Google Calendar API - TIGHTLY COUPLED
    const googleCalendar = google.calendar({ version: 'v3', auth });
    await googleCalendar.events.insert({ ... });
  });
```

**Problem**: Can't swap Google Calendar integration without rewriting the entire function.

#### Solution: Event Bus Pattern
```typescript
// ✅ GOOD: Emit events, let handlers decide what to do
export const extractCalendarEvents = functions.firestore
  .document('conversations/{conversationId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const event = await extractWithAI(snap.data());
    
    // Save to Firestore first (single source of truth)
    await firestore.collection('extractedEvents').add(event);
    
    // Emit domain event - don't care who handles it
    await emitEvent('calendar.event.extracted', {
      eventId: event.id,
      conversationId: context.params.conversationId,
      event: event
    });
  });

// Separate handler for integrations - EASILY SWAPPABLE
export const handleEventExtracted = functions.firestore
  .document('extractedEvents/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data();
    
    // Route based on configuration
    await routeToIntegration('calendar.event.extracted', event);
  });
```

### 2. Integration Abstraction Layer

#### Create Integration Router
```typescript
// functions/src/integrations/router.ts

interface IntegrationConfig {
  provider: 'native' | 'n8n';
  enabled: boolean;
  fallbackToNative: boolean;
}

interface IntegrationEvent {
  type: string;
  data: any;
  userId: string;
  conversationId: string;
  metadata?: Record<string, any>;
}

export class IntegrationRouter {
  /**
   * Routes integration events to the appropriate handler
   * Allows switching between native and n8n without code changes
   */
  async route(event: IntegrationEvent): Promise<void> {
    const config = await this.getIntegrationConfig(event.userId);
    
    try {
      if (config.provider === 'n8n' && config.enabled) {
        await this.routeToN8n(event);
      } else {
        await this.routeToNative(event);
      }
    } catch (error) {
      console.error(`Integration routing failed:`, error);
      
      // Fallback to native if n8n fails
      if (config.provider === 'n8n' && config.fallbackToNative) {
        console.log('Falling back to native integration');
        await this.routeToNative(event);
      }
    }
  }
  
  private async routeToN8n(event: IntegrationEvent): Promise<void> {
    // Send to n8n webhook
    const webhookUrl = this.getN8nWebhookUrl(event.type);
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`
      },
      body: JSON.stringify(event)
    });
  }
  
  private async routeToNative(event: IntegrationEvent): Promise<void> {
    // Route to native integration handlers
    const handler = this.getNativeHandler(event.type);
    await handler(event);
  }
  
  private async getIntegrationConfig(userId: string): Promise<IntegrationConfig> {
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    return userDoc.data()?.integrations || {
      provider: 'native',
      enabled: true,
      fallbackToNative: true
    };
  }
  
  private getN8nWebhookUrl(eventType: string): string {
    // Map event types to n8n webhook URLs
    const webhookMap = {
      'calendar.event.extracted': '/webhook/event-extracted',
      'decision.made': '/webhook/decision-made',
      'deadline.created': '/webhook/deadline-created',
      'rsvp.received': '/webhook/rsvp-received'
    };
    
    const path = webhookMap[eventType];
    return `${process.env.N8N_HOST}${path}`;
  }
  
  private getNativeHandler(eventType: string): Function {
    // Map event types to native handlers
    const handlerMap = {
      'calendar.event.extracted': exportToGoogleCalendar,
      'decision.made': notifyDecisionMade,
      'deadline.created': scheduleDeadlineReminders,
      'rsvp.received': updateRSVPTracker
    };
    
    return handlerMap[eventType];
  }
}

// Global instance
export const integrationRouter = new IntegrationRouter();
```

#### Usage in Cloud Functions
```typescript
// functions/src/calendar/onEventExtracted.ts

export const onEventExtracted = functions.firestore
  .document('extractedEvents/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data() as CalendarEvent;
    
    // Use router instead of direct integration
    await integrationRouter.route({
      type: 'calendar.event.extracted',
      data: event,
      userId: event.hostUserId,
      conversationId: event.conversationId
    });
  });
```

**This single change enables:**
- ✅ Zero-code switch from native → n8n
- ✅ Per-user integration preferences
- ✅ A/B testing native vs n8n
- ✅ Automatic fallback if n8n fails
- ✅ Gradual migration

### 3. Standardized Event Schema

#### Define Domain Events
```typescript
// functions/src/integrations/events.ts

export namespace DomainEvents {
  export interface CalendarEventExtracted {
    type: 'calendar.event.extracted';
    version: 'v1';
    timestamp: string;
    data: {
      eventId: string;
      conversationId: string;
      messageId: string;
      event: {
        title: string;
        date: string;
        time?: string;
        location?: string;
        participants: string[];
        status: 'proposed' | 'confirmed';
      };
    };
    metadata: {
      userId: string;
      extractionMethod: 'ai' | 'manual';
      confidence?: number;
    };
  }
  
  export interface DecisionMade {
    type: 'decision.made';
    version: 'v1';
    timestamp: string;
    data: {
      decisionId: string;
      conversationId: string;
      summary: string;
      outcome: string;
      actionItems: Array<{
        task: string;
        assignedTo?: string;
      }>;
    };
    metadata: {
      participants: string[];
      confidence: number;
    };
  }
  
  export interface DeadlineCreated {
    type: 'deadline.created';
    version: 'v1';
    timestamp: string;
    data: {
      deadlineId: string;
      conversationId: string;
      task: string;
      deadline: string;
      assignedTo?: string;
      priority: 'urgent' | 'high' | 'normal';
    };
    metadata: {
      userId: string;
      extractionMethod: 'ai' | 'manual';
    };
  }
  
  export interface RSVPReceived {
    type: 'rsvp.received';
    version: 'v1';
    timestamp: string;
    data: {
      trackerId: string;
      eventId: string;
      userId: string;
      response: 'yes' | 'no' | 'maybe';
      messageId: string;
    };
    metadata: {
      conversationId: string;
      totalInvitees: number;
      totalResponded: number;
    };
  }
}

// Type union for all events
export type DomainEvent = 
  | DomainEvents.CalendarEventExtracted
  | DomainEvents.DecisionMade
  | DomainEvents.DeadlineCreated
  | DomainEvents.RSVPReceived;
```

**Why this matters:**
- ✅ n8n receives consistent, well-structured data
- ✅ Versioning allows schema evolution
- ✅ Type safety for native handlers
- ✅ Self-documenting API for n8n workflows
- ✅ Easy to mock for testing

### 4. Webhook Callback Architecture

#### n8n → App Communication
```typescript
// functions/src/webhooks/n8n-callbacks.ts

/**
 * n8n workflows POST back to this endpoint with results
 * This allows bidirectional communication
 */
export const handleN8nCallback = functions.https.onRequest(
  async (req, res) => {
    // Verify request is from n8n
    const signature = req.headers['x-n8n-signature'];
    if (!verifyN8nSignature(signature, req.body)) {
      res.status(401).send('Invalid signature');
      return;
    }
    
    const { 
      eventType, 
      eventId, 
      status, 
      result, 
      error 
    } = req.body;
    
    try {
      // Update Firestore with integration result
      await updateIntegrationStatus(eventType, eventId, {
        status,
        result,
        error,
        processedAt: FieldValue.serverTimestamp()
      });
      
      // Handle specific event types
      switch (eventType) {
        case 'calendar.event.extracted':
          await handleCalendarSyncResult(eventId, result);
          break;
        
        case 'decision.made':
          await handleDecisionProcessed(eventId, result);
          break;
        
        case 'deadline.created':
          await handleDeadlineScheduled(eventId, result);
          break;
      }
      
      res.sendStatus(200);
      
    } catch (error) {
      console.error('n8n callback error:', error);
      res.status(500).send('Processing failed');
    }
  }
);

async function handleCalendarSyncResult(
  eventId: string, 
  result: any
): Promise<void> {
  // Example: n8n synced to Google Calendar, update our record
  if (result.googleCalendarId) {
    await firestore.collection('extractedEvents').doc(eventId).update({
      googleCalendarId: result.googleCalendarId,
      googleCalendarSyncedAt: FieldValue.serverTimestamp(),
      syncStatus: 'synced',
      syncedVia: 'n8n'
    });
  }
  
  // If n8n also synced to Notion
  if (result.notionPageId) {
    await firestore.collection('extractedEvents').doc(eventId).update({
      notionPageId: result.notionPageId,
      notionSyncedAt: FieldValue.serverTimestamp()
    });
  }
}
```

#### n8n Workflow Configuration
```json
{
  "nodes": [
    {
      "name": "Receive Event",
      "type": "n8n-nodes-base.webhook"
    },
    {
      "name": "Google Calendar",
      "type": "n8n-nodes-base.googleCalendar"
    },
    {
      "name": "Notion",
      "type": "n8n-nodes-base.notion"
    },
    {
      "name": "Report Back to App",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-app.com/webhooks/n8n-callback",
        "method": "POST",
        "body": {
          "eventType": "={{$json['type']}}",
          "eventId": "={{$json['data']['eventId']}}",
          "status": "success",
          "result": {
            "googleCalendarId": "={{$node['Google Calendar'].json['id']}}",
            "notionPageId": "={{$node['Notion'].json['id']}}"
          }
        }
      }
    }
  ]
}
```

### 5. Firestore Schema Extensions

#### Integration Tracking Collection
```typescript
// /integrationEvents/{eventId}
interface IntegrationEvent {
  eventId: string;
  eventType: string;
  userId: string;
  conversationId: string;
  
  // Source data
  sourceData: any;
  
  // Routing
  routedTo: 'native' | 'n8n';
  routedAt: Timestamp;
  
  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // Results
  nativeResult?: {
    success: boolean;
    data?: any;
    error?: string;
    completedAt: Timestamp;
  };
  
  n8nResult?: {
    workflowId: string;
    executionId: string;
    success: boolean;
    data?: any;
    error?: string;
    completedAt: Timestamp;
  };
  
  // Fallback tracking
  fallbackUsed: boolean;
  fallbackReason?: string;
  
  // Performance
  processingTimeMs?: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### User Integration Preferences
```typescript
// Extension to /users/{userId}
interface UserIntegrationPreferences {
  integrations: {
    // Global provider preference
    defaultProvider: 'native' | 'n8n';
    
    // Per-feature overrides
    calendar: {
      provider: 'native' | 'n8n';
      enabled: boolean;
      
      // n8n-specific config
      n8n?: {
        workflows: {
          eventExtracted: string;  // n8n workflow ID
          eventUpdated: string;
          eventDeleted: string;
        };
      };
      
      // Native-specific config
      native?: {
        services: Array<'google' | 'apple' | 'outlook'>;
        primaryService: 'google';
      };
    };
    
    decisions: {
      provider: 'native' | 'n8n';
      enabled: boolean;
    };
    
    deadlines: {
      provider: 'native' | 'n8n';
      enabled: boolean;
    };
    
    rsvp: {
      provider: 'native' | 'n8n';
      enabled: boolean;
    };
    
    // Fallback configuration
    fallback: {
      enabled: boolean;
      fallbackToNative: boolean;  // If n8n fails, use native
      retryCount: number;
      retryDelayMs: number;
    };
    
    // Feature flags for gradual rollout
    betaFeatures: {
      n8nIntegrations: boolean;
      multiServiceSync: boolean;
    };
  };
}
```

### 6. Migration Strategy with Feature Flags

#### Firestore-Based Feature Flags
```typescript
// /featureFlags/integrations
interface IntegrationFeatureFlags {
  n8n: {
    enabled: boolean;
    rolloutPercentage: number;  // 0-100
    allowedUserIds: string[];   // Beta testers
    disallowedUserIds: string[]; // Blocklist
    minAppVersion: string;      // Require app update
  };
  
  native: {
    enabled: boolean;
    gracefulShutdown: boolean;  // Allow existing native to finish
  };
  
  // Per-feature rollout
  features: {
    calendar: {
      n8nEnabled: boolean;
      rolloutPercentage: number;
    };
    decisions: {
      n8nEnabled: boolean;
      rolloutPercentage: number;
    };
    // ... etc
  };
}

export async function shouldUseN8n(
  userId: string,
  feature: string
): Promise<boolean> {
  const flags = await getFeatureFlags();
  
  // Check if n8n globally enabled
  if (!flags.n8n.enabled) return false;
  
  // Check if user is in beta
  if (flags.n8n.allowedUserIds.includes(userId)) return true;
  
  // Check if user is blocked
  if (flags.n8n.disallowedUserIds.includes(userId)) return false;
  
  // Check feature-specific rollout
  const featureFlags = flags.features[feature];
  if (!featureFlags?.n8nEnabled) return false;
  
  // Rollout percentage (deterministic based on userId)
  const userHash = hashUserId(userId);
  const userPercentile = userHash % 100;
  
  return userPercentile < featureFlags.rolloutPercentage;
}
```

#### Gradual Migration Example
```typescript
// Week 1: 5% rollout
await updateFeatureFlags({
  'features.calendar.rolloutPercentage': 5
});

// Week 2: 10% if no issues
await updateFeatureFlags({
  'features.calendar.rolloutPercentage': 10
});

// Week 4: 50% rollout
await updateFeatureFlags({
  'features.calendar.rolloutPercentage': 50
});

// Week 8: 100% rollout (fully migrated)
await updateFeatureFlags({
  'features.calendar.rolloutPercentage': 100
});
```

### 7. Testing Strategy for Dual Integration

#### Integration Contract Tests
```typescript
// functions/src/integrations/__tests__/contract.test.ts

describe('Integration Contract Tests', () => {
  const testEvent: DomainEvents.CalendarEventExtracted = {
    type: 'calendar.event.extracted',
    version: 'v1',
    timestamp: new Date().toISOString(),
    data: {
      eventId: 'test-123',
      conversationId: 'conv-456',
      messageId: 'msg-789',
      event: {
        title: 'Soccer Practice',
        date: '2025-10-25',
        time: '16:00',
        location: 'Park Field',
        participants: ['user1', 'user2'],
        status: 'confirmed'
      }
    },
    metadata: {
      userId: 'user1',
      extractionMethod: 'ai',
      confidence: 0.95
    }
  };
  
  test('Native integration handles standard event', async () => {
    const result = await integrationRouter.routeToNative(testEvent);
    expect(result.success).toBe(true);
    expect(result.googleCalendarId).toBeDefined();
  });
  
  test('n8n integration handles standard event', async () => {
    const result = await integrationRouter.routeToN8n(testEvent);
    expect(result.success).toBe(true);
    expect(result.webhookDelivered).toBe(true);
  });
  
  test('Both integrations produce equivalent results', async () => {
    const nativeResult = await integrationRouter.routeToNative(testEvent);
    const n8nResult = await integrationRouter.routeToN8n(testEvent);
    
    // Should both create calendar events
    expect(nativeResult.success).toBe(n8nResult.success);
  });
  
  test('Fallback works when n8n fails', async () => {
    // Simulate n8n failure
    mockN8nToFail();
    
    const result = await integrationRouter.route({
      ...testEvent,
      userId: 'user-with-n8n-enabled'
    });
    
    // Should fall back to native
    expect(result.usedFallback).toBe(true);
    expect(result.success).toBe(true);
  });
});
```

### 8. Monitoring & Observability

#### Integration Metrics Dashboard
```typescript
// functions/src/monitoring/integration-metrics.ts

interface IntegrationMetrics {
  // Routing
  routedToNative: number;
  routedToN8n: number;
  
  // Success rates
  nativeSuccessRate: number;
  n8nSuccessRate: number;
  
  // Performance
  nativeAvgLatencyMs: number;
  n8nAvgLatencyMs: number;
  
  // Failures
  nativeFailures: number;
  n8nFailures: number;
  fallbacksUsed: number;
  
  // Cost tracking
  nativeCost: number;
  n8nCost: number;
}

export const aggregateMetrics = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const hourAgo = Timestamp.fromDate(
      new Date(Date.now() - 3600000)
    );
    
    const events = await firestore
      .collection('integrationEvents')
      .where('createdAt', '>', hourAgo)
      .get();
    
    const metrics = calculateMetrics(events);
    
    await firestore
      .collection('integrationMetrics')
      .add({
        ...metrics,
        timestamp: FieldValue.serverTimestamp(),
        period: 'hourly'
      });
    
    // Alert if n8n success rate drops below 95%
    if (metrics.n8nSuccessRate < 0.95) {
      await sendAdminAlert(
        'n8n integration degraded',
        `Success rate: ${metrics.n8nSuccessRate * 100}%`
      );
    }
  });
```

### 9. Documentation for n8n Workflows

#### Workflow Documentation Template
```typescript
// /n8n-workflows/README.md

/**
 * n8n Workflow: Calendar Event Sync
 * 
 * Webhook: /webhook/event-extracted
 * Trigger: When calendar event is extracted from message
 * 
 * Input Schema:
 * {
 *   "type": "calendar.event.extracted",
 *   "data": {
 *     "eventId": "string",
 *     "event": {
 *       "title": "string",
 *       "date": "YYYY-MM-DD",
 *       "time": "HH:MM" (optional)
 *     }
 *   }
 * }
 * 
 * Actions:
 * 1. Create event in Google Calendar
 * 2. Create page in Notion (family dashboard)
 * 3. Send Slack notification to family channel
 * 4. POST result back to app
 * 
 * Callback URL: /webhooks/n8n-callback
 * 
 * Expected Callback:
 * {
 *   "eventType": "calendar.event.extracted",
 *   "eventId": "string",
 *   "status": "success",
 *   "result": {
 *     "googleCalendarId": "string",
 *     "notionPageId": "string"
 *   }
 * }
 */
```

### 10. Refactoring Checklist

To prepare your existing code for n8n integration:

#### ✅ Phase 1: Decouple Integration Logic (Week 1)
- [ ] Extract all Google Calendar API calls into separate module
- [ ] Create `IntegrationRouter` class
- [ ] Define `DomainEvent` types
- [ ] Implement event emitter pattern
- [ ] Add integration tracking to Firestore

#### ✅ Phase 2: Add Abstraction Layer (Week 2)
- [ ] Implement `routeToNative()` and `routeToN8n()` methods
- [ ] Add webhook callback endpoint
- [ ] Create integration config schema
- [ ] Add feature flags for n8n
- [ ] Write contract tests

#### ✅ Phase 3: Deploy n8n Infrastructure (Week 3)
- [ ] Set up n8n Docker container
- [ ] Configure OAuth for integrations
- [ ] Create initial workflows
- [ ] Test webhook delivery
- [ ] Set up monitoring

#### ✅ Phase 4: Gradual Migration (Week 4-8)
- [ ] Enable n8n for beta users (5%)
- [ ] Monitor metrics and errors
- [ ] Increase rollout incrementally
- [ ] Disable native for migrated users
- [ ] Complete migration or run hybrid

---

## Key Architectural Changes Summary

### Before (Tightly Coupled)
```
Message → AI Extraction → Direct Google Calendar API Call
```
**Problem**: Can't swap integrations without rewriting code

### After (Event-Driven + Abstraction)
```
Message → AI Extraction → Domain Event → Integration Router
                                            ↓
                                    Native Handler  OR  n8n Webhook
                                            ↓                ↓
                                    Google Calendar    [10+ Services]
```
**Benefits**:
- ✅ Zero-code switch between native/n8n
- ✅ Per-user integration preferences
- ✅ Gradual migration with feature flags
- ✅ Automatic fallback
- ✅ Easy A/B testing

### Code Changes Required

**Minimal changes to existing code:**
```typescript
// BEFORE:
await exportToGoogleCalendar(event);

// AFTER:
await integrationRouter.route({
  type: 'calendar.event.extracted',
  data: event,
  userId: event.hostUserId
});
```

**That's it!** The router handles everything else.

---

## Migration Timeline

| Week | Task | Effort |
|------|------|--------|
| 1 | Implement IntegrationRouter | 8 hours |
| 2 | Add webhook callbacks | 4 hours |
| 3 | Deploy n8n + create workflows | 8 hours |
| 4 | Beta testing (5% users) | 4 hours |
| 5-8 | Gradual rollout | 2 hours/week |

**Total: ~30 hours** to be fully n8n-ready

---

## Final Recommendation

### Implement These Changes NOW (Even if not using n8n yet)

1. **IntegrationRouter** - Adds flexibility at minimal cost
2. **Domain Events** - Makes code cleaner regardless
3. **Feature Flags** - Enables controlled rollouts
4. **Integration Tracking** - Better observability

**These changes make your code better even if you never use n8n.**

### When to Add n8n

**After validating Google Calendar integration:**
- Users love it ✅
- Requests for more integrations ✅
- Team bandwidth for n8n infrastructure ✅

Then you're **one config change away** from n8n integration! 🚀

---

## Integration Points

### Device Calendar Integration

```typescript
import * as Calendar from 'expo-calendar';

async function exportToDeviceCalendar(
  event: CalendarEvent
): Promise<boolean> {
  try {
    // Request permissions
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Calendar permission denied');
    }
    
    // Get default calendar
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT
    );
    const defaultCalendar = calendars.find(cal => cal.isPrimary) || calendars[0];
    
    if (!defaultCalendar) {
      throw new Error('No calendar available');
    }
    
    // Create event
    const deviceEventId = await Calendar.createEventAsync(defaultCalendar.id, {
      title: event.title,
      startDate: event.date.toDate(),
      endDate: event.endTime
        ? parseDateTime(event.date, event.endTime)
        : addHours(event.date.toDate(), 1),
      location: event.location || undefined,
      notes: `Created from conversation. Original message: ${event.messageId}`,
      alarms: [
        { relativeOffset: -60 },  // 1 hour before
        { relativeOffset: -15 }   // 15 minutes before
      ]
    });
    
    // Update Firestore with device calendar reference
    await firestore.collection('extractedEvents').doc(event.id).update({
      deviceCalendarId: deviceEventId,
      syncedToDeviceAt: FieldValue.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Failed to export to device calendar:', error);
    return false;
  }
}
```

### Push Notification Integration

```typescript
interface EnhancedNotification {
  title: string;
  body: string;
  data: {
    type: 'calendar' | 'decision' | 'priority' | 'rsvp' | 'deadline' | 'conflict';
    referenceId: string;
    conversationId: string;
    actionable?: boolean;
  };
  categoryIdentifier?: string;  // iOS notification category
  sound?: string;
  priority?: 'default' | 'high';
  badge?: number;
}

// iOS Notification Categories (for actionable notifications)
const NOTIFICATION_CATEGORIES = {
  calendar: {
    id: 'calendar_event',
    actions: [
      { id: 'confirm', title: 'Confirm', options: { foreground: false } },
      { id: 'view', title: 'View', options: { foreground: true } }
    ]
  },
  rsvp: {
    id: 'rsvp_request',
    actions: [
      { id: 'yes', title: 'Yes', options: { foreground: false } },
      { id: 'no', title: 'No', options: { foreground: false } },
      { id: 'maybe', title: 'Maybe', options: { foreground: false } }
    ]
  },
  deadline: {
    id: 'deadline_reminder',
    actions: [
      { id: 'complete', title: 'Mark Complete', options: { foreground: false } },
      { id: 'snooze', title: 'Snooze 1hr', options: { foreground: false } }
    ]
  },
  conflict: {
    id: 'scheduling_conflict',
    actions: [
      { id: 'resolve', title: 'Resolve', options: { foreground: true } },
      { id: 'ignore', title: 'Ignore', options: { foreground: false } }
    ]
  }
};
```

---

## Performance & Scalability

### AI Call Optimization

#### Caching Strategy
```typescript
interface AICache {
  cacheKey: string;              // Hash of prompt + input
  result: any;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  hitCount: number;
}

async function getCachedAIResult(
  cacheKey: string
): Promise<any | null> {
  const cached = await firestore
    .collection('aiCache')
    .doc(cacheKey)
    .get();
  
  if (!cached.exists) return null;
  
  const data = cached.data() as AICache;
  
  // Check if expired
  if (data.expiresAt.toDate() < new Date()) {
    await cached.ref.delete();
    return null;
  }
  
  // Update hit count
  await cached.ref.update({
    hitCount: FieldValue.increment(1)
  });
  
  return data.result;
}

async function callAIWithCaching(
  prompt: string,
  input: string,
  cacheDuration: number = 3600  // 1 hour default
): Promise<any> {
  const cacheKey = hashPromptAndInput(prompt, input);
  
  // Try cache first
  const cached = await getCachedAIResult(cacheKey);
  if (cached) {
    console.log('✅ AI cache hit:', cacheKey);
    return cached;
  }
  
  // Call AI
  console.log('🤖 Calling Claude API:', cacheKey);
  const result = await callClaudeAPI(prompt, input);
  
  // Store in cache
  await firestore.collection('aiCache').doc(cacheKey).set({
    cacheKey,
    result,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(
      new Date(Date.now() + cacheDuration * 1000)
    ),
    hitCount: 0
  });
  
  return result;
}
```

#### Rate Limiting
```typescript
interface RateLimit {
  userId: string;
  aiCallsToday: number;
  dailyLimit: number;
  resetAt: Timestamp;
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const rateLimitRef = firestore.collection('rateLimits').doc(userId);
  const rateLimitDoc = await rateLimitRef.get();
  
  if (!rateLimitDoc.exists) {
    // Initialize rate limit
    await rateLimitRef.set({
      userId,
      aiCallsToday: 0,
      dailyLimit: 50,  // Default limit
      resetAt: Timestamp.fromDate(
        setHours(addDays(new Date(), 1), 0)  // Next midnight
      )
    });
    return true;
  }
  
  const rateLimit = rateLimitDoc.data() as RateLimit;
  
  // Check if reset needed
  if (rateLimit.resetAt.toDate() <= new Date()) {
    await rateLimitRef.update({
      aiCallsToday: 0,
      resetAt: Timestamp.fromDate(
        setHours(addDays(new Date(), 1), 0)
      )
    });
    return true;
  }
  
  // Check if under limit
  if (rateLimit.aiCallsToday >= rateLimit.dailyLimit) {
    console.warn('Rate limit exceeded for user:', userId);
    return false;
  }
  
  // Increment counter
  await rateLimitRef.update({
    aiCallsToday: FieldValue.increment(1)
  });
  
  return true;
}
```

### Database Indexing

```javascript
// firestore.indexes.json
{
  "indexes": [
    // Calendar events by conversation and date
    {
      "collectionGroup": "extractedEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    // Events by participant and date (for conflict detection)
    {
      "collectionGroup": "extractedEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "participants", "arrayConfig": "CONTAINS" },
        { "fieldPath": "date", "order": "ASCENDING" }
      ]
    },
    // Decisions by conversation
    {
      "collectionGroup": "decisions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "conversationId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    // Deadlines by user and status
    {
      "collectionGroup": "deadlines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "assignedTo", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "deadline", "order": "ASCENDING" }
      ]
    },
    // Scheduled reminders for processing
    {
      "collectionGroup": "scheduledReminders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "reminderTime", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## Security & Privacy

### Security Rules Extensions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Extracted events - only conversation participants can access
    match /extractedEvents/{eventId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.participants;
      allow delete: if request.auth != null && 
                       request.auth.uid in resource.data.participants;
    }
    
    // Decisions - only conversation participants
    match /decisions/{decisionId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.decidedBy;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.decidedBy;
    }
    
    // Deadlines - creator and assignee can access
    match /deadlines/{deadlineId} {
      allow read: if request.auth != null && (
                     request.auth.uid == resource.data.assignedTo ||
                     request.auth.uid == resource.data.assignedBy
                  );
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
                       request.auth.uid == resource.data.assignedTo ||
                       request.auth.uid == resource.data.assignedBy
                     );
    }
    
    // RSVP trackers - conversation participants
    match /rsvpTrackers/{trackerId} {
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.invitees;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.invitees;
    }
    
    // Scheduling conflicts - participants only
    match /schedulingConflicts/{conflictId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Rate limits - user can only read their own
    match /rateLimits/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if false;  // Only Cloud Functions can write
    }
  }
}
```

### Privacy Considerations

1. **No Third-Party AI Training**: Data never used to train external AI models
2. **Local Processing First**: Keyword filtering happens client-side when possible
3. **Minimal Data Sharing**: Only necessary message content sent to AI
4. **User Control**: All AI features can be disabled per user
5. **Data Retention**: AI cache expires after 24 hours
6. **Audit Trail**: All AI processing logged for transparency

---

## Cost Management

### Estimated Monthly Costs (100 Active Users)

```typescript
interface CostEstimate {
  feature: string;
  avgCallsPerUserPerMonth: number;
  totalCalls: number;
  costPerCall: number;
  monthlyCost: number;
}

const COST_ESTIMATES: CostEstimate[] = [
  {
    feature: 'Calendar Extraction',
    avgCallsPerUserPerMonth: 30,
    totalCalls: 3000,
    costPerCall: 0.003,  // Claude Sonnet 4.5
    monthlyCost: 9.00
  },
  {
    feature: 'Decision Summarization',
    avgCallsPerUserPerMonth: 5,
    totalCalls: 500,
    costPerCall: 0.003,
    monthlyCost: 1.50
  },
  {
    feature: 'Priority Analysis',
    avgCallsPerUserPerMonth: 10,
    totalCalls: 1000,
    costPerCall: 0.003,
    monthlyCost: 3.00
  },
  {
    feature: 'Deadline Extraction',
    avgCallsPerUserPerMonth: 15,
    totalCalls: 1500,
    costPerCall: 0.003,
    monthlyCost: 4.50
  },
  {
    feature: 'Conflict Resolution',
    avgCallsPerUserPerMonth: 3,
    totalCalls: 300,
    costPerCall: 0.003,
    monthlyCost: 0.90
  }
];

// Total: ~$19/month for 100 users = $0.19 per user per month
```

### Cost Optimization Strategies

1. **Pre-Filtering**: Reduce AI calls by 70% through keyword detection
2. **Caching**: Reduce duplicate processing by 40%
3. **Batch Processing**: Decisions processed in scheduled jobs (not per message)
4. **User Limits**: 50 AI calls per user per day prevents abuse
5. **Progressive Rollout**: Enable features gradually to monitor costs

---

## Monitoring & Observability

### Key Metrics to Track

```typescript
interface AIMetrics {
  // Performance
  avgResponseTime: number;        // ms
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Accuracy
  extractionAccuracy: number;     // % (manual validation)
  falsePositiveRate: number;      // % (priority detection)
  
  // Usage
  totalAICalls: number;
  aiCallsByFeature: {
    [feature: string]: number;
  };
  cacheHitRate: number;           // %
  
  // Cost
  totalCost: number;              // USD
  costPerUser: number;
  costByFeature: {
    [feature: string]: number;
  };
  
  // Errors
  apiErrors: number;
  rateLimitHits: number;
  
  // User Engagement
  featuresEnabled: {
    [feature: string]: number;    // # of users with feature enabled
  };
  featureUsage: {
    [feature: string]: number;    // # of times feature used
  };
}
```

### Logging Strategy

```typescript
// Structured logging for AI calls
async function logAICall(
  feature: string,
  userId: string,
  success: boolean,
  responseTime: number,
  tokenUsage: number
) {
  await firestore.collection('aiLogs').add({
    feature,
    userId,
    success,
    responseTime,
    tokenUsage,
    cost: calculateCost(tokenUsage),
    timestamp: FieldValue.serverTimestamp()
  });
}

// Weekly aggregation for cost tracking
export const aggregateAIMetrics = functions.pubsub
  .schedule('every sunday 00:00')
  .onRun(async () => {
    const weekStart = subDays(new Date(), 7);
    
    const logs = await firestore
      .collection('aiLogs')
      .where('timestamp', '>=', Timestamp.fromDate(weekStart))
      .get();
    
    const metrics = aggregateLogs(logs);
    
    await firestore.collection('aiMetricsWeekly').add({
      weekStart: Timestamp.fromDate(weekStart),
      ...metrics
    });
    
    // Alert if costs are trending high
    if (metrics.totalCost > WEEKLY_COST_THRESHOLD) {
      await sendAdminAlert('AI costs exceeded threshold', metrics);
    }
  });
```

---

## Deployment Strategy

### Phased Rollout

```
Phase 1: Alpha Testing (Week 1)
- Enable for 10 hand-picked testers
- Features: Calendar extraction only
- Monitor: Accuracy, usage, costs
- Iterate: Refine prompts based on feedback

Phase 2: Beta Expansion (Week 2)
- Enable for 50 users
- Features: Calendar + Priority + RSVP
- Monitor: All metrics
- Iterate: Bug fixes, UX improvements

Phase 3: Limited GA (Week 3)
- Enable for all users in project
- Features: All 5 required features
- Monitor: Scale performance, costs
- Prepare: Advanced feature (Proactive Assistant)

Phase 4: Full Rollout (Week 4+)
- Enable advanced feature
- Monitor: Long-term stability
- Optimize: Ongoing prompt engineering
```

### Feature Flags Implementation

```typescript
// Cloud Firestore collection: /featureFlags
interface FeatureFlags {
  globalFlags: {
    aiEnabled: boolean;
    features: {
      [featureName: string]: boolean;
    };
  };
  userOverrides: {
    [userId: string]: {
      [featureName: string]: boolean;
    };
  };
  betaUsers: string[];            // User IDs in beta program
  alphaUsers: string[];           // User IDs in alpha program
}

async function isFeatureEnabled(
  userId: string,
  feature: string
): Promise<boolean> {
  const flags = await getFeatureFlags();
  
  // Check user-specific override first
  if (flags.userOverrides[userId]?.[feature] !== undefined) {
    return flags.userOverrides[userId][feature];
  }
  
  // Check if user is in beta/alpha and feature is beta/alpha
  const featureConfig = flags.features[feature];
  if (featureConfig.requiresBeta && !flags.betaUsers.includes(userId)) {
    return false;
  }
  if (featureConfig.requiresAlpha && !flags.alphaUsers.includes(userId)) {
    return false;
  }
  
  // Check global flag
  return flags.globalFlags.features[feature] ?? false;
}
```

---

## Appendix: Prompt Engineering Best Practices

### General Principles

1. **Be Specific**: Clearly define the task and expected output format
2. **Provide Context**: Give Claude relevant background information
3. **Use Examples**: Show desired output with 2-3 examples
4. **Structured Output**: Always request JSON for consistent parsing
5. **Error Handling**: Include fallback instructions for edge cases
6. **Confidence Scores**: Ask Claude to rate its own confidence
7. **Reasoning**: Request brief explanations for transparency

### Prompt Template

```typescript
const PROMPT_TEMPLATE = `You are a ${role} for busy parents. Your task is to ${task}.

CONTEXT:
${contextInformation}

INPUT:
${userInput}

INSTRUCTIONS:
${detailedInstructions}

OUTPUT FORMAT:
${jsonSchema}

EXAMPLES:
${examples}

EDGE CASES:
${edgeCaseHandling}

Now process the INPUT above.`;
```

### Testing & Iteration

1. **Manual Testing**: Test with 20+ real-world examples
2. **Edge Case Coverage**: Test ambiguous, missing, and malformed inputs
3. **A/B Testing**: Compare prompt variations
4. **Monitoring**: Track accuracy metrics in production
5. **Refinement**: Update prompts based on failure patterns

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| Oct 22, 2025 | 1.0 | Initial architecture for Busy Parent/Caregiver persona |

---

## Related Documentation

- [architecture.md](./architecture.md) - Core system architecture
- [phase2-parent-caregiver-tasks.md](./phase2-parent-caregiver-tasks.md) - Implementation task list
- [task-list.md](./task-list.md) - Main project task list

---

**Document Status:** Ready for Implementation  
**Target Users:** Busy Parents/Caregivers managing family schedules  
**Estimated Implementation:** 4-6 weeks
