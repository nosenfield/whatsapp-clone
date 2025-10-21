# Testing Guide

## Overview

This directory contains all automated tests for the WhatsApp Clone mobile app.

## Test Structure

```
__tests__/
├── unit/                   # Unit tests (isolated components/functions)
│   ├── components/         # Component tests
│   ├── hooks/              # Custom hook tests
│   ├── services/           # Service layer tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests (multiple systems)
│   ├── messaging/          # Messaging flow tests
│   ├── auth/               # Authentication flow tests
│   └── database/           # Database integration tests
├── e2e/                    # End-to-end tests (full user flows)
│   └── messaging.test.ts   # Complete messaging scenarios
├── fixtures/               # Test data and mocks
│   ├── messages.ts         # Sample messages
│   ├── users.ts            # Sample users
│   └── conversations.ts    # Sample conversations
├── helpers/                # Test utilities
│   ├── test-utils.tsx      # Custom render functions
│   ├── database-helper.ts  # Database test setup
│   └── firebase-mock.ts    # Firebase mocking
└── setup.ts                # Global test setup

```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- MessageInput.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run only integration tests
npm test -- integration/

# Run only unit tests
npm test -- unit/
```

## Test Categories

### Unit Tests (Fast, Isolated)
- **Purpose**: Test individual functions/components in isolation
- **Speed**: <100ms per test
- **When to use**: Testing pure functions, component rendering, hooks
- **Example**: Database helper functions, date formatters, validators

### Integration Tests (Medium Speed)
- **Purpose**: Test multiple systems working together
- **Speed**: 100ms-1s per test
- **When to use**: Testing service interactions, database + Firebase, React Query
- **Example**: Message send flow (SQLite → Firestore → UI)

### E2E Tests (Slow, Comprehensive)
- **Purpose**: Test complete user flows
- **Speed**: 1s-5s per test
- **When to use**: Critical user paths, pre-deployment verification
- **Example**: User signs up → creates conversation → sends message → receives reply

## Writing Good Tests

### Test Structure (AAA Pattern)
```typescript
test('should do something', async () => {
  // Arrange - Set up test data
  const user = createTestUser();
  const conversation = createTestConversation();
  
  // Act - Perform the action
  const result = await sendMessage(conversation.id, 'Hello');
  
  // Assert - Verify the outcome
  expect(result).toBeDefined();
  expect(result.content.text).toBe('Hello');
});
```

### Test Naming
- ✅ `should insert message to SQLite when sending`
- ✅ `should prevent duplicate messages with INSERT OR IGNORE`
- ❌ `test1`, `message test`, `it works`

### What to Test
1. **Happy paths** - Normal usage scenarios
2. **Error cases** - What happens when things go wrong
3. **Edge cases** - Boundary conditions, empty states
4. **Regressions** - Previously found bugs

### What NOT to Test
- Third-party libraries (Firebase, React, etc.)
- Implementation details (state variable names, etc.)
- Obvious code (getters/setters)

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Critical Path** | 90%+ | TBD |
| **Services** | 80%+ | TBD |
| **Components** | 70%+ | TBD |
| **Overall** | 70%+ | TBD |

## Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand MessageInput.test.tsx

# Check which tests are running
npm test -- --listTests
```

## Continuous Integration

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Before deployment (pre-deploy script)

## Best Practices

1. **Keep tests fast** - Mock external dependencies
2. **Keep tests isolated** - Each test should be independent
3. **Keep tests readable** - Use descriptive names and clear assertions
4. **Keep tests maintainable** - Use helpers and fixtures
5. **Test behavior, not implementation** - Focus on user outcomes

## Common Issues

### Issue: Tests timing out
**Solution**: Increase timeout for async operations
```typescript
test('should do something', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Issue: SQLite errors in tests
**Solution**: Initialize a fresh database for each test
```typescript
beforeEach(async () => {
  await initTestDatabase();
});
```

### Issue: Firebase not mocked
**Solution**: Use mock functions
```typescript
jest.mock('../../firebase.config', () => ({
  firestore: mockFirestore,
}));
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

