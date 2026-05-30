import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../src/constants/colors';

export default function CategoriesScreen() {
  const mockCategories = ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Hot Wheels 🏎️'];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.info}>Active Ledger Sorting Category Nodes:</Text>
      {mockCategories.map((cat, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={styles.text}>{cat}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  info: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15, fontWeight: '500' },
  card: { backgroundColor: COLORS.card, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  text: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }
});