/**
 * AI Analysis Modal
 * 
 * Displays results from the analyze_conversation tool
 * Shows extracted information with confidence scores
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnalysisResult {
  answer: string;
  confidence: number;
  relevant_messages?: string[];
  message_count_analyzed: number;
  conversation_id: string;
  query: string;
  used_rag?: boolean;
}

interface AIAnalysisModalProps {
  visible: boolean;
  analysisData: AnalysisResult | null;
  onClose: () => void;
}

export const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  visible,
  analysisData,
  onClose,
}) => {
  if (!analysisData) return null;

  const confidencePercentage = Math.round(analysisData.confidence * 100);
  const confidenceColor = getConfidenceColor(analysisData.confidence);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="search" size={24} color="#007AFF" />
              <Text style={styles.headerTitle}>Analysis Result</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Query */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Question</Text>
              <View style={styles.queryBox}>
                <Text style={styles.queryText}>{analysisData.query}</Text>
              </View>
            </View>

            {/* Answer */}
            <View style={styles.section}>
              <View style={styles.answerHeader}>
                <Text style={styles.sectionLabel}>Answer</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
                  <Text style={styles.confidenceText}>
                    {confidencePercentage}% confident
                  </Text>
                </View>
              </View>
              <View style={styles.answerBox}>
                <Text style={styles.answerText}>{analysisData.answer}</Text>
              </View>
            </View>

            {/* Metadata */}
            <View style={styles.metadataSection}>
              <View style={styles.metadataRow}>
                <Ionicons name="chatbubbles-outline" size={16} color="#666" />
                <Text style={styles.metadataText}>
                  Analyzed {analysisData.message_count_analyzed} messages
                </Text>
              </View>
              {analysisData.used_rag && (
                <View style={styles.metadataRow}>
                  <Ionicons name="search-outline" size={16} color="#666" />
                  <Text style={styles.metadataText}>
                    Used semantic search
                  </Text>
                </View>
              )}
            </View>

            {/* Relevant Messages (if available) */}
            {analysisData.relevant_messages && analysisData.relevant_messages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Supporting Evidence</Text>
                {analysisData.relevant_messages.map((message, index) => (
                  <View key={index} style={styles.evidenceBox}>
                    <Text style={styles.evidenceText}>{message}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                This answer was extracted from your conversation using AI analysis.
                {analysisData.confidence < 0.7 && ' The confidence is lower than usual, so please verify the information.'}
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#34C759'; // Green - High confidence
  if (confidence >= 0.6) return '#FF9500'; // Orange - Medium confidence
  return '#FF3B30'; // Red - Low confidence
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queryBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  queryText: {
    fontSize: 16,
    color: '#000',
    fontStyle: 'italic',
  },
  answerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  answerBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  answerText: {
    fontSize: 17,
    color: '#000',
    lineHeight: 24,
  },
  metadataSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
  },
  evidenceBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  evidenceText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  doneButton: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
});

