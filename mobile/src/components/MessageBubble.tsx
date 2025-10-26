import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Message, Conversation, ExtractedEvent } from '../types';
import { useState, useEffect } from 'react';
import { CalendarEventCard } from './ai/CalendarEventCard';
import { useConversationEvents } from '../hooks/useCalendarEvents';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showSender?: boolean; // For group chats
  conversation?: Conversation; // For getting sender name in groups
}

export function MessageBubble({
  message,
  isOwnMessage,
  showSender = false,
  conversation,
}: MessageBubbleProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Get calendar events for this conversation
  const { data: conversationEvents } = useConversationEvents(conversation?.id || '');
  
  // Find events extracted from this specific message
  const messageEvents = conversationEvents?.filter(event => event.messageId === message.id) || [];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = () => {
    if (!isOwnMessage) return null;

    switch (message.status) {
      case 'sending':
        return <MaterialIcons name="schedule" size={14} color="#8E8E93" />;
      case 'sent':
        return <MaterialIcons name="check" size={14} color="#8E8E93" />;
      case 'delivered':
        return <MaterialIcons name="done-all" size={14} color="#8E8E93" />;
      case 'read':
        return <MaterialIcons name="done-all" size={14} color="#007AFF" />;
      default:
        return null;
    }
  };

  const getSenderName = () => {
    if (!showSender || !conversation || isOwnMessage) return null;
    const senderDetails = conversation.participantDetails[message.senderId];
    return senderDetails?.displayName || 'Unknown';
  };

  const handleLongPress = () => {
    const messageText = message.content.text;
    if (!messageText) return; // No text to copy (image only)

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Copy'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await Clipboard.setStringAsync(messageText);
            Alert.alert('Copied', 'Message copied to clipboard');
          }
        }
      );
    } else {
      // For Android or web, just copy directly
      Clipboard.setStringAsync(messageText).then(() => {
        Alert.alert('Copied', 'Message copied to clipboard');
      });
    }
  };

  const isImageMessage = message.content.type === 'image' && message.content.mediaUrl;

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
      ]}
    >
      {showSender && !isOwnMessage && getSenderName() && (
        <Text style={styles.senderName}>{getSenderName()}</Text>
      )}
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={handleLongPress}
        style={[
          styles.bubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          isImageMessage && styles.imageBubble,
        ]}
      >
        {/* Image Message */}
        {isImageMessage && (
          <TouchableOpacity activeOpacity={0.9}>
            <View style={styles.imageContainer}>
              {imageLoading && !imageError && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size="large" color={isOwnMessage ? '#fff' : '#007AFF'} />
                </View>
              )}
              {imageError ? (
                <View style={styles.imageError}>
                  <MaterialIcons name="error-outline" size={40} color="#8E8E93" />
                  <Text style={styles.imageErrorText}>Failed to load image</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: message.content.mediaUrl }}
                  style={styles.messageImage}
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  resizeMode="cover"
                />
              )}
            </View>
            {/* Image Caption */}
            {message.content.text && (
              <Text
                style={[
                  styles.messageText,
                  styles.captionText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {message.content.text}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Text Message */}
        {!isImageMessage && (
          <Text
            style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
            ]}
          >
            {message.content.text}
          </Text>
        )}

        {/* Footer with timestamp and status */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.timestamp,
              isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
          {getStatusIcon()}
        </View>
      </TouchableOpacity>
      
      {/* Calendar Events extracted from this message */}
      {messageEvents.length > 0 && (
        <View style={styles.eventsContainer}>
          {messageEvents.map((event) => (
            <CalendarEventCard
              key={event.id}
              event={event}
              onConfirm={(eventId) => {
                // Handle event confirmation
                console.log('Confirm event:', eventId);
              }}
              onDismiss={(eventId) => {
                // Handle event dismissal
                console.log('Dismiss event:', eventId);
              }}
              onAddToCalendar={(eventId) => {
                // Handle adding to calendar
                console.log('Add to calendar:', eventId);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    marginHorizontal: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  imageBubble: {
    padding: 4,
  },
  ownMessageBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 240,
    height: 240,
  },
  imageError: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  imageErrorText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  captionText: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#8E8E93',
  },
  senderName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
    marginLeft: 12,
  },
  eventsContainer: {
    marginTop: 8,
    marginHorizontal: 4,
  },
});

