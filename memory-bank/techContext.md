# Technical Context

## Tech Stack

### Mobile Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | 54.0.20 | Development platform and tools |
| TypeScript | ~5.9.2 | Type-safe development |
| Expo Router | ~6.0.13 | File-based navigation |
| React Query | ^5.90.5 | Server state synchronization |
| Zustand | ^5.0.8 | Client state management |
| Firebase SDK | ^12.4.0 | Backend integration |
| Expo SQLite | ~16.0.8 | Local database |
| Expo Notifications | ~0.32.12 | Push notifications |
| Expo Image Picker | ~17.0.8 | Media selection |

### Backend Services
| Service | Provider | Purpose |
|---------|----------|---------|
| Firebase Firestore | Google | Persistent data (messages, users, conversations) |
| Firebase RTDB | Google | Ephemeral data (presence, typing indicators) |
| Firebase Cloud Functions | Google | Serverless backend logic (TypeScript, Node 20) |
| Firebase Auth | Google | User authentication (email/password) |
| Firebase Storage | Google | Media file storage (images) |
| Expo Push Service | Expo | Push notification delivery |

### AI/ML Services
| Service | Provider | Purpose | Status |
|---------|----------|---------|--------|
| OpenAI API | OpenAI | Text embeddings, AI features | ✅ Installed |
| Anthropic Claude | Anthropic | LLM for AI commands | ✅ Installed |
| Pinecone | Pinecone | Vector database for RAG | ✅ Installed |
| LangChain | LangSmith | AI orchestration framework | ✅ Installed |

### Development Tools
- **IDE**: Cursor (primary), VS Code compatible
- **Testing**: Jest + React Native Testing Library
- **Build Tool**: EAS Build (Expo Application Services)
- **Git**: Version control, commits follow pattern `[PHASE-TASK] description`
- **Firebase CLI**: Backend deployment and management

## Project Structure

### Root Directory
```
whatsapp-clone/
├── mobile/              # React Native app
├── functions/           # Cloud Functions (TypeScript)
├── _docs/              # Documentation
├── firebase.json       # Firebase configuration
├── firestore.rules     # Security rules
├── database.rules.json # RTDB security rules
└── storage.rules       # Storage security rules
```

### Mobile App Structure
```
mobile/
├── app/                # Expo Router pages
│   ├── (auth)/        # Authentication screens
│   ├── (tabs)/        # Main tabs (chats, profile)
│   └── conversation/  # Conversation screens
├── src/
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # Firebase, SQLite, API services
│   ├── store/         # Zustand stores
│   ├── types/         # TypeScript types
│   └── utils/         # Helper functions
└── assets/            # Images, fonts
```

### Cloud Functions Structure
```
functions/
├── src/
│   ├── index.ts                      # Main entry point
│   ├── notifications/               # Push notification logic
│   ├── embeddings/                  # RAG pipeline
│   ├── features/                     # AI features (calendar extraction)
│   ├── helpers/                      # Shared utilities
│   ├── enhanced-ai-processor.ts     # AI command processor
│   ├── services/                     # AI service integrations
│   └── tools/                        # AI tools definitions
├── lib/                              # Compiled JavaScript
└── tests/                            # Test files
```

## Development Environment

### Prerequisites
- **macOS**: Required for iOS development
- **Xcode**: Latest version from App Store
- **Node.js**: Version 20+ (check with `node --version`)
- **npm/yarn**: Package manager
- **Git**: Version control
- **Firebase CLI**: `npm install -g firebase-tools`
- **Expo CLI**: `npm install -g expo-cli eas-cli`

### Setup Commands
```bash
# Install dependencies
cd mobile && npm install
cd functions && npm install

# Start development server
cd mobile && npm start

# Run on iOS simulator
npm run ios

# Deploy Cloud Functions
cd functions && npm run deploy
```

## Configuration Files

### Mobile App
- `mobile/app.json`: Expo configuration (name, slug, version)
- `mobile/firebase.config.ts`: Firebase initialization
- `mobile/package.json`: Dependencies and scripts
- `mobile/babel.config.js`: Babel configuration
- `mobile/tsconfig.json`: TypeScript configuration

### Cloud Functions
- `functions/package.json`: Dependencies and scripts
- `functions/tsconfig.json`: TypeScript configuration
- `functions/src/index.ts`: Function exports
- `.env` (not committed): API keys for AI services

### Firebase
- `firebase.json`: Firebase project configuration
- `firestore.rules`: Security rules for Firestore
- `database.rules.json`: Security rules for RTDB
- `storage.rules`: Security rules for Storage
- `firestore.indexes.json`: Firestore indexes

## API Keys and Secrets

### Firebase Configuration
**Location**: `mobile/firebase.config.ts`

```typescript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Cloud Functions Secrets
**Location**: Firebase Console → Functions → Secrets

Secrets managed via Firebase:
- `OPENAI_API_KEY`: OpenAI API key for embeddings
- `LANGSMITH_API_KEY`: LangSmith monitoring
- `PINECONE_API_KEY`: Pinecone vector database

Access in functions:
```typescript
import * as functions from 'firebase-functions';
const openaiKey = functions.config().openai.api_key;
```

## Database Schemas

### Firestore Collections
```
/users/{userId}
  - email, displayName, photoURL, pushToken, createdAt

/conversations/{conversationId}
  - type, participants, participantDetails, name, lastMessageAt

/conversations/{conversationId}/messages/{messageId}
  - senderId, content, timestamp, status, deliveredTo, readBy
```

### RTDB Paths
```
/presence/{userId}
  - online, lastSeen

/typing/{conversationId}/{userId}
  - isTyping, timestamp
```

### SQLite Tables
```sql
CREATE TABLE messages (
  id, localId, conversationId, senderId, contentText,
  contentType, mediaUrl, timestamp, status, syncStatus
);

CREATE TABLE conversations (
  id, type, participants, name, lastMessageText, lastMessageAt
);

CREATE TABLE users (
  id, displayName, email, photoURL
);
```

## Build and Deployment

### Development Build
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Web (for testing UI)
npx expo start --web
```

### Production Build (EAS)
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios

# Check build status
eas build:list
```

### Cloud Functions Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:sendMessageNotification

# View logs
firebase functions:log
```

## Testing Setup

### Test Configuration
- **Framework**: Jest
- **Test Libraries**: React Native Testing Library
- **Coverage**: Istanbul/nyc
- **Setup File**: `mobile/__tests__/setup.ts`

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Services tests
npm run test:services

# Components tests
npm run test:components

# With coverage
npm run test:coverage
```

### Test File Organization
```
mobile/__tests__/
├── setup.ts                    # Test configuration
├── unit/                       # Unit tests
│   ├── services/
│   ├── hooks/
│   └── utils/
└── integration/                # Integration tests
    └── flows/
```

## Performance Targets

### Latency
- **Message Delivery**: <300ms (online)
- **Presence Updates**: <50ms (RTDB)
- **Typing Indicators**: <300ms (RTDB)
- **App Launch**: <3s (SQLite cache)
- **Time to First Message**: <1s

### Throughput
- **Message Send Rate**: 30 messages/minute max
- **Media Upload**: 10MB max per image
- **Group Size**: 20 users max
- **Queries**: Paginate at 50 messages

### Resource Usage
- **Memory**: <200MB typical usage
- **Storage**: SQLite cache ~10MB per 1000 messages
- **Battery**: Optimize React Query refetch intervals
- **Network**: Minimize Firestore reads with caching

## Security Configuration

### Authentication
- **Provider**: Firebase Auth (email/password)
- **Token Refresh**: Automatic by Firebase SDK
- **Session Persistence**: Local storage via AsyncStorage

### Data Security
- **Firestore Rules**: User-based access control
- **RTDB Rules**: Authenticated users only
- **Storage Rules**: Private to conversation participants
- **API Keys**: Secrets managed in Firebase Console

### HTTPS Only
- All network requests via HTTPS
- Firebase SDK enforces secure connections
- No plain HTTP allowed

## Monitoring and Logging

### Logging Strategy
```typescript
// Use prefixes for filtering
console.log('[AUTH] User signed in');
console.log('[MESSAGE] Message sent');
console.log('[PRESENCE] User went online');
```

### Firebase Console
- Monitor Firestore usage (reads/writes)
- Track Cloud Functions invocations
- View error logs and crash reports
- Monitor storage usage

### Debugging Tools
- **React Native Debugger**: For React state
- **Firebase Emulator**: For local testing
- **React Query DevTools**: For cache inspection
- **LangSmith**: For AI tool tracking

## TypeScript Configuration

### Strict Mode Settings
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Linting
- **ESLint**: Configured for TypeScript
- **Prettier**: Code formatting (optional)
- **Rules**: Strict mode enforced, no `any` allowed

## Environment Variables

### Development
```bash
# Mobile (Firebase)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...

# Functions (Local)
OPENAI_API_KEY=...
LANGSMITH_API_KEY=...
PINECONE_API_KEY=...
```

### Production
- Firebase: Config in `firebase.config.ts`
- Cloud Functions: Secrets in Firebase Console
- Never commit `.env` files to Git

## Dependency Management

### Mobile Dependencies
```bash
# Add new dependency
cd mobile && npm install <package>

# Update dependencies
npm update

# Check for vulnerabilities
npm audit
```

### Cloud Functions Dependencies
```bash
# Add new dependency
cd functions && npm install <package>

# Build TypeScript
npm run build
```

## Known Technical Constraints

1. **iOS Only (MVP)**: Android support planned post-MVP
2. **Physical Device Required**: Push notifications don't work in simulator
3. **Firebase Free Tier**: Monitor usage to avoid costs
4. **20-User Group Limit**: Hard limit for MVP, can expand
5. **Offline Queue**: Maximum 100 pending messages
6. **TypeScript Strict**: No `any` types allowed

## Troubleshooting

### Common Issues
- **Expo Go Connection**: Use QR code or manual connection
- **Firebase Auth Errors**: Check security rules
- **Push Notifications**: Requires physical device + APNs setup
- **Image Upload**: Check file size limits
- **TypeScript Errors**: Run `npx tsc` to see all errors

### Debug Commands
```bash
# Clear Expo cache
npx expo start --clear

# Clear React Native cache
npx react-native start --reset-cache

# Rebuild Cloud Functions
cd functions && npm run build

# View Firebase logs
firebase functions:log --limit 50
```

---

**Last Updated**: Initial Creation - October 2025  
**Version**: 1.0  
**Status**: Active Development
