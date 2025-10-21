/**
 * Jest setup that runs before tests
 * Fixes compatibility issues with jest-expo and node test environment
 */

// Mock global that jest-expo tries to access
global.window = {};
global.document = {};
global.navigator = { userAgent: 'node.js' };

// Set up jsdom-like environment for jest-expo
if (typeof globalThis.window === 'undefined') {
  globalThis.window = global.window;
}

