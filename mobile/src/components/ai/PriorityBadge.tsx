/**
 * Priority Badge Component
 * 
 * Displays priority level for messages
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PriorityMessage } from '../../types';

interface PriorityBadgeProps {
  priority: PriorityMessage['priority'];
  reason?: string;
  onPress?: () => void;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  reason,
  onPress,
}) => {
  const getPriorityConfig = (priority: PriorityMessage['priority']) => {
    switch (priority) {
      case 'urgent':
        return {
          color: '#F44336',
          backgroundColor: '#ffebee',
          icon: 'warning' as const,
          label: 'URGENT',
        };
      case 'high':
        return {
          color: '#FF9800',
          backgroundColor: '#fff3e0',
          icon: 'alert-circle' as const,
          label: 'HIGH',
        };
      case 'normal':
        return {
          color: '#4CAF50',
          backgroundColor: '#e8f5e8',
          icon: 'checkmark-circle' as const,
          label: 'NORMAL',
        };
      default:
        return {
          color: '#9E9E9E',
          backgroundColor: '#f5f5f5',
          icon: 'help-circle' as const,
          label: 'UNKNOWN',
        };
    }
  };

  const config = getPriorityConfig(priority);

  const BadgeContent = () => (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
};

/**
 * Priority Reason Tooltip Component
 * 
 * Shows detailed reason for priority classification
 */
interface PriorityReasonTooltipProps {
  reason: string;
  confidence: number;
  onClose: () => void;
}

export const PriorityReasonTooltip: React.FC<PriorityReasonTooltipProps> = ({
  reason,
  confidence,
  onClose,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <View style={styles.tooltip}>
      <View style={styles.tooltipHeader}>
        <Text style={styles.tooltipTitle}>Priority Analysis</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tooltipContent}>
        <Text style={styles.reasonText}>{reason}</Text>
        
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Confidence:</Text>
          <Text style={[
            styles.confidenceText, 
            { color: getConfidenceColor(confidence) }
          ]}>
            {getConfidenceLabel(confidence)} ({Math.round(confidence * 100)}%)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  touchable: {
    alignSelf: 'flex-start',
  },
  tooltip: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 300,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tooltipContent: {
    gap: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
