/**
 * Global test setup
 * Runs once before all tests
 */

// Conditionally import testing-library only if available
try {
  require('@testing-library/jest-native/extend-expect');
} catch (e) {
  // Not available - that's OK for service tests
}

// Mock Expo modules (only if they're actually imported in tests)
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}), { virtual: true });

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}), { virtual: true });

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}), { virtual: true });

// Mock Firebase
jest.mock('../firebase.config', () => ({
  auth: {},
  firestore: {},
  realtimeDb: {},
  storage: {},
}), { virtual: true });

// Mock React Native modules (only if needed)
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(10000);

