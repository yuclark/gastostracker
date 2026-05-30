import React, { useState, useEffect, ComponentProps } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

type AnalysisMode = 'expense_overview' | 'income_overview' | 'expense_flow' | 'income_flow';

export default function AnalysisScreen() {
  const isFocused = useIsFocused();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMode, setActiveMode] = useState<AnalysisMode>('expense_overview');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Aggregated Reporting Data States
  const [metricsList, setMetricsList] = useState<any[]>([]);
  const [grandTotalSum, setGrandTotalSum] = useState(0);
  const [dailyFlowCache, setDailyFlowCache] = useState<{ [key: number]: number }>({});

  // 10-Tone Premium Hex Color Palette Matched from your reference image
  const colorsHexMatrix = [
    '#C63A37', // Coral Red (Food)
    '#E5D85C', // Cream Yellow (Loans)
    '#613FB0', // Deep Purple (Transportation)
    '#6CAE64', // Sage Green (Body)
    '#C5336F', // Berry Pink (Error)
    '#3CA1A6', // Soft Teal (Shopping)
    '#5FA2D9', // Slate Blue (Clothing)
    '#E68A38', // Amber Orange (Load)
    '#7D1B44', // Dark Crimson (Bills)
    '#7C8036'  // Olive Drab (Entertainment)
  ];

  // Extracts valid literal icon name structures from Ionicons component props
  const getCategoryIconName = (categoryName: string): ComponentProps<typeof Ionicons>['name'] => {
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes('food')) return 'restaurant';
    if (lowerName.includes('loan')) return 'cash';
    if (lowerName.includes('trans') || lowerName.includes('car')) return 'bus';
    if (lowerName.includes('body') || lowerName.includes('cloth')) return 'shirt';
    if (lowerName.includes('shop')) return 'cart';
    if (lowerName.includes('bill') || lowerName.includes('util')) return 'document-text';
    if (lowerName.includes('entertainment') || lowerName.includes('play')) return 'game-controller';
    return 'pricetag'; // Safe fallback
  };

  const fetchAnalysisReportData = async () => {
    try {
      const activeMonth = selectedDate.getMonth() + 1;
      const activeYear = selectedDate.getFullYear();

      if (activeMode === 'expense_overview' || activeMode === 'income_overview') {
        const queryType = activeMode === 'expense_overview' ? 'gastos' : 'income';
        const dataRows = await db.query(
          `SELECT category, SUM(amount) as total FROM gastos 
           WHERE type = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3 
           GROUP BY category ORDER BY total DESC`,
          [queryType, activeMonth, activeYear]
        );

        if (dataRows) {
          setMetricsList(dataRows);
          setGrandTotalSum(dataRows.reduce((acc: number, curr: any) => acc + parseFloat(curr.total), 0));
        }
      } else {
        const queryType = activeMode === 'expense_flow' ? 'gastos' : 'income';
        const dailyRows = await db.query(
          `SELECT EXTRACT(DAY FROM created_at) as day_num, SUM(amount) as total_sum FROM gastos 
           WHERE type = $1 AND EXTRACT(MONTH FROM created_at) = $2 AND EXTRACT(YEAR FROM created_at) = $3 
           GROUP BY EXTRACT(DAY FROM created_at)`,
          [queryType, activeMonth, activeYear]
        );

        const cache: { [key: number]: number } = {};
        if (dailyRows) {
          dailyRows.forEach((row: any) => {
            cache[parseInt(row.day_num)] = parseFloat(row.total_sum);
          });
        }
        setDailyFlowCache(cache);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (isFocused) fetchAnalysisReportData();
  }, [isFocused, selectedDate, activeMode]);

  const changeMonth = (direction: number) => {
    const nextDate = new Date(selectedDate.setMonth(selectedDate.getMonth() + direction));
    setSelectedDate(new Date(nextDate));
  };

  const getDropdownLabel = () => {
    switch (activeMode) {
      case 'expense_overview': return '▼ EXPENSE OVERVIEW';
      case 'income_overview': return '▼ INCOME OVERVIEW';
      case 'expense_flow': return '▼ EXPENSE FLOW (CALENDAR)';
      case 'income_flow': return '▼ INCOME FLOW (CALENDAR)';
    }
  };

  const formatCalendarValue = (val: number | undefined) => {
    if (!val || val === 0) return '.';
    const prefix = activeMode === 'expense_flow' ? '-' : '+';
    if (val >= 1000) return `${prefix}${(val / 1000).toFixed(1)}k`;
    return `${prefix}${val.toFixed(0)}`;
  };

  const renderCalendarMatrixView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const gridCells: React.ReactNode[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      gridCells.push(<View key={`empty-${i}`} style={styles.calendarDayCellBoxEmpty} />);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dailyValue = dailyFlowCache[day];
      const hasValue = typeof dailyValue === 'number' && dailyValue > 0;
      
      gridCells.push(
        <View key={`day-${day}`} style={styles.calendarDayCellBox}>
          <Text style={styles.calendarDayNumberText}>{day}</Text>
          <Text style={[
            styles.calendarDayValueText,
            hasValue ? { color: activeMode === 'expense_flow' ? COLORS.danger : COLORS.success } : undefined
          ]}>
            {formatCalendarValue(dailyValue)}
          </Text>
        </View>
      );
    }
    return gridCells;
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>

        <View style={styles.headerScroller}>
          <TouchableOpacity style={styles.arrow} onPress={() => changeMonth(-1)}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
          <Text style={styles.monthText}>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity style={styles.arrow} onPress={() => changeMonth(1)}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
        </View>

        {/* 4-Tier Interactive Dropdown Box Selector Module */}
        <View style={styles.dropdownMasterAnchorContainer}>
          <TouchableOpacity style={styles.dropdownSelectorBox} onPress={() => setIsDropdownOpen(!isDropdownOpen)}>
            <Text style={styles.dropdownTitleText}>{getDropdownLabel()}</Text>
            {(activeMode === 'expense_overview' || activeMode === 'income_overview') && (
              <Text style={styles.dropdownSubTotalText}>₱{grandTotalSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            )}
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownExpandedListOverlay}>
              {([
                { key: 'expense_overview', label: 'Expense Overview' },
                { key: 'income_overview', label: 'Income Overview' },
                { key: 'expense_flow', label: 'Expense Flow' },
                { key: 'income_flow', label: 'Income Flow' }
              ] as const).map((opt) => (
                <TouchableOpacity 
                  key={opt.key} 
                  style={[styles.dropdownItemRow, activeMode === opt.key && styles.dropdownItemRowActive]}
                  onPress={() => { setActiveMode(opt.key); setIsDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemRowText, activeMode === opt.key && { color: COLORS.primary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {activeMode === 'expense_overview' || activeMode === 'income_overview' ? (
            <View>
              {/* Data List Rows Section (Straight into metrics, no more pie chart!) */}
              <View style={styles.listRowsGroupPanelCard}>
                {metricsList.length === 0 ? (
                  <Text style={styles.emptyTextFeedback}>No records mapped this month filter.</Text>
                ) : (
                  metricsList.map((item: any, idx: number) => {
                    const proportionalRatio = grandTotalSum > 0 ? (parseFloat(item.total) / grandTotalSum) * 100 : 0;
                    const assignedThemeColor = colorsHexMatrix[idx % colorsHexMatrix.length];
                    const signPrefix = activeMode === 'expense_overview' ? '-' : '+';

                    return (
                      <View key={idx} style={styles.premiumMetricRowCard}>
                        {/* Avatar Circle */}
                        <View style={[styles.categoryAvatarCircle, { backgroundColor: assignedThemeColor }]}>
                          <Ionicons name={getCategoryIconName(item.category)} size={16} color="#FFF" />
                        </View>

                        {/* Middle Tracking Cluster */}
                        <View style={styles.rowMiddleContentBlockColumn}>
                          <View style={styles.rowTopTextLineFlexRow}>
                            <Text style={styles.categoryTitleLabelString}>{item.category.toLowerCase()}</Text>
                            <Text style={[styles.rowValueLabelString, { color: activeMode === 'expense_overview' ? COLORS.danger : COLORS.success }]}>
                              {signPrefix}₱{parseFloat(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                          </View>
                          
                          {/* Horizontal Proportional Fill Bar Indicator */}
                          <View style={styles.progressBarTrackBackground}>
                            <View style={[styles.progressBarFillColorLine, { width: `${proportionalRatio}%`, backgroundColor: '#EFE6C3' }]} />
                          </View>
                        </View>

                        {/* Far Right Percentage Label Column */}
                        <Text style={styles.percentageColumnValueLabel}>{proportionalRatio.toFixed(2)}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          ) : (
            /* CALENDAR MATRIX MODE VIEW BLOCK */
            <View style={styles.calendarFullDisplayCard}>
              <View style={styles.calendarWeekHeaderStripLabelRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wDay) => (
                  <Text key={wDay} style={styles.weekLabelColumnText}>{wDay}</Text>
                ))}
              </View>
              <View style={styles.calendarDaysGridBlockContainer}>
                {renderCalendarMatrixView()}
              </View>
            </View>
          )}
          <View style={{ height: 40 }} />
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
  dropdownMasterAnchorContainer: { position: 'relative', zIndex: 99, marginBottom: 16 },
  dropdownSelectorBox: { backgroundColor: COLORS.card, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
  dropdownTitleText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  dropdownSubTotalText: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 4 },
  dropdownExpandedListOverlay: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: COLORS.card, borderRadius: 8, marginTop: 4, padding: 4, borderWidth: 1, borderColor: '#555', elevation: 4 },
  dropdownItemRow: { padding: 12, borderRadius: 6 },
  dropdownItemRowActive: { backgroundColor: '#444' },
  dropdownItemRowText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  emptyTextFeedback: { color: COLORS.textSecondary, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 },
  calendarFullDisplayCard: { backgroundColor: '#2E2E2E', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: '#444' },
  calendarWeekHeaderStripLabelRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 8, marginBottom: 4 },
  weekLabelColumnText: { flex: 1, color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  calendarDaysGridBlockContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarDayCellBox: { width: '14.28%', height: 62, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#3E3E3E', padding: 4, justifyContent: 'space-between' },
  calendarDayCellBoxEmpty: { width: '14.28%', height: 62 },
  calendarDayNumberText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  calendarDayValueText: { fontSize: 10, fontWeight: '700', textAlign: 'center', bottom: 4, color: '#777' },

  // Card Layout Styling Nodes
  listRowsGroupPanelCard: { marginBottom: 20 },
  premiumMetricRowCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#444' },
  categoryAvatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowMiddleContentBlockColumn: { flex: 1, marginRight: 14 },
  rowTopTextLineFlexRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  categoryTitleLabelString: { color: '#FFF', fontSize: 15, fontWeight: '500', letterSpacing: -0.1 },
  rowValueLabelString: { fontSize: 14, fontWeight: '700' },
  progressBarTrackBackground: { height: 6, backgroundColor: '#444', borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressBarFillColorLine: { height: '100%', borderRadius: 3 },
  percentageColumnValueLabel: { color: '#FFF', fontSize: 13, fontWeight: '600', minWidth: 54, textAlign: 'right' }
});