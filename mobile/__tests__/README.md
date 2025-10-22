# Testing Guide

## Overview

This directory contains all automated tests for the WhatsApp Clone mobile app.

**Test Architecture**: Dual Jest environments for optimal performance
- 🔵 **SERVICES** - Node environment for fast service/integration tests
- 🟣 **COMPONENTS** - React Native environment for UI component tests

## Test Structure

```
__tests__/
├── unit/                   # Unit tests (isolated components/functions)
│   ├── components/         # Component tests (React Native env)
│   ├── hooks/              # Custom hook tests (React Native env)
│   ├── services/           # Service layer tests (Node env)
│   └── store/              # State management tests (Node env)
├── integration/            # Integration tests (Node env)
│   └── messaging/          # Messaging flow tests
├── fixtures/               # Test data and mocks
│   └── test-data.ts        # Sample data factories
├── helpers/                # Test utilities
│   └── test-utils.tsx      # Custom render functions
├── setup-services.ts       # Setup for Node environment tests
└── setup-components.ts     # Setup for React Native environment tests
```

## Running Tests

### All Tests (Both Environments)
```bash
# Run all tests (services + components)
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Services Tests Only (Fast, Node Environment)
```bash
# Run all service tests
npm run test:services

# Run in watch mode
npm run test:services:watch

# Run specific service test
npm run test:services -- database.test.ts
```

### Components Tests Only (React Native Environment)
```bash
# Run all component tests
npm run test:components

# Run in watch mode
npm run test:components:watch

# Run specific component test
npm run test:components -- MessageBubble.test.tsx
```

### Legacy Commands (Still Work)
```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

## Dual Environment Architecture

### Why Two Environments?

**Problem**: React Native tests are slow, but service tests don't need React Native.

**Solution**: Split tests into two Jest projects with different environments:

| Environment | Speed | Use Cases | Example Tests |
|-------------|-------|-----------|---------------|
| **Node** 🔵 | Very Fast | Services, stores, utilities | database.test.ts, message-service.test.ts |
| **React Native** 🟣 | Moderate | Components, hooks | MessageBubble.test.tsx, useMessages.test.tsx |

### Configuration Files

```
mobile/
├── jest.config.js              # Dual project configuration
├── __tests__/
│   ├── setup-services.ts       # Node environment setup
│   └── setup-components.ts     # React Native environment setup
```

**Key Configuration:**
- `jest.config.js` defines two projects with `displayName` for colored output
- Each project has its own `testMatch` pattern and setup file
- Services use `ts-jest` transformer
- Components use `react-native` preset (not jest-expo due to React 19 compatibility)

## Test Categories

### Unit Tests (Fast, Isolated)
- **Purpose**: Test individual functions/components in isolation
- **Speed**: <100ms per test
- **When to use**: Testing pure functions, component rendering, hooks
- **Example**: Database helper functions, message validators, component props

### Integration Tests (Medium Speed)
- **Purpose**: Test multiple systems working together
- **Speed**: 100ms-1s per test
- **When to use**: Testing service interactions, database + Firebase, React Query
- **Example**: Message send flow (SQLite → Firestore → UI)

## Writing Tests

### Service Tests (Node Environment)

**Location**: `__tests__/unit/services/` or `__tests__/integration/`

```typescript
// __tests__/unit/services/example.test.ts
describe('ExampleService', () => {
  beforeEach(async () => {
    // Setup runs in Node environment
    await clearDatabase();
  });

  test('should perform operation quickly', async () => {
    const result = await exampleService.doSomething();
    expect(result).toBeDefined();
  });
});
```

**Features:**
- ✅ Very fast execution (Node environment)
- ✅ Real SQLite database (better-sqlite3)
- ✅ Full TypeScript support
- ✅ All service layer mocks available

### Component Tests (React Native Environment)

**Location**: `__tests__/unit/components/` or `__tests__/unit/hooks/`

```typescript
// __tests__/unit/components/Example.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ExampleComponent } from '../../../src/components/ExampleComponent';

// Mock dependencies
jest.mock('../../../src/hooks/useExample', () => ({
  useExample: jest.fn(),
}));

import { useExample } from '../../../src/hooks/useExample';

describe('ExampleComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render correctly', () => {
    (useExample as jest.Mock).mockReturnValue({
      data: 'test data',
    });

    render(<ExampleComponent />);
    
    expect(screen.getByText('test data')).toBeTruthy();
  });

  test('should handle user interaction', () => {
    const onPress = jest.fn();
    render(<ExampleComponent onPress={onPress} />);
    
    fireEvent.press(screen.getByText('Button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

**Features:**
- ✅ Full React Native Testing Library support
- ✅ Component rendering and interaction testing
- ✅ Hook testing with `renderHook`
- ✅ All Expo modules mocked (firebase, expo-router, etc.)

## Test Structure (AAA Pattern)

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

## Test Naming Conventions

- ✅ `should insert message to SQLite when sending`
- ✅ `should show banner when offline`
- ✅ `should prevent duplicate messages with INSERT OR IGNORE`
- ❌ `test1`, `message test`, `it works`

## What to Test

1. **Happy paths** - Normal usage scenarios
2. **Error cases** - What happens when things go wrong
3. **Edge cases** - Boundary conditions, empty states
4. **Regressions** - Previously found bugs
5. **User interactions** - Clicks, inputs, gestures

## What NOT to Test

- Third-party libraries (Firebase, React, Expo)
- Implementation details (state variable names, internal methods)
- Obvious code (simple getters/setters)
- Mocked functions (test behavior, not mocks)

## Test Coverage Goals

| Category | Target | Current | Environment |
|----------|--------|---------|-------------|
| **Services** | 80%+ | ~40% | 🔵 Node |
| **Components** | 70%+ | ~10% | 🟣 React Native |
| **Hooks** | 70%+ | 0% | 🟣 React Native |
| **Overall** | 70%+ | ~35% | Both |

## Mocking Strategy

### Services Tests (Node Environment)

All mocks are in `__tests__/setup-services.ts`:
- ✅ Firebase (virtual mocks)
- ✅ Expo modules (virtual mocks)
- ✅ SQLite (real better-sqlite3 in-memory database)

### Component Tests (React Native Environment)

All mocks are in `__tests__/setup-components.ts`:
- ✅ Firebase (with realistic method signatures)
- ✅ Expo modules (expo-router, expo-sqlite, etc.)
- ✅ @expo/vector-icons (virtual mock)
- ✅ @react-native-community/netinfo

**Additional mocks per test file:**
```typescript
// Mock custom hooks
jest.mock('../../../src/hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));
```

## Debugging Tests

### Verbose Output
```bash
npm run test:services -- --verbose
npm run test:components -- --verbose
```

### Run Single Test
```bash
npm run test:services -- database.test.ts
npm run test:components -- MessageBubble.test.tsx
```

### Debug with Node Inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand database.test.ts
```

### List All Tests
```bash
npm test -- --listTests
```

### Check Test Coverage
```bash
npm run test:coverage

# Coverage report opens at: mobile/coverage/lcov-report/index.html
```

## Common Issues & Solutions

### Issue: "Cannot find module 'react-native'"
**Environment**: COMPONENTS project  
**Solution**: Module is not being transformed. Add to `transformIgnorePatterns` in jest.config.js

### Issue: Tests timing out
**Solution**: Increase timeout
```typescript
test('should do something', async () => {
  // ...
}, 15000); // 15 second timeout
```

### Issue: Component test fails with "Object.defineProperty"
**Environment**: COMPONENTS project  
**Cause**: React 19 + jest-expo compatibility issue  
**Solution**: Already fixed - we use `react-native` preset instead of `jest-expo`

### Issue: Mock not working
**Solution**: Mock must be defined before import
```typescript
// ✅ Correct order
jest.mock('../../../src/hooks/useExample', () => ({
  useExample: jest.fn(),
}));

import { useExample } from '../../../src/hooks/useExample';

// ❌ Wrong order
import { useExample } from '../../../src/hooks/useExample';

jest.mock('../../../src/hooks/useExample', () => ({
  useExample: jest.fn(),
}));
```

### Issue: SQLite errors in service tests
**Solution**: Database might not be initialized
```typescript
beforeEach(async () => {
  await clearAllData(); // Clear between tests
});
```

## Performance Tips

1. **Use the right environment**
   - Service tests → `__tests__/unit/services/` (Node, fast)
   - Component tests → `__tests__/unit/components/` (React Native, moderate)

2. **Run focused tests during development**
   ```bash
   npm run test:services:watch  # Only service tests
   npm run test:components:watch  # Only component tests
   ```

3. **Use selective testing**
   ```bash
   npm run test:services -- database.test.ts --watch
   ```

4. **Parallelize when possible**
   - Both environments run in parallel by default
   - Total test time ≈ max(services time, components time)

## CI/CD Integration

Tests run automatically on:
- Every commit (pre-commit hook) - Services only for speed
- Pull requests (GitHub Actions) - Full suite
- Before deployment (pre-deploy script) - Full suite

## Best Practices

1. **Keep tests fast** - Use the Node environment when possible
2. **Keep tests isolated** - Each test should be independent
3. **Keep tests readable** - Use descriptive names and clear assertions
4. **Keep tests maintainable** - Use helpers and fixtures
5. **Test behavior, not implementation** - Focus on user outcomes
6. **Mock external dependencies** - Never call real Firebase in tests
7. **Use appropriate environment** - Services in Node, components in React Native

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Projects Configuration](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Context7 Jest Documentation](https://jestjs.io/docs/next/configuration)

## Recent Updates

**October 22, 2025**: Implemented dual Jest environment configuration
- ✅ Separated Node and React Native test environments
- ✅ Fixed React 19 compatibility (switched from jest-expo to react-native preset)
- ✅ Added new npm scripts for running environments separately
- ✅ Updated all setup files and mocks
- ✅ All existing tests still passing (68 service tests, 6 component tests)

See `context-summaries/2025-10-22-component-testing-refactor.md` for full migration details.
