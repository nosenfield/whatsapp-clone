import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Avatar } from './Avatar';
import { User } from '../types';

interface ReadReceiptLineProps {
  readBy: Array<{
    userId: string;
    user: User;
    readAt: Date;
  }>;
  currentUserId: string;
}

export function ReadReceiptLine({ readBy, currentUserId }: ReadReceiptLineProps) {
  console.log('📖 ReadReceiptLine rendered with:', readBy.length, 'readers');
  console.log('📖 ReadReceiptLine - readBy data:', readBy);
  
  // Filter out current user and sort by read time
  const otherReaders = readBy
    .filter(reader => reader.userId !== currentUserId)
    .sort((a, b) => a.readAt.getTime() - b.readAt.getTime());

  console.log('📖 Other readers after filtering:', otherReaders.length);

  if (otherReaders.length === 0) {
    console.log('📖 No other readers, returning null');
    return null;
  }

  const avatarSize = 24;
  const avatarSpacing = 8;

  return (
    <View style={styles.container}>
      {/* Horizontal line spanning full width */}
      <View style={styles.line} />
      
      {/* Avatar circles centered horizontally */}
      <View style={styles.avatarsContainer}>
        {otherReaders.map((reader, index) => {
          return (
            <View
              key={reader.userId}
              style={[
                styles.avatarContainer,
                {
                  width: avatarSize,
                  height: avatarSize,
                }
              ]}
            >
              <Avatar
                user={reader.user}
                size={avatarSize}
                showOnlineIndicator={false}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginVertical: 4,
    position: 'relative',
    height: 40,
  },
  line: {
    position: 'absolute',
    top: 20, // Exactly at the center of 40px container
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
  },
  avatarsContainer: {
    position: 'absolute',
    top: 8, // Center of 24px avatars at center of 40px container (20 - 12 = 8)
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 24,
    zIndex: 1,
  },
  avatarContainer: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
