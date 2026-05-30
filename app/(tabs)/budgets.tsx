import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function BudgetsScreen() {
  const isFocused = useIsFocused();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeSelectCat, setActiveSelectCat] = useState<string | null>(null);
  const [budgetValInput, setBudgetValInput] = useState('');

  const [totalAggregatedBudget, setTotalAggregatedBudget] = useState(0);
  const [totalAggregatedSpent, setTotalAggregatedSpent] = useState(0);
  const [budgetRowsList, setBudgetRowsList] = useState<any[]>([]);

  const fetchBudgetStatusMatrix = async () => {
    try {
      const activeMonth = selectedDate.getMonth() + 1;
      const activeYear = selectedDate.getFullYear();

      const calculatedRows = await db.query(`
        SELECT 
          cc.name as category,
          COALESCE(b.amount, 0.00) as allocation_limit,
          COALESCE(SUM(CASE WHEN g.type = 'gastos' THEN g.amount ELSE 0 END), 0) as combined_spending
        FROM custom_categories cc
        LEFT JOIN budgets b ON cc.name = b.category
        LEFT JOIN gastos g ON cc.name = g.category 
          AND EXTRACT(MONTH FROM g.created_at) = $1 AND EXTRACT(YEAR FROM g.created_at) = $2
        WHERE cc.type = 'gastos' GROUP BY cc.name, b.amount ORDER BY cc.name ASC
      `, [activeMonth, activeYear]);

      if (calculatedRows) {
        setBudgetRowsList(calculatedRows);
        setTotalAggregatedBudget(calculatedRows.reduce((acc: number, r: any) => acc + parseFloat(r.allocation_limit), 0));
        setTotalAggregatedSpent(calculatedRows.reduce((acc: number, r: any) => acc + parseFloat(r.combined_spending), 0));
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (isFocused) fetchBudgetStatusMatrix(); }, [isFocused, selectedDate]);

  const handleUpdate = async () => {
    if (!activeSelectCat || !budgetValInput || isNaN(Number(budgetValInput))) return;
    await db.query(
      "INSERT INTO budgets (category, amount) VALUES ($1, $2) ON CONFLICT (category) DO UPDATE SET amount = EXCLUDED.amount",
      [activeSelectCat, parseFloat(budgetValInput)]
    );
    setBudgetValInput(''); setActiveSelectCat(null); fetchBudgetStatusMatrix();
    Alert.alert("Refreshed", "Budget constraints synchronized.");
  };

  const configuredBudgets = budgetRowsList.filter(item => parseFloat(item.allocation_limit) > 0);
  const unconfiguredBudgets = budgetRowsList.filter(item => parseFloat(item.allocation_limit) === 0);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.calendarStrip}>
            <TouchableOpacity style={styles.arrow} onPress={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabel}>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity style={styles.arrow} onPress={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
          </View>

          <View style={styles.totalOverlookCard}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.overlookLabelText}>TOTAL BUDGET</Text>
              <Text style={[styles.overlookValText, { color: COLORS.primary }]}>₱{totalAggregatedBudget.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.overlookLabelText}>TOTAL SPENT</Text>
              <Text style={[styles.overlookValText, { color: COLORS.danger }]}>₱{totalAggregatedSpent.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.configCard}>
            <TextInput style={styles.inputField} keyboardType="numeric" placeholder="Allocation limit amount (PHP)" placeholderTextColor="#777" value={budgetValInput} onChangeText={setBudgetValInput} />
            <View style={styles.selectionGridRow}>
              {budgetRowsList.map((b) => (
                <TouchableOpacity key={b.category} style={[styles.badgeNodeBtn, activeSelectCat === b.category && { backgroundColor: COLORS.primary }]} onPress={() => setActiveSelectCat(b.category)}>
                  <Text style={[styles.badgeNodeText, activeSelectCat === b.category && { color: '#000' }]}>{b.category}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleUpdate}><Text style={styles.actionButtonText}>Apply Ceiling Value</Text></TouchableOpacity>
          </View>

          <Text style={styles.listSectionHeading}>Budgeted Categories: {selectedDate.toLocaleDateString('en-US', { month: 'long' })}</Text>
          <View style={[styles.cardListingGroup, { marginBottom: 16 }]}>
            {configuredBudgets.length === 0 ? (
              <Text style={styles.emptyFeedbackText}>Currently, no budget is applied for this month. Set budget-limits for this month below.</Text>
            ) : (
              configuredBudgets.map((item: any, idx: number) => {
                const isOverspent = (parseFloat(item.allocation_limit) - parseFloat(item.combined_spending)) < 0;
                return (
                  <View key={idx} style={styles.rowItemCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitleName}>{item.category}</Text>
                      <Text style={styles.itemMetaMetrics}>Spent: ₱{parseFloat(item.combined_spending).toFixed(2)} / Max: ₱{parseFloat(item.allocation_limit).toFixed(2)}</Text>
                    </View>
                    <View style={styles.rightStateIndicator}>
                      <Text style={[styles.stateTextValue, { color: isOverspent ? COLORS.danger : COLORS.success }]}>{isOverspent ? 'OVER' : 'SAFE'}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.listSectionHeading}>Not Budgeted This Month</Text>
          <View style={styles.cardListingGroup}>
            {unconfiguredBudgets.map((item: any, idx: number) => (
              <View key={idx} style={styles.rowItemCard}>
                <Text style={styles.itemTitleName}>{item.category}</Text>
                <TouchableOpacity style={styles.inlineSetBudgetBtn} onPress={() => setActiveSelectCat(item.category)}>
                  <Text style={styles.inlineSetBudgetBtnText}>SET BUDGET</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  innerContentWrapper: { flex: 1, paddingHorizontal: 16 },
  appTitleHeaderLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  calendarStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  arrow: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.card, borderRadius: 8 },
  arrowText: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  monthLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  totalOverlookCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#2E2E2E', padding: 14, borderRadius: 14, marginBottom: 16 },
  overlookLabelText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  overlookValText: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  configCard: { backgroundColor: COLORS.card, padding: 12, borderRadius: 14, marginBottom: 16 },
  inputField: { backgroundColor: '#2E2E2E', borderRadius: 8, padding: 12, color: '#FFF', fontSize: 14, marginBottom: 12 },
  selectionGridRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  badgeNodeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#2E2E2E', borderRadius: 14, marginRight: 6, marginBottom: 6 },
  badgeNodeText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  actionButton: { backgroundColor: COLORS.textPrimary, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: '#000', fontSize: 13, fontWeight: '700' },
  listSectionHeading: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 2 },
  cardListingGroup: { backgroundColor: '#2E2E2E', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  rowItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#444' },
  itemTitleName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  itemMetaMetrics: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  rightStateIndicator: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#3A3A3A', borderRadius: 6 },
  stateTextValue: { fontSize: 11, fontWeight: '700' },
  emptyFeedbackText: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  inlineSetBudgetBtn: { borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  inlineSetBudgetBtnText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' }
});