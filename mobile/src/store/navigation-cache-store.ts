/**
 * Navigation Cache Store
 * 
 * Temporary store for passing cached data during navigation
 * to prevent flash of loading states
 */

import { create } from 'zustand';
import { Message } from '../types';

interface NavigationCacheState {
  cachedMessages: Record<string, Message[]>;
  setCachedMessages: (conversationId: string, messages: Message[]) => void;
  getCachedMessages: (conversationId: string) => Message[] | undefined;
  clearCachedMessages: (conversationId: string) => void;
}

export const useNavigationCacheStore = create<NavigationCacheState>((set, get) => ({
  cachedMessages: {},
  
  setCachedMessages: (conversationId: string, messages: Message[]) => {
    set((state) => ({
      cachedMessages: {
        ...state.cachedMessages,
        [conversationId]: messages,
      },
    }));
  },
  
  getCachedMessages: (conversationId: string) => {
    return get().cachedMessages[conversationId];
  },
  
  clearCachedMessages: (conversationId: string) => {
    set((state) => {
      const newCache = { ...state.cachedMessages };
      delete newCache[conversationId];
      return { cachedMessages: newCache };
    });
  },
}));

