import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth-store';
import * as firestoreService from '../src/services/firebase-firestore';
import { pickImage, takePhoto, uploadProfileImage } from '../src/services/image-service';
import { SAFE_AREA } from '../src/constants/layout';

export default function EditProfileScreen() {
  const { user, setUser } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || null);
    }
  }, [user]);

  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            // Take Photo
            try {
              const photo = await takePhoto();
              if (photo) {
                await handleImageUpload(photo.uri);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to take photo');
            }
          } else if (buttonIndex === 2) {
            // Choose from Library
            try {
              const image = await pickImage();
              if (image) {
                await handleImageUpload(image.uri);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to pick image');
            }
          } else if (buttonIndex === 3) {
            // Remove Photo
            setPhotoURL(null);
          }
        }
      );
    } else {
      // Android fallback - just use image picker
      pickImage()
        .then(async (image) => {
          if (image) {
            await handleImageUpload(image.uri);
          }
        })
        .catch((error: any) => {
          Alert.alert('Error', error.message || 'Failed to pick image');
        });
    }
  };

  const handleImageUpload = async (imageUri: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Upload image using the image service
      const downloadURL = await uploadProfileImage(user.id, imageUri);

      // Update local state
      setPhotoURL(downloadURL);
      
      console.log('✅ Profile image uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading profile image:', error);
      Alert.alert('Error', 'Failed to upload profile image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    try {
      setIsSaving(true);

      // Update user data in Firestore
      await firestoreService.updateUser(user.id, {
        displayName: trimmedName,
        photoURL: photoURL || undefined,
      });

      // Update local auth state
      setUser({
        ...user,
        displayName: trimmedName,
        photoURL: photoURL || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Profile',
          headerShown: true,
          headerBackTitle: 'Profile',
          headerRight: () => (
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              disabled={isSaving}
            >
              <Text style={[styles.saveText, isSaving && styles.saveTextDisabled]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

      {/* Profile Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={handleImagePicker}
          disabled={isLoading}
        >
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.profileImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <MaterialIcons name="person" size={48} color="#fff" />
            </View>
          )}
          
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
          
          <View style={styles.editIconContainer}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.imageHint}>Tap to change photo</Text>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your display name"
            placeholderTextColor="#8E8E93"
            maxLength={50}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text style={styles.characterCount}>{displayName.length}/50</Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Your display name and photo will be visible to other users in conversations.
        </Text>
      </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#8E8E93',
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 16,
    color: '#8E8E93',
  },
  formSection: {
    backgroundColor: '#fff',
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  characterCount: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 40,
  },
});
