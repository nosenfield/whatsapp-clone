module.exports = {
  // Don't use jest-expo preset - it conflicts with node environment
  // preset: 'jest-expo',
  
  // Test environment
  testEnvironment: 'node',
  
  // Setup files  
  setupFiles: ['<rootDir>/__tests__/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  
  // Add ts-jest transform for TypeScript
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  
  // UPDATED: More comprehensive transform ignore patterns
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
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  
  // FIXED: Changed from coverageThresholds to coverageThreshold (singular)
  coverageThreshold: {
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

