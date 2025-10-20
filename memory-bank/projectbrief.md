# Project Brief: WhatsApp Clone with AI Layer

**Last Updated:** October 20, 2025  
**Status:** In Development (Phase 2)

---

## Core Mission

Build a production-ready iOS messaging application inspired by WhatsApp, with a future AI assistance layer. Deploy to TestFlight for alpha testing with 5-100 users, proving the core messaging infrastructure before adding AI capabilities.

---

## Primary Goals

1. **Functional Messaging App**: Real-time one-on-one and group chat (up to 20 users)
2. **Production Quality**: Polished UX, reliable delivery, proper error handling
3. **TestFlight Deployment**: Alpha testing with real users on iOS devices
4. **AI-Ready Architecture**: Data models and infrastructure prepared for future AI integration
5. **Learning Experience**: Master React Native, Firebase, and real-time systems

---

## Key Constraints

### Technical Constraints
- **Platform**: iOS only (initially) - React Native + Expo
- **Backend**: Firebase (Firestore + Realtime Database + Cloud Functions)
- **Language**: TypeScript strict mode (no `any` types)
- **Group Limit**: Maximum 20 users per group chat
- **Image Limit**: 10 MB maximum per image
- **Message Limit**: 5,000 characters per message

### Business Constraints
- **Timeline**: ~10 weeks to MVP (TestFlight ready)
- **Cost**: Free tier Firebase (upgrade if needed)
- **Team**: Solo developer (you + AI assistant)
- **Requirements**: Apple Developer account ($99/year) for TestFlight
- **Testing**: 5-100 alpha testers initially

### Architectural Constraints
- **Dual Database**: Firestore for persistence, RTDB for ephemeral data
- **Optimistic UI**: Messages appear instantly, sync in background
- **Offline-First**: App must work without network connection
- **Security**: Production-ready Firebase security rules required

---

## Success Criteria

### MVP Completion Checklist
- [ ] Users can sign up and sign in (email/password)
- [ ] Users can send/receive text messages in real-time (<300ms delivery)
- [ ] Messages persist after app restart (SQLite + Firestore)
- [ ] Users can see online/offline status (<50ms sync)
- [ ] Users can see typing indicators
- [ ] Users can send/receive images (up to 10MB)
- [ ] Users can create group chats (up to 20 people)
- [ ] Users receive push notifications (foreground/background/killed app)
- [ ] App works offline (messages queue and send on reconnect)
- [ ] App deployed to TestFlight
- [ ] 5-100 alpha testers actively using app
- [ ] No critical bugs reported

### Quality Metrics
- Message delivery: <300ms (online users)
- Presence updates: <50ms
- App launch time: <3 seconds
- Time to first message: <1 second
- Scrolling performance: 60 FPS in message list
- No memory leaks detected
- All TypeScript strict mode (no `any`)
- Firebase security rules properly configured

---

## Out of Scope (Current MVP)

### Explicitly NOT Building (Yet)
- ❌ AI features (Phase 7, post-MVP)
- ❌ Voice messages
- ❌ Video messages
- ❌ End-to-end encryption
- ❌ Advanced message search
- ❌ Multiple devices per user (will work, but not optimized)
- ❌ Message forwarding
- ❌ Disappearing messages
- ❌ Message reactions (emoji)
- ❌ Story/status feature
- ❌ Voice/video calls
- ❌ Android version (React Native makes this easy to add later)

### Future Enhancements (Post-MVP)
- AI assistant chat interface
- Message translation
- Conversation summarization
- Action item extraction
- Smart reply suggestions
- RAG pipeline for conversation search

---

## Core Requirements Summary

### Phase 1: Core Infrastructure ✅
- Authentication (email/password)
- Navigation structure (tabs, screens)
- Local storage (SQLite)
- Firebase service layer

### Phase 2: One-on-One Messaging ⏳ (Current)
- Real-time text messaging
- Optimistic UI updates
- Message persistence
- Offline message queue
- Conversation list

### Phase 3: Presence & Ephemeral Data
- Online/offline indicators
- Typing indicators
- Last seen timestamps

### Phase 4: Media & Group Chat
- Image upload/download
- Group creation (20 user max)
- Group messaging

### Phase 5: Push Notifications
- Expo push token registration
- Cloud Function triggers
- Deep linking to conversations

### Phase 6: Polish & Testing
- Error handling
- UX refinement
- TestFlight deployment
- Alpha testing

### Phase 7: AI Integration (Post-MVP)
- RAG pipeline
- AI assistant
- Translation/summarization

---

## Key Architectural Decisions

1. **React Native + Expo** (not native Swift) - leverage TypeScript expertise
2. **Dual Database Strategy** - Firestore for persistence, RTDB for speed
3. **Expo Push Notifications** (not FCM directly) - simpler setup
4. **Optimistic UI with SQLite** - instant feedback, offline support
5. **20-User Group Limit** - reduces complexity and cost
6. **AI-Ready Data Architecture** - future-proof without schema migrations

---

## Non-Negotiables

These principles must be followed throughout development:

1. **TypeScript Strict Mode**: No `any` types without documentation
2. **Ask Before Acting**: When uncertain, stop and ask for guidance
3. **Sequential Development**: Complete tasks in order from task-list.md
4. **Quality Over Speed**: Working code beats fast broken code
5. **Context Documentation**: Document all decisions for future sessions
6. **Security First**: Proper Firebase rules, no exposed secrets
7. **Real Device Testing**: Push notifications require physical iPhone
8. **Commit Approval Required**: Never commit automatically

---

## Reference Documents

- **Detailed Architecture**: `_docs/architecture.md`
- **Implementation Tasks**: `_docs/task-list.md`
- **Quick Reference**: `_docs/README.md`
- **Current Context**: `memory-bank/activeContext.md`
- **Progress Tracking**: `memory-bank/progress.md`

---

## Project Identity

**Name**: WhatsApp Clone (working title)  
**Type**: iOS Mobile Application (Messaging + Future AI)  
**Tech Stack**: React Native, Expo, Firebase, TypeScript  
**Target Users**: Alpha testers (5-100), eventual consumer app  
**Unique Value**: Messaging app with AI assistance layer (future)

---

This project brief serves as the foundation for all other documentation. When in doubt about project scope, goals, or constraints, refer back to this document.
