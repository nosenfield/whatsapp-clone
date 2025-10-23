/**
 * Decision Card Component
 * 
 * Displays extracted decisions from conversations
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Decision } from '../../types';

interface DecisionCardProps {
  decision: Decision;
  onViewConversation?: (conversationId: string) => void;
  onMarkComplete?: (decisionId: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  onViewConversation,
  onMarkComplete,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: Decision['status']) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'active':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: Decision['status']) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'active':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const completedActionItems = decision.actionItems.filter(item => item.completed).length;
  const totalActionItems = decision.actionItems.length;

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor(decision.status) }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons 
            name={getStatusIcon(decision.status)} 
            size={20} 
            color={getStatusColor(decision.status)} 
          />
          <Text style={styles.title}>Decision Made</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: getStatusColor(decision.status) }]}>
            {decision.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.summary}>{decision.summary}</Text>
        
        <View style={styles.outcome}>
          <Text style={styles.outcomeLabel}>Outcome:</Text>
          <Text style={styles.outcomeText}>{decision.outcome}</Text>
        </View>

        {decision.actionItems.length > 0 && (
          <View style={styles.actionItems}>
            <Text style={styles.actionItemsLabel}>Action Items:</Text>
            <View style={styles.actionItemsProgress}>
              <Text style={styles.actionItemsProgressText}>
                {completedActionItems}/{totalActionItems} completed
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(completedActionItems / totalActionItems) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            {decision.actionItems.slice(0, 3).map((item, index) => (
              <View key={item.id} style={styles.actionItem}>
                <Ionicons 
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={16} 
                  color={item.completed ? '#4CAF50' : '#666'} 
                />
                <Text style={[
                  styles.actionItemText,
                  item.completed && styles.actionItemCompleted
                ]}>
                  {item.description}
                </Text>
              </View>
            ))}
            
            {decision.actionItems.length > 3 && (
              <Text style={styles.moreItems}>
                +{decision.actionItems.length - 3} more items
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.dateText}>
          Decided on {formatDate(decision.decisionDate)}
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onViewConversation?.(decision.conversationId)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#2196F3" />
            <Text style={styles.actionButtonText}>View Conversation</Text>
          </TouchableOpacity>

          {decision.status === 'active' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onMarkComplete?.(decision.id)}
            >
              <Ionicons name="checkmark" size={16} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Mark Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    marginBottom: 12,
  },
  summary: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  outcome: {
    marginBottom: 12,
  },
  outcomeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  outcomeText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  actionItems: {
    marginBottom: 12,
  },
  actionItemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  actionItemsProgress: {
    marginBottom: 8,
  },
  actionItemsProgressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionItemText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  actionItemCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  moreItems: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
