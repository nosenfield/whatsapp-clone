import { auth } from '../../firebase.config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';

// Conditionally import Google Sign-In to avoid errors in Expo Go
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (error: any) {
  console.warn('⚠️ Google Sign-In not available in this environment:', error.message);
}

export const signUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName });
  return userCredential.user;
};

export const signIn = async (email: string, password: string): Promise<FirebaseUser> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const onAuthStateChanged = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

/**
 * Configure Google Sign-In
 * Should be called once when app starts
 */
export const configureGoogleSignIn = async (): Promise<void> => {
  if (!GoogleSignin) {
    console.warn('⚠️ Google Sign-In not available - skipping configuration');
    return;
  }
  
  try {
    await GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
    console.log('✅ Google Sign-In configured successfully');
  } catch (error) {
    console.error('❌ Error configuring Google Sign-In:', error);
    throw error;
  }
};

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available in this environment. Please use email/password authentication.');
  }
  
  try {
    // Check if device supports Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // Get user info from Google
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken;
    
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In');
    }
    
    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);
    
    // Sign in to Firebase with Google credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    
    // Handle specific Google Sign-In errors
    if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with this email address using a different sign-in method.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('The credential received is malformed or has expired.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-In is not enabled for this project.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This user account has been disabled.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No user record found.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('The password is invalid.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    }
    
    throw error;
  }
};

/**
 * Check if Google Sign-In is available
 */
export const isGoogleSignInAvailable = async (): Promise<boolean> => {
  if (!GoogleSignin) {
    return false;
  }
  
  try {
    return await GoogleSignin.hasPlayServices();
  } catch (error) {
    console.warn('⚠️ Google Play Services not available:', error);
    return false;
  }
};
