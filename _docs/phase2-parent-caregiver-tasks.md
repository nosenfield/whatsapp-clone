# Phase 2: Busy Parent/Caregiver - Implementation Task List

**Persona:** Busy Parent/Caregiver  
**Parent Document:** [task-list.md](./task-list.md)  
**Architecture Reference:** [phase2-parent-caregiver-architecture.md](./phase2-parent-caregiver-architecture.md)  
**Last Updated:** October 22, 2025

---

## Overview

This document provides implementation tasks for specializing the messaging app for **Busy Parents/Caregivers** who need to coordinate schedules, manage multiple responsibilities, and track important dates/appointments.

### Selected Features

**Required Features (All 5):**
1. Smart calendar extraction
2. Decision summarization
3. Priority message highlighting
4. RSVP tracking
5. Deadline/reminder extraction

**Advanced Feature (Selected 1):**
- **A) Proactive Assistant:** Detects scheduling conflicts, suggests solutions

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Feature 1: Smart Calendar Extraction](#feature-1-smart-calendar-extraction)
3. [Feature 2: Decision Summarization](#feature-2-decision-summarization)
4. [Feature 3: Priority Message Highlighting](#feature-3-priority-message-highlighting)
5. [Feature 4: RSVP Tracking](#feature-4-rsvp-tracking)
6. [Feature 5: Deadline/Reminder Extraction](#feature-5-deadlinereminder-extraction)
7. [Advanced Feature: Proactive Assistant](#advanced-feature-proactive-assistant)
8. [Testing Checklist](#testing-checklist)
9. [Integration Checklist](#integration-checklist)

---

## Prerequisites

### AI Infrastructure Setup
- [ ] Ensure Anthropic API key configured in Firebase Functions
- [ ] Verify Cloud Function: `processAIAction` exists (from Phase 7)
- [ ] Verify Firestore collections exist:
  - [ ] `/actionQueue`
  - [ ] `/conversationContext`
  - [ ] `/extractedEvents` (new for calendar)
  - [ ] `/decisions` (new for decision tracking)

### Data Model Extensions
- [ ] Add new Firestore collections (see architecture doc)
- [ ] Update TypeScript types in `src/types/index.ts`:
  ```typescript
  interface CalendarEvent {
    id: string;
    conversationId: string;
    messageId: string;
    title: string;
    date: Timestamp;
    time?: string;
    location?: string;
    participants: string[];
    status: 'proposed' | 'confirmed' | 'cancelled';
    extractedBy: 'ai' | 'user';
    createdAt: Timestamp;
  }
  
  interface Decision {
    id: string;
    conversationId: string;
    messageIds: string[];
    summary: string;
    decidedBy: string[];
    outcome: string;
    relatedEvents?: string[];
    createdAt: Timestamp;
  }
  
  interface Priority {
    level: 'urgent' | 'high' | 'normal';
    reason: string;
    keywords: string[];
  }
  ```

### UI Component Library
- [ ] Create base components in `src/components/ai/`:
  - [ ] `CalendarEventCard.tsx`
  - [ ] `DecisionCard.tsx`
  - [ ] `PriorityBadge.tsx`
  - [ ] `RSVPWidget.tsx`
  - [ ] `DeadlineReminder.tsx`
  - [ ] `ConflictAlert.tsx`

---

## Feature 1: Smart Calendar Extraction

**Goal:** Automatically detect dates, times, and events in messages and extract them as structured calendar events

### Phase 1A: Event Detection Logic

#### Cloud Function Development
- [ ] Create Cloud Function: `functions/src/extractCalendarEvents.ts`
  ```typescript
  export const extractCalendarEvents = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const messageText = message.content.text;
      
      // Only process if message contains temporal keywords
      if (!hasTemporalKeywords(messageText)) return;
      
      try {
        const events = await detectEventsWithAI(messageText, message);
        
        if (events.length > 0) {
          await saveExtractedEvents(events, context.params.conversationId);
          await notifyParticipants(context.params.conversationId, events);
        }
      } catch (error) {
        console.error('Event extraction failed:', error);
      }
    });
  ```

#### AI Prompt Engineering
- [ ] Create event extraction prompt template:
  ```typescript
  const EVENT_EXTRACTION_PROMPT = `
  You are a calendar event extraction assistant. Analyze this message and extract any events, appointments, or scheduled activities.
  
  Message: "${messageText}"
  
  For each event found, return a JSON object with:
  - title: Brief event name
  - date: ISO 8601 date (YYYY-MM-DD)
  - time: HH:MM format (24-hour) or null if not specified
  - location: Physical or virtual location, or null
  - isProposed: true if tentative, false if confirmed
  
  Consider:
  - Explicit dates: "October 25th", "next Tuesday"
  - Relative dates: "tomorrow", "next week"
  - Implicit events: "dentist appointment", "soccer practice"
  - Time references: "at 3pm", "in the morning"
  
  Return empty array if no events found.
  `;
  ```

- [ ] Implement AI call with structured output:
  ```typescript
  async function detectEventsWithAI(text: string, message: Message) {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: EVENT_EXTRACTION_PROMPT
      }],
      response_format: { type: 'json_object' }
    });
    
    return parseEventResponse(completion.content[0].text);
  }
  ```

#### Temporal Keyword Detection
- [ ] Create pre-filter to avoid unnecessary AI calls:
  ```typescript
  const TEMPORAL_KEYWORDS = [
    'tomorrow', 'today', 'tonight', 'weekend',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
    'at', 'pm', 'am', 'appointment', 'meeting', 'practice',
    'game', 'class', 'event', 'schedule', 'plan', 'dentist',
    'doctor', 'pickup', 'drop-off', 'party'
  ];
  
  function hasTemporalKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return TEMPORAL_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }
  ```

#### Event Storage
- [ ] Create helper function to save extracted events:
  ```typescript
  async function saveExtractedEvents(
    events: CalendarEvent[],
    conversationId: string
  ) {
    const batch = firestore.batch();
    
    events.forEach(event => {
      const eventRef = firestore
        .collection('extractedEvents')
        .doc();
      
      batch.set(eventRef, {
        ...event,
        conversationId,
        status: event.isProposed ? 'proposed' : 'confirmed',
        extractedBy: 'ai',
        createdAt: FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
  }
  ```

### Phase 1B: Calendar UI Components

#### Event Card Component
- [ ] Create `src/components/ai/CalendarEventCard.tsx`:
  ```typescript
  interface Props {
    event: CalendarEvent;
    onConfirm?: () => void;
    onDismiss?: () => void;
    onAddToCalendar?: () => void;
  }
  
  export function CalendarEventCard({ event, onConfirm, onDismiss, onAddToCalendar }: Props) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="calendar-outline" size={20} />
          <Text style={styles.title}>{event.title}</Text>
          {event.status === 'proposed' && (
            <Badge text="Proposed" color="orange" />
          )}
        </View>
        
        <View style={styles.details}>
          <Text>{formatDate(event.date)}</Text>
          {event.time && <Text>{event.time}</Text>}
          {event.location && <Text>📍 {event.location}</Text>}
        </View>
        
        <View style={styles.actions}>
          {event.status === 'proposed' && (
            <>
              <Button title="Confirm" onPress={onConfirm} />
              <Button title="Dismiss" onPress={onDismiss} variant="outline" />
            </>
          )}
          <Button title="Add to Calendar" onPress={onAddToCalendar} />
        </View>
      </View>
    );
  }
  ```

#### Inline Event Highlights
- [ ] Update `MessageBubble.tsx` to highlight temporal references:
  ```typescript
  function renderMessageContent(text: string) {
    // Detect and highlight temporal phrases
    const highlightedText = text.replace(
      /\b(tomorrow|today|next \w+|at \d+:\d+|on \w+ \d+)/gi,
      '<span class="temporal-highlight">$1</span>'
    );
    
    return <Text>{highlightedText}</Text>;
  }
  ```

- [ ] Show extracted event preview below message:
  ```typescript
  {extractedEvents.length > 0 && (
    <View style={styles.eventPreview}>
      <CalendarEventCard event={extractedEvents[0]} compact />
    </View>
  )}
  ```

### Phase 1C: Calendar Integration

#### Calendar View Screen
- [ ] Create new screen: `app/calendar.tsx`
  - [ ] Month view with events
  - [ ] Day view with event details
  - [ ] Filter by conversation
  - [ ] Filter by status (proposed vs confirmed)

#### Device Calendar Export
- [ ] Install Expo Calendar: `npx expo install expo-calendar`
- [ ] Request calendar permissions:
  ```typescript
  import * as Calendar from 'expo-calendar';
  
  async function addToDeviceCalendar(event: CalendarEvent) {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to add to calendar');
      return;
    }
    
    const calendars = await Calendar.getCalendarsAsync(
      Calendar.EntityTypes.EVENT
    );
    const defaultCalendar = calendars.find(cal => cal.isPrimary);
    
    await Calendar.createEventAsync(defaultCalendar.id, {
      title: event.title,
      startDate: event.date.toDate(),
      endDate: addHours(event.date.toDate(), 1),
      location: event.location || undefined,
      notes: `Extracted from conversation`
    });
    
    Alert.alert('Success', 'Event added to your calendar');
  }
  ```

### Phase 1D: Testing & Edge Cases

#### Unit Tests
- [ ] Test temporal keyword detection
- [ ] Test event extraction with various date formats
- [ ] Test handling of ambiguous dates ("next Friday")
- [ ] Test handling of no events found

#### Integration Tests
- [ ] Send message with event → Verify extraction
- [ ] Confirm proposed event → Verify status update
- [ ] Export to device calendar → Verify success
- [ ] Multiple events in one message → Verify all extracted

#### Edge Cases to Handle
- [ ] Ambiguous dates (resolve to nearest future date)
- [ ] Past dates (mark as historical, don't extract)
- [ ] Conflicts with existing events (flag in UI)
- [ ] Non-English dates (Phase 2 enhancement)

**Checkpoint:** ✅ Calendar events automatically extracted and displayed

---

## Feature 2: Decision Summarization

**Goal:** Automatically identify when decisions have been made in conversations and create summaries

### Phase 2A: Decision Detection Logic

#### Cloud Function Development
- [ ] Create Cloud Function: `functions/src/summarizeDecisions.ts`
  ```typescript
  export const summarizeDecisions = functions.pubsub
    .schedule('every 6 hours')
    .onRun(async (context) => {
      const activeConversations = await getActiveConversations();
      
      for (const conversation of activeConversations) {
        const recentMessages = await getRecentMessages(conversation.id, 50);
        
        if (hasDecisionKeywords(recentMessages)) {
          const decision = await extractDecisionWithAI(recentMessages);
          
          if (decision) {
            await saveDecision(decision, conversation.id);
          }
        }
      }
    });
  ```

#### AI Prompt for Decision Detection
- [ ] Create decision extraction prompt:
  ```typescript
  const DECISION_PROMPT = `
  You are a decision-tracking assistant for busy parents. Analyze this conversation and identify any decisions that have been made.
  
  Look for patterns like:
  - Agreement statements: "sounds good", "let's do it", "that works"
  - Plan confirmations: "see you then", "I'll bring", "you handle"
  - Time/place decisions: "let's meet at", "we'll go to"
  - Task assignments: "I'll pick up", "you can grab", "I'll handle"
  
  For each decision found, extract:
  - summary: What was decided (1 sentence)
  - participants: Who was involved
  - outcome: Final decision or plan
  - actionItems: Any tasks assigned (if any)
  - relatedEvents: Any calendar events mentioned
  
  Messages:
  ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
  
  Return JSON array of decisions. Empty array if none found.
  `;
  ```

#### Decision Keywords Filter
- [ ] Pre-filter conversations for efficiency:
  ```typescript
  const DECISION_KEYWORDS = [
    'sounds good', 'let\'s do', 'works for me', 'i\'ll', 'you handle',
    'agreed', 'confirmed', 'decided', 'plan', 'we\'ll', 'okay',
    'perfect', 'deal', 'done', 'see you', 'meet at'
  ];
  
  function hasDecisionKeywords(messages: Message[]): boolean {
    const combinedText = messages
      .map(m => m.content.text.toLowerCase())
      .join(' ');
    
    return DECISION_KEYWORDS.some(keyword => 
      combinedText.includes(keyword)
    );
  }
  ```

### Phase 2B: Decision UI Components

#### Decision Card Component
- [ ] Create `src/components/ai/DecisionCard.tsx`:
  ```typescript
  interface Props {
    decision: Decision;
    onViewMessages?: () => void;
    onMarkComplete?: () => void;
  }
  
  export function DecisionCard({ decision, onViewMessages, onMarkComplete }: Props) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle-outline" size={24} color="green" />
          <Text style={styles.summary}>{decision.summary}</Text>
        </View>
        
        <View style={styles.outcome}>
          <Text style={styles.label}>Decision:</Text>
          <Text style={styles.text}>{decision.outcome}</Text>
        </View>
        
        {decision.actionItems && decision.actionItems.length > 0 && (
          <View style={styles.actions}>
            <Text style={styles.label}>To Do:</Text>
            {decision.actionItems.map((item, index) => (
              <Text key={index}>• {item}</Text>
            ))}
          </View>
        )}
        
        <View style={styles.meta}>
          <Text style={styles.timestamp}>
            {formatRelativeTime(decision.createdAt)}
          </Text>
          <TouchableOpacity onPress={onViewMessages}>
            <Text style={styles.link}>View conversation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  ```

#### Decisions Tab/Screen
- [ ] Create new screen: `app/decisions.tsx`
  - [ ] List all decisions across conversations
  - [ ] Filter by date range
  - [ ] Filter by conversation
  - [ ] Search decisions
  - [ ] Mark decisions as completed
  - [ ] Link to related messages

#### In-Conversation Decision Indicators
- [ ] Add decision indicator in conversation:
  ```typescript
  // Show above message that triggered decision
  {message.triggeredDecision && (
    <View style={styles.decisionIndicator}>
      <Ionicons name="information-circle" size={16} />
      <Text>Decision detected - View in Decisions tab</Text>
    </View>
  )}
  ```

### Phase 2C: Decision Management

#### Mark as Complete
- [ ] Implement completion tracking:
  ```typescript
  async function markDecisionComplete(decisionId: string) {
    await firestore.collection('decisions').doc(decisionId).update({
      completedAt: FieldValue.serverTimestamp(),
      status: 'completed'
    });
  }
  ```

#### Link to Related Events
- [ ] Cross-reference decisions with calendar events:
  ```typescript
  function linkDecisionToEvent(decision: Decision, event: CalendarEvent) {
    // Update decision with event reference
    await firestore.collection('decisions').doc(decision.id).update({
      relatedEvents: FieldValue.arrayUnion(event.id)
    });
    
    // Update event with decision reference
    await firestore.collection('extractedEvents').doc(event.id).update({
      relatedDecision: decision.id
    });
  }
  ```

### Phase 2D: Testing

#### Test Scenarios
- [ ] Group chat plans dinner → Decision extracted
- [ ] Couple decides on school pickup → Decision extracted
- [ ] Casual chat with no decisions → No false positives
- [ ] Decision spans multiple messages → Correctly aggregated
- [ ] Decision references event → Linked correctly

**Checkpoint:** ✅ Decisions automatically summarized and tracked

---

## Feature 3: Priority Message Highlighting

**Goal:** Automatically identify urgent/important messages and visually highlight them

### Phase 3A: Priority Detection

#### Real-Time Priority Analysis
- [ ] Create Cloud Function: `functions/src/analyzePriority.ts`
  ```typescript
  export const analyzePriority = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const messageText = message.content.text;
      
      // Quick keyword check first
      const quickPriority = detectPriorityKeywords(messageText);
      
      if (quickPriority.level !== 'normal') {
        // Use AI for refined analysis
        const aiPriority = await analyzePriorityWithAI(messageText);
        
        // Store priority metadata
        await snap.ref.update({
          'content.metadata.priority': {
            level: aiPriority.level,
            reason: aiPriority.reason,
            keywords: aiPriority.keywords,
            analyzedAt: FieldValue.serverTimestamp()
          }
        });
        
        // Trigger priority notification if urgent
        if (aiPriority.level === 'urgent') {
          await sendPriorityNotification(context.params.conversationId, message);
        }
      }
    });
  ```

#### Priority Keywords
- [ ] Define priority detection rules:
  ```typescript
  const URGENT_KEYWORDS = [
    'urgent', 'emergency', 'asap', 'immediately', 'now',
    'hospital', 'hurt', 'sick', 'fever', 'injury'
  ];
  
  const HIGH_PRIORITY_KEYWORDS = [
    'important', 'deadline', 'today', 'tonight', 'forgot',
    'need', 'must', 'have to', 'reminder', 'don\'t forget'
  ];
  
  function detectPriorityKeywords(text: string): Priority {
    const lowerText = text.toLowerCase();
    
    if (URGENT_KEYWORDS.some(k => lowerText.includes(k))) {
      return {
        level: 'urgent',
        reason: 'Contains urgent keywords',
        keywords: URGENT_KEYWORDS.filter(k => lowerText.includes(k))
      };
    }
    
    if (HIGH_PRIORITY_KEYWORDS.some(k => lowerText.includes(k))) {
      return {
        level: 'high',
        reason: 'Contains high-priority keywords',
        keywords: HIGH_PRIORITY_KEYWORDS.filter(k => lowerText.includes(k))
      };
    }
    
    return {
      level: 'normal',
      reason: 'No priority indicators found',
      keywords: []
    };
  }
  ```

#### AI Priority Analysis
- [ ] Create AI prompt for nuanced analysis:
  ```typescript
  const PRIORITY_ANALYSIS_PROMPT = `
  You are a priority assessment assistant for busy parents. Analyze this message and determine its urgency level.
  
  Message: "${messageText}"
  
  Consider:
  - Time sensitivity: Is action needed soon?
  - Impact: Could ignoring this have consequences?
  - Nature: Emergency, deadline, reminder, or routine?
  - Tone: Urgent language, multiple exclamation marks
  
  Return JSON:
  {
    "level": "urgent" | "high" | "normal",
    "reason": "Brief explanation (1 sentence)",
    "suggestedAction": "What recipient should do" (optional)
  }
  
  Urgent: Immediate safety/health concerns, true emergencies
  High: Time-sensitive (today/tonight), important decisions, deadlines
  Normal: Everything else
  `;
  ```

### Phase 3B: Priority UI Components

#### Priority Badge Component
- [ ] Create `src/components/ai/PriorityBadge.tsx`:
  ```typescript
  interface Props {
    level: 'urgent' | 'high' | 'normal';
    reason?: string;
  }
  
  export function PriorityBadge({ level, reason }: Props) {
    const config = {
      urgent: { icon: 'alert-circle', color: '#FF3B30', label: 'URGENT' },
      high: { icon: 'flag', color: '#FF9500', label: 'Important' },
      normal: { icon: null, color: null, label: null }
    };
    
    if (level === 'normal') return null;
    
    const { icon, color, label } = config[level];
    
    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Ionicons name={icon} size={14} color="white" />
        <Text style={styles.label}>{label}</Text>
        {reason && (
          <Tooltip content={reason}>
            <Ionicons name="information-circle-outline" size={12} />
          </Tooltip>
        )}
      </View>
    );
  }
  ```

#### Message Highlighting
- [ ] Update `MessageBubble.tsx` to show priority:
  ```typescript
  const priorityStyles = {
    urgent: {
      borderColor: '#FF3B30',
      borderWidth: 2,
      backgroundColor: '#FFF5F5'
    },
    high: {
      borderColor: '#FF9500',
      borderWidth: 1,
      backgroundColor: '#FFF9F0'
    }
  };
  
  return (
    <View style={[
      styles.bubble,
      message.content.metadata?.priority && 
        priorityStyles[message.content.metadata.priority.level]
    ]}>
      {message.content.metadata?.priority && (
        <PriorityBadge {...message.content.metadata.priority} />
      )}
      {/* ... rest of message ... */}
    </View>
  );
  ```

#### Conversation List Priority Indicators
- [ ] Update conversation list items to show priority:
  ```typescript
  {conversation.lastMessage?.priority?.level === 'urgent' && (
    <View style={styles.priorityIndicator}>
      <Ionicons name="alert-circle" size={16} color="#FF3B30" />
    </View>
  )}
  ```

### Phase 3C: Priority Notifications

#### Enhanced Push Notifications
- [ ] Update push notification logic for priority messages:
  ```typescript
  async function sendPriorityNotification(
    conversationId: string,
    message: Message
  ) {
    const priority = message.content.metadata?.priority;
    
    const notification = {
      title: priority.level === 'urgent' ? '🚨 URGENT' : '⚠️ Important',
      body: `${message.sender}: ${message.content.text.substring(0, 100)}`,
      data: {
        conversationId,
        messageId: message.id,
        priority: priority.level
      },
      sound: priority.level === 'urgent' ? 'urgent.wav' : 'default',
      priority: priority.level === 'urgent' ? 'high' : 'default',
      badge: await getUnreadCount(message.recipientId)
    };
    
    await sendPushNotification(message.recipientId, notification);
  }
  ```

#### Custom Notification Sounds
- [ ] Add custom sound for urgent messages
- [ ] Configure iOS notification categories

### Phase 3D: Testing

#### Test Priority Detection
- [ ] Send "Emergency! Hospital now" → Urgent
- [ ] Send "Important: School pickup at 3pm today" → High
- [ ] Send "How was your day?" → Normal
- [ ] Test false positives (minimize over-flagging)

**Checkpoint:** ✅ Priority messages highlighted and notified

---

## Feature 4: RSVP Tracking

**Goal:** Track responses to invitations and maintain participation status

### Phase 4A: RSVP Detection

#### RSVP Pattern Recognition
- [ ] Create Cloud Function: `functions/src/trackRSVPs.ts`
  ```typescript
  export const trackRSVPs = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const messageText = message.content.text.toLowerCase();
      
      // Check if this is an RSVP response
      const rsvpResponse = detectRSVPResponse(messageText);
      
      if (rsvpResponse) {
        // Find related event
        const relatedEvent = await findRelatedEvent(
          context.params.conversationId,
          message.timestamp
        );
        
        if (relatedEvent) {
          await updateRSVPStatus(
            relatedEvent.id,
            message.senderId,
            rsvpResponse
          );
        }
      }
      
      // Check if this is an invitation
      const isInvitation = detectInvitation(messageText);
      
      if (isInvitation) {
        await createRSVPTracker(message, context.params.conversationId);
      }
    });
  ```

#### RSVP Response Detection
- [ ] Define RSVP patterns:
  ```typescript
  const RSVP_PATTERNS = {
    yes: [
      'yes', 'i\'ll be there', 'count me in', 'sounds good',
      'we\'ll come', 'we\'re in', 'see you there', 'looking forward'
    ],
    no: [
      'can\'t make it', 'won\'t be able', 'have to miss',
      'sorry', 'unfortunately', 'not this time'
    ],
    maybe: [
      'maybe', 'not sure', 'might', 'possibly', 'tentatively',
      'let me check', 'need to confirm'
    ]
  };
  
  function detectRSVPResponse(text: string): 'yes' | 'no' | 'maybe' | null {
    for (const [response, patterns] of Object.entries(RSVP_PATTERNS)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return response as 'yes' | 'no' | 'maybe';
      }
    }
    return null;
  }
  ```

#### Invitation Detection
- [ ] Identify messages that require RSVPs:
  ```typescript
  const INVITATION_KEYWORDS = [
    'are you coming', 'can you make it', 'will you be there',
    'let me know', 'rsvp', 'please respond', 'join us'
  ];
  
  function detectInvitation(text: string): boolean {
    return INVITATION_KEYWORDS.some(keyword => 
      text.toLowerCase().includes(keyword)
    ) || text.includes('?');  // Question mark often indicates request for response
  }
  ```

### Phase 4B: RSVP Data Model

#### RSVP Tracker Schema
- [ ] Create Firestore collection: `/rsvpTrackers/{trackerId}`
  ```typescript
  interface RSVPTracker {
    id: string;
    conversationId: string;
    eventId: string;           // Link to calendar event
    messageId: string;          // Original invitation message
    hostUserId: string;
    invitees: string[];         // All conversation participants
    responses: {
      [userId: string]: {
        status: 'yes' | 'no' | 'maybe' | 'pending';
        respondedAt?: Timestamp;
        messageId?: string;     // Message where they responded
      };
    };
    createdAt: Timestamp;
  }
  ```

#### Update Functions
- [ ] Implement RSVP tracking functions:
  ```typescript
  async function updateRSVPStatus(
    trackerId: string,
    userId: string,
    status: 'yes' | 'no' | 'maybe'
  ) {
    await firestore.collection('rsvpTrackers').doc(trackerId).update({
      [`responses.${userId}`]: {
        status,
        respondedAt: FieldValue.serverTimestamp()
      }
    });
    
    // Notify host of response
    const tracker = await getTracker(trackerId);
    if (tracker.hostUserId !== userId) {
      await notifyHost(tracker.hostUserId, userId, status);
    }
  }
  ```

### Phase 4C: RSVP UI Components

#### RSVP Widget Component
- [ ] Create `src/components/ai/RSVPWidget.tsx`:
  ```typescript
  interface Props {
    tracker: RSVPTracker;
    currentUserId: string;
    onRespond: (status: 'yes' | 'no' | 'maybe') => void;
  }
  
  export function RSVPWidget({ tracker, currentUserId, onRespond }: Props) {
    const myResponse = tracker.responses[currentUserId];
    const summary = calculateRSVPSummary(tracker.responses);
    
    return (
      <View style={styles.widget}>
        <Text style={styles.title}>RSVP</Text>
        
        {myResponse?.status === 'pending' ? (
          <View style={styles.buttons}>
            <Button title="Yes" onPress={() => onRespond('yes')} />
            <Button title="No" onPress={() => onRespond('no')} />
            <Button title="Maybe" onPress={() => onRespond('maybe')} />
          </View>
        ) : (
          <View style={styles.responded}>
            <Text>You responded: {myResponse.status}</Text>
            <Button title="Change" onPress={() => {/* Allow edit */}} />
          </View>
        )}
        
        <View style={styles.summary}>
          <Text>✅ {summary.yes} Yes</Text>
          <Text>❓ {summary.maybe} Maybe</Text>
          <Text>❌ {summary.no} No</Text>
          <Text>⏳ {summary.pending} Pending</Text>
        </View>
        
        <TouchableOpacity onPress={() => {/* Show detailed list */}}>
          <Text style={styles.link}>View all responses</Text>
        </TouchableOpacity>
      </View>
    );
  }
  ```

#### In-Message RSVP Display
- [ ] Update `MessageBubble.tsx` to show RSVP widget:
  ```typescript
  {message.rsvpTrackerId && (
    <RSVPWidget
      tracker={rsvpTrackers[message.rsvpTrackerId]}
      currentUserId={currentUser.id}
      onRespond={(status) => handleRSVP(message.rsvpTrackerId, status)}
    />
  )}
  ```

#### RSVP Status Screen
- [ ] Create screen: `app/rsvp-status/[id].tsx`
  - [ ] Detailed list of all responses
  - [ ] User avatars and names
  - [ ] Response timestamps
  - [ ] Quick actions (message non-responders)

### Phase 4D: Smart RSVP Features

#### Auto-Remind Non-Responders
- [ ] Schedule function to remind pending RSVPs:
  ```typescript
  export const remindPendingRSVPs = functions.pubsub
    .schedule('every day 09:00')
    .timeZone('America/New_York')
    .onRun(async () => {
      const trackers = await getActiveRSVPTrackers();
      
      for (const tracker of trackers) {
        const pendingUsers = getPendingUsers(tracker);
        
        if (pendingUsers.length > 0 && isWithin48Hours(tracker.event.date)) {
          await sendReminderNotification(tracker, pendingUsers);
        }
      }
    });
  ```

#### Guest List Export
- [ ] Allow exporting confirmed guests:
  ```typescript
  function exportGuestList(tracker: RSVPTracker): string {
    const confirmed = Object.entries(tracker.responses)
      .filter(([_, response]) => response.status === 'yes')
      .map(([userId, _]) => getUserName(userId));
    
    return confirmed.join(', ');
  }
  ```

### Phase 4E: Testing

#### Test Scenarios
- [ ] User sends invitation → RSVP tracker created
- [ ] Others respond yes/no/maybe → Status updated
- [ ] Host views summary → Accurate count
- [ ] Non-responder gets reminder → Notification sent
- [ ] User changes RSVP → Status updated

**Checkpoint:** ✅ RSVPs tracked and managed

---

## Feature 5: Deadline/Reminder Extraction

**Goal:** Automatically extract deadlines and set up reminders

### Phase 5A: Deadline Detection

#### Deadline Extraction Logic
- [ ] Create Cloud Function: `functions/src/extractDeadlines.ts`
  ```typescript
  export const extractDeadlines = functions.firestore
    .document('conversations/{conversationId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const messageText = message.content.text;
      
      if (hasDeadlineKeywords(messageText)) {
        const deadlines = await extractDeadlinesWithAI(messageText, message);
        
        for (const deadline of deadlines) {
          await saveDeadline(deadline, context.params.conversationId);
          await scheduleReminder(deadline);
        }
      }
    });
  ```

#### AI Deadline Extraction
- [ ] Create deadline extraction prompt:
  ```typescript
  const DEADLINE_PROMPT = `
  You are a deadline extraction assistant. Analyze this message and extract any deadlines, due dates, or time-sensitive tasks.
  
  Message: "${messageText}"
  
  For each deadline found, extract:
  - task: What needs to be done
  - deadline: ISO 8601 date (YYYY-MM-DD)
  - time: HH:MM if specified
  - assignedTo: Who is responsible (if mentioned)
  - priority: 'urgent' if same-day, 'high' if within 3 days, else 'normal'
  
  Look for:
  - Explicit deadlines: "by Friday", "due tomorrow", "before 5pm"
  - Implicit urgency: "needs to be done", "have to", "must"
  - Task assignments: "you need to", "can you", "remember to"
  
  Return JSON array of deadlines.
  `;
  ```

### Phase 5B: Reminder Scheduling

#### Schedule Reminders
- [ ] Implement reminder scheduling:
  ```typescript
  async function scheduleReminder(deadline: Deadline) {
    const reminderTimes = calculateReminderTimes(deadline.deadline);
    
    for (const reminderTime of reminderTimes) {
      await firestore.collection('scheduledReminders').add({
        deadlineId: deadline.id,
        conversationId: deadline.conversationId,
        userId: deadline.assignedTo,
        reminderTime: reminderTime,
        task: deadline.task,
        status: 'pending'
      });
    }
  }
  
  function calculateReminderTimes(deadline: Timestamp): Timestamp[] {
    const reminders: Timestamp[] = [];
    const deadlineDate = deadline.toDate();
    
    // 1 day before
    reminders.push(Timestamp.fromDate(subDays(deadlineDate, 1)));
    
    // Morning of deadline day
    reminders.push(Timestamp.fromDate(
      setHours(deadlineDate, 9)
    ));
    
    // 1 hour before (if time specified)
    if (hasSpecificTime(deadline)) {
      reminders.push(Timestamp.fromDate(subHours(deadlineDate, 1)));
    }
    
    return reminders;
  }
  ```

#### Send Reminder Notifications
- [ ] Create scheduled function to send reminders:
  ```typescript
  export const sendScheduledReminders = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async () => {
      const now = Timestamp.now();
      const dueReminders = await firestore
        .collection('scheduledReminders')
        .where('status', '==', 'pending')
        .where('reminderTime', '<=', now)
        .get();
      
      for (const reminderDoc of dueReminders.docs) {
        const reminder = reminderDoc.data() as ScheduledReminder;
        
        await sendReminderPush(reminder);
        
        await reminderDoc.ref.update({
          status: 'sent',
          sentAt: FieldValue.serverTimestamp()
        });
      }
    });
  ```

### Phase 5C: Deadline UI Components

#### Deadline Reminder Component
- [ ] Create `src/components/ai/DeadlineReminder.tsx`:
  ```typescript
  interface Props {
    deadline: Deadline;
    onComplete?: () => void;
    onSnooze?: (duration: number) => void;
    onDismiss?: () => void;
  }
  
  export function DeadlineReminder({ deadline, onComplete, onSnooze, onDismiss }: Props) {
    const timeUntil = calculateTimeUntil(deadline.deadline);
    const isOverdue = timeUntil < 0;
    
    return (
      <View style={[styles.card, isOverdue && styles.overdue]}>
        <View style={styles.header}>
          <Ionicons 
            name={isOverdue ? "alert-circle" : "time-outline"} 
            size={24} 
            color={isOverdue ? "#FF3B30" : "#FF9500"} 
          />
          <Text style={styles.task}>{deadline.task}</Text>
        </View>
        
        <View style={styles.timing}>
          <Text style={styles.deadline}>
            {isOverdue ? 'Overdue: ' : 'Due: '}
            {formatDeadline(deadline.deadline)}
          </Text>
          <Text style={styles.timeLeft}>
            ({formatTimeUntil(timeUntil)})
          </Text>
        </View>
        
        {deadline.assignedTo && (
          <Text style={styles.assigned}>
            Assigned to: {getUserName(deadline.assignedTo)}
          </Text>
        )}
        
        <View style={styles.actions}>
          <Button title="Complete" onPress={onComplete} variant="success" />
          <Button title="Snooze 1hr" onPress={() => onSnooze(3600)} variant="outline" />
          <Button title="Dismiss" onPress={onDismiss} variant="text" />
        </View>
      </View>
    );
  }
  ```

#### Deadlines Screen
- [ ] Create screen: `app/deadlines.tsx`
  - [ ] List all active deadlines
  - [ ] Sort by urgency (overdue → today → this week → future)
  - [ ] Filter by conversation
  - [ ] Filter by assigned person
  - [ ] Mark as complete
  - [ ] Snooze reminders

#### In-Message Deadline Indicators
- [ ] Show deadline extracted from message:
  ```typescript
  {message.extractedDeadlines?.length > 0 && (
    <View style={styles.deadlinePreview}>
      {message.extractedDeadlines.map(deadline => (
        <View key={deadline.id} style={styles.deadlineChip}>
          <Ionicons name="time-outline" size={12} />
          <Text>{deadline.task} - {formatDate(deadline.deadline)}</Text>
        </View>
      ))}
    </View>
  )}
  ```

### Phase 5D: Integration with Calendar

#### Link Deadlines to Events
- [ ] Cross-reference deadlines with calendar events:
  ```typescript
  async function linkDeadlineToEvent(deadline: Deadline) {
    const relatedEvents = await firestore
      .collection('extractedEvents')
      .where('conversationId', '==', deadline.conversationId)
      .where('date', '==', deadline.deadline)
      .get();
    
    if (!relatedEvents.empty) {
      await firestore.collection('deadlines').doc(deadline.id).update({
        relatedEventId: relatedEvents.docs[0].id
      });
    }
  }
  ```

### Phase 5E: Testing

#### Test Deadline Extraction
- [ ] "Report due by Friday at 5pm" → Deadline extracted with time
- [ ] "Don't forget to pick up kids today" → Deadline extracted
- [ ] "Meeting tomorrow" → Calendar event (not deadline)
- [ ] Multiple deadlines in one message → All extracted

#### Test Reminder System
- [ ] Create deadline 2 days out → Verify 3 reminders scheduled
- [ ] Wait for reminder time → Verify notification sent
- [ ] Snooze reminder → Verify rescheduled
- [ ] Complete task → Verify reminders cancelled

**Checkpoint:** ✅ Deadlines extracted and reminders automated

---

## Advanced Feature: Proactive Assistant

**Goal:** Detect scheduling conflicts and suggest solutions automatically

### Phase 6A: Conflict Detection

#### Conflict Detection Algorithm
- [ ] Create Cloud Function: `functions/src/detectConflicts.ts`
  ```typescript
  export const detectConflicts = functions.firestore
    .document('extractedEvents/{eventId}')
    .onCreate(async (snap, context) => {
      const newEvent = snap.data() as CalendarEvent;
      
      // Get all events for this user around the same time
      const potentialConflicts = await findOverlappingEvents(
        newEvent.participants,
        newEvent.date,
        newEvent.time
      );
      
      if (potentialConflicts.length > 0) {
        const conflict = {
          eventId: newEvent.id,
          conflictingEvents: potentialConflicts.map(e => e.id),
          detectedAt: FieldValue.serverTimestamp(),
          status: 'unresolved'
        };
        
        await saveConflict(conflict);
        await notifyParticipants(newEvent, conflict);
      }
    });
  ```

#### Overlapping Event Detection
- [ ] Implement time overlap logic:
  ```typescript
  function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    // If no times specified, check if same day
    if (!event1.time || !event2.time) {
      return isSameDay(event1.date.toDate(), event2.date.toDate());
    }
    
    const start1 = parseDateTime(event1.date, event1.time);
    const end1 = addHours(start1, 1);  // Assume 1 hour duration
    
    const start2 = parseDateTime(event2.date, event2.time);
    const end2 = addHours(start2, 1);
    
    // Check if time ranges overlap
    return (start1 < end2) && (start2 < end1);
  }
  ```

### Phase 6B: AI-Powered Suggestions

#### Conflict Resolution Suggestions
- [ ] Use AI to generate resolution options:
  ```typescript
  const CONFLICT_RESOLUTION_PROMPT = `
  You are a scheduling assistant for busy parents. There is a scheduling conflict that needs resolution.
  
  New Event: ${newEvent.title} at ${formatDateTime(newEvent.date, newEvent.time)}
  Conflicting Events:
  ${conflictingEvents.map(e => `- ${e.title} at ${formatDateTime(e.date, e.time)}`).join('\n')}
  
  Suggest 3 practical solutions considering:
  - Can either event be rescheduled?
  - Can someone else attend/handle one?
  - Are there nearby time slots?
  - Which event is more important/flexible?
  
  For each solution, provide:
  - action: What to do
  - reasoning: Why this works
  - difficulty: 'easy', 'moderate', 'hard'
  
  Return JSON array of solutions.
  `;
  ```

#### Generate Suggestions
- [ ] Implement suggestion generator:
  ```typescript
  async function generateConflictSolutions(
    conflict: SchedulingConflict
  ): Promise<Solution[]> {
    const newEvent = await getEvent(conflict.eventId);
    const conflictingEvents = await getEvents(conflict.conflictingEvents);
    
    const aiSolutions = await callAIForSolutions(newEvent, conflictingEvents);
    
    // Enhance with automatic actions
    return aiSolutions.map(solution => ({
      ...solution,
      actions: [
        {
          type: 'reschedule',
          eventId: solution.affectedEventId,
          newTime: solution.suggestedTime,
          automated: true  // Can be done automatically
        }
      ]
    }));
  }
  ```

### Phase 6C: Conflict UI Components

#### Conflict Alert Component
- [ ] Create `src/components/ai/ConflictAlert.tsx`:
  ```typescript
  interface Props {
    conflict: SchedulingConflict;
    solutions: Solution[];
    onSelectSolution: (solution: Solution) => void;
    onDismiss: () => void;
  }
  
  export function ConflictAlert({ conflict, solutions, onSelectSolution, onDismiss }: Props) {
    return (
      <View style={styles.alert}>
        <View style={styles.header}>
          <Ionicons name="warning" size={32} color="#FF3B30" />
          <Text style={styles.title}>Scheduling Conflict Detected</Text>
        </View>
        
        <View style={styles.conflictDetails}>
          <Text style={styles.label}>New Event:</Text>
          <EventSummary event={conflict.newEvent} />
          
          <Text style={styles.label}>Conflicts with:</Text>
          {conflict.conflictingEvents.map(event => (
            <EventSummary key={event.id} event={event} />
          ))}
        </View>
        
        <Text style={styles.solutionsHeader}>Suggested Solutions:</Text>
        {solutions.map((solution, index) => (
          <TouchableOpacity
            key={index}
            style={styles.solution}
            onPress={() => onSelectSolution(solution)}
          >
            <View style={styles.solutionHeader}>
              <Text style={styles.solutionAction}>{solution.action}</Text>
              <Badge 
                text={solution.difficulty} 
                color={getDifficultyColor(solution.difficulty)} 
              />
            </View>
            <Text style={styles.reasoning}>{solution.reasoning}</Text>
            <View style={styles.solutionActions}>
              {solution.automated && (
                <Text style={styles.automated}>Can be done automatically</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        <Button title="Ignore" onPress={onDismiss} variant="text" />
      </View>
    );
  }
  ```

#### Proactive Notification
- [ ] Send push notification when conflict detected:
  ```typescript
  async function notifyConflict(
    userId: string,
    conflict: SchedulingConflict
  ) {
    await sendPushNotification(userId, {
      title: '⚠️ Scheduling Conflict',
      body: `${conflict.newEvent.title} conflicts with ${conflict.conflictingEvents[0].title}`,
      data: {
        type: 'conflict',
        conflictId: conflict.id
      },
      sound: 'default',
      priority: 'high'
    });
  }
  ```

### Phase 6D: Automatic Resolution

#### One-Tap Resolution
- [ ] Implement automatic conflict resolution:
  ```typescript
  async function resolveConflict(
    conflictId: string,
    solution: Solution
  ) {
    const conflict = await getConflict(conflictId);
    
    for (const action of solution.actions) {
      if (action.type === 'reschedule' && action.automated) {
        // Automatically reschedule the event
        await rescheduleEvent(action.eventId, action.newTime);
        
        // Notify participants
        await notifyReschedule(action.eventId, action.newTime);
      } else if (action.type === 'cancel') {
        // Suggest cancellation but don't auto-execute
        await suggestCancellation(action.eventId);
      }
    }
    
    // Mark conflict as resolved
    await firestore.collection('schedulingConflicts').doc(conflictId).update({
      status: 'resolved',
      solution: solution,
      resolvedAt: FieldValue.serverTimestamp()
    });
  }
  ```

#### Smart Scheduling Suggestions
- [ ] Proactively suggest best times:
  ```typescript
  async function suggestBestTime(
    eventTitle: string,
    participants: string[],
    preferredDate: Date
  ): Promise<TimeSlot[]> {
    // Get all participants' events
    const allEvents = await getParticipantsEvents(participants, preferredDate);
    
    // Find free slots
    const freeSlots = findFreeSlots(allEvents, preferredDate);
    
    // Rank by convenience (not too early/late, not during meals)
    return rankTimeSlots(freeSlots);
  }
  ```

### Phase 6E: Testing

#### Test Conflict Detection
- [ ] Create two overlapping events → Conflict detected
- [ ] View suggestions → 3 options provided
- [ ] Select automatic solution → Event rescheduled
- [ ] Dismiss conflict → Marked as ignored

#### Test Edge Cases
- [ ] Events on same day but no times → Flagged as potential conflict
- [ ] 3-way conflict (3 events overlap) → All conflicts shown
- [ ] Resolve one conflict → Related conflicts updated
- [ ] User manually resolves → Conflict marked resolved

**Checkpoint:** ✅ Proactive conflict detection and resolution working

---

## Testing Checklist

### Unit Tests
- [ ] Temporal keyword detection
- [ ] Decision keyword detection
- [ ] Priority keyword detection
- [ ] RSVP pattern matching
- [ ] Deadline extraction
- [ ] Event overlap detection

### Integration Tests
- [ ] End-to-end calendar extraction flow
- [ ] End-to-end decision summarization flow
- [ ] End-to-end priority highlighting flow
- [ ] End-to-end RSVP tracking flow
- [ ] End-to-end deadline reminder flow
- [ ] End-to-end conflict resolution flow

### AI Quality Tests
- [ ] Calendar extraction accuracy (>90%)
- [ ] Decision detection precision (minimize false positives)
- [ ] Priority classification accuracy
- [ ] RSVP interpretation accuracy
- [ ] Deadline extraction recall (catch all deadlines)
- [ ] Conflict solution quality (practical suggestions)

### User Acceptance Tests
- [ ] Recruit 5 busy parents as alpha testers
- [ ] Test all 5 required features in real conversations
- [ ] Test proactive assistant with real scheduling scenarios
- [ ] Collect feedback on usefulness and accuracy
- [ ] Iterate based on feedback

---

## Integration Checklist

### Backend Integration
- [ ] All Cloud Functions deployed
- [ ] All Firestore collections created with indexes
- [ ] All scheduled functions configured
- [ ] Security rules updated for new collections
- [ ] Rate limiting configured for AI calls

### Frontend Integration
- [ ] All UI components integrated into conversation screen
- [ ] New tabs/screens added to navigation
- [ ] Notifications configured for all features
- [ ] Deep links configured (calendar, decisions, deadlines)
- [ ] Feature flags implemented (enable per user)

### Third-Party Integration
- [ ] Expo Calendar permissions and export working
- [ ] Device calendar sync tested
- [ ] Push notification sounds configured
- [ ] Custom notification categories set up

### Performance Optimization
- [ ] AI calls optimized (pre-filtering with keywords)
- [ ] Batch processing for periodic functions
- [ ] Caching for frequently accessed data
- [ ] Query optimization with proper indexes

---

## Cost Management

### AI Cost Optimization
- [ ] Implement pre-filtering to reduce unnecessary AI calls
- [ ] Cache AI results for similar messages
- [ ] Set per-user daily limits (e.g., 50 AI calls/day)
- [ ] Use cheaper models for simple tasks (keyword detection)
- [ ] Monitor monthly AI spend in Firebase Console

### Expected Costs (for 100 users)
| Feature | Estimated AI Calls/Month | Cost @ $0.003/call |
|---------|--------------------------|-------------------|
| Calendar Extraction | ~3,000 | $9 |
| Decision Summarization | ~500 | $1.50 |
| Priority Analysis | ~1,000 | $3 |
| Deadline Extraction | ~1,500 | $4.50 |
| Conflict Resolution | ~300 | $0.90 |
| **Total** | **~6,300** | **$18.90** |

---

## Feature Flags

### Rollout Strategy
- [ ] Implement feature flag system in Firestore:
  ```typescript
  interface UserFeatureFlags {
    userId: string;
    features: {
      calendarExtraction: boolean;
      decisionSummarization: boolean;
      priorityHighlighting: boolean;
      rsvpTracking: boolean;
      deadlineReminders: boolean;
      proactiveAssistant: boolean;
    };
    betaTester: boolean;
  }
  ```

### Gradual Rollout
1. Enable for 10 alpha testers (Week 1)
2. Expand to 50 users (Week 2)
3. Enable for all users (Week 3+)

---

## Success Metrics

### Feature Adoption
- [ ] % of users with at least 1 extracted calendar event
- [ ] % of users with at least 1 tracked decision
- [ ] % of messages flagged as priority (should be <10%)
- [ ] % of invitations with RSVP tracking enabled
- [ ] % of deadlines with reminders set

### User Satisfaction
- [ ] Feature usefulness rating (1-5 scale)
- [ ] Feature accuracy rating (1-5 scale)
- [ ] Frequency of use (daily, weekly, rarely)
- [ ] Would recommend to other busy parents? (yes/no)

### Technical Performance
- [ ] AI call success rate (>95%)
- [ ] Average AI response time (<2s)
- [ ] False positive rate for priority detection (<5%)
- [ ] Calendar extraction accuracy (>90%)
- [ ] Reminder delivery rate (>99%)

---

## Documentation

### User Documentation
- [ ] Create in-app tutorial for each feature
- [ ] Create FAQ page
- [ ] Create video demos
- [ ] Create help articles

### Developer Documentation
- [ ] Document AI prompts and rationale
- [ ] Document data models and relationships
- [ ] Document Cloud Function architecture
- [ ] Create troubleshooting guide

---

## Maintenance Plan

### Weekly
- [ ] Review AI accuracy metrics
- [ ] Check for false positives/negatives
- [ ] Monitor AI cost trends
- [ ] Review user feedback

### Monthly
- [ ] Refine AI prompts based on accuracy data
- [ ] Update keyword dictionaries
- [ ] Optimize Cloud Function performance
- [ ] Review and adjust rate limits

### Quarterly
- [ ] Major prompt engineering improvements
- [ ] Evaluate new AI models
- [ ] Feature expansion based on user requests
- [ ] Cost optimization review

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Status:** Ready for Implementation
