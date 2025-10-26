import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { uploadImage, getDownloadURL } from './firebase-storage';

const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const COMPRESSED_IMAGE_WIDTH = 1200;
const THUMBNAIL_WIDTH = 200;

export interface ImageUploadResult {
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

/**
 * Request camera permissions
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermissions = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

/**
 * Pick image from library
 */
export const pickImage = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  try {
    // Request permission
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) {
      throw new Error('Media library permission denied');
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    
    // Validate file size
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
    }

    return asset;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

/**
 * Take photo with camera
 */
export const takePhoto = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
  try {
    // Request permission
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    
    // Validate file size
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`);
    }

    return asset;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

/**
 * Compress image to reduce file size
 */
export const compressImage = async (
  uri: string,
  maxWidth: number = COMPRESSED_IMAGE_WIDTH
): Promise<{ uri: string; width: number; height: number }> => {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.8, format: SaveFormat.JPEG }
    );

    return result;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

/**
 * Generate thumbnail from image
 */
export const generateThumbnail = async (
  uri: string
): Promise<{ uri: string; width: number; height: number }> => {
  try {
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: THUMBNAIL_WIDTH } }],
      { compress: 0.7, format: SaveFormat.JPEG }
    );

    return result;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

/**
 * Upload image to Firebase Storage
 * @param conversationId - The conversation this image belongs to
 * @param imageUri - Local URI of the image
 * @returns URLs for full image and thumbnail
 */
export const uploadImageMessage = async (
  conversationId: string,
  imageUri: string
): Promise<ImageUploadResult> => {
  try {
    console.log('📷 Starting image upload for conversation:', conversationId);

    // Compress main image
    console.log('📷 Compressing image...');
    const compressed = await compressImage(imageUri);

    // Generate thumbnail
    console.log('📷 Generating thumbnail...');
    const thumbnail = await generateThumbnail(imageUri);

    // Generate unique filename
    const timestamp = Date.now();
    const imagePath = `message-media/${conversationId}/image_${timestamp}.jpg`;
    const thumbnailPath = `message-media/${conversationId}/thumb_${timestamp}.jpg`;

    // Upload full image
    console.log('📷 Uploading full image...');
    await uploadImage(compressed.uri, imagePath);
    const imageUrl = await getDownloadURL(imagePath);

    // Upload thumbnail
    console.log('📷 Uploading thumbnail...');
    await uploadImage(thumbnail.uri, thumbnailPath);
    const thumbnailUrl = await getDownloadURL(thumbnailPath);

    console.log('✅ Image upload complete');

    return {
      imageUrl,
      thumbnailUrl,
      width: compressed.width,
      height: compressed.height,
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload profile image to Firebase Storage
 * @param userId - The user ID
 * @param imageUri - Local URI of the image
 * @returns Download URL for the profile image
 */
export const uploadProfileImage = async (
  userId: string,
  imageUri: string
): Promise<string> => {
  try {
    console.log('📷 Starting profile image upload for user:', userId);

    // Compress image for profile
    console.log('📷 Compressing profile image...');
    const compressed = await compressImage(imageUri);

    // Generate unique filename
    const timestamp = Date.now();
    const imagePath = `profile-images/${userId}/profile_${timestamp}.jpg`;

    // Upload image
    console.log('📷 Uploading profile image...');
    await uploadImage(compressed.uri, imagePath);
    const imageUrl = await getDownloadURL(imagePath);

    console.log('✅ Profile image upload complete');

    return imageUrl;
  } catch (error) {
    console.error('❌ Error uploading profile image:', error);
    throw error;
  }
};

/**
 * Delete image from Firebase Storage
 * @param imageUrl - The download URL of the image
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathStart = url.pathname.indexOf('/o/') + 3;
    const pathEnd = url.pathname.indexOf('?');
    const encodedPath = url.pathname.substring(pathStart, pathEnd);
    const path = decodeURIComponent(encodedPath);

    // Delete from Firebase Storage
    const { deleteFile } = await import('./firebase-storage');
    await deleteFile(path);

    console.log('✅ Image deleted:', path);
  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
};

