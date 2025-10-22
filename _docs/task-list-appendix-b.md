# Task List Appendix B: Parent-Caregiver AI Specialization (Optional)

**Parent Document:** [task-list.md](./task-list.md)  
**Architecture Reference:** [architecture-appendix-b.md](./architecture-appendix-b.md)  
**Last Updated:** October 22, 2025  
**Status:** Optional Enhancement - Can be implemented after generic AI features

---

## Overview

This appendix provides implementation tasks for **specializing the messaging app for Busy Parents/Caregivers**. These features are **optional** and can be implemented after the generic AI features in Phase 7 are complete.

### When to Implement These Features

**Implement if:**
- ✅ Generic AI features (Phase 7) are complete
- ✅ User research shows strong demand from parent/caregiver users
- ✅ You want to differentiate with a vertical solution
- ✅ You have 60-80 hours for implementation

**Skip if:**
- ❌ Generic AI features meet user needs
- ❌ User base is not primarily parents/caregivers
- ❌ Want to keep broader market appeal

---

## Selected Features for Parent-Caregiver Specialization

### Required Features (All 5)
1. **Smart Calendar Extraction** - Automatically detect and extract events from messages
2. **Decision Summarization** - Track and summarize group planning decisions
3. **Priority Message Highlighting** - Detect and highlight urgent messages
4. **RSVP Tracking** - Manage invitations and track responses
5. **Deadline/Reminder Extraction** - Auto-extract deadlines and set reminders

### Advanced Feature (+1)
6. **Proactive Assistant** - Detect scheduling conflicts and suggest solutions

### Additional Infrastructure
- RAG Pipeline for conversation history search
- Google Calendar Integration (bidirectional sync)
- Pinecone vector database
- Advanced prompt engineering

---

## Prerequisites

### AI Infrastructure (from Phase 7)
- [x] Anthropic API key configured in Firebase Functions
- [x] Cloud Function: `processAIAction` exists
- [ ] **Set up Pinecone for RAG pipeline**
  - [ ] Create Pinecone account and get API key
  - [ ] Create index: `conversation-history` (dimension: 1536)
  - [ ] Install dependencies: `npm install @pinecone-database/pinecone openai`

### Data Model Extensions
- [ ] Add new Firestore collections:
  - [ ] `/extractedEvents` - Calendar events from messages
  - [ ] `/decisions` - Decision summaries
  - [ ] `/deadlines` - Extracted deadlines
  - [ ] `/rsvpTrackers` - RSVP tracking
  - [ ] `/schedulingConflicts` - Detected conflicts
  - [ ] `/scheduledReminders` - Pending reminders
  - [ ] `/messageEmbeddings` - RAG pipeline data

### UI Component Library
- [ ] Create base components in `src/components/ai/`:
  - [ ] `CalendarEventCard.tsx`
  - [ ] `DecisionCard.tsx`
  - [ ] `PriorityBadge.tsx`
  - [ ] `RSVPWidget.tsx`
  - [ ] `DeadlineReminder.tsx`
  - [ ] `ConflictAlert.tsx`

---

## Phase 0: RAG Pipeline Setup (Foundation)

**Purpose:** Enable AI features to search through past conversations for context-aware assistance

**Estimated Time:** 8-10 hours

### Embedding Generation
- [ ] Create Cloud Function: `generateEmbeddings.ts`
  - [ ] Trigger on new message creation
  - [ ] Skip messages <10 chars or emoji-only
  - [ ] Generate embedding via OpenAI text-embedding-3-small
  - [ ] Store in Pinecone with metadata
  - [ ] Track in Firestore `/messageEmbeddings`

### OpenAI Embedding Service
- [ ] Create `functions/src/services/embeddings.ts`
  - [ ] `generateEmbedding(text)` function
  - [ ] `generateQueryEmbedding(query)` function
  - [ ] Error handling and retry logic

### Pinecone Integration
- [ ] Create `functions/src/services/pinecone.ts`
  - [ ] Initialize Pinecone client
  - [ ] `upsertToPinecone()` function
  - [ ] `searchConversationHistory()` function
  - [ ] `searchAcrossConversations()` function

### RAG-Enhanced AI Calls
- [ ] Create `functions/src/services/rag-helper.ts`
  - [ ] `enhancePromptWithContext()` function
  - [ ] Fetch relevant messages from Pinecone
  - [ ] Format context for AI prompts
  - [ ] Include in all AI feature calls

### Testing RAG Pipeline
- [ ] Test embedding generation on sample messages
- [ ] Test search accuracy with queries
- [ ] Test context enhancement in AI calls
- [ ] Measure latency (<2s for search + AI call)

**Checkpoint:** ✅ RAG pipeline operational, all features can access conversation history

---

## Phase 0.5: Google Calendar Integration (Optional)

**Purpose:** Bidirectional sync between extracted events and Google Calendar

**Estimated Time:** 6-8 hours

### OAuth 2.0 Setup
- [ ] Create OAuth 2.0 credentials in Google Cloud Console
- [ ] Configure redirect URI for iOS app
- [ ] Install dependencies: `@react-native-google-signin/google-signin`

### Client-Side OAuth Flow
- [ ] Create `mobile/src/services/google-auth.ts`
  - [ ] `signInWithGoogle()` function
  - [ ] `getGoogleAccessToken()` function
  - [ ] Token storage in SecureStore

### Export to Google Calendar
- [ ] Create Cloud Function: `exportToGoogleCalendar`
  - [ ] Receive event ID and access token
  - [ ] Create event in Google Calendar via API
  - [ ] Store Google Calendar event ID in Firestore
  - [ ] Update sync status

### UI Integration
- [ ] Add "Connect Google Calendar" to Profile settings
- [ ] Add "Add to Google Calendar" button to CalendarEventCard
- [ ] Show sync status (synced/pending/failed)
- [ ] Display connected account email

### Testing Google Calendar
- [ ] Test OAuth flow
- [ ] Test event export
- [ ] Test sync status updates
- [ ] Test error handling (revoked permissions)

**Checkpoint:** ✅ Events seamlessly sync to Google Calendar

---

## Feature 1: Smart Calendar Extraction

**Goal:** Automatically detect dates, times, and events in messages

**Estimated Time:** 10-12 hours

### Phase 1A: Event Detection Logic
- [ ] Create Cloud Function: `extractCalendarEvents`
  - [ ] Trigger on message creation
  - [ ] Pre-filter with temporal keywords
  - [ ] Call AI for event extraction
  - [ ] Save to `/extractedEvents` collection

### Phase 1B: AI Prompt Engineering
- [ ] Create event extraction prompt template
  - [ ] Detect explicit dates ("October 25th", "next Tuesday")
  - [ ] Detect relative dates ("tomorrow", "next week")
  - [ ] Extract time, location, participants
  - [ ] Determine if proposed vs confirmed

### Phase 1C: Calendar UI Components
- [ ] Create `CalendarEventCard.tsx`
  - [ ] Display event details (title, date, time, location)
  - [ ] "Confirm" and "Dismiss" buttons for proposed events
  - [ ] "Add to Calendar" action
- [ ] Update `MessageBubble.tsx`
  - [ ] Show extracted event preview below message
  - [ ] Highlight temporal phrases in message text

### Phase 1D: Calendar View Screen
- [ ] Create `app/calendar.tsx`
  - [ ] Month view with events
  - [ ] Day view with details
  - [ ] Filter by conversation/status

### Phase 1E: Device Calendar Export
- [ ] Install Expo Calendar
- [ ] Request calendar permissions
- [ ] Implement `addToDeviceCalendar()` function
- [ ] Test export to iOS Calendar

### Testing
- [ ] Test with various date formats
- [ ] Test with ambiguous dates
- [ ] Test multiple events in one message
- [ ] Test calendar export

**Checkpoint:** ✅ Calendar events automatically extracted and displayed

---

## Feature 2: Decision Summarization

**Goal:** Identify and summarize decisions made in conversations

**Estimated Time:** 8-10 hours

### Phase 2A: Decision Detection
- [ ] Create Cloud Function: `summarizeDecisions`
  - [ ] Scheduled function (every 6 hours)
  - [ ] Pre-filter with decision keywords
  - [ ] Call AI for decision extraction
  - [ ] Save to `/decisions` collection

### Phase 2B: AI Prompt Engineering
- [ ] Create decision extraction prompt
  - [ ] Detect agreement statements
  - [ ] Identify participants
  - [ ] Extract outcome and action items
  - [ ] Link to related events

### Phase 2C: Decision UI Components
- [ ] Create `DecisionCard.tsx`
  - [ ] Display summary, outcome, action items
  - [ ] "View conversation" link
  - [ ] "Mark complete" action
- [ ] Create `app/decisions.tsx`
  - [ ] List all decisions
  - [ ] Filter by conversation/date
  - [ ] Search functionality

### Phase 2D: Decision Management
- [ ] Implement completion tracking
- [ ] Link decisions to calendar events
- [ ] Cross-reference with related messages

### Testing
- [ ] Test decision detection in group planning
- [ ] Test with casual chat (no false positives)
- [ ] Test action item extraction
- [ ] Test event linking

**Checkpoint:** ✅ Decisions automatically summarized and tracked

---

## Feature 3: Priority Message Highlighting

**Goal:** Detect and highlight urgent/important messages

**Estimated Time:** 6-8 hours

### Phase 3A: Priority Detection
- [ ] Create Cloud Function: `analyzePriority`
  - [ ] Trigger on message creation
  - [ ] Pre-filter with urgent keywords
  - [ ] Call AI for refined analysis
  - [ ] Store priority metadata in message

### Phase 3B: Priority Keywords
- [ ] Define urgent keywords (emergency, asap, hurt, etc.)
- [ ] Define high-priority keywords (important, deadline, etc.)
- [ ] Implement keyword detection function

### Phase 3C: AI Priority Analysis
- [ ] Create priority analysis prompt
  - [ ] Consider time sensitivity
  - [ ] Evaluate impact
  - [ ] Assess tone and urgency

### Phase 3D: Priority UI Components
- [ ] Create `PriorityBadge.tsx`
  - [ ] Urgent (red), High (orange), Normal (no badge)
  - [ ] Show reason on tap
- [ ] Update `MessageBubble.tsx`
  - [ ] Border and background color for priority
  - [ ] Display priority badge
- [ ] Update conversation list
  - [ ] Show priority indicator for last message

### Phase 3E: Priority Notifications
- [ ] Enhanced push notifications for urgent messages
- [ ] Custom sound for urgent messages
- [ ] Higher priority in notification system

### Testing
- [ ] Test urgent message detection
- [ ] Test high-priority detection
- [ ] Test false positive rate (<5%)
- [ ] Test notification behavior

**Checkpoint:** ✅ Priority messages highlighted and notified

---

## Feature 4: RSVP Tracking

**Goal:** Track responses to invitations and maintain participation status

**Estimated Time:** 8-10 hours

### Phase 4A: RSVP Detection
- [ ] Create Cloud Function: `trackRSVPs`
  - [ ] Detect invitation messages
  - [ ] Detect RSVP responses (yes/no/maybe)
  - [ ] Link responses to events
  - [ ] Update `/rsvpTrackers` collection

### Phase 4B: RSVP Data Model
- [ ] Create RSVPTracker schema
  - [ ] Link to event and conversation
  - [ ] Track all invitees
  - [ ] Store individual responses
  - [ ] Track response timestamps

### Phase 4C: RSVP UI Components
- [ ] Create `RSVPWidget.tsx`
  - [ ] Yes/No/Maybe buttons
  - [ ] Response summary (X Yes, Y No, Z Maybe, W Pending)
  - [ ] "View all responses" action
- [ ] Create `app/rsvp-status/[id].tsx`
  - [ ] Detailed response list
  - [ ] User avatars and names

### Phase 4D: Smart RSVP Features
- [ ] Auto-remind non-responders (scheduled function)
- [ ] Export guest list
- [ ] Link RSVPs to calendar events

### Testing
- [ ] Test invitation detection
- [ ] Test RSVP response patterns
- [ ] Test reminder system
- [ ] Test guest list export

**Checkpoint:** ✅ RSVPs tracked and managed

---

## Feature 5: Deadline/Reminder Extraction

**Goal:** Automatically extract deadlines and set up reminders

**Estimated Time:** 10-12 hours

### Phase 5A: Deadline Detection
- [ ] Create Cloud Function: `extractDeadlines`
  - [ ] Trigger on message creation
  - [ ] Pre-filter with deadline keywords
  - [ ] Call AI for deadline extraction
  - [ ] Save to `/deadlines` collection

### Phase 5B: AI Deadline Extraction
- [ ] Create deadline extraction prompt
  - [ ] Extract task description
  - [ ] Identify deadline date/time
  - [ ] Determine assigned person
  - [ ] Assess priority level

### Phase 5C: Reminder Scheduling
- [ ] Implement `scheduleReminder()` function
  - [ ] Calculate reminder times (1 day before, morning of, 1 hour before)
  - [ ] Create scheduled reminders in Firestore
- [ ] Create Cloud Function: `sendScheduledReminders`
  - [ ] Scheduled function (every 15 minutes)
  - [ ] Send push notifications for due reminders
  - [ ] Mark as sent

### Phase 5D: Deadline UI Components
- [ ] Create `DeadlineReminder.tsx`
  - [ ] Display task, deadline, time remaining
  - [ ] "Complete", "Snooze", "Dismiss" actions
  - [ ] Overdue indicator
- [ ] Create `app/deadlines.tsx`
  - [ ] List all deadlines (sorted by urgency)
  - [ ] Filter by conversation/assigned person
  - [ ] Mark as complete

### Phase 5E: Calendar Integration
- [ ] Link deadlines to calendar events
- [ ] Export deadlines to device calendar

### Testing
- [ ] Test deadline extraction
- [ ] Test reminder scheduling
- [ ] Test notification delivery
- [ ] Test snooze and complete actions

**Checkpoint:** ✅ Deadlines extracted and reminders automated

---

## Advanced Feature: Proactive Assistant

**Goal:** Detect scheduling conflicts and suggest solutions

**Estimated Time:** 12-15 hours

### Phase 6A: Conflict Detection
- [ ] Create Cloud Function: `detectConflicts`
  - [ ] Trigger on new event creation
  - [ ] Find overlapping events
  - [ ] Save to `/schedulingConflicts`
  - [ ] Notify participants

### Phase 6B: AI-Powered Suggestions
- [ ] Create conflict resolution prompt
  - [ ] Analyze conflicts
  - [ ] Generate 3 practical solutions
  - [ ] Rank by difficulty
  - [ ] Include automated actions

### Phase 6C: Conflict UI Components
- [ ] Create `ConflictAlert.tsx`
  - [ ] Display conflicting events
  - [ ] Show suggested solutions
  - [ ] "Easy", "Moderate", "Hard" badges
  - [ ] One-tap resolution
- [ ] Create proactive notification
  - [ ] Send when conflict detected
  - [ ] Deep link to conflict screen

### Phase 6D: Automatic Resolution
- [ ] Implement `resolveConflict()` function
  - [ ] Reschedule events automatically
  - [ ] Notify participants of changes
  - [ ] Mark conflict as resolved

### Phase 6E: Smart Scheduling
- [ ] Implement `suggestBestTime()` function
  - [ ] Find free slots for all participants
  - [ ] Rank by convenience
  - [ ] Consider preferences (not too early/late)

### Testing
- [ ] Test conflict detection
- [ ] Test solution generation
- [ ] Test automatic rescheduling
- [ ] Test multi-party conflicts

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
- [ ] End-to-end calendar extraction
- [ ] End-to-end decision summarization
- [ ] End-to-end priority highlighting
- [ ] End-to-end RSVP tracking
- [ ] End-to-end deadline reminders
- [ ] End-to-end conflict resolution

### AI Quality Tests
- [ ] Calendar extraction accuracy (>90%)
- [ ] Decision detection precision (minimize false positives)
- [ ] Priority classification accuracy
- [ ] RSVP interpretation accuracy
- [ ] Deadline extraction recall
- [ ] Conflict solution quality

### User Acceptance Tests
- [ ] Recruit 5 busy parents as alpha testers
- [ ] Test all 5 required features in real conversations
- [ ] Test proactive assistant with real scheduling
- [ ] Collect feedback on usefulness and accuracy
- [ ] Iterate based on feedback

---

## Cost Management

### AI Cost Optimization
- [ ] Implement pre-filtering to reduce AI calls
- [ ] Cache AI results for similar messages
- [ ] Set per-user daily limits (50 AI calls/day)
- [ ] Use cheaper models for simple tasks
- [ ] Monitor monthly spend

### Expected Costs (for 100 users)
| Feature | AI Calls/Month | Cost |
|---------|----------------|------|
| Calendar Extraction | ~3,000 | $9.00 |
| Decision Summarization | ~500 | $1.50 |
| Priority Analysis | ~1,000 | $3.00 |
| Deadline Extraction | ~1,500 | $4.50 |
| Conflict Resolution | ~300 | $0.90 |
| RAG (embeddings + queries) | - | $11.00 |
| **Total** | ~6,300 | **$29.90** |

**Per User:** $0.30/month

---

## Feature Flags & Rollout

### Implementation
- [ ] Create feature flag system in Firestore:
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
  }
  ```

### Gradual Rollout
1. Enable for 10 alpha testers (Week 1)
2. Expand to 50 users (Week 2)
3. Enable for all users (Week 3+)

---

## Success Metrics

### Feature Adoption
- [ ] % users with ≥1 extracted calendar event
- [ ] % users with ≥1 tracked decision
- [ ] % messages flagged as priority (target: <10%)
- [ ] % invitations with RSVP tracking
- [ ] % deadlines with reminders set

### User Satisfaction
- [ ] Feature usefulness rating (1-5 scale)
- [ ] Feature accuracy rating (1-5 scale)
- [ ] Frequency of use (daily, weekly, rarely)
- [ ] Would recommend? (yes/no)

### Technical Performance
- [ ] AI call success rate (target: >95%)
- [ ] Average AI response time (target: <2s)
- [ ] False positive rate for priority (target: <5%)
- [ ] Calendar extraction accuracy (target: >90%)
- [ ] Reminder delivery rate (target: >99%)

---

## Estimated Timeline

### If Implementing All Features

| Phase | Features | Time |
|-------|----------|------|
| Phase 0 | RAG Pipeline Setup | 8-10 hours |
| Phase 0.5 | Google Calendar Integration | 6-8 hours |
| Feature 1 | Smart Calendar Extraction | 10-12 hours |
| Feature 2 | Decision Summarization | 8-10 hours |
| Feature 3 | Priority Highlighting | 6-8 hours |
| Feature 4 | RSVP Tracking | 8-10 hours |
| Feature 5 | Deadline/Reminders | 10-12 hours |
| Advanced | Proactive Assistant | 12-15 hours |
| Testing | All features | 8-10 hours |
| **Total** | | **76-95 hours** |

**Recommended:** Implement incrementally over 8-12 weeks (1-2 features per week)

---

## Alternative: Incremental Approach

### Week 1-2: Foundation
- [ ] RAG Pipeline Setup
- [ ] Google Calendar Integration (optional)

### Week 3-4: Core Features (Choose 2)
- [ ] Smart Calendar Extraction (most valuable)
- [ ] Priority Message Highlighting (easiest)

### Week 5-6: Additional Features (Choose 2)
- [ ] Decision Summarization
- [ ] Deadline/Reminder Extraction

### Week 7-8: Advanced Features
- [ ] RSVP Tracking
- [ ] Proactive Assistant (if time)

### Week 9-10: Testing & Polish
- [ ] Comprehensive testing
- [ ] User feedback
- [ ] Iterations

**Total Time:** 8-10 weeks (10-12 hours/week)

---

## References

- **Architecture Details:** See `architecture-appendix-b.md`
- **Original Spec:** See `phase2-parent-caregiver-tasks.md` (complete 2,400-line spec)
- **Parent Task List:** See `task-list.md` (Phase 7)

---

**Document Status:** Ready for implementation (optional)  
**Implementation Decision:** After generic AI features complete  
**Last Updated:** October 22, 2025

