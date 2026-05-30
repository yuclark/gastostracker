import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function AnalysisScreen() {
  const isFocused = useIsFocused();
  const [expenseMetrics, setExpenseMetrics] = useState<any[]>([]);
  const [incomeMetrics, setIncomeMetrics] = useState<any[]>([]);

  const fetchAnalysisData = async () => {
    const expenses = await db.query("SELECT category, SUM(amount) as total FROM gastos WHERE type = 'gastos' GROUP BY category ORDER BY total DESC");
    if (expenses) setExpenseMetrics(expenses);

    const income = await db.query("SELECT category, SUM(amount) as total FROM gastos WHERE type = 'income' GROUP BY category ORDER BY total DESC");
    if (income) setIncomeMetrics(income);
  };

  useEffect(() => { if (isFocused) fetchAnalysisData(); }, [isFocused]);

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.heading, { color: COLORS.danger }]}>Gastos Allocations</Text>
      {expenseMetrics.length === 0 ? <Text style={styles.empty}>No logging data found.</Text> : 
        expenseMetrics.map((item: any, idx: number) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.name}>{item.category}</Text>
            <Text style={[styles.val, { color: COLORS.danger }]}>-₱{parseFloat(item.total).toFixed(2)}</Text>
          </View>
        ))
      }

      <Text style={[styles.heading, { color: COLORS.success, marginTop: 20 }]}>Income Allocations</Text>
      {incomeMetrics.length === 0 ? <Text style={styles.empty}>No income data found.</Text> : 
        incomeMetrics.map((item: any, idx: number) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.name}>{item.category}</Text>
            <Text style={[styles.val, { color: COLORS.success }]}>+₱{parseFloat(item.total).toFixed(2)}</Text>
          </View>
        ))
      }
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  empty: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 10, paddingLeft: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.card, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  val: { fontSize: 14, fontWeight: '700' }
});