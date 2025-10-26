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
}

export const GroupMemberAvatars: React.FC<GroupMemberAvatarsProps> = ({
  conversation,
  groupMemberPresence,
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
                {presence?.online && (
                  <View style={styles.onlineIndicator} />
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
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberName: {
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 50,
  },
});
