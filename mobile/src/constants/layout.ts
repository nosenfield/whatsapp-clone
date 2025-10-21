/**
 * Layout constants for consistent spacing across the app
 * Handles iOS safe areas (status bar, home indicator)
 */

import { Platform } from 'react-native';

/**
 * Safe area insets for iOS
 * These ensure content doesn't overlap with system UI
 */
export const SAFE_AREA = {
  // Top inset (status bar area)
  TOP: Platform.OS === 'ios' ? 44 : 0, // Standard iOS status bar height
  
  // Bottom inset (home indicator area)
  BOTTOM: Platform.OS === 'ios' ? 34 : 0, // iPhone X and newer home indicator
  
  // Additional padding for older iPhones without home indicator
  BOTTOM_LEGACY: Platform.OS === 'ios' ? 20 : 0,
} as const;

/**
 * Standard spacing values
 */
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 40,
} as const;

/**
 * Common component heights
 */
export const HEIGHTS = {
  TAB_BAR: 49, // Standard iOS tab bar height
  HEADER: 44, // Standard iOS navigation header height
  INPUT: 40,
  BUTTON: 50,
} as const;

/**
 * Helper function to get bottom padding based on device
 * Uses the larger of the two values to ensure compatibility
 */
export const getBottomSafeArea = (): number => {
  return Math.max(SAFE_AREA.BOTTOM, SAFE_AREA.BOTTOM_LEGACY);
};

