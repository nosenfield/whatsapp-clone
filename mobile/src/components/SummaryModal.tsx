import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export interface SummaryData {
  summary: string;
  message_count: number;
  time_range: string;
  conversation_id: string;
  summary_length: string;
  participants?: string[];
  key_topics?: string[];
}

interface SummaryModalProps {
  visible: boolean;
  summaryData: SummaryData | null;
  onClose: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  visible,
  summaryData,
  onClose,
}) => {
  if (!summaryData) return null;

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(summaryData.summary);
      Alert.alert('Copied', 'Summary copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      Alert.alert('Error', 'Failed to copy summary');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="document-text" size={24} color="#007AFF" />
            <Text style={styles.title}>Conversation Summary</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Metadata Section */}
          <View style={styles.metadataContainer}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <Ionicons name="chatbubbles-outline" size={16} color="#8E8E93" />
                <Text style={styles.metadataText}>
                  {summaryData.message_count} {summaryData.message_count === 1 ? 'message' : 'messages'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Ionicons name="time-outline" size={16} color="#8E8E93" />
                <Text style={styles.metadataText}>{summaryData.time_range}</Text>
              </View>
            </View>
          </View>

          {/* Summary Text */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryLabel}>Summary</Text>
            <Text style={styles.summaryText}>{summaryData.summary}</Text>
          </View>

          {/* Participants Section */}
          {summaryData.participants && summaryData.participants.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Participants</Text>
              <View style={styles.participantsContainer}>
                {summaryData.participants.map((participant, index) => (
                  <View key={index} style={styles.participantChip}>
                    <Ionicons name="person-outline" size={14} color="#007AFF" />
                    <Text style={styles.participantText}>{participant}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Key Topics Section */}
          {summaryData.key_topics && summaryData.key_topics.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Topics</Text>
              <View style={styles.topicsContainer}>
                {summaryData.key_topics.map((topic, index) => (
                  <View key={index} style={styles.topicChip}>
                    <Text style={styles.topicText}>{topic}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyToClipboard}
          >
            <Ionicons name="copy-outline" size={20} color="#007AFF" />
            <Text style={styles.copyButtonText}>Copy Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  metadataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  participantText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  topicText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    gap: 12,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

