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
import { ClarificationModal, ClarificationData, ClarificationOption } from './ClarificationModal';
import { SummaryModal, SummaryData } from './SummaryModal';
import { AIAnalysisModal } from './AIAnalysisModal';

interface AICommandButtonProps {
  currentConversationId?: string;
  appContext?: any; // For compatibility with existing usage
  style?: any;
}

const SUGGESTED_COMMANDS = [
  "Tell John I'm on my way",
  "Who is coming to the party tonight?",
  "What did Sarah say about the deadline?",
  "When is the meeting scheduled?",
  "Summarize this conversation",
];

export const AICommandButton: React.FC<AICommandButtonProps> = ({
  currentConversationId,
  appContext,
  style,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [command, setCommand] = useState('');
  const [isClarificationVisible, setIsClarificationVisible] = useState(false);
  const [clarificationData, setClarificationData] = useState<ClarificationData | null>(null);
  const [originalCommand, setOriginalCommand] = useState('');
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  const { executeCommand, continueCommandWithClarification, isProcessing, error } = useAICommands(currentConversationId, appContext);

  const handleCommandSubmit = async () => {
    if (!command.trim()) return;

    console.log('🚀 Submitting AI command:', command);
    const result = await executeCommand(command.trim());
    console.log('📋 AI command result:', result);
    
    if (result.success) {
      console.log('🔍 AI Command result:', {
        success: result.success,
        requires_clarification: result.requires_clarification,
        clarification_data: result.clarification_data,
        action: result.action,
        message: result.message
      });
      
      if (result.requires_clarification && result.clarification_data) {
        console.log('✅ Showing clarification modal');
        // Show clarification modal
        setClarificationData(result.clarification_data);
        setOriginalCommand(result.original_command || command.trim());
        setIsClarificationVisible(true);
        setIsModalVisible(false); // Hide command modal
      } else if (result.action?.type === 'analysis' && result.action?.payload) {
        console.log('✅ Showing analysis modal');
        // Show analysis modal
        setAnalysisData(result.action.payload);
        setIsAnalysisVisible(true);
        setIsModalVisible(false); // Hide command modal
        setCommand('');
      } else if (result.action?.type === 'summary' && result.action?.payload) {
        console.log('✅ Showing summary modal');
        // Show summary modal
        setSummaryData(result.action.payload);
        setIsSummaryVisible(true);
        setIsModalVisible(false); // Hide command modal
        setCommand('');
      } else {
        console.log('✅ Showing success alert');
        Alert.alert('Success', result.message);
        setIsModalVisible(false);
        setCommand('');
      }
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

  const handleClarificationSelect = async (option: ClarificationOption) => {
    if (!clarificationData || !originalCommand) return;

    console.log('📋 User selected clarification option:', option.title);
    setIsClarificationVisible(false);

    const result = await continueCommandWithClarification(
      originalCommand,
      clarificationData,
      option
    );

    if (result.success) {
      Alert.alert('Success', result.message);
      setCommand('');
    } else {
      Alert.alert('Error', result.message);
    }

    // Reset state
    setClarificationData(null);
    setOriginalCommand('');
  };

  const handleClarificationCancel = () => {
    setIsClarificationVisible(false);
    setClarificationData(null);
    setOriginalCommand('');
    // Reopen command modal
    setIsModalVisible(true);
  };

  const handleSummaryClose = () => {
    setIsSummaryVisible(false);
    setSummaryData(null);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.floatingButton, style]}
        onPress={() => setIsModalVisible(true)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="sparkles" 
          size={28} 
          color="#34C759" 
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

      {/* Clarification Modal */}
      {clarificationData && (
        <ClarificationModal
          visible={isClarificationVisible}
          clarificationData={clarificationData}
          onSelect={handleClarificationSelect}
          onCancel={handleClarificationCancel}
        />
      )}

      {/* Summary Modal */}
      <SummaryModal
        visible={isSummaryVisible}
        summaryData={summaryData}
        onClose={handleSummaryClose}
      />

      {/* Analysis Modal */}
      <AIAnalysisModal
        visible={isAnalysisVisible}
        analysisData={analysisData}
        onClose={() => setIsAnalysisVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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