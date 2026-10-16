import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Share,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { theme } from '../styles/theme';
import {
  getSetting,
  setSetting,
  listAllReadings,
  listAllMeals,
  deleteAllUserData,
  seed25DaysData,
} from '../db';
import { TabBarScrollContext } from '../context/TabBarScrollContext';
import DevTimestampTestScreen from './DevTimestampTestScreen';

export default function SettingsScreen() {
  const { onScroll } = useContext(TabBarScrollContext);
  const [showDevTest, setShowDevTest] = useState(false);

  // Preferences State
  const [glucoseUnit, setGlucoseUnit] = useState('mg/dL');
  const [targetLow, setTargetLow] = useState('70');
  const [targetHigh, setTargetHigh] = useState('140');
  const [targetSavedMsg, setTargetSavedMsg] = useState(false);

  // AI State
  const [photoAiEnabled, setPhotoAiEnabled] = useState(true);

  // Delete Dialog State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const unit = await getSetting('glucose_unit', 'mg/dL');
      const low = await getSetting('target_low', '70');
      const high = await getSetting('target_high', '140');
      const ai = await getSetting('photo_ai_enabled', true);

      setGlucoseUnit(unit || 'mg/dL');
      setTargetLow(String(low || '70'));
      setTargetHigh(String(high || '140'));
      setPhotoAiEnabled(ai !== false);
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  };

  const handleUnitChange = async (newUnit) => {
    setGlucoseUnit(newUnit);
    try {
      await setSetting('glucose_unit', newUnit);
    } catch (err) {
      console.warn('Failed to save glucose_unit:', err);
    }
  };

  const handleSaveTargets = async () => {
    const lowNum = parseInt(targetLow, 10);
    const highNum = parseInt(targetHigh, 10);

    if (isNaN(lowNum) || isNaN(highNum) || lowNum <= 0 || highNum <= lowNum) {
      Alert.alert(
        'Invalid Range',
        'Please enter a valid numeric target range (e.g. 70 to 140).'
      );
      return;
    }

    try {
      await setSetting('target_low', String(lowNum));
      await setSetting('target_high', String(highNum));
      setTargetSavedMsg(true);
      setTimeout(() => setTargetSavedMsg(false), 2000);
    } catch (err) {
      Alert.alert('Error', `Could not save target range: ${err.message}`);
    }
  };

  const handleToggleAi = async (value) => {
    setPhotoAiEnabled(value);
    try {
      await setSetting('photo_ai_enabled', value);
    } catch (err) {
      console.warn('Failed to save photo_ai_enabled:', err);
    }
  };

  const handleExportData = async () => {
    try {
      const [readings, meals] = await Promise.all([
        listAllReadings(),
        listAllMeals(),
      ]);

      const payload = {
        app: 'PlateLine',
        version: '0.1',
        exportedAt: new Date().toISOString(),
        settings: {
          glucoseUnit,
          targetLow,
          targetHigh,
          photoAiEnabled,
        },
        readingsCount: readings.length,
        mealsCount: meals.length,
        readings,
        meals,
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const filename = `PlateLine_Export_${Date.now()}.json`;

      let shared = false;
      try {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (cacheDir) {
          const fileUri = `${cacheDir}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
            encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Save PlateLine JSON Export',
            });
            shared = true;
          }
        }
      } catch (fileErr) {
        console.warn('FileSystem export failed, falling back to Share.share:', fileErr);
      }

      if (!shared) {
        await Share.share({
          title: filename,
          message: jsonStr,
        });
      }
    } catch (err) {
      Alert.alert('Export Failed', `Could not export data: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteInputText.trim() !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE in all caps to confirm.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllUserData();
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteInputText('');
      Alert.alert('Data Erased', 'All readings and meal records have been wiped from this device.');
    } catch (err) {
      setIsDeleting(false);
      Alert.alert('Deletion Error', `Could not wipe data: ${err.message}`);
    }
  };

  if (showDevTest) {
    return <DevTimestampTestScreen onBack={() => setShowDevTest(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Preferences, local data & privacy controls
          </Text>
        </View>

        {/* ============================================================ */}
        {/* 1. PREFERENCES GROUP */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
        </View>
        <View style={styles.groupCard}>
          {/* Row: Glucose Unit Segmented */}
          <View style={styles.row}>
            <View style={styles.rowLabelColumn}>
              <Text style={styles.rowLabel}>Glucose Unit</Text>
              <Text style={styles.rowSubLabel}>Applies across charts & stat tiles</Text>
            </View>
            <View style={styles.unitSegmentContainer}>
              <TouchableOpacity
                style={[
                  styles.unitSegmentBtn,
                  glucoseUnit === 'mg/dL' && styles.unitSegmentBtnActive,
                ]}
                onPress={() => handleUnitChange('mg/dL')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.unitSegmentText,
                    glucoseUnit === 'mg/dL' && styles.unitSegmentTextActive,
                  ]}
                >
                  mg/dL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitSegmentBtn,
                  glucoseUnit === 'mmol/L' && styles.unitSegmentBtnActive,
                ]}
                onPress={() => handleUnitChange('mmol/L')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.unitSegmentText,
                    glucoseUnit === 'mmol/L' && styles.unitSegmentTextActive,
                  ]}
                >
                  mmol/L
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.hairlineDivider} />

          {/* Row: Target Range (Low/High numeric inputs) */}
          <View style={styles.rowVertical}>
            <View style={styles.targetLabelRow}>
              <View>
                <Text style={styles.rowLabel}>Target Band Range</Text>
                <Text style={styles.rowSubLabel}>
                  Used for chart guide band ({glucoseUnit})
                </Text>
              </View>
              {targetSavedMsg && (
                <View style={styles.savedPill}>
                  <Ionicons name="checkmark" size={12} color={theme.colors.olive} />
                  <Text style={styles.savedPillText}>Saved</Text>
                </View>
              )}
            </View>

            <View style={styles.targetInputsRow}>
              <View style={styles.targetInputWrapper}>
                <Text style={styles.targetInputPrefix}>Low</Text>
                <TextInput
                  style={styles.targetInputField}
                  value={targetLow}
                  onChangeText={setTargetLow}
                  keyboardType="numeric"
                  placeholder="70"
                  placeholderTextColor={theme.colors.taupe}
                />
              </View>
              <Text style={styles.targetDash}>–</Text>
              <View style={styles.targetInputWrapper}>
                <Text style={styles.targetInputPrefix}>High</Text>
                <TextInput
                  style={styles.targetInputField}
                  value={targetHigh}
                  onChangeText={setTargetHigh}
                  keyboardType="numeric"
                  placeholder="140"
                  placeholderTextColor={theme.colors.taupe}
                />
              </View>
              <TouchableOpacity
                style={styles.saveTargetBtn}
                onPress={handleSaveTargets}
                activeOpacity={0.8}
              >
                <Text style={styles.saveTargetBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. AI GROUP */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>AI</Text>
        </View>
        <View style={styles.groupCard}>
          <View style={styles.row}>
            <View style={styles.rowLabelColumn}>
              <Text style={[styles.rowLabel, { opacity: 0.75 }]}>AI Camera (Photo Meal Analysis)</Text>
              <Text style={styles.rowSubLabel}>Automatic meal identification via camera</Text>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{
                false: theme.colors.surfaceSubtle,
                true: theme.colors.ochre,
              }}
              thumbColor={theme.colors.taupe}
            />
          </View>
          <View style={styles.hairlineDivider} />
          <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 13, color: theme.colors.deepRust, fontStyle: 'italic', fontWeight: '500' }}>
              The option is not available for this version.
            </Text>
          </View>
        </View>


        {/* ============================================================ */}
        {/* 3. DATA GROUP */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>DATA</Text>
        </View>
        <View style={styles.groupCard}>
          {/* Row: Seed 25-Day Indian Cuisine Demo Data */}
          <TouchableOpacity
            style={styles.rowActionable}
            onPress={() => {
              Alert.alert(
                'Load 25-Day Demo Data',
                'This will populate 25 days of Indian cuisine meals (Idli, Thali, Khichdi, etc.), glucose readings, and medication tracking for testing all app features.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Load Demo Data',
                    onPress: async () => {
                      try {
                        const res = await seed25DaysData(true);
                        Alert.alert('Demo Data Loaded', `Successfully loaded ${res.days} days of Indian cuisine meals and glucose logs! Check the Home chart, Timeline, and Clinician Report.`);
                      } catch (err) {
                        Alert.alert('Seeding Error', err.message);
                      }
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Load 25-Day Demo Data"
          >
            <View style={styles.rowLeftGroup}>
              <View style={[styles.rowIconCircle, { backgroundColor: 'rgba(217, 164, 65, 0.15)' }]}>
                <Ionicons
                  name="restaurant-outline"
                  size={18}
                  color={theme.colors.ochre}
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>Load 25-Day Demo Data</Text>
                <Text style={styles.rowSubLabel}>Indian cuisine meals & 25 days of readings</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.taupe}
            />
          </TouchableOpacity>

          <View style={styles.hairlineDivider} />

          {/* Row: Export all data (JSON) */}
          <TouchableOpacity
            style={styles.rowActionable}
            onPress={handleExportData}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Export all data as JSON"
          >
            <View style={styles.rowLeftGroup}>
              <View style={styles.rowIconCircle}>
                <Ionicons
                  name="share-outline"
                  size={18}
                  color={theme.colors.terracotta}
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>Export all data (JSON)</Text>
                <Text style={styles.rowSubLabel}>Share sheet with complete journal history</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.taupe}
            />
          </TouchableOpacity>

          <View style={styles.hairlineDivider} />


          {/* Row: Delete all data */}
          <TouchableOpacity
            style={styles.rowActionable}
            onPress={() => {
              setDeleteInputText('');
              setShowDeleteModal(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Delete all data"
          >
            <View style={styles.rowLeftGroup}>
              <View
                style={[
                  styles.rowIconCircle,
                  { backgroundColor: 'rgba(158, 61, 42, 0.12)' },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.deepRust}
                />
              </View>
              <View>
                <Text
                  style={[styles.rowLabel, { color: theme.colors.deepRust }]}
                >
                  Delete all data
                </Text>
                <Text style={styles.rowSubLabel}>
                  Permanently wipe all records from this device
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.deepRust}
            />
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 4. ABOUT GROUP */}
        {/* ============================================================ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
        </View>
        <View style={styles.groupCard}>
          {/* Version row */}
          <View style={styles.row}>
            <View style={styles.rowLeftGroup}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.aboutLogoIcon}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.rowLabel}>PlateLine v0.1 — offline, on-device</Text>
                <Text style={styles.rowSubLabel}>Local SQLite database sandbox</Text>
              </View>
            </View>
          </View>

          <View style={styles.hairlineDivider} />

          {/* Verification runner row */}
          <TouchableOpacity
            style={styles.rowActionable}
            onPress={() => setShowDevTest(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              <View style={styles.rowIconCircle}>
                <Ionicons
                  name="flask-outline"
                  size={18}
                  color={theme.colors.taupe}
                />
              </View>
              <View>
                <Text style={styles.rowLabel}>Timestamp Stability Test (M2)</Text>
                <Text style={styles.rowSubLabel}>Verifies Hard Rule 6 persistence</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.taupe}
            />
          </TouchableOpacity>
        </View>

        {/* Verbatim Disclaimer Caption */}
        <Text style={styles.disclaimerCaption}>
          PlateLine is a personal journal. It does not give medical advice. Always consult your doctor.
        </Text>
      </ScrollView>

      {/* ============================================================ */}
      {/* TYPED CONFIRMATION MODAL ("type DELETE") */}
      {/* ============================================================ */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={theme.colors.deepRust}
              />
            </View>
            <Text style={styles.modalTitle}>Delete All Data?</Text>
            <Text style={styles.modalDescription}>
              This will permanently erase all glucose readings, meal logs, and settings from your device. This cannot be undone.
            </Text>

            <View style={styles.inputPromptWrapper}>
              <Text style={styles.inputPromptText}>
                Type <Text style={styles.inputPromptBold}>DELETE</Text> to confirm:
              </Text>
              <TextInput
                style={styles.deleteInput}
                value={deleteInputText}
                onChangeText={setDeleteInputText}
                placeholder="DELETE"
                placeholderTextColor={theme.colors.taupe}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  deleteInputText.trim() !== 'DELETE' && styles.modalConfirmBtnDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteInputText.trim() !== 'DELETE' || isDeleting}
                activeOpacity={0.85}
              >
                <Text style={styles.modalConfirmText}>
                  {isDeleting ? 'Deleting...' : 'Delete Everything'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: theme.spacing.screenPadding, // 20px
    paddingBottom: 90,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: theme.typography.title.fontSize, // 28
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.ink,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  // Section Headers: Terracotta in small caps
  sectionHeaderRow: {
    marginTop: 18, // >= 16px section spacing
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.terracotta, // #C1553B
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Sand groups on cream
  groupCard: {
    backgroundColor: theme.colors.sand, // #FBF6EA
    borderRadius: theme.radius.cards, // 18px
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: 8,
    ...theme.shadow.warm,
  },
  // Rows: 48px min height
  row: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowActionable: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowVertical: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLogoIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  rowLabelColumn: {
    flex: 1,
    paddingRight: 10,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  rowSubLabel: {
    fontSize: 12,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  captionText: {
    fontSize: 12,
    color: theme.colors.taupe,
    marginTop: 4,
    lineHeight: 17,
  },
  // Hairline dividers in olive tint at 30% opacity
  hairlineDivider: {
    height: 1,
    backgroundColor: 'rgba(138, 139, 108, 0.30)',
    marginLeft: 16,
  },
  // Unit Segmented Control
  unitSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  unitSegmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  unitSegmentBtnActive: {
    backgroundColor: theme.colors.terracotta,
  },
  unitSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  unitSegmentTextActive: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  // Target Range Row
  targetLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(138, 139, 108, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  savedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.olive,
  },
  targetInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 10,
  },
  targetInputPrefix: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.taupe,
    marginRight: 6,
  },
  targetInputField: {
    flex: 1,
    height: 40,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  targetDash: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.taupe,
  },
  saveTargetBtn: {
    backgroundColor: theme.colors.ochre,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTargetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  // Disclaimer Caption
  disclaimerCaption: {
    fontSize: 13,
    color: theme.colors.taupe,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  // Delete Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.modalBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.sand,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(158, 61, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.deepRust,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: theme.colors.ink,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  inputPromptWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  inputPromptText: {
    fontSize: 13,
    color: theme.colors.taupe,
    marginBottom: 6,
    textAlign: 'center',
  },
  inputPromptBold: {
    fontWeight: '700',
    color: theme.colors.deepRust,
  },
  deleteInput: {
    width: '100%',
    height: 46,
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.deepRust,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.deepRust,
    letterSpacing: 2,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cream,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: theme.colors.deepRust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnDisabled: {
    opacity: 0.4,
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.cream,
  },
});
