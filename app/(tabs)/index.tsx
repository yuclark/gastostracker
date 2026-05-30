import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function RecordsScreen() {
  const isFocused = useIsFocused();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Advanced Calculator Engine Variables
  const [displayAmount, setDisplayAmount] = useState('0');
  const [memoryValue, setMemoryValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [clearDisplayOnNextKey, setClearDisplayOnNextKey] = useState(false);

  // Core Ledger Transaction Input Parameters (Defaults strictly to gastos)
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'income' | 'gastos'>('gastos');
  const [account, setAccount] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  // Editable Sub-panel Calendar States
  const [editYear, setEditYear] = useState(String(new Date().getFullYear()));
  const [editMonth, setEditMonth] = useState(String(new Date().getMonth() + 1));
  const [editDay, setEditDay] = useState(String(new Date().getDate()));
  const [editHour, setEditHour] = useState(String(new Date().getHours()));
  const [editMinute, setEditMinute] = useState(String(new Date().getMinutes()));

  // Active Screen Streams State Hydration
  const [monthGastos, setMonthGastos] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [groupedRecords, setGroupedRecords] = useState<{ [key: string]: any[] }>({});
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [accountsList, setAccountsList] = useState<string[]>([]);

  // Toggles for Custom Sheet Drawer Lookalikes
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  const changeMonth = (direction: number) => {
    const nextDate = new Date(selectedDate.setMonth(selectedDate.getMonth() + direction));
    setSelectedDate(new Date(nextDate));
  };

  const fetchRecordsPipelineData = async () => {
    try {
      const activeMonth = selectedDate.getMonth() + 1;
      const activeYear = selectedDate.getFullYear();

      const accs = await db.query("SELECT name FROM dynamic_accounts ORDER BY name ASC");
      setAccountsList(accs.map((a: any) => a.name));

      const cats = await db.query("SELECT name FROM custom_categories WHERE type = $1 ORDER BY name ASC", [type]);
      setCategoriesList(cats.map((c: any) => c.name));

      const monthlyData = await db.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0) as gastos
        FROM gastos WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
        [activeMonth, activeYear]
      );
      if (monthlyData && monthlyData.length > 0) {
        setMonthIncome(parseFloat(monthlyData[0].income));
        setMonthGastos(parseFloat(monthlyData[0].gastos));
      }

      const balanceData = await db.query(`
        SELECT (COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0)) as total_balance FROM gastos
      `);
      if (balanceData && balanceData.length > 0) {
        setCurrentBalance(parseFloat(balanceData[0].total_balance));
      }

      const rawFeed = await db.query(
        "SELECT * FROM gastos WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2 ORDER BY created_at DESC",
        [activeMonth, activeYear]
      );

      const groups: { [key: string]: any[] } = {};
      rawFeed.forEach((row: any) => {
        const dateKey = new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', weekday: 'long' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(row);
      });
      setGroupedRecords(groups);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (isFocused) fetchRecordsPipelineData(); }, [isFocused, selectedDate, type]);

  // Math Evaluation Core Engine Logic 
  const runInternalCalculation = () => {
    if (memoryValue === null || !pendingOperator) return parseFloat(displayAmount);
    const current = parseFloat(displayAmount);
    let result = memoryValue;

    if (pendingOperator === '+') result += current;
    else if (pendingOperator === '-') result -= current;
    else if (pendingOperator === '×') result *= current;
    else if (pendingOperator === '÷') result = current !== 0 ? result / current : 0;

    return result;
  };

  const handleKeyPress = (val: string) => {
    if (val === 'C') {
      setDisplayAmount('0');
      setMemoryValue(null);
      setPendingOperator(null);
      setClearDisplayOnNextKey(false);
    } else if (val === '⌫') {
      if (displayAmount.length <= 1 || displayAmount === '0') setDisplayAmount('0');
      else setDisplayAmount(displayAmount.slice(0, -1));
    } else if (['+', '-', '×', '÷'].includes(val)) {
      const computed = runInternalCalculation();
      setMemoryValue(computed);
      setPendingOperator(val);
      setDisplayAmount(String(computed));
      setClearDisplayOnNextKey(true);
    } else if (val === '=') {
      if (pendingOperator && memoryValue !== null) {
        const computed = runInternalCalculation();
        setDisplayAmount(String(computed));
        setMemoryValue(null);
        setPendingOperator(null);
        setClearDisplayOnNextKey(true);
      }
    } else {
      if (clearDisplayOnNextKey) {
        setDisplayAmount(val === '.' ? '0.' : val);
        setClearDisplayOnNextKey(false);
      } else {
        if (displayAmount === '0' && val !== '.') setDisplayAmount(val);
        else if (val === '.' && displayAmount.includes('.')) return;
        else setDisplayAmount(displayAmount + val);
      }
    }
  };

  const handleOpenEditWorkspace = (logItem: any) => {
    const nativeDate = new Date(logItem.created_at);
    setEditingId(logItem.id);
    setDisplayAmount(String(parseFloat(logItem.amount)));
    setNotes(logItem.description || '');
    setType(logItem.type);
    setAccount(logItem.account);
    setCategory(logItem.category);

    setEditYear(String(nativeDate.getFullYear()));
    setEditMonth(String(nativeDate.getMonth() + 1));
    setEditDay(String(nativeDate.getDate()));
    setEditHour(String(nativeDate.getHours()));
    setEditMinute(String(nativeDate.getMinutes()));
    setIsModalOpen(true);
  };

  const closeAndResetModal = () => {
    setDisplayAmount('0');
    setMemoryValue(null);
    setPendingOperator(null);
    setNotes('');
    setAccount(null);
    setCategory(null);
    setEditingId(null);
    setIsModalOpen(false);
    setShowAccountPicker(false);
    setShowCategoryPicker(false);
    setShowDateTimePicker(false);
  };

  const handleSaveRecord = async () => {
    const finalAmount = parseFloat(displayAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      Alert.alert("Input Deficit", "Transaction total value calculation must scale above 0.");
      return;
    }
    if (!account || !category) {
      Alert.alert("Deficit", "Designating an account entity point and categorical assignment node is required.");
      return;
    }

    const yearNum = parseInt(editYear) || selectedDate.getFullYear();
    const monthNum = (parseInt(editMonth) || 1) - 1;
    const dayNum = parseInt(editDay) || 1;
    const hourNum = parseInt(editHour) || 0;
    const minNum = parseInt(editMinute) || 0;
    const targetTimestamp = new Date(yearNum, monthNum, dayNum, hourNum, minNum);

    if (editingId) {
      await db.query(
        `UPDATE gastos SET amount = $1, description = $2, category = $3, type = $4, account = $5, created_at = $6 WHERE id = $7`,
        [finalAmount, notes.trim(), category, type, account, targetTimestamp, editingId]
      );
    } else {
      await db.query(
        "INSERT INTO gastos (amount, description, category, type, account, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [finalAmount, notes.trim(), category, type, account, targetTimestamp]
      );
    }

    closeAndResetModal();
    fetchRecordsPipelineData();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.monthHeaderRow}>
            <TouchableOpacity onPress={() => changeMonth(-1)}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
            <Text style={styles.monthLabelText}>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
          </View>

          <View style={styles.summaryBar}>
            <View style={styles.summaryNode}>
              <Text style={styles.summaryLabel}>EXPENSE</Text>
              <Text style={[styles.summaryVal, { color: COLORS.danger }]}>₱{monthGastos.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryNode}>
              <Text style={styles.summaryLabel}>INCOME</Text>
              <Text style={[styles.summaryVal, { color: COLORS.success }]}>₱{monthIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryNode}>
              <Text style={styles.summaryLabel}>BALANCE</Text>
              <Text style={[styles.summaryVal, { color: '#FFF' }]}>₱{currentBalance.toFixed(2)}</Text>
            </View>
          </View>

          {Object.keys(groupedRecords).map((dateKey) => (
            <View key={dateKey} style={styles.dateBlockContainer}>
              <Text style={styles.dateBlockHeader}>{dateKey}</Text>
              {groupedRecords[dateKey].map((row: any, idx: number) => (
                <TouchableOpacity key={idx} style={styles.ledgerRowCard} onPress={() => handleOpenEditWorkspace(row)}>
                  <View style={styles.circleIcon}><Text style={{ fontSize: 14 }}>{row.type === 'income' ? '💰' : '🏷️'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowCategoryTitle}>{row.category}</Text>
                    <Text style={styles.rowSubMetadata}>💵 {row.account} {row.description ? `"${row.description}"` : ''}</Text>
                  </View>
                  <Text style={[styles.rowAmountText, { color: row.type === 'income' ? COLORS.success : COLORS.danger }]}>
                    {row.type === 'income' ? '' : '-'}₱{parseFloat(row.amount).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>

        <TouchableOpacity style={styles.fabActionButton} onPress={() => { setEditingId(null); setType('gastos'); setIsModalOpen(true); }}>
          <Text style={styles.fabBtnText}>+</Text>
        </TouchableOpacity>

        {/* Dynamic Mobile Numerical Calculator Interface Matrix Overlay */}
        <Modal visible={isModalOpen} animationType="slide" transparent={false}>
          <SafeAreaView style={styles.modalSafeContainer}>
            <View style={styles.modalHeaderTopBar}>
              <TouchableOpacity onPress={closeAndResetModal}><Text style={styles.headerActionBtnText}>✕ CANCEL</Text></TouchableOpacity>
              {editingId && (
                <TouchableOpacity onPress={async () => {
                  await db.query("DELETE FROM gastos WHERE id = $1", [editingId]);
                  closeAndResetModal(); fetchRecordsPipelineData();
                }}><Text style={[styles.headerActionBtnText, { color: COLORS.danger }]}>🗑️ DELETE</Text></TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSaveRecord}><Text style={styles.headerActionBtnText}>{editingId ? '✓ UPDATE' : '✓ SAVE'}</Text></TouchableOpacity>
            </View>

            {/* Split Type Segments Control (Defaults directly to Expense) */}
            <View style={styles.typeSelectorRowSegment}>
              <TouchableOpacity style={[styles.typeBtnOption, type === 'income' && styles.typeBtnOptionActive]} onPress={() => { setType('income'); setCategory(null); }}>
                <Text style={[styles.typeBtnText, type === 'income' && { color: '#FFF' }]}>INCOME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtnOption, type === 'gastos' && styles.typeBtnOptionActive]} onPress={() => { setType('gastos'); setCategory(null); }}>
                <Text style={[styles.typeBtnText, type === 'gastos' && { color: '#FFF' }]}>✓ EXPENSE</Text>
              </TouchableOpacity>
            </View>

            {/* Top-Tier Flexible Parameters Selection Gate Node Rows */}
            <View style={styles.dualDropdownSelectorsFlexRow}>
              <TouchableOpacity style={styles.selectorDropdownNode} onPress={() => { setShowAccountPicker(!showAccountPicker); setShowCategoryPicker(false); setShowDateTimePicker(false); }}>
                <Text style={styles.selectorDropdownNodeText}>💳 {account || 'Account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selectorDropdownNode} onPress={() => { setShowCategoryPicker(!showCategoryPicker); setShowAccountPicker(false); setShowDateTimePicker(false); }}>
                <Text style={styles.selectorDropdownNodeText}>🏷️ {category || 'Category'}</Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Interactive Drawers panels configurations matching images */}
            {showAccountPicker && (
              <ScrollView style={styles.drawerSubPanelContainer} keyboardShouldPersistTaps="handled">
                {accountsList.map((a) => (
                  <TouchableOpacity key={a} style={styles.drawerItemRow} onPress={() => { setAccount(a); setShowAccountPicker(false); }}>
                    <Text style={styles.drawerItemRowText}>💳 {a}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {showCategoryPicker && (
              <ScrollView style={styles.drawerSubPanelContainer} keyboardShouldPersistTaps="handled">
                {categoriesList.map((c) => (
                  <TouchableOpacity key={c} style={styles.drawerItemRow} onPress={() => { setCategory(c); setShowCategoryPicker(false); }}>
                    <Text style={styles.drawerItemRowText}>🏷️ {c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput style={styles.notesInputFieldBlock} placeholder="Add notes" placeholderTextColor="#777" value={notes} onChangeText={setNotes} />

            {/* Calculator Display Output View Module */}
            <View style={styles.calculatorOutputFlexDisplayRow}>
              {pendingOperator && <Text style={styles.calcHistoryLabel}>{memoryValue} {pendingOperator}</Text>}
              <Text style={styles.calculatorMainValueDigits}>{displayAmount}</Text>
              <TouchableOpacity style={styles.inlineBackspaceTouchNode} onPress={() => handleKeyPress('⌫')}>
                <Text style={styles.backspaceIconGlyph}>⌫</Text>
              </TouchableOpacity>
            </View>

            {/* Supercharged Chunkier Keyboard Grid Arrays Matrix Configurations */}
            <View style={styles.keyboardMatrixSystemBlockGrid}>
              <View style={styles.numericMainGridContainerBlock}>
                {[
                  ['7', '8', '9'],
                  ['4', '5', '6'],
                  ['1', '2', '3'],
                  ['C', '0', '.']
                ].map((rowArr, rowKey) => (
                  <View key={rowKey} style={styles.keypadHorizontalFlexRowBlock}>
                    {rowArr.map((cell) => (
                      <TouchableOpacity key={cell} style={styles.numericCellBtnNode} onPress={() => handleKeyPress(cell)}>
                        <Text style={[styles.keypadCellBtnText, cell === 'C' && { color: COLORS.danger }]}>{cell}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.operatorsFlexColumnSideBlock}>
                {['÷', '×', '-', '+', '='].map((op) => (
                  <TouchableOpacity key={op} style={[styles.keypadCellBtnNode, op === '=' && { backgroundColor: COLORS.primary }]} onPress={() => handleKeyPress(op)}>
                    <Text style={[styles.keypadCellBtnText, op === '=' && { color: '#000', fontWeight: '800' }]}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bottom Target Adjustable Date and Time Configuration Drawer Button Toggle */}
            <TouchableOpacity style={styles.modalBottomDateTimePickerStrip} onPress={() => { setShowDateTimePicker(!showDateTimePicker); setShowAccountPicker(false); setShowCategoryPicker(false); }}>
              <Text style={styles.statusStripTextLabel}>📅 {editMonth}/{editDay}/{editYear}</Text>
              <Text style={styles.statusStripTextLabel}>⏰ {editHour}:{editMinute}</Text>
            </TouchableOpacity>

            {showDateTimePicker && (
              <View style={styles.inlineDateTimePickerBlockCard}>
                <View style={styles.timeUnitCol}><Text style={styles.timeUnitLabel}>Month</Text><TextInput style={styles.timeUnitInput} keyboardType="numeric" value={editMonth} onChangeText={setEditMonth} maxLength={2} /></View>
                <View style={styles.timeUnitCol}><Text style={styles.timeUnitLabel}>Day</Text><TextInput style={styles.timeUnitInput} keyboardType="numeric" value={editDay} onChangeText={setEditDay} maxLength={2} /></View>
                <View style={styles.timeUnitCol}><Text style={styles.timeUnitLabel}>Year</Text><TextInput style={styles.timeUnitInput} keyboardType="numeric" value={editYear} onChangeText={setEditYear} maxLength={4} /></View>
                <View style={styles.timeUnitCol}><Text style={styles.timeUnitLabel}>Hour</Text><TextInput style={styles.timeUnitInput} keyboardType="numeric" value={editHour} onChangeText={setEditHour} maxLength={2} /></View>
                <View style={styles.timeUnitCol}><Text style={styles.timeUnitLabel}>Minute</Text><TextInput style={styles.timeUnitInput} keyboardType="numeric" value={editMinute} onChangeText={setEditMinute} maxLength={2} /></View>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  modalSafeContainer: { flex: 1, backgroundColor: COLORS.background, padding: 16, justifyContent: 'space-between' },
  innerContentWrapper: { flex: 1, paddingHorizontal: 16 },
  appTitleHeaderLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center', marginVertical: 12 },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navArrow: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', paddingHorizontal: 10 },
  monthLabelText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2E2E2E', padding: 14, borderRadius: 12, marginBottom: 16 },
  summaryNode: { alignItems: 'center', flex: 1 },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  summaryVal: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  dateBlockContainer: { marginBottom: 16 },
  dateBlockHeader: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6, marginBottom: 8 },
  ledgerRowCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#444' },
  circleIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowCategoryTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  rowSubMetadata: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  rowAmountText: { fontSize: 15, fontWeight: '700' },
  fabActionButton: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4F4F4F', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary, elevation: 8 },
  fabBtnText: { color: COLORS.textPrimary, fontSize: 28, bottom: 2 },
  modalHeaderTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  headerActionBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  typeSelectorRowSegment: { flexDirection: 'row', backgroundColor: '#2E2E2E', borderRadius: 10, padding: 4, marginBottom: 14 },
  typeBtnOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  typeBtnOptionActive: { backgroundColor: '#444444', borderWidth: 1, borderColor: COLORS.primary },
  typeBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  dualDropdownSelectorsFlexRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  selectorDropdownNode: { flex: 1, backgroundColor: COLORS.card, padding: 14, borderRadius: 10, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#555' },
  selectorDropdownNodeText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  drawerSubPanelContainer: { backgroundColor: '#2E2E2E', borderRadius: 8, padding: 4, marginBottom: 10, maxHeight: 110 },
  drawerItemRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#444' },
  drawerItemRowText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  notesInputFieldBlock: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#555', color: '#FFF', fontSize: 15, paddingVertical: 12, paddingHorizontal: 4, marginBottom: 10 },
  calculatorOutputFlexDisplayRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#555', paddingVertical: 8, marginBottom: 12, height: 60, position: 'relative' },
  calcHistoryLabel: { color: COLORS.primary, fontSize: 14, position: 'absolute', left: 4, bottom: 18 },
  calculatorMainValueDigits: { color: COLORS.textPrimary, fontSize: 36, fontWeight: '400', marginRight: 48 },
  inlineBackspaceTouchNode: { position: 'absolute', right: 4, width: 40, height: '100%', justifyContent: 'center', alignItems: 'center' },
  backspaceIconGlyph: { color: COLORS.primary, fontSize: 22 },
  keyboardMatrixSystemBlockGrid: { flexDirection: 'row', flex: 1, minHeight: 260, marginBottom: 12 },
  operatorsFlexColumnSideBlock: { width: '25%', justifyContent: 'space-between', paddingLeft: 4 },
  numericMainGridContainerBlock: { width: '75%', justifyContent: 'space-between' },
  keypadHorizontalFlexRowBlock: { flexDirection: 'row', justifyContent: 'space-between', flex: 1 },
  keypadCellBtnNode: { flex: 1, backgroundColor: '#4F4F4F', marginVertical: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#555' },
  numericCellBtnNode: { flex: 1, backgroundColor: '#3E3E3E', margin: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4F4F4F' },
  keypadCellBtnText: { color: '#FFF', fontSize: 22, fontWeight: '600' },
  modalBottomDateTimePickerStrip: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#555', paddingTop: 12, paddingHorizontal: 4 },
  statusStripTextLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  inlineDateTimePickerBlockCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#2E2E2E', padding: 10, borderRadius: 10, marginTop: 10 },
  timeUnitCol: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  timeUnitLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  timeUnitInput: { width: '100%', backgroundColor: '#444', borderRadius: 4, textAlign: 'center', color: '#FFF', fontSize: 14, paddingVertical: 6, fontWeight: '700', borderWidth: 1, borderColor: '#555' }
});