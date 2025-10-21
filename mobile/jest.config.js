module.exports = {
  preset: 'jest-expo',
  
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // Transform files
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  
  // Module paths
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  
  coverageThresholds: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
  ],
  
  // Module name mapper (for absolute imports)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@types': '<rootDir>/src/types',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000,
};

