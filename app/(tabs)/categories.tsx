import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Platform } from 'react-native';
import { COLORS } from '../../src/constants/colors';
import { db } from '../../src/config/db';
import { useIsFocused } from '@react-navigation/native';

export default function CategoriesHubScreen() {
  const isFocused = useIsFocused();
  const [newCatName, setNewCatName] = useState('');
  const [typeToggle, setTypeToggle] = useState<'gastos' | 'income'>('gastos');
  const [categoriesListPool, setCategoriesListPool] = useState<any[]>([]);

  const fetchActivePool = async () => {
    const data = await db.query("SELECT * FROM custom_categories WHERE type = $1 ORDER BY name ASC", [typeToggle]);
    if (data) setCategoriesListPool(data);
  };

  useEffect(() => { if (isFocused) fetchActivePool(); }, [isFocused, typeToggle]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.innerContentWrapper}>
        <Text style={styles.appTitleHeaderLabel}>Gastos Tracker ni Vishe ug Clark</Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.toggleStrip}>
            <TouchableOpacity style={[styles.toggleBtn, typeToggle === 'gastos' && { backgroundColor: COLORS.danger }]} onPress={() => setTypeToggle('gastos')}><Text style={[styles.toggleText, typeToggle === 'gastos' && { color: '#FFF' }]}>Expense Pool</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, typeToggle === 'income' && { backgroundColor: COLORS.success }]} onPress={() => setTypeToggle('income')}><Text style={[styles.toggleText, typeToggle === 'income' && { color: '#FFF' }]}>Income Pool</Text></TouchableOpacity>
          </View>

          <View style={styles.inputCard}>
            <TextInput style={styles.textInput} placeholder="Assign new operational pool node name..." placeholderTextColor="#777" value={newCatName} onChangeText={setNewCatName} />
            <TouchableOpacity style={styles.submitAction} onPress={async () => {
              if (!newCatName.trim()) return;
              await db.query("INSERT INTO custom_categories (name, type) VALUES ($1, $2) ON CONFLICT DO NOTHING", [newCatName.trim(), typeToggle]);
              setNewCatName(''); fetchActivePool();
            }}><Text style={styles.submitActionText}>Add Node Context</Text></TouchableOpacity>
          </View>

          <Text style={styles.poolTitle}>{typeToggle === 'gastos' ? 'Active Expense Categories' : 'Active Income Categories'}</Text>
          <View style={styles.collectionPanel}>
            {categoriesListPool.map((item: any, idx: number) => (
              <View key={idx} style={[styles.rowLineItem, idx === categoriesListPool.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.leftLabelContainer}><View style={styles.bulletPoint} /><Text style={styles.categoryTitleLabelName}>{item.name}</Text></View>
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
  toggleStrip: { flexDirection: 'row', backgroundColor: '#2E2E2E', borderRadius: 10, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  inputCard: { backgroundColor: COLORS.card, padding: 12, borderRadius: 14, marginBottom: 16 },
  textInput: { backgroundColor: '#2E2E2E', borderRadius: 8, padding: 12, color: '#FFF', fontSize: 14, marginBottom: 12 },
  submitAction: { backgroundColor: COLORS.textPrimary, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitActionText: { color: '#000', fontSize: 13, fontWeight: '700' },
  poolTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  collectionPanel: { backgroundColor: '#2E2E2E', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 20 },
  rowLineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#444' },
  leftLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  bulletPoint: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 12 },
  categoryTitleLabelName: { color: '#FFF', fontSize: 15, fontWeight: '600' }
});