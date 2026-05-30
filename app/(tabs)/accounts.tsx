import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function AccountsScreen() {
  const isFocused = useIsFocused();
  const [newAccName, setNewAccName] = useState('');
  const [totalAggNetAsset, setTotalAggNetAsset] = useState(0);
  const [totalExpenseSoFar, setTotalExpenseSoFar] = useState(0);
  const [totalIncomeSoFar, setTotalIncomeSoFar] = useState(0);
  const [accountsListRows, setAccountsListRows] = useState<any[]>([]);

  const fetchAccountsSummaryPipeline = async () => {
    try {
      const combinedFlow = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_inflow,
          COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0) as total_outflow
        FROM gastos
      `);

      if (combinedFlow && combinedFlow.length > 0) {
        const inflow = parseFloat(combinedFlow[0].total_inflow);
        const outflow = parseFloat(combinedFlow[0].total_outflow);
        setTotalIncomeSoFar(inflow); setTotalExpenseSoFar(outflow); setTotalAggNetAsset(inflow - outflow);
      }

      const activeAccounts = await db.query("SELECT * FROM dynamic_accounts ORDER BY name ASC");
      const structuralRows = await Promise.all(activeAccounts.map(async (acc: any) => {
        const balanceCalc = await db.query(`
          SELECT (COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
                  COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0)) as node_balance 
          FROM gastos WHERE account = $1
        `, [acc.name]);
        return { ...acc, balance: balanceCalc && balanceCalc.length > 0 ? parseFloat(balanceCalc[0].node_balance) : 0.00 };
      }));

      setAccountsListRows(structuralRows);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (isFocused) fetchAccountsSummaryPipeline(); }, [isFocused]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.assetHeaderCard}>
            <Text style={styles.assetHeaderLabel}>[ All Accounts ₱{totalAggNetAsset.toFixed(2)} ]</Text>
            <View style={styles.splitRow}>
              <View style={{ alignItems: 'center' }}><Text style={styles.subLabel}>EXPENSE SO FAR</Text><Text style={[styles.subValue, { color: COLORS.danger }]}>₱{totalExpenseSoFar.toFixed(2)}</Text></View>
              <View style={{ alignItems: 'center' }}><Text style={styles.subLabel}>INCOME SO FAR</Text><Text style={[styles.subValue, { color: COLORS.success }]}>₱{totalIncomeSoFar.toFixed(2)}</Text></View>
            </View>
          </View>

          <View style={styles.creationCard}>
            <TextInput style={styles.textInput} placeholder="New Account Title (e.g. Maya, Gcash)" placeholderTextColor="#777" value={newAccName} onChangeText={setNewAccName} />
            <TouchableOpacity style={styles.btnBlock} onPress={async () => {
              if(!newAccName.trim()) return;
              await db.query("INSERT INTO dynamic_accounts (name) VALUES ($1) ON CONFLICT DO NOTHING", [newAccName.trim()]);
              setNewAccName(''); fetchAccountsSummaryPipeline();
            }}><Text style={styles.btnText}>⊕ ADD NEW ACCOUNT</Text></TouchableOpacity>
          </View>

          <Text style={styles.listHeadingTitle}>Liquid Accounts Matrix</Text>
          {accountsListRows.map((item, idx) => (
            <View key={idx} style={styles.accountBoxRow}>
              <View style={styles.iconNodeCircle}><Text style={{ fontSize: 16 }}>💳</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountNameTitle}>{item.name}</Text>
                <Text style={styles.balanceSummaryLine}>Balance: <Text style={{ color: COLORS.success, fontWeight: '700' }}>₱{item.balance.toFixed(2)}</Text></Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  innerContentWrapper: { flex: 1, paddingHorizontal: 16 },
  appTitleHeaderLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  assetHeaderCard: { backgroundColor: '#2E2E2E', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  assetHeaderLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12, borderTopWidth: 1, borderTopColor: '#444', paddingTop: 10 },
  subLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  subValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  creationCard: { backgroundColor: COLORS.card, padding: 12, borderRadius: 14, marginBottom: 16 },
  textInput: { backgroundColor: '#2E2E2E', borderRadius: 8, padding: 12, color: '#FFF', fontSize: 14, marginBottom: 12 },
  btnBlock: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center' },
  btnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  listHeadingTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  accountBoxRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2E2E', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  iconNodeCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  accountNameTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  balanceSummaryLine: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 }
});