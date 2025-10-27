/**
 * Group Member Avatars Component
 * 
 * Displays avatars of group members with online indicators
 */

import React from 'react';
import { View, ScrollView, Image, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Conversation } from '../../types';

interface GroupMemberAvatarsProps {
  conversation: Conversation;
  groupMemberPresence: Record<string, { online: boolean; lastSeen: Date | null }>;
  typingUserIds: string[];
}

export const GroupMemberAvatars: React.FC<GroupMemberAvatarsProps> = ({
  conversation,
  groupMemberPresence,
  typingUserIds,
}) => {
  return (
    <View style={styles.memberAvatarsBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.memberAvatarsScrollContent}
      >
        {conversation.participants.map((participantId) => {
          const participant = conversation.participantDetails[participantId];
          const presence = groupMemberPresence[participantId];
          const isTyping = typingUserIds.includes(participantId);
          
          return (
            <View key={participantId} style={styles.memberAvatarContainer}>
              <View style={styles.memberAvatarWrapper}>
                {participant?.photoURL ? (
                  <Image
                    source={{ uri: participant.photoURL }}
                    style={styles.memberAvatar}
                  />
                ) : (
                  <View style={styles.memberDefaultAvatar}>
                    <MaterialIcons
                      name="person"
                      size={16}
                      color="#fff"
                    />
                  </View>
                )}
                {/* Online indicator in top right corner */}
                {presence?.online && (
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
              <Text style={styles.memberName} numberOfLines={1}>
                {participant?.displayName || 'Unknown'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  memberAvatarsBar: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  memberAvatarsScrollContent: {
    paddingHorizontal: 4,
  },
  memberAvatarContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 50,
  },
  memberAvatarWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  memberDefaultAvatar: {
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
    backgroundColor: '#007AFF', // iOS blue color for typing
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 50,
  },
});
