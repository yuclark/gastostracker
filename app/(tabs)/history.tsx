import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function HistoryScreen() {
  const isFocused = useIsFocused();
  const [fullHistory, setFullHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    const data = await db.query("SELECT * FROM gastos ORDER BY created_at DESC");
    if (data) setFullHistory(data);
  };

  useEffect(() => { if (isFocused) fetchHistory(); }, [isFocused]);

  return (
    <View style={styles.container}>
      <FlatList
        data={fullHistory}
        keyExtractor={(item: any, index: number) => index.toString()}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.historyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{item.description}</Text>
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                <Text style={styles.metaLabel}>{item.category}</Text>
                <Text style={[styles.metaLabel, { marginLeft: 6, backgroundColor: '#F8FAFC' }]}>{item.account}</Text>
                <Text style={[styles.metaLabel, { marginLeft: 6, backgroundColor: '#FFF' }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
            <Text style={[styles.amount, { color: item.type === 'income' ? COLORS.success : COLORS.danger }]}>
              {item.type === 'income' ? '+' : '-'}₱{parseFloat(item.amount).toFixed(2)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  desc: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  metaLabel: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  amount: { fontSize: 15, fontWeight: '700' }
});