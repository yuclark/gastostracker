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

  // Pop-up Selection Modal States (Replacing Dropdowns)
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // Calculator Operational Engines
  const [displayAmount, setDisplayAmount] = useState('0');
  const [memoryValue, setMemoryValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [clearDisplayOnNextKey, setClearDisplayOnNextKey] = useState(false);

  // Field Form States
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<'income' | 'gastos'>('gastos');
  const [account, setAccount] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  // Overridden Calendar Metrics
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentDay, setCurrentDay] = useState(new Date().getDate());
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [currentMinute, setCurrentMinute] = useState(new Date().getMinutes());
  const [isPm, setIsPm] = useState(new Date().getHours() >= 12);

  // Account Balances Cache State for Account Selection Sheet
  const [accountBalances, setAccountBalances] = useState<{ [key: string]: number }>({});

  // Core List Data Views
  const [monthGastos, setMonthGastos] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [groupedRecords, setGroupedRecords] = useState<{ [key: string]: any[] }>({});
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [accountsList, setAccountsList] = useState<string[]>([]);

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

      // Dynamically calculate current balance for every account to show in pop-up list
      const balancesCache: { [key: string]: number } = {};
      for (const a of accs.map((acc: any) => acc.name)) {
        const balRes = await db.query(
          `SELECT (COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
                  COALESCE(SUM(CASE WHEN type = 'gastos' THEN amount ELSE 0 END), 0)) as bal FROM gastos WHERE account = $1`,
          [a]
        );
        balancesCache[a] = balRes && balRes.length > 0 ? parseFloat(balRes[0].bal) : 0.00;
      }
      setAccountBalances(balancesCache);

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

  const handleOpenNewEntry = () => {
    const liveNow = new Date();
    setCurrentYear(liveNow.getFullYear());
    setCurrentMonth(liveNow.getMonth());
    setCurrentDay(liveNow.getDate());
    setCurrentHour(liveNow.getHours());
    setCurrentMinute(liveNow.getMinutes());
    setIsPm(liveNow.getHours() >= 12);

    setEditingId(null);
    setType('gastos');
    setIsModalOpen(true);
  };

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

    setCurrentYear(nativeDate.getFullYear());
    setCurrentMonth(nativeDate.getMonth());
    setCurrentDay(nativeDate.getDate());
    setCurrentHour(nativeDate.getHours());
    setCurrentMinute(nativeDate.getMinutes());
    setIsPm(nativeDate.getHours() >= 12);
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
  };

  const handleSaveRecord = async () => {
    const finalAmount = parseFloat(displayAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      Alert.alert("Input Deficit", "Transaction value must be higher than 0.");
      return;
    }
    if (!account || !category) {
      Alert.alert("Deficit", "Account and Category parameters are strictly required nodes.");
      return;
    }

    const compiledTimestamp = new Date(currentYear, currentMonth, currentDay, currentHour, currentMinute);

    if (editingId) {
      await db.query(
        `UPDATE gastos SET amount = $1, description = $2, category = $3, type = $4, account = $5, created_at = $6 WHERE id = $7`,
        [finalAmount, notes.trim(), category, type, account, compiledTimestamp, editingId]
      );
    } else {
      await db.query(
        "INSERT INTO gastos (amount, description, category, type, account, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [finalAmount, notes.trim(), category, type, account, compiledTimestamp]
      );
    }

    closeAndResetModal();
    fetchRecordsPipelineData();
  };

  const calendarDaysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const targetMonthLabelString = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const selectedDateHeaderString = new Date(currentYear, currentMonth, currentDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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

        <TouchableOpacity style={styles.fabActionButton} onPress={handleOpenNewEntry}>
          <Text style={styles.fabBtnText}>+</Text>
        </TouchableOpacity>

        {/* Core Calculation Overlay Module */}
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

            <View style={styles.typeSelectorRowSegment}>
              <TouchableOpacity style={[styles.typeBtnOption, type === 'income' && styles.typeBtnOptionActive]} onPress={() => { setType('income'); setCategory(null); }}>
                <Text style={[styles.typeBtnText, type === 'income' && { color: '#FFF' }]}>INCOME</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtnOption, type === 'gastos' && styles.typeBtnOptionActive]} onPress={() => { setType('gastos'); setCategory(null); }}>
                <Text style={[styles.typeBtnText, type === 'gastos' && { color: '#FFF' }]}>✓ EXPENSE</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Interactive Selection Node Toggles */}
            <View style={styles.dualDropdownSelectorsFlexRow}>
              <TouchableOpacity style={styles.selectorDropdownNode} onPress={() => setIsAccountPickerOpen(true)}>
                <Text style={styles.selectorDropdownNodeText}>💳 {account || 'Account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.selectorDropdownNode} onPress={() => setIsCategoryPickerOpen(true)}>
                <Text style={styles.selectorDropdownNodeText}>🏷️ {category || 'Category'}</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.notesInputFieldBlock} placeholder="Add notes" placeholderTextColor="#777" value={notes} onChangeText={setNotes} />

            <View style={styles.calculatorOutputFlexDisplayRow}>
              {pendingOperator && <Text style={styles.calcHistoryLabel}>{memoryValue} {pendingOperator}</Text>}
              <Text style={styles.calculatorMainValueDigits}>{displayAmount}</Text>
              <TouchableOpacity style={styles.inlineBackspaceTouchNode} onPress={() => handleKeyPress('⌫')}>
                <Text style={styles.backspaceIconGlyph}>⌫</Text>
              </TouchableOpacity>
            </View>

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

            <View style={styles.modalBottomDateTimePickerStrip}>
              <TouchableOpacity onPress={() => setIsDatePickerOpen(true)}>
                <Text style={styles.statusStripTextLabel}>📅 {currentMonth + 1}/{currentDay}/{currentYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsTimePickerOpen(true)}>
                <Text style={styles.statusStripTextLabel}>⏰ {currentHour % 12 || 12}:{currentMinute < 10 ? '0' : ''}{currentMinute} {isPm ? 'PM' : 'AM'}</Text>
              </TouchableOpacity>
            </View>

            {/* A. Account Sheet Pop-up View Modal Configuration (`image_3f467f.jpg`) */}
            <Modal visible={isAccountPickerOpen} transparent={true} animationType="slide">
              <View style={styles.bottomSheetModalBackdrop}>
                <View style={styles.bottomSheetCardContainer}>
                  <Text style={styles.sheetHeaderTitleLabel}>Select an account</Text>
                  <ScrollView style={{ maxHeight: 220 }}>
                    {accountsList.map((accName) => (
                      <TouchableOpacity 
                        key={accName} 
                        style={[styles.sheetSelectionRowItem, account === accName && styles.sheetSelectionRowItemActive]}
                        onPress={() => { setAccount(accName); setIsAccountPickerOpen(false); }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.sheetCircleIconAvatar}><Text style={{ fontSize: 14 }}>💳</Text></View>
                          <Text style={styles.sheetItemNodeTextName}>{accName}</Text>
                        </View>
                        <Text style={styles.sheetItemRightBalanceAmt}>₱{(accountBalances[accName] || 0.00).toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity 
                    style={styles.sheetBottomActionButtonBlock}
                    onPress={() => { setIsAccountPickerOpen(false); Alert.alert("Account Matrix", "Navigate to Accounts tab module to append dynamic core assets configuration rows."); }}
                  >
                    <Text style={styles.sheetBottomActionBtnText}>➕ ADD NEW ACCOUNT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sheetCloseCancelTextBtn} onPress={() => setIsAccountPickerOpen(false)}>
                    <Text style={{ color: COLORS.danger, fontWeight: '700', textAlign: 'center' }}>CANCEL</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* B. Category Grid Fullscreen Pop-up View Modal Configuration (`image_3f467c.jpg`) */}
            <Modal visible={isCategoryPickerOpen} transparent={true} animationType="fade">
              <View style={styles.fullscreenPopupModalBackdrop}>
                <SafeAreaView style={{ flex: 1, width: '100%' }}>
                  <Text style={styles.fullscreenPopupHeaderTitleLabel}>Select a category</Text>
                  <ScrollView contentContainerStyle={styles.fullscreenGridScrollContainerLayout}>
                    {categoriesList.map((catName) => (
                      <TouchableOpacity 
                        key={catName} 
                        style={[styles.gridCategoryCircleCellNode, category === catName && styles.gridCategoryCircleCellNodeActive]}
                        onPress={() => { setCategory(catName); setIsCategoryPickerOpen(false); }}
                      >
                        <View style={styles.gridCategoryIconSphereAvatar}>
                          <Text style={{ fontSize: 18 }}>🏷️</Text>
                        </View>
                        <Text style={styles.gridCategoryLabelStringText} numberOfLines={1}>{catName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.fullscreenPopupDismissFooterBtn} onPress={() => setIsCategoryPickerOpen(false)}>
                    <Text style={styles.fullscreenPopupDismissFooterBtnText}>✕ CLOSE CANCEL</Text>
                  </TouchableOpacity>
                </SafeAreaView>
              </View>
            </Modal>

            {/* 1. Pop-up Calendar Dialog */}
            <Modal visible={isDatePickerOpen} transparent={true} animationType="fade">
              <View style={styles.pickerBackdropCenteredBlur}>
                <View style={styles.calendarDialogContainerBox}>
                  <View style={styles.calendarTopHeaderBand}>
                    <Text style={styles.calendarHeaderYearText}>{currentYear}</Text>
                    <Text style={styles.calendarHeaderDateText}>{selectedDateHeaderString}</Text>
                  </View>
                  <View style={styles.calendarBodyGridPanel}>
                    <View style={styles.calendarMonthNavigationStrip}>
                      <TouchableOpacity onPress={() => setCurrentMonth(currentMonth === 0 ? 11 : currentMonth - 1)}><Text style={styles.pickerNavArrow}>‹</Text></TouchableOpacity>
                      <Text style={styles.pickerMonthLabelTitle}>{targetMonthLabelString}</Text>
                      <TouchableOpacity onPress={() => setCurrentMonth(currentMonth === 11 ? 0 : currentMonth + 1)}><Text style={styles.pickerNavArrow}>›</Text></TouchableOpacity>
                    </View>
                    <View style={styles.calendarWeekDaysRow}>
                      {['S','M','T','W','T','F','S'].map((dayLetter, dIdx) => <Text key={dIdx} style={styles.weekLetterLabel}>{dayLetter}</Text>)}
                    </View>
                    <ScrollView contentContainerStyle={styles.calendarDaysGridWrap}>
                      {calendarDaysArray.map((dayNum) => (
                        <TouchableOpacity 
                          key={dayNum} 
                          style={[styles.calendarDayCellNode, currentDay === dayNum && styles.calendarDayCellNodeActive]} 
                          onPress={() => setCurrentDay(dayNum)}
                        >
                          <Text style={[styles.calendarDayCellText, currentDay === dayNum && { color: '#000', fontWeight: '700' }]}>{dayNum}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.dialogActionsBarFooterRow}>
                    <TouchableOpacity style={styles.dialogActionBtn} onPress={() => setIsDatePickerOpen(false)}><Text style={styles.dialogActionBtnText}>CANCEL</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dialogActionBtn} onPress={() => setIsDatePickerOpen(false)}><Text style={styles.dialogActionBtnText}>OK</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* 2. Pop-up Clock Dial Dialog */}
            <Modal visible={isTimePickerOpen} transparent={true} animationType="fade">
              <View style={styles.pickerBackdropCenteredBlur}>
                <View style={styles.clockDialogContainerBox}>
                  <View style={styles.clockTopDisplayHeader}>
                    <Text style={styles.clockHeaderDigitsText}>{currentHour % 12 || 12}:{currentMinute < 10 ? '0' : ''}{currentMinute}</Text>
                    <View style={styles.clockAmPmFlexToggleColumn}>
                      <TouchableOpacity onPress={() => { setIsPm(false); if(currentHour>=12) setCurrentHour(currentHour-12); }}><Text style={[styles.ampmToggleText, !isPm && styles.ampmToggleTextActive]}>AM</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { setIsPm(true); if(currentHour<12) setCurrentHour(currentHour+12); }}><Text style={[styles.ampmToggleText, isPm && styles.ampmToggleTextActive]}>PM</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.clockDialFaceVisualBlock}>
                    <View style={styles.outerClockWheelCircleCircle}>
                      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hourNum, index) => (
                        <TouchableOpacity 
                          key={hourNum} 
                          style={[styles.clockHourDigitCellNode, { transform: [{ rotate: `${index * 30}deg` }, { translateY: -44 }] }]}
                          onPress={() => {
                            let adjustedHour = hourNum;
                            if (isPm && hourNum !== 12) adjustedHour += 12;
                            if (!isPm && hourNum === 12) adjustedHour = 0;
                            setCurrentHour(adjustedHour);
                          }}
                        >
                          <Text style={[styles.clockHourDigitTextText, { transform: [{ rotate: `-${index * 30}deg` }] }, (currentHour % 12 || 12) === hourNum && styles.clockDigitActiveText]}>
                            {hourNum}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <View style={styles.centerClockPivotPinPin} />
                    </View>
                  </View>
                  <View style={styles.dialogActionsBarFooterRow}>
                    <TouchableOpacity style={styles.dialogActionBtn} onPress={() => setIsTimePickerOpen(false)}><Text style={styles.dialogActionBtnText}>CANCEL</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.dialogActionBtn} onPress={() => setIsTimePickerOpen(false)}><Text style={styles.dialogActionBtnText}>OK</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

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
  modalBottomDateTimePickerStrip: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#555', paddingTop: 14, paddingHorizontal: 4 },
  statusStripTextLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  
  // Account Bottom Sheet Modal UI Styling Elements (`image_3f467f.jpg`)
  bottomSheetModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheetCardContainer: { backgroundColor: COLORS.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: Platform.OS === 'ios' ? 24 : 14 },
  sheetHeaderTitleLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  sheetSelectionRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#444' },
  sheetSelectionRowItemActive: { backgroundColor: '#4F4F4F', borderRadius: 8, paddingHorizontal: 6 },
  sheetCircleIconAvatar: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#2E2E2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sheetItemNodeTextName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  sheetItemRightBalanceAmt: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  sheetBottomActionButtonBlock: { marginTop: 14, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, alignItems: 'center' },
  sheetBottomActionBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  sheetCloseCancelTextBtn: { marginTop: 12, paddingVertical: 8 },

  // Category Fullscreen Grid Pop-up UI Styling Elements (`image_3f467c.jpg`)
  fullscreenPopupModalBackdrop: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  fullscreenPopupHeaderTitleLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center', marginVertical: 14 },
  fullscreenGridScrollContainerLayout: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingBottom: 24 },
  gridCategoryCircleCellNode: { width: '25%', alignItems: 'center', marginVertical: 12 },
  gridCategoryCircleCellNodeActive: { opacity: 0.5 },
  gridCategoryIconSphereAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#4F4F4F', alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 1, borderColor: '#555' },
  gridCategoryLabelStringText: { color: '#FFF', fontSize: 11, fontWeight: '600', width: '90%', textAlign: 'center' },
  fullscreenPopupDismissFooterBtn: { padding: 14, backgroundColor: '#2E2E2E', borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#444' },
  fullscreenPopupDismissFooterBtnText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },

  // Calendar Picker Styling Node Elements
  pickerBackdropCenteredBlur: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialogActionsBarFooterRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12 },
  dialogActionBtn: { paddingHorizontal: 16, paddingVertical: 10, marginLeft: 8 },
  dialogActionBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  calendarDialogContainerBox: { width: '100%', maxWidth: 310, backgroundColor: '#3E3E3E', borderRadius: 8, overflow: 'hidden' },
  calendarTopHeaderBand: { backgroundColor: '#525252', padding: 16 },
  calendarHeaderYearText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  calendarHeaderDateText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 4 },
  calendarBodyGridPanel: { padding: 12 },
  calendarMonthNavigationStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerNavArrow: { color: '#FFF', fontSize: 18, fontWeight: '700', paddingHorizontal: 10 },
  pickerMonthLabelTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  calendarWeekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekLetterLabel: { color: COLORS.textSecondary, fontSize: 11, width: 34, textAlign: 'center', fontWeight: '600' },
  calendarDaysGridWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarDayCellNode: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', margin: 2 },
  calendarDayCellNodeActive: { backgroundColor: COLORS.primary },
  calendarDayCellText: { color: '#FFF', fontSize: 12 },

  // Clock Picker Styling Node Elements
  clockDialogContainerBox: { width: '100%', maxWidth: 280, backgroundColor: '#3E3E3E', borderRadius: 8, overflow: 'hidden' },
  clockTopDisplayHeader: { backgroundColor: '#525252', padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  clockHeaderDigitsText: { color: COLORS.textPrimary, fontSize: 36, fontWeight: '400', marginRight: 12 },
  clockAmPmFlexToggleColumn: { justifyContent: 'space-between', height: 40 },
  ampmToggleText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  ampmToggleTextActive: { color: COLORS.textPrimary },
  clockDialFaceVisualBlock: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  outerClockWheelCircleCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#484848', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  centerClockPivotPinPin: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, position: 'absolute' },
  clockHourDigitCellNode: { position: 'absolute', width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clockHourDigitTextText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  clockDigitActiveText: { color: '#000', backgroundColor: COLORS.primary, borderRadius: 12, width: 24, height: 24, textAlign: 'center', paddingVertical: 3, overflow: 'hidden', fontWeight: '700' }
});