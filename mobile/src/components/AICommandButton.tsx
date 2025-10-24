import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAICommands } from '../hooks/useAICommands';
import { createUserFriendlyError } from '../utils/ai-error-handling';

interface AICommandButtonProps {
  currentConversationId?: string;
  appContext?: any; // For compatibility with existing usage
  style?: any;
}

const SUGGESTED_COMMANDS = [
  "Tell John I'm on my way",
  "Open my conversation with Sarah",
  "Start a new conversation with Alex",
  "Summarize the most recent message",
  "Summarize my most recent message",
  "Summarize this conversation",
];

export const AICommandButton: React.FC<AICommandButtonProps> = ({
  currentConversationId,
  appContext,
  style,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [command, setCommand] = useState('');
  
  // Debug logging
  console.log('🔍 AICommandButton Debug:');
  console.log('  - currentConversationId:', currentConversationId);
  console.log('  - appContext:', appContext);
  console.log('  - appContext.currentScreen:', appContext?.currentScreen);
  console.log('  - appContext.currentConversationId:', appContext?.currentConversationId);
  
  const { executeCommand, isProcessing, error } = useAICommands(currentConversationId, appContext);

  const handleCommandSubmit = async () => {
    if (!command.trim()) return;

    console.log('🚀 Submitting AI command:', command);
    const result = await executeCommand(command.trim());
    console.log('📋 AI command result:', result);
    
    if (result.success) {
      Alert.alert('Success', result.message);
      setIsModalVisible(false);
      setCommand('');
    } else {
      // Show error with suggestions if available
      const friendlyError = createUserFriendlyError({ message: result.message });
      const suggestions = friendlyError.suggestions;
      
      if (suggestions && suggestions.length > 0) {
        Alert.alert(
          'Error', 
          result.message,
          [
            { text: 'OK', style: 'default' },
            ...suggestions.map(suggestion => ({
              text: suggestion,
              style: 'default' as const,
              onPress: () => setCommand(suggestion)
            }))
          ]
        );
      } else {
        Alert.alert('Error', result.message);
      }
    }
  };

  const handleSuggestedCommand = (suggestedCommand: string) => {
    setCommand(suggestedCommand);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, style]}
        onPress={() => setIsModalVisible(true)}
        disabled={isProcessing}
      >
        <Ionicons 
          name="sparkles" 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Assistant</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>What would you like me to help you with?</Text>
            
            <TextInput
              style={styles.input}
              placeholder="e.g., Tell John I'm on my way"
              value={command}
              onChangeText={setCommand}
              multiline
              autoFocus
            />

            <Text style={styles.suggestionsTitle}>Suggested Commands:</Text>
            <View style={styles.suggestionsContainer}>
              {SUGGESTED_COMMANDS.map((suggestedCommand, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => handleSuggestedCommand(suggestedCommand)}
                >
                  <Text style={styles.suggestionText}>{suggestedCommand}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>Error: {error}</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!command.trim() || isProcessing) && styles.submitButtonDisabled
              ]}
              onPress={handleCommandSubmit}
              disabled={!command.trim() || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Send Command</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 30,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  suggestionsContainer: {
    marginBottom: 30,
  },
  suggestionButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginBottom: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});