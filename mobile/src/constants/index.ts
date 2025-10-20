// App Constants

// Group Chat
export const MAX_GROUP_SIZE = 20;

// Messages
export const MAX_MESSAGE_LENGTH = 5000;

// Media
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

// Timing
export const TYPING_INDICATOR_TIMEOUT = 5000; // 5 seconds
export const TYPING_DEBOUNCE_MS = 300;

// Rate Limits
export const RATE_LIMITS = {
  messagesPerMinute: 30,
  groupCreationsPerHour: 5,
  mediaUploadsPerHour: 20,
  // Future AI features
  aiCallsPerDay: 50,
  aiCallsPerConversation: 10,
};
