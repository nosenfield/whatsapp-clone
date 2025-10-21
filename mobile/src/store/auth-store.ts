import { create } from 'zustand';
import { User } from '../types';
import * as firebaseAuth from '../services/firebase-auth';
import * as firestoreService from '../services/firebase-firestore';
import { initializePresence, setPresence } from '../services/firebase-rtdb';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

/**
 * Convert Firebase User to our User type
 */
const firebaseUserToUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: firebaseUser.displayName || 'Anonymous',
    photoURL: firebaseUser.photoURL || undefined,
    createdAt: new Date(firebaseUser.metadata.creationTime!),
    lastActive: new Date(),
  };
};

/**
 * Auth Store using Zustand
 * Manages authentication state and provides auth actions
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true while checking auth state
  error: null,

  // Set user (also updates isAuthenticated)
  setUser: (user) => {
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
      error: null,
    });
  },

  // Set loading state
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Set error
  setError: (error) => {
    set({ error });
  },

  /**
   * Sign up a new user
   */
  signUp: async (email, password, displayName) => {
    try {
      set({ isLoading: true, error: null });

      // Create Firebase auth user
      const firebaseUser = await firebaseAuth.signUp(email, password, displayName);

      // Create user document in Firestore
      await firestoreService.createUser(firebaseUser.uid, {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: displayName,
        createdAt: new Date(),
        lastActive: new Date(),
      });

      // Convert to our User type
      const user = firebaseUserToUser(firebaseUser);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Initialize presence system
      console.log('🟢 Initializing presence for new user');
      await initializePresence(firebaseUser.uid);

      console.log('✅ User signed up successfully:', user.email);
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      set({
        error: error.message || 'Failed to sign up',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Sign in an existing user
   */
  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      // Sign in with Firebase
      const firebaseUser = await firebaseAuth.signIn(email, password);

      // Fetch user data from Firestore
      const userData = await firestoreService.getUser(firebaseUser.uid);

      let user: User;
      if (userData) {
        user = userData;
      } else {
        // If user document doesn't exist (shouldn't happen), create it
        user = firebaseUserToUser(firebaseUser);
        await firestoreService.createUser(firebaseUser.uid, user);
      }

      // Update last active
      await firestoreService.updateUser(firebaseUser.uid, {
        lastActive: new Date(),
      });

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Initialize presence system
      console.log('🟢 Initializing presence for signed-in user');
      await initializePresence(firebaseUser.uid);

      console.log('✅ User signed in successfully:', user.email);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      set({
        error: error.message || 'Failed to sign in',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      const { user } = get();
      
      // Set user as offline before signing out
      if (user) {
        console.log('🔴 Setting user offline before sign out');
        await setPresence(user.id, false);
      }

      await firebaseAuth.signOut();

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      console.log('✅ User signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      set({
        error: error.message || 'Failed to sign out',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Initialize auth listener
   * Should be called once when app starts
   */
  initializeAuth: () => {
    set({ isLoading: true });

    // Listen to auth state changes
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // User is signed in
          const userData = await firestoreService.getUser(firebaseUser.uid);

          let user: User;
          if (userData) {
            user = userData;
          } else {
            // Create user document if it doesn't exist
            user = firebaseUserToUser(firebaseUser);
            await firestoreService.createUser(firebaseUser.uid, user);
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Initialize presence system
          console.log('🟢 Initializing presence for restored user');
          await initializePresence(firebaseUser.uid);

          console.log('✅ Auth state restored:', user.email);
        } catch (error: any) {
          console.error('❌ Error loading user data:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message,
          });
        }
      } else {
        // User is signed out
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        console.log('ℹ️ No authenticated user');
      }
    });

    // Return cleanup function (not used in Zustand, but could be useful)
    return unsubscribe;
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      set({ isLoading: true, error: null });

      // Update in Firestore
      await firestoreService.updateUser(user.id, updates);

      // Update local state
      set({
        user: { ...user, ...updates },
        isLoading: false,
        error: null,
      });

      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      set({
        error: error.message || 'Failed to update profile',
        isLoading: false,
      });
      throw error;
    }
  },
}));

/**
 * Selector hooks for convenience
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
