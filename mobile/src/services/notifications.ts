/**
 * Notifications Service
 * 
 * Handles push notification setup, permissions, and token management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configure how notifications are handled when app is in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and get Expo push token
 * 
 * @param userId - The current user's ID for logging/debugging
 * @returns The Expo push token or null if failed
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  console.log('📱 Registering for push notifications...', { userId });

  // Check if running on physical device
  if (!Device.isDevice) {
    console.warn('⚠️ Push notifications only work on physical devices, not simulators');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      console.log('🔔 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permission denied, return null
    if (finalStatus !== 'granted') {
      console.warn('❌ Notification permissions denied by user');
      return null;
    }

    console.log('✅ Notification permissions granted');

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('❌ EAS project ID not found in app.json');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('✅ Got Expo push token:', token);

    return token;
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Set up notification listeners for app lifecycle
 * 
 * @param onNotificationReceived - Callback when notification received (foreground)
 * @param onNotificationTapped - Callback when notification tapped
 * @returns Cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) {
  console.log('👂 Setting up notification listeners...');

  // Listener for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received (foreground):', notification);
    onNotificationReceived?.(notification);
  });

  // Listener for when user taps on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response);
    onNotificationTapped?.(response);
  });

  // Return cleanup function
  return () => {
    console.log('🧹 Cleaning up notification listeners');
    receivedListener.remove();
    responseListener.remove();
  };
}

/**
 * Get the last notification response (useful for cold starts)
 * This checks if the app was opened by tapping a notification
 * 
 * @returns The notification response or null
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    
    if (response) {
      console.log('🚀 App opened from notification:', response);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error getting initial notification:', error);
    return null;
  }
}

/**
 * Set app icon badge count (number shown on app icon)
 * 
 * @param count - Number to display (0 to clear badge)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log('🔢 Badge count set to:', count);
  } catch (error) {
    console.error('❌ Error setting badge count:', error);
  }
}

/**
 * Clear all delivered notifications from notification center
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    console.log('🧹 Cleared all notifications');
  } catch (error) {
    console.error('❌ Error clearing notifications:', error);
  }
}

/**
 * Schedule a local notification (for testing purposes)
 * 
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data to include
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // null means send immediately
    });
    console.log('📤 Local notification scheduled');
  } catch (error) {
    console.error('❌ Error scheduling local notification:', error);
  }
}

/**
 * Extract notification data payload
 * Handles both notification tap and foreground receive
 */
export function getNotificationData(
  notificationOrResponse: Notifications.Notification | Notifications.NotificationResponse
): Record<string, any> {
  // Check if it's a response (tap) or just a notification (received)
  const notification = 'notification' in notificationOrResponse
    ? notificationOrResponse.notification
    : notificationOrResponse;

  return notification.request.content.data || {};
}

/**
 * Type guard to check if notification is a message notification
 */
export function isMessageNotification(data: Record<string, any>): data is {
  type: 'new_message';
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
} {
  return (
    data.type === 'new_message' &&
    typeof data.conversationId === 'string' &&
    typeof data.messageId === 'string'
  );
}

