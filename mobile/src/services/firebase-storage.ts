import { storage } from '../../firebase.config';
import { ref, uploadBytes, getDownloadURL as getFirebaseDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload an image to Firebase Storage
 * @param uri - Local file URI
 * @param path - Storage path (e.g., 'message-media/conversationId/image.jpg')
 * @returns Upload result
 */
export const uploadImage = async (uri: string, path: string): Promise<void> => {
  try {
    // Fetch the file from local URI
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create storage reference
    const storageRef = ref(storage, path);

    // Upload file
    await uploadBytes(storageRef, blob);

    console.log('✅ File uploaded to:', path);
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw error;
  }
};

/**
 * Get download URL for a file in Firebase Storage
 * @param path - Storage path
 * @returns Download URL
 */
export const getDownloadURL = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    const url = await getFirebaseDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('❌ Error getting download URL:', error);
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param path - Storage path
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('✅ File deleted from:', path);
  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw error;
  }
};

