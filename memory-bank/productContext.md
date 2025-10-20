# Product Context

**Last Updated:** October 20, 2025

---

## Why This Project Exists

This is a learning project designed to master modern mobile development and real-time systems, while building a production-quality messaging application that can serve as a platform for AI experimentation.

---

## Problems Being Solved

### 1. **Real-Time Communication**
Enable instant messaging between users with sub-second latency, working across different network conditions and device states.

### 2. **Offline-First Experience**
Users should be able to read message history and compose messages even without network connectivity, with automatic synchronization when connection returns.

### 3. **Scalable Group Communication**
Support group conversations with up to 20 participants while maintaining message delivery performance and read receipt tracking.

### 4. **Reliable Message Delivery**
Ensure messages are delivered even when recipients are offline, with proper queuing, retry logic, and delivery confirmation.

### 5. **Presence Awareness**
Users want to know when their contacts are online and actively typing, creating a more engaging conversation experience.

### 6. **Future AI Integration**
Create an architecture that can support AI features (translation, summarization, smart replies) without requiring major refactoring.

---

## How It Should Work

### Core User Flows

#### **First-Time User Experience**
1. User downloads app from TestFlight
2. Signs up with email and password
3. Sets display name
4. Arrives at empty conversation list
5. Taps "New Conversation" to find contacts
6. Starts first conversation

#### **Daily Messaging Flow**
1. User opens app → sees conversation list instantly (from SQLite cache)
2. Taps conversation → messages load from cache (<1s)
3. Types message → appears immediately in UI (optimistic update)
4. Message syncs to Firebase in background
5. Recipient receives push notification
6. Recipient opens app → sees message in real-time

#### **Group Chat Flow**
1. User creates group, names it, adds members (up to 20)
2. Sends message to group
3. All members receive push notification
4. Messages show sender name and avatar
5. Users can see who has read each message

#### **Offline Experience**
1. User loses network connection
2. App continues working with cached data
3. User types messages → they queue locally
4. "Waiting for network" indicator shows
5. Connection returns → messages send automatically
6. UI updates to show "sent" status

---

## User Experience Goals

### Performance Expectations
- **Instant Feedback**: Messages appear in UI immediately (<50ms)
- **Fast Delivery**: Recipients receive within 300ms when online
- **Quick Launch**: App ready to use in <3 seconds
- **Smooth Scrolling**: 60 FPS in message lists, no janking

### Reliability Expectations
- **Always Available**: Core features work offline
- **Never Lose Data**: Messages persist through crashes/restarts
- **Automatic Recovery**: Failed sends retry automatically
- **Clear Status**: Users always know message delivery state

### Usability Expectations
- **Familiar Patterns**: Similar to WhatsApp/iMessage
- **Minimal Friction**: No unnecessary steps or confirmations
- **Clear Feedback**: Loading states, errors, and success indicators
- **Accessible**: Works with VoiceOver, large text, high contrast

---

## Target Users

### Alpha Testing Phase (Current)
- **Who**: 5-100 tech-savvy early adopters
- **Purpose**: Validate core messaging functionality
- **Expectations**: Willing to tolerate bugs, provide feedback
- **Access**: TestFlight invitation

### Post-MVP Phase (Future)
- **Who**: General consumer users
- **Purpose**: Daily messaging with AI assistance
- **Expectations**: Production reliability, polished UX
- **Access**: App Store (eventually)

---

## Key Differentiators

### Current MVP
1. **Optimistic UI**: Messages appear instantly vs waiting for server
2. **Dual Database**: Combines speed (RTDB) with rich queries (Firestore)
3. **Offline-First**: Full functionality without network
4. **TypeScript Throughout**: Type safety from mobile to cloud functions

### Future with AI Layer
1. **Conversation Intelligence**: AI-powered summaries and search
2. **Automatic Translation**: Real-time message translation
3. **Smart Assistance**: Contextual reply suggestions
4. **Action Extraction**: Automatic task/deadline detection

---

## Success Indicators

### Alpha Testing Success
- [ ] 50+ active testers using app daily
- [ ] <5% crash rate
- [ ] Average message delivery time <500ms
- [ ] 90%+ push notification delivery rate
- [ ] Positive feedback on core experience
- [ ] No data loss incidents

### Product-Market Fit Indicators (Future)
- Users prefer this over existing messaging apps
- High daily active usage (multi-hour sessions)
- Organic growth through word-of-mouth
- Low churn rate
- AI features actively used

---

## Design Philosophy

### Core Principles

1. **Speed First**: Optimize for perceived performance over absolute accuracy
2. **Offline Always**: Never assume network connectivity
3. **Clear State**: Users should always know what's happening
4. **Fail Gracefully**: Errors should never break the app
5. **Privacy-Aware**: Prepare for future E2E encryption

### UX Priorities (in order)

1. **Reliability**: Messages always deliver
2. **Speed**: Instant feedback on actions
3. **Simplicity**: Minimal cognitive load
4. **Polish**: Smooth animations, good design
5. **Delight**: Thoughtful micro-interactions

---

## Technical Philosophy

### Architecture Principles

1. **Separation of Concerns**: UI, business logic, data layers clearly separated
2. **Type Safety**: TypeScript strict mode throughout
3. **Testability**: Code structured for easy testing
4. **Scalability**: Architecture supports growth (more users, features)
5. **Observability**: Proper logging and error tracking

### Data Principles

1. **Single Source of Truth**: Firestore is authoritative
2. **Local-First**: SQLite provides instant access
3. **Optimistic Updates**: Assume success, handle failures
4. **Conflict Resolution**: Last-write-wins for MVP
5. **Data Integrity**: Validate at all boundaries

---

## Feature Roadmap Context

### MVP Features (Weeks 1-10)
Core messaging must be rock-solid before adding AI complexity.

### Post-MVP Phase 1 (Future)
Basic AI features: translation, smart replies, simple search.

### Post-MVP Phase 2 (Future)
Advanced AI: RAG-powered search, conversation intelligence, automated workflows.

### Long-Term Vision
Platform for AI-augmented communication, possibly with voice/video.

---

## Constraints Context

### Why 20-User Group Limit?
- Keeps Firestore write fanout manageable (20 writes vs 100+)
- Simplifies read receipt aggregation
- Reduces typing indicator complexity
- Proves infrastructure without excessive cost
- Can expand later based on usage patterns

### Why Firebase vs Custom Backend?
- Faster development (no backend code to write)
- Real-time built-in (WebSocket handling)
- Scales automatically
- Free tier sufficient for alpha testing
- Industry-standard reliability

### Why iOS-Only Initially?
- Smaller test surface (one platform)
- Required for learning iOS deployment
- React Native makes Android easy to add later
- TestFlight simplifies distribution
- Most contacts likely on iOS

---

## Measuring Success

### Quantitative Metrics
- Message delivery time (p50, p95, p99)
- App launch time
- Crash-free sessions percentage
- Push notification delivery rate
- API response times (Firestore, RTDB)
- Firebase quota usage

### Qualitative Metrics
- Tester feedback sentiment
- Feature request themes
- Bug severity and frequency
- User retention (7-day, 30-day)
- Net Promoter Score (NPS)

---

This product context explains the "why" behind architectural decisions and guides feature prioritization throughout development.
