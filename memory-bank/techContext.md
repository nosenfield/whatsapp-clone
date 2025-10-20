# Technology Context

**Last Updated:** October 20, 2025

---

## Technology Stack

### Mobile Frontend

| Technology | Version | Purpose | Documentation |
|------------|---------|---------|---------------|
| React Native | Latest | Mobile app framework | [docs](https://reactnative.dev) |
| Expo | SDK 51+ | Development platform | [docs](https://docs.expo.dev) |
| TypeScript | 5.x | Type-safe JavaScript | [docs](https://typescriptlang.org) |
| Expo Router | Latest | File-based navigation | [docs](https://docs.expo.dev/router) |
| React Query | 5.x | Server state management | [docs](https://tanstack.com/query) |
| Zustand | 4.x | Client state management | [docs](https://docs.pmnd.rs/zustand) |
| Expo SQLite | Latest | Local database | [docs](https://docs.expo.dev/versions/latest/sdk/sqlite) |
| Firebase SDK | 10.x | Backend integration | [docs](https://firebase.google.com/docs/web/setup) |

### Backend Services

| Service | Purpose | Pricing | Documentation |
|---------|---------|---------|---------------|
| Firebase Firestore | Persistent data storage | Free tier: 50k reads, 20k writes/day | [docs](https://firebase.google.com/docs/firestore) |
| Firebase Realtime Database | Ephemeral data (presence, typing) | Free tier: 1GB storage, 10GB/month transfer | [docs](https://firebase.google.com/docs/database) |
| Firebase Cloud Functions | Serverless backend logic | Free tier: 125k invocations/month | [docs](https://firebase.google.com/docs/functions) |
| Firebase Authentication | User authentication | Free tier: unlimited | [docs](https://firebase.google.com/docs/auth) |
| Firebase Storage | Media file storage | Free tier: 5GB storage | [docs](https://firebase.google.com/docs/storage) |
| Expo Push Service | Push notifications | Free | [docs](https://docs.expo.dev/push-notifications) |

### Development Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| Expo CLI | Expo project management | `npm install -g expo-cli` |
| EAS CLI | Build and deployment | `npm install -g eas-cli` |
| Firebase CLI | Firebase management | `npm install -g firebase-tools` |
| Xcode | iOS development | Mac App Store |
| React Native Debugger | Debugging tool | [Download](https://github.com/jhen0409/react-native-debugger) |

---

## Development Setup

### Prerequisites

```bash
# Check versions
node --version    # Should be 20+
npm --version     # Should be 10+
expo --version    # Should be latest
eas --version     # Should be latest
firebase --version # Should be latest

# Verify Xcode
xcodebuild -version  # Should be 15+
```

### Environment Variables

**Required for Mobile App** (`mobile/.env`):
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Required for Cloud Functions** (`functions/.env`):
```bash
ANTHROPIC_API_KEY=your-api-key    # For future AI features
OPENAI_API_KEY=your-api-key        # For future AI features
```

### Project Structure

```
whatsapp-clone/
├── mobile/                        # React Native + Expo app
│   ├── app/                       # Expo Router pages
│   │   ├── (auth)/               # Auth screens (login, register)
│   │   ├── (tabs)/               # Main tabs (chats, profile)
│   │   ├── conversation/[id].tsx # Dynamic conversation route
│   │   └── _layout.tsx           # Root layout with providers
│   │
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── usePresence.ts
│   │   │   ├── useTypingIndicators.ts
│   │   │   └── useConversations.ts
│   │   ├── services/             # External service wrappers
│   │   │   ├── firebase-auth.ts
│   │   │   ├── firebase-firestore.ts
│   │   │   ├── firebase-rtdb.ts
│   │   │   ├── firebase-storage.ts
│   │   │   └── database.ts       # SQLite operations
│   │   ├── store/                # Zustand stores
│   │   │   ├── auth-store.ts
│   │   │   └── message-store.ts
│   │   ├── types/                # TypeScript interfaces
│   │   │   └── index.ts
│   │   ├── utils/                # Helper functions
│   │   │   ├── error-handler.ts
│   │   │   ├── validators.ts
│   │   │   └── date-formatter.ts
│   │   └── constants/            # App constants
│   │       └── index.ts
│   │
│   ├── assets/                   # Images, fonts
│   ├── firebase.config.ts        # Firebase initialization
│   ├── app.json                  # Expo configuration
│   ├── eas.json                  # EAS Build configuration
│   └── package.json
│
├── functions/                    # Firebase Cloud Functions
│   ├── src/
│   │   ├── sendMessageNotification.ts
│   │   ├── updatePresence.ts
│   │   ├── handleGroupMessage.ts
│   │   └── processAIAction.ts   # Future: AI processing
│   ├── package.json
│   └── tsconfig.json
│
├── _docs/                        # Comprehensive documentation
├── memory-bank/                  # AI context files
├── context-summaries/            # Development session logs
├── .cursor/rules/                # Cursor IDE rules
├── firebase.json                 # Firebase configuration
├── firestore.rules              # Firestore security
├── database.rules.json          # RTDB security
└── storage.rules                # Storage security
```

---

## Key Dependencies

### Mobile App (`mobile/package.json`)

**Core Framework**:
```json
{
  "expo": "~51.0.0",
  "react-native": "0.74.0",
  "react": "18.2.0",
  "typescript": "~5.3.0"
}
```

**Navigation & Routing**:
```json
{
  "expo-router": "~3.5.0",
  "react-native-safe-area-context": "4.10.0",
  "react-native-screens": "~3.31.0"
}
```

**State Management**:
```json
{
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.5.0"
}
```

**Firebase**:
```json
{
  "firebase": "^10.12.0"
}
```

**Local Storage**:
```json
{
  "expo-sqlite": "~14.0.0"
}
```

**Push Notifications**:
```json
{
  "expo-notifications": "~0.28.0",
  "expo-device": "~6.0.0"
}
```

**Media Handling**:
```json
{
  "expo-image-picker": "~15.0.0",
  "expo-image": "~1.12.0"
}
```

### Cloud Functions (`functions/package.json`)

```json
{
  "firebase-functions": "^5.0.0",
  "firebase-admin": "^12.0.0",
  "expo-server-sdk": "^3.10.0",
  "@anthropic-ai/sdk": "^0.20.0",
  "typescript": "^5.3.0"
}
```

---

## Firebase Configuration

### Firestore Collections

```
/users/{userId}
  - id: string
  - email: string
  - displayName: string
  - photoURL?: string
  - pushToken?: string
  - createdAt: Timestamp
  - lastActive: Timestamp

/conversations/{conversationId}
  - id: string
  - type: 'direct' | 'group'
  - participants: string[]
  - name?: string (for groups)
  - lastMessageAt: Timestamp
  - unreadCount: { [userId]: number }

/conversations/{conversationId}/messages/{messageId}
  - id: string
  - senderId: string
  - content: { text: string, type: 'text' | 'image', mediaUrl?: string }
  - timestamp: Timestamp
  - status: 'sending' | 'sent' | 'delivered' | 'read'
  - readBy: { [userId]: Timestamp }
```

### Realtime Database Structure

```
/presence/{userId}
  - online: boolean
  - lastSeen: number (timestamp)
  - connections: { [connectionId]: true }

/typing/{conversationId}/{userId}
  - isTyping: boolean
  - timestamp: number
```

### Storage Structure

```
/profile-images/{userId}/{imageId}.jpg
/message-media/{conversationId}/{mediaId}.jpg
```

---

## TypeScript Configuration

**Strict Mode Enabled** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Key Rules**:
- No `any` types (use `unknown` or proper types)
- All function parameters and returns typed
- Interfaces for all data structures
- Type guards for runtime checks

---

## Build & Deployment

### Development Build

```bash
# Run in Expo Go
cd mobile
npx expo start

# Scan QR with iPhone Camera app
```

### Production Build (EAS)

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

### EAS Configuration (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {
      "distribution": "store",
      "ios": { "simulator": false }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "your-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
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

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| App Launch | <3s | Time to interactive |
| Message Send | <50ms | UI update time |
| Message Delivery | <300ms | Sender to recipient |
| Presence Update | <50ms | Status change sync |
| Typing Indicator | <300ms | Start to display |
| Image Upload | <5s | 1MB image |
| Scrolling FPS | 60 FPS | Message list |
| Memory Usage | <200MB | Normal operation |

---

## Security Best Practices

### Firebase Security Rules

**Principle**: Deny by default, allow explicitly

```javascript
// Firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Explicit allow for authenticated users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Environment Variables

- **Never commit** `.env` files
- **Always use** `EXPO_PUBLIC_` prefix for client-side env vars
- **Store secrets** in Firebase Functions config
- **Use different keys** for dev/staging/production

### API Keys

- **Firebase keys are safe** to expose (protected by security rules)
- **AI API keys must** be server-side only
- **Push tokens** should be validated server-side

---

## Testing Setup

### Unit Testing (Future)

```bash
# Install Jest + React Native Testing Library
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

### Integration Testing

```bash
# Firebase Emulator Suite
firebase emulators:start

# Test against local emulators
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
```

### Device Testing

**Required**:
- Physical iPhone (push notifications don't work in simulator)
- TestFlight account
- Multiple iOS versions (if possible)

**Recommended Test Devices**:
- iPhone SE (smallest screen)
- iPhone 14 Pro (standard)
- iPhone 14 Pro Max (largest screen)

---

## Common Commands

### Daily Development

```bash
# Start Expo dev server
cd mobile && npx expo start

# Clear cache and restart
npx expo start --clear

# View logs
npx expo start --ios
# Then shake device for dev menu

# Type check
npx tsc --noEmit
```

### Firebase Operations

```bash
# View Firestore data
firebase firestore:indexes

# View RTDB data
firebase database:get /

# View function logs
firebase functions:log --only sendMessageNotification

# Deploy rules only
firebase deploy --only firestore:rules,database
```

### Build & Deploy

```bash
# Build preview version
eas build --platform ios --profile preview

# Check build status
eas build:list

# Submit to TestFlight
eas submit --platform ios --latest
```

---

## Troubleshooting

### Common Issues

**Issue**: "Firebase not initialized"
```bash
# Solution: Check firebase.config.ts has correct values
# Ensure .env file exists with EXPO_PUBLIC_ prefixed vars
```

**Issue**: Push notifications not working
```bash
# Solution: Must test on physical device
# Verify APNs key configured in Firebase Console
# Check push token saved in Firestore
```

**Issue**: TypeScript errors with `any`
```bash
# Solution: Define proper interfaces in src/types/index.ts
# Use type guards for runtime checks
```

**Issue**: Slow Firestore queries
```bash
# Solution: Add indexes via Firebase Console
# Use .limit() to reduce data transfer
# Check for N+1 query patterns
```

---

## Resource Links

### Official Documentation
- [React Native](https://reactnative.dev/docs/getting-started)
- [Expo](https://docs.expo.dev/)
- [Firebase](https://firebase.google.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [React Query](https://tanstack.com/query/latest/docs/react/overview)

### Community Resources
- [Expo Forums](https://forums.expo.dev/)
- [React Native Community](https://www.reactnative.community/)
- [Firebase Slack](https://firebase.community/)
- [Stack Overflow - React Native](https://stackoverflow.com/questions/tagged/react-native)

### Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/)
- [Postman](https://www.postman.com/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

---

This technical context provides the foundation for understanding the technology choices and how to work with the stack effectively.
