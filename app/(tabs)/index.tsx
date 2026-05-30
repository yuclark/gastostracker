import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function LogGastosScreen() {
  const isFocused = useIsFocused();
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'gastos' | 'income'>('gastos');
  const [account, setAccount] = useState('GCash');
  const [category, setCategory] = useState('Food');

  // Dashboard Data State
  const [monthGastos, setMonthGastos] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  const categoriesList = type === 'gastos' 
    ? ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Hot Wheels 🏎️']
    : ['Salary', 'Allowance', 'Business', 'Investment', 'Side Hustle'];

  const fetchDashboardMetrics = async () => {
    try {
      // 1. Fetch current month total income & expenses (resets monthly)
      const monthlyQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0) as gastos
        FROM gastos 
        WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
      `;
      const monthlyData = await db.query(monthlyQuery);
      if (monthlyData && monthlyData.length > 0) {
        setMonthIncome(parseFloat(monthlyData[0].income));
        setMonthGastos(parseFloat(monthlyData[0].gastos));
      }

      // 2. Fetch cumulative all-time total balance (carries over to next months naturally)
      const balanceQuery = `
        SELECT 
          (COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
           COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0)) as total_balance
        FROM gastos
      `;
      const balanceData = await db.query(balanceQuery);
      if (balanceData && balanceData.length > 0) {
        setCurrentBalance(parseFloat(balanceData[0].total_balance));
      }

      // 3. Fetch recent entries feed
      const feedData = await db.query("SELECT * FROM gastos ORDER BY created_at DESC LIMIT 5");
      if (feedData) setRecentRecords(feedData);

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { if (isFocused) fetchDashboardMetrics(); }, [isFocused]);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) return;
    
    // Fallback protection: check if empty or blank description
    const finalCategory = category.trim() === '' ? 'Uncategorized' : category;
    const finalDescription = description.trim() === '' ? 'Uncategorized Transaction' : description;

    await db.query(
      "INSERT INTO gastos (amount, description, category, type, account, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
      [parseFloat(amount), finalDescription, finalCategory, type, account]
    );

    // Reset Form fields
    setAmount('');
    setDescription('');
    setCategory(type === 'gastos' ? 'Food' : 'Salary');
    
    // Refresh calculations instantly
    fetchDashboardMetrics();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Dynamic Dashboard Scoreboards */}
      <View style={styles.metricsRow}>
        <View style={[styles.miniCard, { borderLeftColor: COLORS.success, borderLeftWidth: 4 }]}>
          <Text style={styles.miniLabel}>Month Income</Text>
          <Text style={[styles.miniAmount, { color: COLORS.success }]}>₱{monthIncome.toFixed(2)}</Text>
        </View>
        <View style={[styles.miniCard, { borderLeftColor: COLORS.danger, borderLeftWidth: 4 }]}>
          <Text style={styles.miniLabel}>Month Gastos</Text>
          <Text style={[styles.miniAmount, { color: COLORS.danger }]}>₱{monthGastos.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Running Balance</Text>
        <Text style={styles.balanceAmount}>₱{currentBalance.toFixed(2)}</Text>
      </View>

      {/* Main Entry Ledger Form */}
      <View style={styles.formCard}>
        {/* Toggle Selector Segment for Income vs Expense */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity 
            style={[styles.segmentBtn, type === 'gastos' && { backgroundColor: COLORS.danger }]} 
            onPress={() => { setType('gastos'); setCategory('Food'); }}
          >
            <Text style={[styles.segmentText, type === 'gastos' && { color: '#FFF' }]}>Gastos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentBtn, type === 'income' && { backgroundColor: COLORS.success }]} 
            onPress={() => { setType('income'); setCategory('Salary'); }}
          >
            <Text style={[styles.segmentText, type === 'income' && { color: '#FFF' }]}>Income</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Amount (PHP)</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="0.00" value={amount} onChangeText={setAmount} />
        
        <Text style={styles.label}>Description</Text>
        <TextInput style={styles.input} placeholder="Notes..." value={description} onChangeText={setDescription} />

        {/* Account Selector Node Row */}
        <Text style={styles.label}>Select Account Outflow Node</Text>
        <View style={styles.selectorRow}>
          {['GCash', 'Cash', 'Bank'].map((acc) => (
            <TouchableOpacity 
              key={acc} 
              style={[styles.selectorItem, account === acc && styles.selectorItemActive]} 
              onPress={() => setAccount(acc)}
            >
              <Text style={[styles.selectorItemText, account === acc && styles.selectorItemTextActive]}>{acc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Selector Grid Block */}
        <Text style={styles.label}>Category Allocation</Text>
        <View style={styles.categoryGrid}>
          {categoriesList.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.catGridItem, category === cat && { backgroundColor: COLORS.border }]} 
              onPress={() => setCategory(cat)}
            >
              <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <TouchableOpacity style={[styles.button, { backgroundColor: type === 'gastos' ? COLORS.primary : COLORS.success }]} onPress={handleSave}>
          <Text style={styles.buttonText}>Log {type === 'gastos' ? 'Expense' : 'Inflow'}</Text>
        </TouchableOpacity>
      </View>

      {/* Embedded Realtime Recent Shared Feed Matrix */}
      <Text style={styles.sectionTitle}>Recent Shared Ledger Activity</Text>
      {recentRecords.map((item: any, idx: number) => (
        <View key={idx} style={styles.recordItem}>
          <View>
            <Text style={styles.recordDesc}>{item.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.recordTag}>{item.category}</Text>
              <Text style={[styles.recordTag, { backgroundColor: '#F1F5F9', marginLeft: 6 }]}>{item.account}</Text>
            </View>
          </View>
          <Text style={[styles.recordAmount, { color: item.type === 'income' ? COLORS.success : COLORS.danger }]}>
            {item.type === 'income' ? '+' : '-'}₱{parseFloat(item.amount).toFixed(2)}
          </Text>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  miniCard: { flex: 0.48, backgroundColor: COLORS.card, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  miniLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  miniAmount: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  balanceCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  balanceAmount: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  formCard: { backgroundColor: COLORS.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  segmentContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 4, marginBottom: 16 },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  segmentText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 15, color: COLORS.textPrimary },
  selectorRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  selectorItem: { flex: 1, marginHorizontal: 3, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  selectorItemActive: { backgroundColor: COLORS.tint, borderColor: COLORS.tint },
  selectorItemText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  selectorItemTextActive: { color: '#FFF', fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  catGridItem: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, marginRight: 6, marginBottom: 6, backgroundColor: '#FFF' },
  button: { padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  recordDesc: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  recordTag: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  recordAmount: { fontSize: 15, fontWeight: '700' }
});