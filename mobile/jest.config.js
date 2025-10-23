/**
 * Dual Jest Environment Configuration
 * - SERVICES: Node environment for fast service/integration tests
 * - COMPONENTS: React Native environment for UI component tests
 */

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
        '<rootDir>/__tests__/unit/commands/**/*.test.{ts,tsx}',
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
      
      // Coverage for services and commands
      collectCoverageFrom: [
        'src/services/**/*.{ts,tsx}',
        'src/commands/**/*.{ts,tsx}',
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
      
      // Use react-native preset (instead of jest-expo to avoid React 19 issues)
      preset: 'react-native',
      
      // Only run component and hook tests
      testMatch: [
        '<rootDir>/__tests__/unit/components/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/unit/hooks/**/*.test.{ts,tsx}',
      ],
      
      // Setup files
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup-components.ts'],
      
      // Transform patterns (from Expo's recommended pattern + Context7)
      transformIgnorePatterns: [
        'node_modules/(?!(?:.pnpm/)?' +
          '((jest-)?react-native|@react-native(-community)?|' +
          'expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|' +
          'react-navigation|@react-navigation/.*|' +
          '@sentry/react-native|native-base|react-native-svg))'
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
