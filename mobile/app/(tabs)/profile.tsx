import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import * as firestoreService from '../../src/services/firebase-firestore';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);

  // Load notification preferences
  useEffect(() => {
    if (user?.id) {
      loadNotificationPreferences();
    }
  }, [user?.id]);

  const loadNotificationPreferences = async () => {
    try {
      if (!user) return;
      
      const userData = await firestoreService.getUser(user.id);
      if (userData?.notificationsEnabled !== undefined) {
        setNotificationsEnabled(userData.notificationsEnabled);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!user || isUpdatingPrefs) return;

    try {
      setIsUpdatingPrefs(true);
      setNotificationsEnabled(enabled);

      await firestoreService.updateUser(user.id, {
        notificationsEnabled: enabled,
      });

      console.log(`✅ Notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      // Revert on error
      setNotificationsEnabled(!enabled);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will happen automatically via auth state change
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
          ) : (
            <MaterialIcons name="person" size={48} color="#fff" />
          )}
        </View>
        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Profile Options */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.option} onPress={() => router.push('/edit-profile')}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="edit" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Edit Profile</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
        </TouchableOpacity>

        <View style={styles.separator} />

        <View style={styles.option}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="notifications" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            disabled={isUpdatingPrefs}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.option} onPress={() => {}}>
          <View style={styles.optionLeft}>
            <MaterialIcons name="privacy-tip" size={24} color="#007AFF" />
            <Text style={styles.optionText}>Privacy & Security</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <Text style={styles.version}>Version 1.0.0 (MVP)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginLeft: 60,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  signOutText: {
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 12,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 24,
    marginBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 40,
  },
});

