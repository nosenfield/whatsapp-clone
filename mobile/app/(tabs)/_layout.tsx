import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AICommandButton } from '../../src/components/AICommandButton';
import { useAICommandContext } from '../../src/hooks/useAICommandContext';
import { StyleSheet, View } from 'react-native';

export default function TabsLayout() {
  const aiContext = useAICommandContext();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat-bubble" size={size} color={color} />
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <AICommandButton 
                appContext={aiContext}
                style={styles.headerAIButton}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    marginRight: 16,
    zIndex: 1000,
  },
  headerAIButton: {
    // No additional styles needed, button handles its own styling
  },
});

