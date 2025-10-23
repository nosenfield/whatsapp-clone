import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AvatarProps {
  photoURL?: string | null;
  displayName?: string;
  size?: number;
  backgroundColor?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  photoURL,
  displayName,
  size = 50,
  backgroundColor = '#007AFF',
  showOnlineIndicator = false,
  isOnline = false,
}) => {
  const avatarSize = size;
  const borderRadius = avatarSize / 2;
  const iconSize = Math.round(avatarSize * 0.56); // ~56% of avatar size
  const onlineIndicatorSize = Math.round(avatarSize * 0.28); // ~28% of avatar size

  return (
    <View style={styles.avatarContainer}>
      <View style={[
        styles.avatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius,
          backgroundColor,
        }
      ]}>
        {photoURL ? (
          <Image
            source={{ uri: photoURL }}
            style={[
              styles.profileImage,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius,
              }
            ]}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons
            name="person"
            size={iconSize}
            color="#fff"
          />
        )}
      </View>
      {/* Online indicator - green dot if user is online */}
      {showOnlineIndicator && isOnline && (
        <View style={[
          styles.onlineIndicator,
          {
            width: onlineIndicatorSize,
            height: onlineIndicatorSize,
            borderRadius: onlineIndicatorSize / 2,
            bottom: Math.round(avatarSize * 0.04), // 4% from bottom
            right: Math.round(avatarSize * 0.04), // 4% from right
          }
        ]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    // Dynamic styles applied inline
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: '#34C759', // iOS green color
    borderWidth: 2,
    borderColor: '#fff',
  },
});
