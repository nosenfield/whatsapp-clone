import { create } from 'zustand';
import { Message } from '../types';

interface MessageStore {
  // Optimistic messages (not yet confirmed by server)
  optimisticMessages: Message[];

  // Actions
  addOptimisticMessage: (message: Message) => void;
  updateOptimisticMessage: (localId: string, updates: Partial<Message>) => void;
  removeOptimisticMessage: (localId: string) => void;
  clearOptimisticMessages: () => void;
  getOptimisticMessage: (localId: string) => Message | undefined;
}

/**
 * Message Store using Zustand
 * Manages optimistic UI updates for messages
 * 
 * Flow:
 * 1. User sends message → addOptimisticMessage (shows immediately in UI)
 * 2. Server confirms → updateOptimisticMessage (update status)
 * 3. Once confirmed in Firestore → removeOptimisticMessage (rely on Firestore data)
 */
export const useMessageStore = create<MessageStore>((set, get) => ({
  optimisticMessages: [],

  /**
   * Add a message to the optimistic store
   * Called immediately when user sends a message
   */
  addOptimisticMessage: (message) => {
    set((state) => ({
      optimisticMessages: [...state.optimisticMessages, message],
    }));
    
    console.log('📤 Added optimistic message:', message.localId);
  },

  /**
   * Update an optimistic message
   * Called when server responds (success or failure)
   */
  updateOptimisticMessage: (localId, updates) => {
    set((state) => ({
      optimisticMessages: state.optimisticMessages.map((msg) =>
        msg.localId === localId ? { ...msg, ...updates } : msg
      ),
    }));
    
    console.log('🔄 Updated optimistic message:', localId, updates);
  },

  /**
   * Remove message from optimistic store
   * Called once message is confirmed in Firestore
   */
  removeOptimisticMessage: (localId) => {
    set((state) => ({
      optimisticMessages: state.optimisticMessages.filter(
        (msg) => msg.localId !== localId
      ),
    }));
    
    console.log('✅ Removed optimistic message:', localId);
  },

  /**
   * Clear all optimistic messages
   * Useful for cleanup or error recovery
   */
  clearOptimisticMessages: () => {
    set({ optimisticMessages: [] });
    console.log('🧹 Cleared all optimistic messages');
  },

  /**
   * Get a specific optimistic message by localId
   */
  getOptimisticMessage: (localId) => {
    return get().optimisticMessages.find((msg) => msg.localId === localId);
  },
}));

/**
 * Selector hook to get optimistic messages for a specific conversation
 */
export const useOptimisticMessagesForConversation = (conversationId: string) => {
  return useMessageStore((state) =>
    state.optimisticMessages.filter(
      (msg) => msg.conversationId === conversationId
    )
  );
};

/**
 * Selector hook to get all pending messages (status: 'sending')
 */
export const usePendingMessages = () => {
  return useMessageStore((state) =>
    state.optimisticMessages.filter((msg) => msg.status === 'sending')
  );
};

/**
 * Selector hook to get all failed messages
 */
export const useFailedMessages = () => {
  return useMessageStore((state) =>
    state.optimisticMessages.filter(
      (msg) => msg.syncStatus === 'failed'
    )
  );
};
