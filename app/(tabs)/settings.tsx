import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/constants/colors';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.title}>Cloud Engine Diagnostics</Text>
        <Text style={styles.detail}>Database Node: Neon PostgreSQL Serverless</Text>
        <Text style={styles.detail}>Sync Engine: Online (HTTP Public Pipeline)</Text>
        <Text style={styles.detail}>Environment: Expo Stable Stack</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  statusCard: { backgroundColor: COLORS.card, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  detail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }
});