import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ClarificationOption {
  id: string;
  title: string;
  subtitle: string;
  confidence: number;
  metadata?: any;
  display_text: string;
}

export interface ClarificationData {
  clarification_type: string;
  question: string;
  context?: string;
  options: ClarificationOption[];
  best_option: ClarificationOption;
  allow_cancel: boolean;
  requires_user_input: true;
  action: string;
}

interface ClarificationModalProps {
  visible: boolean;
  clarificationData: ClarificationData;
  onSelect: (option: ClarificationOption) => void;
  onCancel: () => void;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({
  visible,
  clarificationData,
  onSelect,
  onCancel,
}) => {
  const handleOptionSelect = (option: ClarificationOption) => {
    onSelect(option);
  };

  const handleCancel = () => {
    if (clarificationData.allow_cancel) {
      onCancel();
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'contact_selection':
        return 'person';
      case 'conversation_selection':
        return 'chatbubbles';
      case 'message_selection':
        return 'mail';
      default:
        return 'help-circle';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contact_selection':
        return 'Select Contact';
      case 'conversation_selection':
        return 'Select Conversation';
      case 'message_selection':
        return 'Select Message';
      default:
        return 'Make Selection';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons 
              name={getIconForType(clarificationData.clarification_type)} 
              size={24} 
              color="#007AFF" 
            />
            <Text style={styles.title}>{getTypeLabel(clarificationData.clarification_type)}</Text>
          </View>
          {clarificationData.allow_cancel && (
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.question}>{clarificationData.question}</Text>
          
          {clarificationData.context && (
            <Text style={styles.context}>{clarificationData.context}</Text>
          )}

          <View style={styles.optionsContainer}>
            {clarificationData.options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  index === 0 && styles.bestOptionButton,
                ]}
                onPress={() => handleOptionSelect(option)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    <Text style={[
                      styles.optionTitle,
                      index === 0 && styles.bestOptionTitle,
                    ]}>
                      {option.title}
                    </Text>
                    {index === 0 && (
                      <View style={styles.bestOptionBadge}>
                        <Text style={styles.bestOptionBadgeText}>Best Match</Text>
                      </View>
                    )}
                  </View>
                  
                  {option.subtitle && (
                    <Text style={[
                      styles.optionSubtitle,
                      index === 0 && styles.bestOptionSubtitle,
                    ]}>
                      {option.subtitle}
                    </Text>
                  )}
                  
                  <View style={styles.optionFooter}>
                    <Text style={styles.confidenceText}>
                      {Math.round(option.confidence * 100)}% match
                    </Text>
                  </View>
                </View>
                
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={index === 0 ? "#007AFF" : "#999"} 
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  context: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  bestOptionButton: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  bestOptionTitle: {
    color: '#007AFF',
    fontWeight: '600',
  },
  bestOptionBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  bestOptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bestOptionSubtitle: {
    color: '#007AFF',
  },
  optionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
});
