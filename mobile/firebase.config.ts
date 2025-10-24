import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import Constants from 'expo-constants';

// Read Firebase config from environment variables
// Using EXPO_PUBLIC_ prefix makes these available in the app
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

// Validate that all required config values are present
const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'databaseURL',
] as const;

for (const key of requiredConfigKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Missing Firebase configuration: ${key}. ` +
      `Please ensure all EXPO_PUBLIC_FIREBASE_* variables are set in your .env file.`
    );
  }
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Auth (Firebase v12 handles persistence automatically in React Native)
export const auth = getAuth(app);

// Initialize Firestore with offline persistence
// This enables better offline support and faster queries
export const firestore = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Log config status in development (without exposing sensitive values)
if (__DEV__) {
  console.log('✅ Firebase initialized with project:', firebaseConfig.projectId);
}
