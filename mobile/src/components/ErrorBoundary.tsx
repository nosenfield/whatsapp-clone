import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 * Catches unhandled React errors and prevents app crashes
 * Shows user-friendly error screen with retry option
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('❌ ErrorBoundary caught:', error, errorInfo);
    
    // TODO: Send to error tracking service (Sentry, etc.) in production
    if (!__DEV__) {
      // this.logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
          
          <Text style={styles.title}>Something went wrong</Text>
          
          <Text style={styles.message}>
            We're sorry, but something unexpected happened.
            {__DEV__ && this.state.error?.message && (
              `\n\n${this.state.error.message}`
            )}
          </Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          
          {__DEV__ && (
            <Text style={styles.devNote}>
              Dev Mode: Check console for full error details
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 24,
    textAlign: 'center',
  },
});

