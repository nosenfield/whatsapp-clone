// Firebase Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  pushToken?: string;
  pushTokenUpdatedAt?: Date;
  notificationsEnabled?: boolean; // Whether push notifications are enabled (default: true)
  createdAt: Date;
  lastActive: Date;
  preferences?: {
    language?: string;
    aiEnabled?: boolean;
    autoTranslate?: boolean;
  };
}

// Message Types
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'file';
export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface MessageContent {
  text: string;
  type: MessageType;
  mediaUrl?: string;
  mediaThumbnail?: string;
  metadata?: {
    translation?: Record<string, string>;
    sentiment?: 'positive' | 'neutral' | 'negative';
    aiSuggestions?: string[];
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: MessageContent;
  timestamp: Date;
  status: MessageStatus;
  deliveredTo: string[];
  readBy: Record<string, Date>;
  localId?: string;
  syncStatus?: SyncStatus;
  deletedAt?: Date;
  deletedFor?: string[];
}

// Conversation Types
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[];
  participantDetails: Record<string, {
    displayName: string;
    photoURL?: string;
  }>;
  name?: string;
  createdBy?: string;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: Record<string, number>;
  lastSeenBy?: Record<string, {
    lastMessageId?: string;
    seenAt: Date;
  }>;
}

// State Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface MessageStore {
  optimisticMessages: Message[];
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (localId: string, updates: Partial<Message>) => void;
  removeOptimisticMessage: (localId: string) => void;
}

// Presence Types
export interface Presence {
  online: boolean;
  lastSeen: Date | null;
}

// Typing Indicator Types
export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

// Parent-Caregiver AI Types
export interface ExtractedEvent {
  id: string;
  conversationId: string;
  messageId: string;
  title: string;
  date: Date;
  time?: string;
  location?: string;
  participants: string[];
  status: 'proposed' | 'confirmed' | 'cancelled';
  extractedAt: Date;
  extractedBy: string; // AI system
  googleCalendarEventId?: string;
  deviceCalendarEventId?: string;
}

export interface Decision {
  id: string;
  conversationId: string;
  summary: string;
  outcome: string;
  participants: string[];
  actionItems: ActionItem[];
  decisionDate: Date;
  extractedAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  relatedEventId?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface PriorityMessage {
  messageId: string;
  conversationId: string;
  priority: 'urgent' | 'high' | 'normal';
  reason: string;
  confidence: number; // 0-1
  analyzedAt: Date;
}

export interface RSVPTracker {
  id: string;
  conversationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  invitees: RSVPResponse[];
  organizerId: string;
  createdAt: Date;
  status: 'active' | 'closed';
}

export interface RSVPResponse {
  userId: string;
  response: 'yes' | 'no' | 'maybe' | 'pending';
  respondedAt?: Date;
  message?: string;
}

export interface Deadline {
  id: string;
  conversationId: string;
  messageId: string;
  taskDescription: string;
  deadline: Date;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'overdue';
  reminders: Reminder[];
  extractedAt: Date;
}

export interface Reminder {
  id: string;
  deadlineId: string;
  reminderTime: Date;
  status: 'pending' | 'sent' | 'snoozed';
  sentAt?: Date;
  snoozedUntil?: Date;
}

export interface SchedulingConflict {
  id: string;
  userId: string;
  conflictingEvents: string[]; // Array of event IDs
  conflictType: 'time_overlap' | 'location_conflict' | 'resource_conflict';
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
  suggestedSolutions: ConflictSolution[];
  status: 'active' | 'resolved' | 'dismissed';
}

export interface ConflictSolution {
  id: string;
  description: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  automated: boolean;
  actions: string[];
}

export interface MessageEmbedding {
  id: string;
  messageId: string;
  conversationId: string;
  embedding: number[];
  text: string;
  createdAt: Date;
  metadata: {
    senderId: string;
    timestamp: Date;
    messageType: string;
  };
}

// AI Feature Flags
export interface UserFeatureFlags {
  userId: string;
  features: {
    calendarExtraction: boolean;
    decisionSummarization: boolean;
    priorityHighlighting: boolean;
    rsvpTracking: boolean;
    deadlineReminders: boolean;
    proactiveAssistant: boolean;
    ragPipeline: boolean;
  };
  updatedAt: Date;
}
