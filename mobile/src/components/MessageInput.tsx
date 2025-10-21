import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getBottomSafeArea } from '../constants/layout';
import { setTyping } from '../services/firebase-rtdb';
import { pickImage, takePhoto } from '../services/image-service';
import * as ImagePicker from 'expo-image-picker';

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onSend: (text: string) => void;
  onSendImage?: (imageUri: string) => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  userId,
  onSend,
  onSendImage,
  disabled = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Clear typing indicator helper
  const clearTypingIndicator = async () => {
    if (isTyping) {
      console.log('⌨️ Clearing typing indicator');
      try {
        await setTyping(conversationId, userId, false);
        setIsTyping(false);
      } catch (error) {
        console.error('Error clearing typing indicator:', error);
      }
    }
  };

  // Handle text change with typing detection
  const handleTextChange = async (newText: string) => {
    setText(newText);

    // Don't show typing indicator if text is empty
    if (!newText.trim()) {
      clearTypingIndicator();
      return;
    }

    // Set typing indicator if not already set
    if (!isTyping) {
      console.log('⌨️ Setting typing indicator');
      try {
        await setTyping(conversationId, userId, true);
        setIsTyping(true);
      } catch (error) {
        console.error('Error setting typing indicator:', error);
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator after 5 seconds
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingIndicator();
    }, 5000);
  };

  const handleSend = () => {
    // Send image if one is selected
    if (selectedImage && onSendImage) {
      clearTypingIndicator();
      onSendImage(selectedImage.uri);
      setSelectedImage(null);
      setText('');
      return;
    }

    // Send text message
    const trimmedText = text.trim();
    if (trimmedText && !disabled) {
      // Clear typing indicator immediately on send
      clearTypingIndicator();
      
      // Clear any pending timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      onSend(trimmedText);
      setText('');
    }
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            // Take Photo
            try {
              const photo = await takePhoto();
              if (photo) {
                setSelectedImage(photo);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to take photo');
            }
          } else if (buttonIndex === 2) {
            // Choose from Library
            try {
              const image = await pickImage();
              if (image) {
                setSelectedImage(image);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to pick image');
            }
          }
        }
      );
    } else {
      // Android fallback - just use image picker
      pickImage()
        .then((image) => {
          if (image) {
            setSelectedImage(image);
          }
        })
        .catch((error: any) => {
          Alert.alert('Error', error.message || 'Failed to pick image');
        });
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleBlur = () => {
    // Clear typing indicator when input loses focus
    clearTypingIndicator();
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear typing indicator on unmount
      setTyping(conversationId, userId, false).catch(console.error);
    };
  }, [conversationId, userId]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.container, { paddingBottom: getBottomSafeArea() + 8 }]}>
        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={handleRemoveImage}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Row */}
        <View style={styles.inputRow}>
          {/* Image Picker Button */}
          {onSendImage && !selectedImage && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleImagePicker}
              disabled={disabled}
            >
              <MaterialIcons name="image" size={24} color={disabled ? '#C7C7CC' : '#007AFF'} />
            </TouchableOpacity>
          )}

          {/* Text Input */}
          {!selectedImage && (
            <TextInput
              style={styles.input}
              placeholder="Message..."
              value={text}
              onChangeText={handleTextChange}
              onBlur={handleBlur}
              multiline
              maxLength={5000}
              editable={!disabled}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
          )}

          {/* Image Caption Input */}
          {selectedImage && (
            <TextInput
              style={styles.input}
              placeholder="Add a caption..."
              value={text}
              onChangeText={setText}
              multiline
              maxLength={5000}
              editable={!disabled}
            />
          )}

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() && !selectedImage || disabled) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={(!text.trim() && !selectedImage) || disabled}
          >
            <MaterialIcons
              name="send"
              size={24}
              color={(text.trim() || selectedImage) && !disabled ? '#007AFF' : '#C7C7CC'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

