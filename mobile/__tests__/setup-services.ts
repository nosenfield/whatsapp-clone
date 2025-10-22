/**
 * Setup for service and integration tests (Node environment)
 * Fast execution without React Native overhead
 */

// Mock Expo modules (virtual since they don't exist in Node)
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

