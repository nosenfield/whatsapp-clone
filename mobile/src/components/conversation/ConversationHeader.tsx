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
