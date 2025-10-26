/**
 * Calendar Event Card Component
 * 
 * Displays extracted calendar events from messages
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExtractedEvent } from '../../types';

interface CalendarEventCardProps {
  event: ExtractedEvent;
  onConfirm?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
  onAddToCalendar?: (eventId: string) => void;
}

export const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  event,
  onConfirm,
  onDismiss,
  onAddToCalendar,
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  const getStatusColor = (status: ExtractedEvent['status']) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'proposed':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: ExtractedEvent['status']) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'proposed':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getStatusColor(event.status) }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons 
            name={getStatusIcon(event.status)} 
            size={20} 
            color={getStatusColor(event.status)} 
          />
          <Text style={styles.title}>{event.title}</Text>
        </View>
        
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: getStatusColor(event.status) }]}>
            {event.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDate(event.date)}</Text>
        </View>

        {event.time && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{formatTime(event.time)}</Text>
          </View>
        )}

        {event.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{event.location}</Text>
          </View>
        )}

        {event.participants.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {event.status === 'proposed' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => onConfirm?.(event.id)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dismissButton]}
            onPress={() => onDismiss?.(event.id)}
          >
            <Ionicons name="close" size={16} color="white" />
            <Text style={styles.actionButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {event.status === 'confirmed' && (
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.calendarButton]}
            onPress={() => onAddToCalendar?.(event.id)}
          >
            <Ionicons name="calendar" size={16} color="white" />
            <Text style={styles.actionButtonText}>Add to Calendar</Text>
          </TouchableOpacity>
        </View>
      )}
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
    flex: 1,
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
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  dismissButton: {
    backgroundColor: '#F44336',
  },
  calendarButton: {
    backgroundColor: '#2196F3',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
