import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DevErrorScreenProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  onReset?: () => void;
}

/**
 * Development-only error screen with condensed, useful information
 * Shows everything needed for debugging in one screen
 */
export function DevErrorScreen({ error, errorInfo, onReset }: DevErrorScreenProps) {
  // Extract key information from stack
  const stackLines = error.stack?.split('\n') || [];
  const firstRelevantLine = stackLines.find(line => 
    line.includes('.tsx') || line.includes('.ts') || line.includes('.js')
  );
  
  // Parse file and line number
  const fileMatch = firstRelevantLine?.match(/\((.+):(\d+):(\d+)\)/);
  const fileName = fileMatch ? fileMatch[1].split('/').pop() : 'Unknown';
  const lineNumber = fileMatch ? fileMatch[2] : '?';

  // Categorize error
  const errorType = error.message.includes('constraint') ? 'Database' :
                    error.message.includes('Firestore') ? 'Firebase' :
                    error.message.includes('Network') ? 'Network' :
                    error.message.includes('undefined') ? 'TypeError' :
                    'Runtime';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="bug-report" size={24} color="#FF3B30" />
        <Text style={styles.headerText}>Dev Error</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Error Type Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{errorType}</Text>
        </View>

        {/* Error Message */}
        <Text style={styles.errorMessage}>{error.message}</Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <MaterialIcons name="location-on" size={16} color="#8E8E93" />
          <Text style={styles.locationText}>
            {fileName}:{lineNumber}
          </Text>
        </View>

        {/* Quick Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Fix</Text>
          <Text style={styles.analysisText}>{getQuickFix(error.message)}</Text>
        </View>

        {/* Stack Trace (condensed) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stack Trace (Top 5)</Text>
          <View style={styles.stackContainer}>
            {stackLines.slice(0, 5).map((line, index) => (
              <Text key={index} style={styles.stackLine} numberOfLines={1}>
                {line.trim()}
              </Text>
            ))}
          </View>
        </View>

        {/* Component Stack (if available) */}
        {errorInfo?.componentStack && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Component Stack</Text>
            <Text style={styles.stackText} numberOfLines={3}>
              {errorInfo.componentStack.split('\n').slice(0, 3).join('\n')}
            </Text>
          </View>
        )}

        {/* Common Causes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Causes</Text>
          {getCommonCauses(error.message).map((cause, index) => (
            <Text key={index} style={styles.causeText}>• {cause}</Text>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {onReset && (
          <TouchableOpacity style={styles.button} onPress={onReset}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.button, styles.copyButton]} 
          onPress={() => {
            // In a real app, copy to clipboard
            console.log('Error details:', error);
          }}
        >
          <MaterialIcons name="content-copy" size={20} color="#007AFF" />
          <Text style={[styles.buttonText, styles.copyButtonText]}>Copy Error</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getQuickFix(errorMessage: string): string {
  if (errorMessage.includes('FOREIGN KEY constraint')) {
    return 'Foreign key missing. Check if parent record exists in database before inserting child record.';
  }
  if (errorMessage.includes('UNIQUE constraint')) {
    return 'Duplicate record. Check if record already exists before inserting, or use UPSERT instead.';
  }
  if (errorMessage.includes('NOT NULL constraint')) {
    return 'Required field is null. Check that all required fields are provided before insert.';
  }
  if (errorMessage.includes('conversationId')) {
    return 'Conversation ID missing. Ensure conversation is loaded and stored in SQLite before sending messages.';
  }
  if (errorMessage.includes('duplicate')) {
    return 'Duplicate data detected. Implement deduplication check before insert.';
  }
  return 'Check the stack trace and recent code changes.';
}

function getCommonCauses(errorMessage: string): string[] {
  if (errorMessage.includes('constraint')) {
    return [
      'Missing parent record in related table',
      'Trying to insert duplicate data',
      'Required field not provided',
      'Data type mismatch',
    ];
  }
  if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
    return [
      'Accessing property of undefined object',
      'Missing data from API/database',
      'Component unmounted during async operation',
      'Optional chaining needed (?.)',
    ];
  }
  return [
    'Check recent code changes',
    'Verify data flow',
    'Check async operation timing',
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#E5E5EA',
    lineHeight: 20,
  },
  stackContainer: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  stackLine: {
    fontSize: 11,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  stackText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
  },
  causeText: {
    fontSize: 14,
    color: '#E5E5EA',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#2C2C2E',
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  copyButtonText: {
    color: '#007AFF',
  },
});

