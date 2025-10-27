/**
 * Conversation Header Component
 * 
 * Displays conversation name, avatar, and presence information in the header
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Conversation } from '../../types';

interface ConversationHeaderProps {
  conversation: Conversation | null;
  currentUserId: string;
  isGroup: boolean;
  conversationName: string;
  headerSubtitle: string;
  otherParticipantPhotoURL?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  showMemberAvatars: boolean;
  onToggleMemberAvatars: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  currentUserId,
  isGroup,
  conversationName,
  headerSubtitle,
  otherParticipantPhotoURL,
  isOnline,
  isTyping,
  showMemberAvatars,
  onToggleMemberAvatars,
}) => {
  return (
    <TouchableOpacity 
      style={styles.headerContainer}
      onPress={() => isGroup && onToggleMemberAvatars()}
      activeOpacity={isGroup ? 0.7 : 1}
    >
      {!isGroup && (
        <View style={styles.headerAvatarContainer}>
          <View style={styles.avatarWrapper}>
            {otherParticipantPhotoURL ? (
              <Image
                source={{ uri: otherParticipantPhotoURL }}
                style={styles.headerPhoto}
              />
            ) : (
              <View style={styles.headerDefaultAvatar}>
                <MaterialIcons
                  name="person"
                  size={18}
                  color="#fff"
                />
              </View>
            )}
            {/* Online indicator in top right corner */}
            {isOnline && (
              <View style={styles.onlineIndicator} />
            )}
            {/* Typing indicator in lower right corner */}
            {isTyping && (
              <View style={styles.typingIndicator}>
                <MaterialIcons
                  name="keyboard"
                  size={8}
                  color="#fff"
                />
              </View>
            )}
          </View>
        </View>
      )}
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{conversationName}</Text>
        <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerAvatarContainer: {
    position: 'absolute',
    left: 0,
  },
  avatarWrapper: {
    position: 'relative',
  },
  headerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerDefaultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  typingIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
});
