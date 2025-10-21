import { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getBottomSafeArea } from '../constants/layout';
import { setTyping } from '../services/firebase-rtdb';

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({
  conversationId,
  userId,
  onSend,
  disabled = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
        >
          <MaterialIcons
            name="send"
            size={24}
            color={text.trim() && !disabled ? '#007AFF' : '#C7C7CC'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
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

