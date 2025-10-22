# Testing Refactor Plan - Post Phase 3 (CONTINUED)

**Date:** October 22, 2025  
**Status:** Continuation of main refactor plan

---

## Timeline & Checkpoints (Continued)

### Week 1 (16-20 hours)

**Days 1-2: Infrastructure (6 hours)**
- ✅ Implement dual environments
- ✅ Create setup-services.ts and setup-react-native.ts
- ✅ Update npm scripts
- ✅ Verify all existing tests pass
- ✅ Remove old setup files

**Checkpoint 1:** All 133 existing tests pass with new infrastructure

**Days 3-4: Phase 3 Tests (4 hours)**
- ✅ Test usePresence hook (10 tests)
- ✅ Test useTypingIndicators hook (12 tests)
- ✅ Test firebase-rtdb service (7 tests)

**Checkpoint 2:** Phase 3 features have 80%+ coverage

**Days 5: Phase 4 Tests (3 hours)**
- ✅ Test image-service (8 tests)
- ✅ Enhance group tests (8 tests)

**Checkpoint 3:** Phase 4 features have 70%+ coverage

### Week 2 (8-12 hours)

**Days 1-2: Phase 5 Tests (4 hours)**
- ✅ Test notification-service (12 tests)
- ✅ Test Cloud Function (6 tests)

**Checkpoint 4:** Phase 5 features have 70%+ coverage

**Days 3-5: Integration Tests (4-5 hours)**
- ✅ Complete messaging flow (15 tests)
- ✅ Presence + typing integration (8 tests)
- ✅ Offline mode integration (6 tests)

**Checkpoint 5:** Critical user flows tested end-to-end

---

## Priority Matrix

### Must Have (Before Phase 6) 🔴

| Test | Reason | Estimated Time |
|------|--------|----------------|
| Infrastructure refactor | Enable all other tests | 6 hours |
| usePresence tests | Critical UX feature | 1.5 hours |
| useTypingIndicators tests | Critical UX feature | 1.5 hours |
| notification-service tests | Production critical | 2 hours |
| message-store tests | Bug prevention | 2 hours |
| Complete messaging flow | Integration validation | 2 hours |

**Total: 15 hours (2 days)**

### Should Have (Nice to have) 🟡

| Test | Reason | Estimated Time |
|------|--------|----------------|
| firebase-rtdb tests | Service validation | 1 hour |
| image-service tests | Feature validation | 1.5 hours |
| auth-store tests | State validation | 1.5 hours |
| Presence + typing integration | Flow validation | 1.5 hours |
| Offline mode integration | Edge case validation | 1 hour |

**Total: 6.5 hours (1 day)**

### Could Have (Future) 🟢

| Test | Reason | Estimated Time |
|------|--------|----------------|
| E2E tests with Detox | Full app testing | 8+ hours |
| Performance tests | Load testing | 4 hours |
| Accessibility tests | A11y validation | 3 hours |
| Security tests | Penetration testing | 4 hours |

---

## Risk Assessment

### High Risk Areas (Need Tests First)

**1. Optimistic Updates (message-store)**
- **Risk:** Duplicate messages (Bug #4)
- **Impact:** User sees 2 copies of every message
- **Tests Needed:** 15-20 tests
- **Priority:** 🔴 Critical

**2. Presence Subscriptions (usePresence)**
- **Risk:** Memory leaks, incorrect status
- **Impact:** App crashes, wrong online status
- **Tests Needed:** 10 tests
- **Priority:** 🔴 Critical

**3. Push Notifications (notification-service)**
- **Risk:** Token not saved, notifications fail
- **Impact:** Users miss messages
- **Tests Needed:** 12 tests
- **Priority:** 🔴 Critical

### Medium Risk Areas

**4. Typing Indicators (useTypingIndicators)**
- **Risk:** Indicators don't clear, wrong users shown
- **Impact:** Confusing UX
- **Tests Needed:** 12 tests
- **Priority:** 🟡 High

**5. Image Upload (image-service)**
- **Risk:** Upload fails, images corrupted
- **Impact:** Feature broken
- **Tests Needed:** 8 tests
- **Priority:** 🟡 Medium

### Low Risk Areas

**6. Firebase RTDB Service**
- **Risk:** Service calls fail
- **Impact:** Features don't work
- **Tests Needed:** 7 tests
- **Priority:** 🟢 Low (well-tested by hooks)

---

## Test Strategy by Feature Type

### Real-Time Features (Presence, Typing)

**Testing Approach:**
1. Mock Firebase RTDB callbacks
2. Test subscription setup
3. Test data updates
4. Test cleanup (critical for memory)
5. Test error handling

**Example Pattern:**
```typescript
describe('Real-Time Feature', () => {
  test('should set up listener', () => {});
  test('should update on data change', () => {});
  test('should clean up on unmount', () => {});
  test('should handle errors', () => {});
});
```

### State Management (Stores)

**Testing Approach:**
1. Test initial state
2. Test state transitions
3. Test side effects
4. Test persistence
5. Test edge cases

**Example Pattern:**
```typescript
describe('Store', () => {
  test('should have correct initial state', () => {});
  test('should update state on action', () => {});
  test('should persist to storage', () => {});
  test('should handle concurrent updates', () => {});
});
```

### Service Layer

**Testing Approach:**
1. Test happy path
2. Test error cases
3. Test edge cases
4. Test validation
5. Mock external dependencies

**Example Pattern:**
```typescript
describe('Service', () => {
  test('should perform operation successfully', () => {});
  test('should handle network errors', () => {});
  test('should validate inputs', () => {});
  test('should retry on failure', () => {});
});
```

### Integration Tests

**Testing Approach:**
1. Test complete user flows
2. Test cross-feature interactions
3. Test error recovery
4. Test performance
5. Minimal mocking

**Example Pattern:**
```typescript
describe('User Flow', () => {
  test('should complete flow successfully', () => {});
  test('should handle interruptions', () => {});
  test('should recover from errors', () => {});
  test('should work offline', () => {});
});
```

---

## Common Testing Patterns

### Pattern 1: Testing React Hooks

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';

test('should update on state change', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await act(async () => {
    await result.current.updateState('new value');
  });
  
  await waitFor(() => {
    expect(result.current.value).toBe('new value');
  });
});
```

### Pattern 2: Testing Cleanup

```typescript
test('should clean up on unmount', () => {
  const mockUnsubscribe = jest.fn();
  
  const { unmount } = renderHook(() => useMyHook());
  
  unmount();
  
  expect(mockUnsubscribe).toHaveBeenCalled();
});
```

### Pattern 3: Testing Async Operations

```typescript
test('should handle async operation', async () => {
  const promise = myAsyncFunction();
  
  await expect(promise).resolves.toBe('expected value');
  
  // Or for errors:
  await expect(promise).rejects.toThrow('error message');
});
```

### Pattern 4: Testing Firebase Callbacks

```typescript
test('should handle Firebase callback', async () => {
  let callback: any;
  
  (onValue as jest.Mock).mockImplementation((ref, cb) => {
    callback = cb;
  });
  
  const { result } = renderHook(() => useMyHook());
  
  // Trigger callback
  act(() => {
    callback({ val: () => ({ data: 'test' }) });
  });
  
  await waitFor(() => {
    expect(result.current.data).toBe('test');
  });
});
```

### Pattern 5: Testing Store Updates

```typescript
test('should update store', () => {
  const { useMyStore } = require('../store/my-store');
  const store = useMyStore.getState();
  
  act(() => {
    store.updateValue('new value');
  });
  
  expect(store.value).toBe('new value');
});
```

---

## Testing Utilities to Create

### Helper 1: Firebase Mock Factory

**Create:** `mobile/__tests__/helpers/firebase-mocks.ts`

```typescript
/**
 * Factory functions for creating Firebase mocks
 */

export const createFirestoreMock = () => ({
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
    add: jest.fn(),
  })),
});

export const createRealtimeDbMock = () => ({
  ref: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    onDisconnect: jest.fn(() => ({
      set: jest.fn(),
    })),
    on: jest.fn(),
    off: jest.fn(),
  })),
});

export const createStorageMock = () => ({
  ref: jest.fn(() => ({
    putFile: jest.fn(),
    put: jest.fn(),
    getDownloadURL: jest.fn(),
    delete: jest.fn(),
  })),
});
```

### Helper 2: Wait for Condition

**Create:** `mobile/__tests__/helpers/wait-for-condition.ts`

```typescript
/**
 * Wait for a condition to be true
 * Useful for testing async operations
 */

export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

### Helper 3: Mock Network State

**Create:** `mobile/__tests__/helpers/mock-network.ts`

```typescript
/**
 * Mock network state for offline testing
 */

export const mockOnlineState = () => {
  jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn((callback) => {
      callback({ isConnected: true, isInternetReachable: true });
      return jest.fn();
    }),
  }));
};

export const mockOfflineState = () => {
  jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: jest.fn((callback) => {
      callback({ isConnected: false, isInternetReachable: false });
      return jest.fn();
    }),
  }));
};
```

---

## CI/CD Integration

### GitHub Actions Workflow

**Create:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json
      
      - name: Install dependencies
        run: cd mobile && npm ci
      
      - name: Run service tests
        run: cd mobile && npm run test:services
      
      - name: Run React Native tests
        run: cd mobile && npm run test:react-native
      
      - name: Run integration tests
        run: cd mobile && npm run test:integration
      
      - name: Generate coverage report
        run: cd mobile && npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./mobile/coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: true
      
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./mobile/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20.x'
      
      - name: Install dependencies
        run: cd mobile && npm ci
      
      - name: Run TypeScript check
        run: cd mobile && npx tsc --noEmit
```

### Pre-commit Hook

**Create:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running tests before commit..."

cd mobile

# Run tests
npm test -- --bail --findRelatedTests

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ Tests passed!"
exit 0
```

**Install Husky:**
```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm test"
```

---

## Documentation Updates

### Update 1: Testing Guide

**Create:** `mobile/__tests__/TESTING_GUIDE.md`

```markdown
# Testing Guide

## Running Tests

### All Tests
\`\`\`bash
npm test
\`\`\`

### By Environment
\`\`\`bash
npm run test:services        # Fast Node tests
npm run test:react-native    # React Native tests
\`\`\`

### By Type
\`\`\`bash
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
\`\`\`

### Specific Test File
\`\`\`bash
npm test usePresence.test.ts
\`\`\`

### Watch Mode
\`\`\`bash
npm run test:watch
\`\`\`

### Coverage
\`\`\`bash
npm run test:coverage
\`\`\`

## Writing Tests

### Test Structure
\`\`\`typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  test('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
\`\`\`

### Testing Hooks
\`\`\`typescript
import { renderHook, waitFor } from '@testing-library/react-native';

test('should update hook state', async () => {
  const { result } = renderHook(() => useMyHook());
  
  await waitFor(() => {
    expect(result.current.value).toBe('expected');
  });
});
\`\`\`

### Testing Components
\`\`\`typescript
import { render } from '../../helpers/test-utils';

test('should render component', () => {
  const { getByText } = render(<MyComponent />);
  
  expect(getByText('Expected Text')).toBeTruthy();
});
\`\`\`

## Best Practices

1. **Test behavior, not implementation**
2. **Keep tests independent**
3. **Use descriptive test names**
4. **Mock external dependencies**
5. **Clean up after tests**
6. **Test edge cases**
7. **Don't test library code**

## Coverage Goals

- Services: 80%+
- Hooks: 70%+
- Components: 60%+
- Overall: 70%+
```

### Update 2: README

**Update:** `mobile/__tests__/README.md`

Add new sections:
```markdown
## Test Environments

This project uses dual test environments:

- **services**: Node environment for fast service tests
- **react-native**: jest-expo environment for component/hook tests

Tests automatically run in the correct environment based on file location.

## New Test Structure

\`\`\`
__tests__/
├── unit/
│   ├── services/      → Node environment
│   ├── hooks/         → React Native environment
│   ├── components/    → React Native environment
│   └── store/         → React Native environment
├── integration/       → Mixed environments
│   ├── messaging/     → Node environment
│   └── features/      → React Native environment
└── helpers/           → Test utilities
\`\`\`
```

---

## Troubleshooting

### Issue 1: Tests Fail After Infrastructure Change

**Symptoms:**
```
Cannot find module 'react' from 'test-utils.tsx'
```

**Solution:**
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests again
npm test
```

### Issue 2: Hook Tests Fail

**Symptoms:**
```
Invalid hook call. Hooks can only be called inside the body of a function component.
```

**Solution:**
Make sure you're using `renderHook` from `@testing-library/react-native`:
```typescript
import { renderHook } from '@testing-library/react-native';

// NOT: import { renderHook } from '@testing-library/react-hooks';
```

### Issue 3: Tests Timeout

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**Solution:**
Increase timeout in test:
```typescript
test('should do something', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Issue 4: Firebase Mocks Not Working

**Symptoms:**
```
Cannot read property 'collection' of undefined
```

**Solution:**
Check mock setup in setup files:
```typescript
// In setup-react-native.ts or setup-services.ts
jest.mock('../firebase.config', () => ({
  firestore: {
    collection: jest.fn(() => ({ /* ... */ })),
  },
}));
```

---

## Migration Checklist

### Phase 1: Infrastructure ✅
- [ ] Create dual environment config
- [ ] Create setup-services.ts
- [ ] Create setup-react-native.ts
- [ ] Update npm scripts
- [ ] Test all existing tests pass
- [ ] Remove old setup files
- [ ] Update documentation

### Phase 2: Phase 3 Tests ✅
- [ ] Create usePresence.test.ts
- [ ] Create useTypingIndicators.test.ts
- [ ] Create firebase-rtdb.test.ts
- [ ] Verify Phase 3 coverage >80%

### Phase 3: Phase 4 Tests ✅
- [ ] Create image-service.test.ts
- [ ] Enhance conversation-service.test.ts
- [ ] Verify Phase 4 coverage >70%

### Phase 4: Phase 5 Tests ✅
- [ ] Create notification-service.test.ts
- [ ] Create sendMessageNotification.test.ts
- [ ] Verify Phase 5 coverage >70%

### Phase 5: Integration Tests ✅
- [ ] Create complete-messaging-flow.test.tsx
- [ ] Create presence-typing-integration.test.tsx
- [ ] Create offline-mode.test.tsx
- [ ] Verify critical flows tested

### Phase 6: Documentation & CI/CD ✅
- [ ] Create TESTING_GUIDE.md
- [ ] Update README.md
- [ ] Set up GitHub Actions
- [ ] Set up pre-commit hooks
- [ ] Configure Codecov

---

## Quick Win Tests (Start Here)

If you have limited time, prioritize these tests first:

### Day 1 (4 hours) - Critical Infrastructure
1. ✅ Fix dual environments (2 hours)
2. ✅ Test usePresence hook (1 hour)
3. ✅ Test message-store (1 hour)

**Impact:** Prevents critical bugs, enables future tests

### Day 2 (4 hours) - High-Value Tests
1. ✅ Test notification-service (2 hours)
2. ✅ Test useTypingIndicators (1 hour)
3. ✅ Test complete messaging flow (1 hour)

**Impact:** Covers most critical features

### Day 3 (Optional) - Nice to Have
1. ✅ Test image-service (1.5 hours)
2. ✅ Test firebase-rtdb (1 hour)
3. ✅ Integration tests (1.5 hours)

**Impact:** Comprehensive coverage, peace of mind

---

## Post-Refactor Metrics

### Before vs After

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Test Count** | 133 | ~210 | +58% |
| **Coverage** | 35% | 65% | +86% |
| **Critical Path Coverage** | 40% | 85% | +113% |
| **Untested Features** | 5 phases | 1 phase | -80% |
| **Test Infrastructure** | Broken | Fixed | ✅ |
| **Component Tests** | Limited | Full support | ✅ |
| **Hook Tests** | None | Comprehensive | ✅ |
| **Integration Tests** | Basic | Comprehensive | ✅ |

### ROI Analysis

**Investment:** 16-22 hours of work

**Returns:**
- ✅ Prevent regression bugs (save 4+ hours per bug)
- ✅ Faster debugging (save 2+ hours per issue)
- ✅ Confident refactoring (enable Phase 6 work)
- ✅ Production readiness (reduce support time)
- ✅ Team scalability (new devs can verify changes)

**Break-even:** After preventing 2-3 bugs (expected in Phase 6)

---

## Final Recommendations

### For Immediate Testing (This Week)

**Minimum Viable Testing (8 hours):**
1. Fix infrastructure (4 hours)
2. Test usePresence (1 hour)
3. Test notification-service (2 hours)
4. Test message-store (1 hour)

**Result:** Most critical bugs prevented, can proceed to Phase 6

### For Production (Next 2 Weeks)

**Complete Refactor (20 hours):**
1. All infrastructure fixes
2. All Phase 3-5 tests
3. Integration tests
4. CI/CD setup

**Result:** Production-ready testing, confident deployment

### For Long-Term Success

**Ongoing:**
- Write tests for new features
- Maintain 70%+ coverage
- Review tests in PR reviews
- Update tests when refactoring
- Monitor test performance

---

## Conclusion

This refactor plan transforms your testing from:
- ❌ **Broken infrastructure** → ✅ **Proper dual environments**
- ❌ **35% coverage** → ✅ **65% coverage**
- ❌ **No Phase 3-5 tests** → ✅ **Comprehensive coverage**
- ❌ **Can't add new tests** → ✅ **Scalable test framework**

**Estimated Effort:** 16-22 hours (2-3 days)

**Impact:** Production-ready testing before Phase 6 (Polish & Testing)

**ROI:** Prevents 5-10+ hours of debugging in Phase 6 alone

**Recommendation:** Complete at least the "Must Have" tests (15 hours) before starting Phase 6.

---

**Document Version:** 2.0  
**Last Updated:** October 22, 2025  
**Status:** Ready for implementation  
**Next Review:** After Phase 5 deployment

---

## Appendix: Test File Templates

### Template 1: Hook Test

```typescript
/**
 * Tests for [HookName] hook
 * [Brief description of what the hook does]
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMyHook } from '../../../src/hooks/useMyHook';

describe('useMyHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default values', () => {
      const { result } = renderHook(() => useMyHook());
      
      expect(result.current.value).toBe('default');
    });
  });

  describe('State Updates', () => {
    test('should update state', async () => {
      const { result } = renderHook(() => useMyHook());
      
      await act(async () => {
        await result.current.updateValue('new');
      });
      
      expect(result.current.value).toBe('new');
    });
  });

  describe('Cleanup', () => {
    test('should clean up on unmount', () => {
      const { unmount } = renderHook(() => useMyHook());
      
      unmount();
      
      // Verify cleanup happened
    });
  });
});
```

### Template 2: Service Test

```typescript
/**
 * Tests for [ServiceName] service
 * [Brief description of what the service does]
 */

import { myServiceFunction } from '../../../src/services/my-service';

jest.mock('../../../firebase.config');

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('myServiceFunction', () => {
    test('should perform operation successfully', async () => {
      const result = await myServiceFunction('input');
      
      expect(result).toBe('expected');
    });

    test('should handle errors', async () => {
      await expect(
        myServiceFunction('invalid')
      ).rejects.toThrow('error message');
    });
  });
});
```

### Template 3: Integration Test

```typescript
/**
 * Integration test: [Feature Name]
 * Tests: [List of features being tested together]
 */

import { renderHook, waitFor } from '@testing-library/react-native';

describe('Feature Integration', () => {
  test('should complete user flow', async () => {
    // Arrange: Set up initial state
    
    // Act: Perform actions
    
    // Assert: Verify outcome
  });

  test('should handle errors gracefully', async () => {
    // Test error recovery
  });
});
```

---

**END OF TESTING REFACTOR PLAN**

For questions or clarifications, refer to:
- Main assessment: `testing-assessment.md` (in _temp/)
- Fix assessment: `testing-fix-assessment.md` (in _temp/)
- Current status: `PHASE4_TESTS.md` (in __tests__/)
- Regression plan: `REGRESSION_TEST_PLAN.md` (in __tests__/)
