/**
 * Map Firebase error codes to user-friendly messages
 */

interface FirebaseError {
  code?: string;
  message: string;
}

export function getAuthErrorMessage(error: any): string {
  const firebaseError = error as FirebaseError;
  
  // Map Firebase auth error codes to user-friendly messages
  const errorCode = firebaseError.code;
  
  switch (errorCode) {
    // Sign up errors
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign up is not enabled. Please contact support.';
    
    // Sign in errors
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    
    // Network errors
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/timeout':
      return 'Request timed out. Please try again.';
    
    // General errors
    case 'auth/internal-error':
      return 'Something went wrong. Please try again later.';
    case 'auth/invalid-api-key':
      return 'App configuration error. Please contact support.';
    
    // Default
    default:
      // If no code or unknown code, return a generic message
      if (!errorCode) {
        return 'An error occurred. Please try again.';
      }
      // Return the original message as fallback (but cleaned up)
      return firebaseError.message || 'An error occurred. Please try again.';
  }
}

export function getFirestoreErrorMessage(error: any): string {
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code;
  
  switch (errorCode) {
    case 'permission-denied':
      return 'You don\'t have permission to access this data.';
    case 'not-found':
      return 'The requested data was not found.';
    case 'already-exists':
      return 'This item already exists.';
    case 'failed-precondition':
      return 'This operation cannot be completed at this time.';
    case 'unavailable':
      return 'Service is temporarily unavailable. Please try again.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    case 'resource-exhausted':
      return 'Too many requests. Please slow down.';
    default:
      return 'Failed to save your changes. Please try again.';
  }
}

export function getStorageErrorMessage(error: any): string {
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code;
  
  switch (errorCode) {
    case 'storage/object-not-found':
      return 'File not found.';
    case 'storage/unauthorized':
      return 'You don\'t have permission to access this file.';
    case 'storage/canceled':
      return 'Upload was cancelled.';
    case 'storage/quota-exceeded':
      return 'Storage quota exceeded. Please contact support.';
    case 'storage/invalid-checksum':
      return 'File was corrupted during upload. Please try again.';
    case 'storage/retry-limit-exceeded':
      return 'Upload failed after multiple attempts. Please try again later.';
    case 'storage/invalid-argument':
      return 'Invalid file. Please try a different file.';
    case 'storage/unauthenticated':
      return 'Please sign in to upload files.';
    default:
      return 'Failed to upload file. Please try again.';
  }
}

export function getNetworkErrorMessage(error: any): string {
  if (!navigator.onLine) {
    return 'No internet connection. Please check your network and try again.';
  }
  return 'Network error. Please check your connection and try again.';
}

export function getGenericErrorMessage(error: any): string {
  // Try to determine error type from the error code prefix
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code;
  
  if (errorCode) {
    if (errorCode.startsWith('auth/')) {
      return getAuthErrorMessage(error);
    } else if (errorCode.startsWith('storage/')) {
      return getStorageErrorMessage(error);
    } else {
      return getFirestoreErrorMessage(error);
    }
  }
  
  // Check if it's a network error
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return getNetworkErrorMessage(error);
  }
  
  // Default fallback
  return 'Something went wrong. Please try again.';
}

