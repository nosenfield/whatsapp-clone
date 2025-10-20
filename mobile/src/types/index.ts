// Firebase Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  pushToken?: string;
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
    text: string;
    senderId: string;
    timestamp: Date;
  };
  unreadCount: Record<string, number>;
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
