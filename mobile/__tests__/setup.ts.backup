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

// Mock expo-sqlite with better-sqlite3 for real SQL testing
jest.mock('expo-sqlite', () => {
  const Database = require('better-sqlite3');
  const databases = new Map();

  return {
    openDatabaseAsync: jest.fn(async (name: string) => {
      // Use in-memory database for tests
      let db = databases.get(name);
      if (!db) {
        db = new Database(':memory:');
        databases.set(name, db);
      }

      return {
        execAsync: jest.fn(async (sql: string) => {
          db.exec(sql);
        }),
        
        runAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const stmt = db.prepare(sql);
          return stmt.run(...params);
        }),
        
        getAllAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const stmt = db.prepare(sql);
          return stmt.all(...params);
        }),
        
        getFirstAsync: jest.fn(async (sql: string, params: any[] = []) => {
          const stmt = db.prepare(sql);
          return stmt.get(...params);
        }),
      };
    }),
  };
});

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

