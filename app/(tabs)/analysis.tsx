import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function AnalysisScreen() {
  const isFocused = useIsFocused();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeAnalysisType, setActiveAnalysisType] = useState<'gastos' | 'income'>('gastos');
  const [metricsList, setMetricsList] = useState<any[]>([]);
  const [grandTotalSum, setGrandTotalSum] = useState(0);

  const colorsHexMatrix = ['#D6745A', '#E2C974', '#76C787', '#5B92E5', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C'];

  const fetchAnalysisReport = async () => {
    const activeMonth = selectedDate.getMonth() + 1;
    const activeYear = selectedDate.getFullYear();

    const dataRows = await db.query(
      `SELECT category, SUM(amount) as total FROM gastos 
       WHERE type = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3 
       GROUP BY category ORDER BY total DESC`,
      [activeAnalysisType, activeMonth, activeYear]
    );

    if (dataRows) {
      setMetricsList(dataRows);
      setGrandTotalSum(dataRows.reduce((acc: number, curr: any) => acc + parseFloat(curr.total), 0));
    }
  };

  useEffect(() => { if (isFocused) fetchAnalysisReport(); }, [isFocused, selectedDate, activeAnalysisType]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerScroller}>
            <TouchableOpacity style={styles.arrow} onPress={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
            <Text style={styles.monthText}>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity style={styles.arrow} onPress={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.dropdownSelectorBox} onPress={() => setActiveAnalysisType(activeAnalysisType === 'gastos' ? 'income' : 'gastos')}>
            <Text style={styles.dropdownTitleText}>{activeAnalysisType === 'gastos' ? '▼ EXPENSE OVERVIEW' : '▼ INCOME OVERVIEW'}</Text>
            <Text style={styles.dropdownSubTotalText}>₱{grandTotalSum.toFixed(2)}</Text>
          </TouchableOpacity>

          {/* Fully Responsive CSS Donut Wheel Module Replacement */}
          <View style={styles.pieChartVisualSection}>
            <View style={styles.outerDonutWheelFrame}>
              {metricsList.map((item, idx) => {
                const ratioPercent = grandTotalSum > 0 ? (parseFloat(item.total) / grandTotalSum) * 100 : 0;
                if (ratioPercent === 0) return null;
                return (
                  <View key={idx} style={[styles.donutSliceLine, {
                    borderColor: colorsHexMatrix[idx % colorsHexMatrix.length],
                    transform: [{ rotate: `${(idx * 45)}deg` }],
                    opacity: 0.2 + (ratioPercent / 110)
                  }]} />
                );
              })}
              <View style={styles.innerDonutCoreMask}><Text style={styles.donutCenterLabel}>Expenses</Text></View>
            </View>

            {/* Structured Color-Coded Chart Labels Grid */}
            <View style={styles.legendContainerGridBlock}>
              {metricsList.map((item, index) => {
                const ratioVal = grandTotalSum > 0 ? (parseFloat(item.total) / grandTotalSum) * 100 : 0;
                return (
                  <View key={index} style={styles.legendItemRowNode}>
                    <View style={[styles.legendColorSquare, { backgroundColor: colorsHexMatrix[index % colorsHexMatrix.length] }]} />
                    <Text style={styles.legendLabelTextDescription}>{item.category} ({ratioVal.toFixed(1)}%)</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pure Rows Feeds (Levels Removed) */}
          <View style={styles.chartWrapperPanel}>
            {metricsList.map((item: any, idx: number) => (
              <View key={idx} style={[styles.metricCardRow, idx === metricsList.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.catLabelName}>{item.category}</Text>
                <Text style={[styles.amountValueLabel, { color: activeAnalysisType === 'gastos' ? COLORS.danger : COLORS.success }]}>
                  ₱{parseFloat(item.total).toFixed(2)}
                </Text>
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
  headerScroller: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  arrow: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.card, borderRadius: 8 },
  arrowText: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  monthText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  dropdownSelectorBox: { backgroundColor: COLORS.card, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary, marginBottom: 16 },
  dropdownTitleText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dropdownSubTotalText: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 4 },
  pieChartVisualSection: { backgroundColor: '#2E2E2E', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  outerDonutWheelFrame: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', marginBottom: 16 },
  donutSliceLine: { position: 'absolute', width: '100%', height: '100%', borderRadius: 70, borderWidth: 16, borderColor: 'transparent' },
  innerDonutCoreMask: { width: 108, height: 108, borderRadius: 54, backgroundColor: '#2E2E2E', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
  donutCenterLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  legendContainerGridBlock: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', borderTopWidth: 1, borderTopColor: '#444', paddingTop: 12 },
  legendItemRowNode: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8, paddingHorizontal: 4 },
  legendColorSquare: { width: 10, height: 10, borderRadius: 2, marginRight: 8 },
  legendLabelTextDescription: { color: '#FFF', fontSize: 12, fontWeight: '500' },
  chartWrapperPanel: { backgroundColor: '#2E2E2E', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20 },
  metricCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444' },
  catLabelName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  amountValueLabel: { fontSize: 15, fontWeight: '700' }
});