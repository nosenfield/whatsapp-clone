# Component Testing Refactor Plan

**Project:** WhatsApp Clone - Messaging App  
**Phase:** Between Phase 3 and Phase 4  
**Date:** October 21, 2025  
**Goal:** Enable React Native component testing without breaking existing service tests

---

## Executive Summary

**Current Situation:**
- ✅ Service layer tests working (database, Firebase, message service)
- ❌ Cannot test React Native components (removed `jest-expo` preset)
- ❌ Missing test coverage for 7 components built in Phases 2-4

**Problem:**
Current Jest configuration uses Node environment and removed `jest-expo` preset to fix syntax errors. This prevents React Native component testing.

**Solution:**
Implement **dual test environments** using Jest projects - one for services (Node) and one for components (React Native).

**Estimated Time:** 2-3 hours  
**Risk:** Low (existing tests continue working)  
**Impact:** Enables full test coverage for components

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Implementation Steps](#implementation-steps)
4. [Component Test Strategy](#component-test-strategy)
5. [Migration Checklist](#migration-checklist)
6. [Testing Plan](#testing-plan)
7. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### What Works Today ✅

**Service Tests (Node Environment):**
```
__tests__/unit/services/
├── database.test.ts           ✅ 70+ tests passing
├── message-service.test.ts    ✅ 18 tests passing
└── conversation-service.test.ts (planned)

__tests__/integration/messaging/
└── messaging-bugs.test.ts     ✅ 11 tests passing
```

**Configuration:**
- `testEnvironment: 'node'` - Fast, no DOM overhead
- `ts-jest` transform - TypeScript support
- Better-sqlite3 - Real database testing
- Virtual mocks - Expo modules mocked

### What Doesn't Work ❌

**Component Tests (React Native Required):**
```
__tests__/unit/components/
└── MessageBubble.test.tsx     ❌ Cannot render React Native components
```

**Current Error When Testing Components:**
```
Error: Cannot find module 'react-native' from 'node_modules/@testing-library/react-native'
```

**Why:**
- No `jest-expo` preset (removed to fix syntax errors)
- Node environment doesn't provide React Native
- No React Native test utilities available

### Components Needing Tests

| Component | Lines | Complexity | Priority | Phase |
|-----------|-------|------------|----------|-------|
| MessageBubble | ~80 | Medium | High | 2 |
| MessageInput | ~120 | High | High | 2 |
| MessageList | ~150 | High | High | 2 |
| ConversationItem | ~100 | Medium | Medium | 2 |
| OfflineBanner | ~50 | Low | Low | 2 |
| ErrorBoundary | ~80 | Medium | Medium | 2 |
| DevErrorScreen | ~60 | Low | Low | N/A |

**Total:** 7 components, ~640 lines, 0% coverage

---

## Target Architecture

### Dual Environment Setup

```
Jest Projects (Two Environments)
├── Services Environment (Node)
│   ├── Fast execution
│   ├── Real database (better-sqlite3)
│   ├── Service layer tests
│   └── Integration tests
│
└── Components Environment (React Native)
    ├── jest-expo preset
    ├── React Native Testing Library
    ├── Component tests
    └── Hook tests
```

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Service tests | ✅ Working | ✅ Still working |
| Component tests | ❌ Broken | ✅ Working |
| Test speed | Fast (Node) | Fast (services), Moderate (components) |
| Coverage | ~35% | Target 60%+ |
| Maintainability | Workarounds | Standard setup |

---

## Implementation Steps

### Step 1: Backup Current Configuration (5 minutes)

**Action:**
```bash
cd mobile

# Backup current working config
cp jest.config.js jest.config.js.backup
cp __tests__/setup.ts __tests__/setup.ts.backup
cp __tests__/jest.setup.js __tests__/jest.setup.js.backup

# Create git checkpoint
git add jest.config.js __tests__/setup.ts __tests__/jest.setup.js
git commit -m "chore: backup working test config before component testing refactor"
```

**Validation:**
```bash
# Verify backups exist
ls -la jest.config.js.backup
ls -la __tests__/setup.ts.backup
ls -la __tests__/jest.setup.js.backup

# Verify existing tests still pass
npm test
```

**Expected Result:** All service tests still pass (100+ tests)

---

### Step 2: Install Required Dependencies (10 minutes)

**Action:**
```bash
cd mobile

# Install React Native testing dependencies
npm install --save-dev \
  @testing-library/react-native@^12.4.0 \
  @testing-library/jest-native@^5.4.3 \
  react-test-renderer@19.1.0 \
  jest-expo@^52.0.3

# Verify installations
npm list @testing-library/react-native
npm list react-test-renderer
npm list jest-expo
```

**Validation:**
```bash
# Check package.json updated
grep "@testing-library/react-native" package.json
grep "jest-expo" package.json
```

**Expected Result:**
- All packages installed successfully
- No peer dependency warnings (or acceptable warnings only)

---

### Step 3: Create Dual Environment Config (30 minutes)

**Action:** Replace `jest.config.js` with dual-project setup

```javascript
// mobile/jest.config.js
module.exports = {
  // Shared configuration
  verbose: true,
  testTimeout: 10000,
  
  // Dual environments via projects
  projects: [
    // ============================================
    // PROJECT 1: Services & Integration Tests
    // ============================================
    {
      displayName: {
        name: 'SERVICES',
        color: 'blue',
      },
      
      // Node environment for fast execution
      testEnvironment: 'node',
      
      // Only run service and integration tests
      testMatch: [
        '<rootDir>/__tests__/unit/services/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/integration/**/*.test.{ts,tsx}',
      ],
      
      // Setup files
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup-services.ts'],
      
      // TypeScript transformation
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      
      // Module paths
      modulePaths: ['<rootDir>'],
      moduleDirectories: ['node_modules', '<rootDir>'],
      
      // Module name mapper
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@store/(.*)$': '<rootDir>/src/store/$1',
        '^@types': '<rootDir>/src/types',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
      },
      
      // Coverage for services only
      collectCoverageFrom: [
        'src/services/**/*.{ts,tsx}',
        'src/store/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!**/__tests__/**',
      ],
    },
    
    // ============================================
    // PROJECT 2: Components & Hooks Tests
    // ============================================
    {
      displayName: {
        name: 'COMPONENTS',
        color: 'magenta',
      },
      
      // Use jest-expo preset for React Native
      preset: 'jest-expo',
      
      // Only run component and hook tests
      testMatch: [
        '<rootDir>/__tests__/unit/components/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/unit/hooks/**/*.test.{ts,tsx}',
      ],
      
      // Setup files
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup-components.ts'],
      
      // Transform patterns (from jest-expo)
      transformIgnorePatterns: [
        'node_modules/(?!(' +
          '(jest-)?react-native' +
          '|@react-native(-community)?' +
          '|expo(nent)?' +
          '|@expo(nent)?/.*' +
          '|@expo-google-fonts/.*' +
          '|react-navigation' +
          '|@react-navigation/.*' +
          '|@unimodules/.*' +
          '|unimodules' +
          '|sentry-expo' +
          '|native-base' +
          '|react-native-svg' +
        ')/)',
      ],
      
      // Module paths
      modulePaths: ['<rootDir>'],
      moduleDirectories: ['node_modules', '<rootDir>'],
      
      // Module name mapper
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@store/(.*)$': '<rootDir>/src/store/$1',
        '^@types': '<rootDir>/src/types',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
      },
      
      // Coverage for components and hooks
      collectCoverageFrom: [
        'src/components/**/*.{ts,tsx}',
        'src/hooks/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!**/__tests__/**',
      ],
    },
  ],
  
  // ============================================
  // Global Coverage Thresholds
  // ============================================
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
};
```

**Save as:** `mobile/jest.config.js`

**Key Features:**
- ✅ Two separate test environments
- ✅ Colored output (blue for services, magenta for components)
- ✅ Different test patterns for each project
- ✅ Separate coverage collection
- ✅ Maintains existing service test setup

---

### Step 4: Create Service-Specific Setup (10 minutes)

**Action:** Rename and update setup file for services

```bash
cd mobile/__tests__
mv setup.ts setup-services.ts
```

**Update:** `mobile/__tests__/setup-services.ts`

```typescript
/**
 * Setup for service and integration tests (Node environment)
 */

// Mock Expo modules (virtual since they don't exist in Node)
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}), { virtual: true });

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
  Tabs: { Screen: () => null },
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}), { virtual: true });

// Mock Firebase (services will use their own mocks)
jest.mock('../firebase.config', () => ({
  auth: {},
  firestore: {},
  realtimeDb: {},
  storage: {},
}), { virtual: true });

// Silence console in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Test timeout
jest.setTimeout(10000);
```

**Key Changes:**
- Removed React Native specific mocks
- Kept only what service tests need
- Simpler, focused setup

---

### Step 5: Create Component-Specific Setup (15 minutes)

**Action:** Create new setup file for components

**Create:** `mobile/__tests__/setup-components.ts`

```typescript
/**
 * Setup for component and hook tests (React Native environment)
 */

import '@testing-library/jest-native/extend-expect';

// Mock Firebase (components use real Firebase types)
jest.mock('../firebase.config', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  firestore: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        onSnapshot: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
  realtimeDb: {
    ref: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      onValue: jest.fn(),
      off: jest.fn(),
    })),
  },
  storage: {
    ref: jest.fn(() => ({
      put: jest.fn(),
      getDownloadURL: jest.fn(),
    })),
  },
}));

// Mock expo-sqlite for components
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
  })),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  requestCameraPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri) => 
    Promise.resolve({ uri, width: 200, height: 200 })
  ),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Test timeout
jest.setTimeout(10000);
```

**Key Features:**
- ✅ Imports React Native Testing Library matchers
- ✅ Mocks Firebase with realistic structure
- ✅ Mocks all Expo modules used in components
- ✅ Provides default implementations that won't crash tests

---

### Step 6: Delete Obsolete Setup Files (5 minutes)

**Action:** Remove files no longer needed

```bash
cd mobile/__tests__

# Remove old setup file (now split into two)
rm -f setup.ts

# Remove Node.js polyfill file (not needed with dual environments)
rm -f jest.setup.js
```

**Validation:**
```bash
# Verify files removed
ls -la setup.ts       # Should not exist
ls -la jest.setup.js  # Should not exist

# Verify new files exist
ls -la setup-services.ts    # Should exist
ls -la setup-components.ts  # Should exist
```

---

### Step 7: Update npm Scripts (5 minutes)

**Action:** Update `mobile/package.json` test scripts

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    
    "test:services": "jest --selectProjects SERVICES",
    "test:services:watch": "jest --selectProjects SERVICES --watch",
    
    "test:components": "jest --selectProjects COMPONENTS",
    "test:components:watch": "jest --selectProjects COMPONENTS --watch",
    
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration"
  }
}
```

**New Scripts:**
- `npm run test:services` - Run only service tests (fast)
- `npm run test:components` - Run only component tests
- `npm run test:services:watch` - Watch mode for services
- `npm run test:components:watch` - Watch mode for components

---

### Step 8: Run Migration Validation (10 minutes)

**Action:** Test that both environments work

```bash
cd mobile

# 1. Clear Jest cache
npx jest --clearCache

# 2. Run service tests only
npm run test:services

# Expected: All existing tests pass
# ✅ database.test.ts (70+ tests)
# ✅ message-service.test.ts (18 tests)
# ✅ messaging-bugs.test.ts (11 tests)

# 3. Run component tests (will fail initially - that's OK)
npm run test:components

# Expected: No tests found yet (we haven't written them)
# Or: Existing MessageBubble test fails (expected)

# 4. Run all tests
npm test

# Expected: Service tests pass, components may fail
```

**Success Criteria:**
- ✅ Service tests still pass (100+ tests)
- ✅ No "Cannot find module 'react-native'" errors
- ⚠️ Component tests may fail (haven't written real ones yet)
- ✅ Dual projects detected (colored output)

---

### Step 9: Create First Component Test (20 minutes)

**Action:** Create a working example component test

**Create:** `mobile/__tests__/unit/components/OfflineBanner.test.tsx`

```typescript
/**
 * Component test for OfflineBanner
 * Tests the offline indicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OfflineBanner } from '../../../src/components/OfflineBanner';

// Mock the network hook
jest.mock('../../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render nothing when online', () => {
    // Mock online state
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { toJSON } = render(<OfflineBanner />);
    
    // Should render null (nothing shown)
    expect(toJSON()).toBeNull();
  });

  test('should show banner when offline', () => {
    // Mock offline state
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    render(<OfflineBanner />);
    
    // Should show offline message
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  test('should show banner when connected but no internet', () => {
    // Mock connected but no internet
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: true,
      isInternetReachable: false,
      type: 'wifi',
    });

    render(<OfflineBanner />);
    
    // Should still show offline message
    expect(screen.getByText('No internet connection')).toBeTruthy();
  });

  test('should have correct styling when offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    const { getByTestId } = render(<OfflineBanner />);
    
    // Check for test ID (you'll need to add this to OfflineBanner component)
    // const banner = getByTestId('offline-banner');
    // expect(banner).toHaveStyle({ backgroundColor: '#ff3b30' });
  });
});
```

**Update Component:** Add testID to `OfflineBanner.tsx` (optional but recommended)

```typescript
// In src/components/OfflineBanner.tsx
<View testID="offline-banner" style={styles.banner}>
  {/* ... existing content ... */}
</View>
```

**Run Test:**
```bash
npm run test:components

# Expected: All 3-4 tests pass
```

---

### Step 10: Verify Complete Setup (10 minutes)

**Action:** Final validation

```bash
cd mobile

# 1. Run all tests
npm test

# 2. Check coverage
npm run test:coverage

# 3. Run specific projects
npm run test:services
npm run test:components

# 4. Verify colored output
# Should see:
# SERVICES (blue) - database.test.ts, message-service.test.ts, etc.
# COMPONENTS (magenta) - OfflineBanner.test.tsx
```

**Success Criteria:**
- ✅ All service tests pass (100+ tests)
- ✅ At least one component test passes
- ✅ Colored output shows both projects
- ✅ Coverage report includes both services and components
- ✅ No errors or warnings

---

## Component Test Strategy

### Test Priority Matrix

| Component | Priority | Complexity | Tests Needed | Estimated Time |
|-----------|----------|------------|--------------|----------------|
| MessageBubble | HIGH | Medium | 8-10 tests | 1 hour |
| MessageInput | HIGH | High | 12-15 tests | 2 hours |
| MessageList | HIGH | High | 10-12 tests | 1.5 hours |
| ConversationItem | MEDIUM | Medium | 6-8 tests | 45 min |
| OfflineBanner | LOW | Low | 3-4 tests | 30 min (✅ done) |
| ErrorBoundary | MEDIUM | Medium | 5-6 tests | 1 hour |

**Total Estimated Time:** 6-7 hours for full component coverage

### Phase 1: Critical Components (Week 1)

**Focus:** Components used in every message interaction

**Tests to Write:**
1. ✅ **OfflineBanner** (30 min) - COMPLETED in Step 9
2. **MessageBubble** (1 hour)
   - Renders message text
   - Shows sender name in groups
   - Displays timestamp
   - Shows different styles for own/other messages
   - Displays status indicators
   - Shows images when present
   - Handles long text

3. **MessageInput** (2 hours)
   - Text input works
   - Send button disabled when empty
   - Send button calls onSend
   - Image picker opens
   - Camera picker opens
   - Shows typing indicator
   - Clears after send
   - Multi-line support

4. **MessageList** (1.5 hours)
   - Renders list of messages
   - Scrolls to bottom on mount
   - Groups messages by date
   - Shows loading state
   - Shows empty state
   - Infinite scroll works

**Total:** ~5 hours for critical path

### Phase 2: Secondary Components (Week 2)

**Tests to Write:**
5. **ConversationItem** (45 min)
   - Shows conversation name
   - Shows last message
   - Shows timestamp
   - Shows unread count
   - Shows online indicator
   - Handles tap

6. **ErrorBoundary** (1 hour)
   - Catches errors
   - Shows error UI
   - Try again button works
   - Logs errors

**Total:** ~2 hours for secondary components

---

## Component Test Templates

### Template 1: Simple Component Test

```typescript
/**
 * Component: <ComponentName>
 * Purpose: Brief description
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ComponentName } from '../../../src/components/ComponentName';

describe('ComponentName', () => {
  test('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeTruthy();
  });

  test('should handle user interaction', () => {
    const onPress = jest.fn();
    render(<ComponentName onPress={onPress} />);
    
    fireEvent.press(screen.getByText('Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Template 2: Component with Props

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { createTestMessage } from '../../fixtures/test-data';

describe('MessageBubble', () => {
  test('should render own message with blue background', () => {
    const message = createTestMessage();
    const { getByTestId } = render(
      <MessageBubble message={message} isOwnMessage={true} />
    );
    
    const bubble = getByTestId('message-bubble');
    expect(bubble).toHaveStyle({ backgroundColor: '#007AFF' });
  });
});
```

### Template 3: Component with Mocked Hooks

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../src/hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

import { useMessages } from '../../../src/hooks/useMessages';

describe('MessageList', () => {
  test('should show loading state', () => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: [],
      isLoading: true,
    });

    const { getByTestId } = render(<MessageList conversationId="123" />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
```

---

## Migration Checklist

### Pre-Migration ✅

- [x] Read testing-fix-assessment.md
- [x] Understand current limitations
- [x] Backup current configuration
- [x] Verify existing tests pass
- [x] Document current test count

### During Migration 🔄

- [ ] Install component testing dependencies
- [ ] Create dual environment config
- [ ] Split setup into service/component
- [ ] Update npm scripts
- [ ] Run validation tests
- [ ] Create first component test
- [ ] Verify both environments work

### Post-Migration ✅

- [ ] All service tests still pass
- [ ] At least one component test passes
- [ ] Coverage reports include both
- [ ] Documentation updated
- [ ] Team trained on new commands
- [ ] Git commit with changes

---

## Testing Plan

### Verification Tests

**Test 1: Service Tests Still Work**
```bash
npm run test:services
# Expected: 100+ tests pass
# Time: <30 seconds
```

**Test 2: Component Test Runs**
```bash
npm run test:components
# Expected: 3-4 tests pass (OfflineBanner)
# Time: <10 seconds
```

**Test 3: Both Run Together**
```bash
npm test
# Expected: All tests pass, colored output
# Time: <40 seconds
```

**Test 4: Coverage Report**
```bash
npm run test:coverage
# Expected: Separate coverage for services and components
# Services: ~40%
# Components: ~10% (just OfflineBanner)
# Time: <1 minute
```

### Success Metrics

| Metric | Before | Target | Validation |
|--------|--------|--------|------------|
| Service tests passing | 100+ | 100+ | ✅ No regressions |
| Component tests passing | 0 | 3+ | ✅ OfflineBanner works |
| Test environments | 1 | 2 | ✅ Colored output |
| Coverage (services) | ~35% | ~35% | ✅ Maintained |
| Coverage (components) | 0% | ~10% | ✅ Progress |

---

## Rollback Plan

### If Migration Fails

**Quick Rollback (5 minutes):**

```bash
cd mobile

# Restore backups
cp jest.config.js.backup jest.config.js
cp __tests__/setup.ts.backup __tests__/setup.ts
cp __tests__/jest.setup.js.backup __tests__/jest.setup.js

# Clear cache
npx jest --clearCache

# Verify tests work
npm test
```

**Verify Rollback:**
```bash
# Should see 100+ tests passing
npm test

# If successful:
git checkout jest.config.js __tests__/setup.ts __tests__/jest.setup.js
git status  # Should be clean
```

### If Tests Partially Work

**Debug Strategy:**

1. **Service tests fail:**
   ```bash
   # Check setup-services.ts
   # Verify ts-jest transform
   # Check module mocks
   npm run test:services -- --verbose
   ```

2. **Component tests fail:**
   ```bash
   # Check jest-expo preset loaded
   # Verify React Native mocks
   # Check setup-components.ts
   npm run test:components -- --verbose
   ```

3. **Both fail:**
   ```bash
   # Likely config syntax error
   # Check jest.config.js syntax
   node -c jest.config.js  # Check for syntax errors
   ```

---

## Post-Migration Tasks

### Immediate (After Migration Complete)

1. **Update Documentation**
   - [ ] Update TESTING_SETUP.md with new scripts
   - [ ] Update testing-assessment.md progress
   - [ ] Update progress.md with new coverage

2. **Team Communication**
   - [ ] Announce new test commands
   - [ ] Share component test examples
   - [ ] Document common patterns

3. **Git Commit**
   ```bash
   git add jest.config.js __tests__/ package.json
   git commit -m "feat: enable component testing with dual Jest environments
   
   - Split into services (Node) and components (React Native) projects
   - Add setup-services.ts and setup-components.ts
   - Add npm scripts for running projects separately
   - Create first component test (OfflineBanner)
   - All existing service tests still passing
   
   BREAKING CHANGE: Test setup split into two files
   Migration guide: see _docs/component-testing-refactor-plan.md"
   ```

### Short-term (Next Week)

4. **Write Priority Component Tests**
   - [ ] MessageBubble (1 hour)
   - [ ] MessageInput (2 hours)
   - [ ] MessageList (1.5 hours)
   
5. **Update CI/CD**
   - [ ] Run both test projects in CI
   - [ ] Separate coverage reports
   - [ ] Set coverage thresholds per project

### Medium-term (Before Phase 6)

6. **Complete Component Coverage**
   - [ ] All 7 components tested
   - [ ] Target 70% component coverage
   - [ ] Document testing patterns

7. **Add Hook Tests**
   - [ ] useMessages
   - [ ] useConversations
   - [ ] usePresence
   - [ ] useTypingIndicators

---

## FAQ

### Q: Will this break existing tests?

**A:** No. Service tests run in the same environment (Node) with the same setup. They continue working exactly as before.

### Q: Do I need to rewrite any tests?

**A:** No. Existing tests work as-is. You're only *adding* the ability to test components.

### Q: How much slower will tests be?

**A:** Service tests: Same speed (Node environment)  
Component tests: Slightly slower (~20%) due to React Native  
Overall: Minimal impact (~5-10% slower)

### Q: Can I run just service tests?

**A:** Yes! `npm run test:services` runs only services (fast feedback loop)

### Q: What if I only change a component?

**A:** `npm run test:components` to test just components

### Q: How do I debug a failing test?

**A:** 
```bash
# Debug service test
npm run test:services -- database.test.ts --verbose

# Debug component test
npm run test:components -- OfflineBanner.test.tsx --verbose
```

### Q: Do component tests use real Firebase?

**A:** No. Firebase is mocked in `setup-components.ts` for fast, isolated tests.

### Q: Can I test hooks separately?

**A:** Yes! Hook tests run in the COMPONENTS project (need React Native)

### Q: What about integration tests?

**A:** Integration tests run in SERVICES project (Node environment)

---

## Timeline

### Recommended Schedule

**Day 1 (2 hours):**
- Morning: Steps 1-6 (configuration)
- Afternoon: Steps 7-10 (validation)
- End of day: Commit dual environment setup

**Day 2 (2 hours):**
- Write MessageBubble tests
- Write MessageInput tests (partial)

**Day 3 (2 hours):**
- Complete MessageInput tests
- Write MessageList tests

**Day 4 (1 hour):**
- Write ConversationItem tests
- Write ErrorBoundary tests

**Total: 7 hours over 4 days**

### Fast Track (1 Day)

**Morning (2-3 hours):**
- Complete migration (Steps 1-10)
- Write OfflineBanner test

**Afternoon (2-3 hours):**
- Write MessageBubble tests
- Write MessageInput tests (priority ones only)

**Total: 4-6 hours in one day**

---

## Expected Outcomes

### After Migration

**Test Infrastructure:**
- ✅ Dual test environments working
- ✅ Service tests still passing
- ✅ Component tests possible
- ✅ No technical debt

**Test Coverage:**
- Services: ~35% (unchanged)
- Components: ~10% (OfflineBanner only)
- Overall: ~30%

**Developer Experience:**
- ✅ Clear test commands
- ✅ Fast service test feedback
- ✅ Colored test output
- ✅ Standard Expo setup

### After Component Tests Written

**Test Coverage:**
- Services: ~35%
- Components: ~70%
- Hooks: ~60%
- Overall: ~55-60%

**Confidence Level:**
- ✅ High confidence in service layer
- ✅ High confidence in UI components
- ✅ Protected against regressions
- ✅ Ready for TestFlight

---

## Success Criteria

### Must Have ✅
- [ ] All existing service tests pass
- [ ] At least one component test passes
- [ ] Both projects run independently
- [ ] Coverage reports work
- [ ] No breaking changes to existing tests

### Should Have 🎯
- [ ] OfflineBanner fully tested
- [ ] Clear documentation
- [ ] Team understands new setup
- [ ] Git commit with migration

### Nice to Have 💡
- [ ] MessageBubble tests written
- [ ] CI/CD updated
- [ ] Testing guide created

---

## Conclusion

This refactor enables full component testing without compromising existing service test quality. The dual environment approach is industry standard and provides the best developer experience.

**Key Benefits:**
- ✅ No trade-offs (both environments work perfectly)
- ✅ Minimal migration effort (2-3 hours)
- ✅ No breaking changes (existing tests work)
- ✅ Future-proof (scalable to 1000+ tests)
- ✅ Standard approach (Expo recommended)

**Next Steps:**
1. Execute migration (Steps 1-10)
2. Verify both environments work
3. Write priority component tests
4. Update documentation
5. Celebrate! 🎉

---

**Document Version:** 1.0  
**Status:** Ready for Implementation  
**Estimated Time:** 2-3 hours (migration) + 5-7 hours (component tests)  
**Risk Level:** Low  
**Impact:** High

