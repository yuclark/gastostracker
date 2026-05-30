import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.tint,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Records</Text>,
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={20} />
        }} 
      />
      <Tabs.Screen 
        name="analysis" 
        options={{ 
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Analysis</Text>,
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" color={color} size={20} />
        }} 
      />
      <Tabs.Screen 
        name="budgets" 
        options={{ 
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Budgets</Text>,
          tabBarIcon: ({ color, size }) => <Ionicons name="calculator-outline" color={color} size={20} />
        }} 
      />
      <Tabs.Screen 
        name="accounts" 
        options={{ 
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Accounts</Text>,
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" color={color} size={20} />
        }} 
      />
      <Tabs.Screen 
        name="categories" 
        options={{ 
          tabBarLabel: ({ color }) => <Text style={[styles.tabLabel, { color }]}>Categories</Text>,
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={20} />
        }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#2E2E2E', borderTopWidth: 1, borderTopColor: '#444', height: 64, paddingBottom: 8, paddingTop: 8 },
  tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 }
});