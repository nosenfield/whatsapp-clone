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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { aiCommandService, AppContext } from '../services/ai-command-service';
import { useAuthStore } from '../store/auth-store';
import { useRouter } from 'expo-router';

interface AICommandButtonProps {
  appContext: AppContext;
  style?: any;
}

export function AICommandButton({ appContext, style }: AICommandButtonProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();

  const handleCommand = async () => {
    if (!command.trim() || !user) return;

    setIsProcessing(true);
    try {
      const response = await aiCommandService.processCommand(command.trim(), appContext);
      
      if (response.success) {
        // Handle the response based on action type
        switch (response.action) {
          case 'navigate_to_conversation':
            if (response.result?.conversationId) {
              router.push(`/conversation/${response.result.conversationId}`);
            }
            break;
          case 'show_summary':
            Alert.alert('AI Summary', response.response);
            break;
          case 'show_error':
            Alert.alert('Error', response.error || 'Something went wrong');
            break;
          default:
            Alert.alert('AI Response', response.response);
        }
        
        // Close modal and clear command
        setIsModalVisible(false);
        setCommand('');
      } else {
        Alert.alert('Error', response.error || 'Failed to process command');
      }
    } catch (error) {
      console.error('AI command error:', error);
      Alert.alert('Error', 'Failed to process AI command');
    } finally {
      setIsProcessing(false);
    }
  };

  const suggestedCommands = [
    "Start a new conversation with John",
    "Open my conversation with Sarah",
    "Tell Mike I'm on my way",
    "Summarize this conversation",
    "Summarize the most recent message",
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, style]}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="smart-toy" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Assistant</Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.instructionText}>
              Tell me what you'd like to do:
            </Text>

            <TextInput
              style={styles.commandInput}
              placeholder="e.g., Start a new conversation with John"
              value={command}
              onChangeText={setCommand}
              multiline
              maxLength={200}
              editable={!isProcessing}
            />

            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Suggested commands:</Text>
              {suggestedCommands.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => setCommand(suggestion)}
                  disabled={isProcessing}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.sendButton, isProcessing && styles.sendButtonDisabled]}
              onPress={handleCommand}
              disabled={!command.trim() || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="white" />
                  <Text style={styles.sendButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
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
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  commandInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  suggestionButton: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#007AFF',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
