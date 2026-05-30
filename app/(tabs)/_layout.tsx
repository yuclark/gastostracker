import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS } from '../../src/constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.tint,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        headerStyle: {
          backgroundColor: COLORS.card,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        headerTitleStyle: {
          color: COLORS.textPrimary,
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Log Gastos', tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11 }}>Log</Text> }} />
      <Tabs.Screen name="analysis" options={{ title: 'Analysis', tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11 }}>Analysis</Text> }} />
      <Tabs.Screen name="history" options={{ title: 'History Log', tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11 }}>History</Text> }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories', tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11 }}>Categories</Text> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings & Sync', tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11 }}>Settings</Text> }} />
    </Tabs>
  );
}