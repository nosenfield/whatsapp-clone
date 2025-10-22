# Testing Framework Setup Guide

## ✅ What Was Set Up

Your project now has a complete testing framework with:

### 📁 Structure
```
mobile/
├── __tests__/
│   ├── unit/                      # Fast, isolated tests
│   │   └── components/
│   │       └── MessageBubble.test.tsx
│   ├── integration/               # Multi-system tests
│   │   └── messaging/
│   │       └── messaging-bugs.test.ts
│   ├── fixtures/                  # Test data
│   │   └── test-data.ts
│   ├── helpers/                   # Test utilities
│   │   └── test-utils.tsx
│   ├── setup.ts                   # Global setup
│   └── README.md                  # Testing guide
├── jest.config.js                 # Jest configuration
└── TESTING_SETUP.md              # This file
```

### 🛠️ Configuration
- ✅ Jest with `jest-expo` preset
- ✅ React Native Testing Library
- ✅ TypeScript support
- ✅ Coverage thresholds (70%)
- ✅ Custom render with providers
- ✅ Firebase mocks
- ✅ Expo mocks

### 📝 Test Scripts
```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test:unit         # Only unit tests
npm run test:integration  # Only integration tests
```

---

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
cd mobile
npm install
```

This will install:
- `jest` - Test runner
- `jest-expo` - Expo preset for Jest
- `@testing-library/react-native` - Testing utilities
- `@testing-library/jest-native` - Custom matchers
- `@types/jest` - TypeScript types
- `react-test-renderer` - React testing renderer

### 2. Verify Installation

```bash
npm test -- --version
```

You should see Jest version info.

### 3. Run Your First Test

```bash
npm test
```

This will run all tests in the `__tests__` directory.

---

## 📊 What Tests Were Created

### 1. Regression Tests for Your Bugs

**File**: `__tests__/integration/messaging/messaging-bugs.test.ts`

Tests all 4 bugs we just fixed:
- ✅ UNIQUE Constraint (INSERT OR IGNORE)
- ✅ NOT NULL Constraint (conversationId mapping)
- ✅ FOREIGN KEY Constraint (upsert conversation first)
- ✅ Duplicate Messages (optimistic store cleanup)

**Run it:**
```bash
npm test messaging-bugs
```

### 2. Component Test Example

**File**: `__tests__/unit/components/MessageBubble.test.tsx`

Example unit test for the MessageBubble component.

**Run it:**
```bash
npm test MessageBubble
```

---

## 🎯 Next Steps

### Option 1: Add More Tests (Recommended)

1. **Test Database Operations** (High Priority)
```bash
# Create: __tests__/unit/services/database.test.ts
npm test database
```

2. **Test Firebase Services** (Medium Priority)
```bash
# Create: __tests__/unit/services/firebase-firestore.test.ts
npm test firebase
```

3. **Test Components** (Lower Priority)
```bash
# Create tests for MessageInput, MessageList, etc.
npm test components
```

### Option 2: Run Tests Before Commit

Add pre-commit hook to run tests automatically:

**File**: `.git/hooks/pre-commit`
```bash
#!/bin/sh
cd mobile && npm test -- --bail
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Option 3: Set Up CI/CD

Add to GitHub Actions:

**File**: `.github/workflows/test.yml`
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd mobile && npm install
      - run: cd mobile && npm test
```

---

## 📚 Testing Best Practices

### Write Tests That:
1. **Test Behavior, Not Implementation**
   - ✅ "User can send a message"
   - ❌ "sendMessage function calls insertMessage"

2. **Are Independent**
   - Each test should work in isolation
   - Don't rely on other tests running first

3. **Are Fast**
   - Mock external dependencies (Firebase, SQLite)
   - Unit tests should be < 100ms

4. **Are Readable**
   - Clear test names
   - AAA pattern (Arrange, Act, Assert)
   - Comments for complex logic

### Example Test Structure:
```typescript
describe('Feature Name', () => {
  test('should do something when condition', async () => {
    // Arrange - Set up test data
    const message = createTestMessage();
    
    // Act - Perform action
    await insertMessage(message);
    
    // Assert - Verify result
    expect(message).toHaveBeenInserted();
  });
});
```

---

## 🐛 Debugging Tests

### Test Fails But Should Pass?

1. **Check Mock Setup**
```typescript
// Verify mocks are working
console.log('Mock called:', mockFn.mock.calls);
```

2. **Increase Timeout**
```typescript
test('slow test', async () => {
  // ...
}, 15000); // 15 second timeout
```

3. **Run Single Test**
```bash
npm test -- MessageBubble.test.tsx --verbose
```

### Test Passes But Shouldn't?

1. **Check Assertions**
```typescript
// Bad - No actual assertion
test('should work', () => {
  sendMessage();
  // Test passes because no assertion failed
});

// Good - Has assertion
test('should work', async () => {
  const result = await sendMessage();
  expect(result).toBeDefined();
});
```

2. **Use .rejects/.resolves for Promises**
```typescript
// Test async errors
await expect(sendMessage()).rejects.toThrow();
```

---

## 📈 Coverage Reports

### Generate Coverage Report
```bash
npm run test:coverage
```

### View HTML Report
```bash
open coverage/lcov-report/index.html
```

### Coverage Thresholds
Current thresholds (in `jest.config.js`):
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

You can adjust these in `jest.config.js` under `coverageThresholds`.

---

## 🤔 FAQ

### Q: Do I need to test everything?
**A:** No. Focus on:
1. Critical paths (messaging, auth)
2. Complex logic (optimistic updates)
3. Bug-prone areas (database operations)
4. Regressions (previously found bugs)

### Q: How long should tests take?
**A:** 
- Unit tests: < 100ms each
- Integration tests: < 1s each
- Full suite: < 30s for quick feedback

### Q: Should I write tests first (TDD)?
**A:** Not required, but helps catch bugs earlier. For this project:
- Write tests for new features: Optional
- Write tests for bug fixes: **Highly recommended**

### Q: What about E2E tests?
**A:** For MVP, integration tests are sufficient. Add E2E tests with Detox/Maestro post-TestFlight if needed.

---

## 🎓 Resources

### Documentation
- [Jest](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Tutorials
- [Testing React Native Apps](https://reactnative.dev/docs/testing-overview)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Mocking in Jest](https://jestjs.io/docs/mock-functions)

---

## ✅ Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Run tests (`npm test`)
- [ ] Verify 2 test suites pass
- [ ] Read `__tests__/README.md`
- [ ] Add tests for your next feature
- [ ] Set up pre-commit hook (optional)
- [ ] Configure CI/CD (optional)

---

## 📞 Need Help?

If you encounter issues:

1. **Check Jest version**
```bash
npm test -- --version
```

2. **Clear Jest cache**
```bash
npx jest --clearCache
```

3. **Reinstall dependencies**
```bash
rm -rf node_modules
npm install
```

4. **Check for TypeScript errors**
```bash
npx tsc --noEmit
```

---

**Setup Complete!** 🎉

You now have a professional testing framework ready for development.

