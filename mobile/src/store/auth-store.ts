import { create } from 'zustand';
import { User } from '../types';
import * as firebaseAuth from '../services/firebase-auth';
import * as firestoreService from '../services/firebase-firestore';
import { initializePresence, setPresence } from '../services/firebase-rtdb';
import { registerForPushNotifications } from '../services/notifications';
import { getAuthErrorMessage, getFirestoreErrorMessage } from '../utils/error-messages';
import { User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  registerPushToken: (userId: string) => Promise<void>;
}

/**
 * Convert Firebase User to our User type
 */
const firebaseUserToUser = (firebaseUser: FirebaseUser): User => {
  const user: User = {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: firebaseUser.displayName || 'Anonymous',
    createdAt: new Date(firebaseUser.metadata.creationTime!),
    lastActive: new Date(),
  };

  // Only add photoURL if it exists (Firestore doesn't allow undefined values)
  if (firebaseUser.photoURL) {
    user.photoURL = firebaseUser.photoURL;
  }

  return user;
};

/**
 * Manual auth persistence helpers for Expo Go compatibility
 */
const AUTH_STORAGE_KEY = '@whatsapp_clone_auth_user';

const saveUserToStorage = async (user: User | null): Promise<void> => {
  try {
    if (user) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      console.log('💾 User saved to AsyncStorage');
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('🗑️ User removed from AsyncStorage');
    }
  } catch (error) {
    console.warn('⚠️ Failed to save user to storage:', error);
  }
};

const getUserFromStorage = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (userData) {
      const user = JSON.parse(userData);
      console.log('📱 User restored from AsyncStorage');
      return user;
    }
  } catch (error) {
    console.warn('⚠️ Failed to restore user from storage:', error);
  }
  return null;
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
    // Save to AsyncStorage for persistence across reloads
    saveUserToStorage(user);
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

      // Use setUser to save to AsyncStorage
      get().setUser(user);

      // Initialize presence system
      console.log('🟢 Initializing presence for new user');
      await initializePresence(firebaseUser.uid);

      // Register push notification token
      await get().registerPushToken(firebaseUser.uid);

      console.log('✅ User signed up successfully:', user.email);
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      const errorMessage = getAuthErrorMessage(error);
      set({
        error: errorMessage,
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

      // Use setUser to save to AsyncStorage
      get().setUser(user);

      // Initialize presence system
      console.log('🟢 Initializing presence for signed-in user');
      await initializePresence(firebaseUser.uid);

      // Register push notification token
      await get().registerPushToken(firebaseUser.uid);

      console.log('✅ User signed in successfully:', user.email);
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      const errorMessage = getAuthErrorMessage(error);
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Sign in with Google
   */
  signInWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });

      // Sign in with Google
      const firebaseUser = await firebaseAuth.signInWithGoogle();

      // Check if user document exists in Firestore
      const userData = await firestoreService.getUser(firebaseUser.uid);

      let user: User;
      if (userData) {
        // Update existing user with latest Google info
        user = {
          ...userData,
          displayName: firebaseUser.displayName || userData.displayName,
          lastActive: new Date(),
        };

        // Only update photoURL if it exists (Firestore doesn't allow undefined values)
        if (firebaseUser.photoURL) {
          user.photoURL = firebaseUser.photoURL;
        } else if (userData.photoURL) {
          user.photoURL = userData.photoURL;
        }
        
        // Update user document with latest info
        await firestoreService.updateUser(firebaseUser.uid, {
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastActive: user.lastActive,
        });
      } else {
        // Create new user document for Google user
        user = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || 'Google User',
          createdAt: new Date(firebaseUser.metadata.creationTime!),
          lastActive: new Date(),
        };

        // Only add photoURL if it exists (Firestore doesn't allow undefined values)
        if (firebaseUser.photoURL) {
          user.photoURL = firebaseUser.photoURL;
        }
        
        await firestoreService.createUser(firebaseUser.uid, user);
      }

      // Use setUser to save to AsyncStorage
      get().setUser(user);

      // Initialize presence system
      console.log('🟢 Initializing presence for Google signed-in user');
      await initializePresence(firebaseUser.uid);

      // Register push notification token
      await get().registerPushToken(firebaseUser.uid);

      console.log('✅ User signed in with Google successfully:', user.email);
    } catch (error: any) {
      console.error('❌ Google Sign-In error:', error);
      const errorMessage = getAuthErrorMessage(error);
      set({
        error: errorMessage,
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

      // Use setUser to clear AsyncStorage and update state
      get().setUser(null);

      console.log('✅ User signed out successfully');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      const errorMessage = getAuthErrorMessage(error);
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Initialize auth listener
   * Should be called once when app starts
   */
  initializeAuth: async () => {
    set({ isLoading: true });

    // First, try to restore user from AsyncStorage (for Expo Go compatibility)
    const storedUser = await getUserFromStorage();
    let hasRestoredFromStorage = false;
    
    if (storedUser) {
      console.log('🔄 Restoring user from AsyncStorage:', storedUser.email);
      get().setUser(storedUser); // Use setUser to save to AsyncStorage
      hasRestoredFromStorage = true;
      
      // Initialize presence and push token for restored user
      try {
        await initializePresence(storedUser.id);
        await get().registerPushToken(storedUser.id);
        console.log('✅ User restored from AsyncStorage');
      } catch (error) {
        console.warn('⚠️ Failed to initialize services for restored user:', error);
      }
    }

    // Configure Google Sign-In
    try {
      await firebaseAuth.configureGoogleSignIn();
    } catch (error) {
      console.warn('⚠️ Google Sign-In configuration failed:', error);
      // Don't throw - app should still work without Google Sign-In
    }

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

          // Use setUser to save to AsyncStorage
          get().setUser(user);

          // Initialize presence system
          console.log('🟢 Initializing presence for restored user');
          await initializePresence(firebaseUser.uid);

          // Register push notification token
          await get().registerPushToken(firebaseUser.uid);

          console.log('✅ Auth state restored:', user.email);
        } catch (error: any) {
          console.error('❌ Error loading user data:', error);
          const errorMessage = getFirestoreErrorMessage(error);
          get().setUser(null); // Use setUser to clear AsyncStorage
        }
      } else {
        // User is signed out - only clear if we didn't restore from AsyncStorage
        if (!hasRestoredFromStorage) {
          get().setUser(null); // Use setUser to clear AsyncStorage
          console.log('ℹ️ No authenticated user');
        } else {
          console.log('ℹ️ Firebase Auth says no user, but we restored from AsyncStorage');
        }
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
      const errorMessage = getFirestoreErrorMessage(error);
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Register push notification token for the user
   * Should be called after sign in/sign up
   */
  registerPushToken: async (userId: string) => {
    try {
      console.log('📱 Registering push token for user:', userId);

      // Get push token from Expo
      const pushToken = await registerForPushNotifications(userId);

      if (!pushToken) {
        console.warn('⚠️ No push token received (simulator or permission denied)');
        return;
      }

      // Save token to Firestore
      await firestoreService.updateUser(userId, {
        pushToken,
        pushTokenUpdatedAt: new Date(),
      });

      console.log('✅ Push token registered and saved to Firestore');
    } catch (error: any) {
      console.error('❌ Error registering push token:', error);
      // Don't throw - push notification failure shouldn't block app usage
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
