import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import {
  createReading,
  updateReading,
  deleteReading,
  listAllReadings,
  listAllMeals,
  updateMeal,
  deleteMeal,
} from '../db';
import { nowLocalMinute, formatDisplay, isStableLocalString } from '../lib/time';
import MealLogScreen from './MealLogScreen';
import EntryPreviewModal from '../components/EntryPreviewModal';

const CONTEXT_OPTIONS = [
  'Fasting',
  'Before meal',
  'After meal',
  'Other',
  'Prefer not to specify',
];

export default function AddScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('quickReading'); // 'quickReading' | 'mealLog'

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [glucoseValue, setGlucoseValue] = useState('');
  const [recordedAt, setRecordedAt] = useState(nowLocalMinute());
  const [context, setContext] = useState(null);
  const [medicine, setMedicine] = useState('');
  const [notes, setNotes] = useState('');

  // UI State
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [recentReadings, setRecentReadings] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus tracking for input borders (amber -> ochre on focus)
  const [focusedInput, setFocusedInput] = useState(null);

  // Preview / Edit-Note Modal State
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalNotes, setModalNotes] = useState('');
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  useEffect(() => {
    loadRecentData();
  }, [activeTab]);

  const loadRecentData = async () => {
    try {
      const readings = await listAllReadings();
      setRecentReadings(readings || []);
      const meals = await listAllMeals();
      setRecentMeals(meals || []);
    } catch (err) {
      console.warn('Error loading recent data:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setGlucoseValue('');
    setRecordedAt(nowLocalMinute());
    setContext(null);
    setMedicine('');
    setNotes('');
    setErrorMessage('');
  };

  const handleContextSelect = (option) => {
    if (option === 'Prefer not to specify') {
      setContext(null);
    } else if (context === option) {
      setContext(null);
    } else {
      setContext(option);
    }
  };

  const validateGlucose = (val) => {
    if (!val || val.trim() === '') {
      return 'Please enter your glucose reading.';
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      return 'Please enter a valid numeric value.';
    }
    if (num < 20 || num > 600) {
      return 'Please enter a realistic glucose value between 20 and 600 mg/dL.';
    }
    return '';
  };

  const handleSave = async () => {
    setErrorMessage('');
    setFeedbackMessage('');

    const validationErr = validateGlucose(glucoseValue);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    let finalTimestamp = recordedAt.trim();
    if (!isStableLocalString(finalTimestamp)) {
      finalTimestamp = nowLocalMinute();
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateReading(editingId, {
          value: parseFloat(glucoseValue),
          recordedAt: finalTimestamp,
          context: context,
          notes: notes.trim() || null,
        });
        setFeedbackMessage('✓ Reading updated in on-device SQLite');
      } else {
        await createReading({
          value: parseFloat(glucoseValue),
          unit: 'mg/dL',
          recordedAt: finalTimestamp,
          context: context,
          notes: [medicine.trim() ? `Med: ${medicine.trim()}` : null, notes.trim()]
            .filter(Boolean)
            .join(' | ') || null,
        });
        setFeedbackMessage('✓ Reading saved to on-device SQLite');
      }

      resetForm();
      await loadRecentData();
    } catch (err) {
      setErrorMessage(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPreview = (item, type) => {
    setSelectedEntry({ ...item, entryType: type });
    setModalNotes(item.notes || item.note || '');
  };

  const handleClosePreview = () => {
    setSelectedEntry(null);
    setModalNotes('');
  };

  const handleSaveModalNotes = async () => {
    if (!selectedEntry) return;
    try {
      if (selectedEntry.entryType === 'reading') {
        await updateReading(selectedEntry.id, {
          notes: modalNotes.trim() || null,
        });
      }
      setFeedbackMessage('✓ Notes updated');
      handleClosePreview();
      await loadRecentData();
    } catch (err) {
      Alert.alert('Error', `Could not update notes: ${err.message}`);
    }
  };

  const handleDeleteEntry = (item) => {
    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete this record?\nThis will remove it from your device permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReading(item.id);
              if (editingId === item.id) resetForm();
              if (selectedEntry?.id === item.id) handleClosePreview();
              setFeedbackMessage('✓ Entry deleted');
              await loadRecentData();
            } catch (err) {
              setErrorMessage(`Failed to delete: ${err.message}`);
            }
          },
        },
      ]
    );
  };

  // If user selected Meal Log mode, display full MealLogScreen
  if (activeTab === 'mealLog') {
    return (
      <MealLogScreen
        navigation={navigation}
        onBack={() => {
          setActiveTab('quickReading');
          loadRecentData();
        }}
      />
    );
  }

  // Combine readings and meals for entry tiles
  const allEntries = [
    ...recentReadings.map((r) => ({
      id: r.id,
      type: 'reading',
      value: `${r.value} ${r.unit}`,
      time: r.recordedAt,
      context: r.context,
      notes: r.notes,
      raw: r,
    })),
    ...recentMeals.map((m) => ({
      id: m.id,
      type: 'meal',
      value: m.meal_type || 'Meal',
      time: m.created_at || m.recordedAt,
      context: m.description,
      notes: m.note,
      raw: m,
    })),
  ].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section: Entry Tile Grid + "+" Tile */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Recent Entries</Text>
              <Text style={styles.captionText}>Tap tile to preview & edit</Text>
            </View>

            <View style={styles.tileGrid}>
              {/* The Big "+" Tile */}
              <TouchableOpacity
                style={styles.addTile}
                onPress={() => setShowNewEntryModal(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="New entry"
              >
                <Ionicons name="add" size={28} color={theme.colors.cream} />
                <Text style={styles.addTileText}>New Entry</Text>
              </TouchableOpacity>

              {/* Previous Entry Tiles (2-col grid, sand fill, >=64px tall) */}
              {allEntries.slice(0, 5).map((entry) => {
                const isReading = entry.type === 'reading';
                const hasMedicine =
                  entry.notes && entry.notes.toLowerCase().includes('med');

                return (
                  <TouchableOpacity
                    key={`${entry.type}-${entry.id}`}
                    style={styles.entryTile}
                    onPress={() => handleOpenPreview(entry.raw, entry.type)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.tileTopRow}>
                      <View
                        style={[
                          styles.entryChip,
                          isReading
                            ? styles.readingChip
                            : styles.mealChip,
                        ]}
                      >
                        <Text style={styles.entryChipText}>
                          {isReading ? 'Reading' : entry.value}
                        </Text>
                      </View>
                      {hasMedicine && (
                        <View style={styles.medicineMarker}>
                          <Ionicons
                            name="medical-outline"
                            size={12}
                            color={theme.colors.sand}
                          />
                        </View>
                      )}
                    </View>
                    <Text style={styles.tileValue} numberOfLines={1}>
                      {isReading ? entry.value : entry.context || 'Home meal'}
                    </Text>
                    <Text style={styles.tileTime}>
                      {formatDisplay(entry.time)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Mode Switcher Segmented Control: Quick Reading vs Meal Log */}
          <View style={styles.modeSwitcherContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                activeTab === 'quickReading' && styles.modeButtonActive,
              ]}
              onPress={() => setActiveTab('quickReading')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={
                  activeTab === 'quickReading'
                    ? theme.colors.cream
                    : theme.colors.taupe
                }
              />
              <Text
                style={[
                  styles.modeButtonText,
                  activeTab === 'quickReading' && styles.modeButtonTextActive,
                ]}
              >
                Quick Reading
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                activeTab === 'mealLog' && styles.modeButtonActive,
              ]}
              onPress={() => setActiveTab('mealLog')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="restaurant-outline"
                size={18}
                color={
                  activeTab === 'mealLog'
                    ? theme.colors.cream
                    : theme.colors.taupe
                }
              />
              <Text
                style={[
                  styles.modeButtonText,
                  activeTab === 'mealLog' && styles.modeButtonTextActive,
                ]}
              >
                Meal Log
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Reading Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>
                {editingId ? 'Edit Glucose Reading' : 'Quick Reading (<20s)'}
              </Text>
              {editingId && (
                <TouchableOpacity
                  onPress={resetForm}
                  style={styles.cancelEditButton}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Olive-tinted Toast/Banner with Ink Text */}
            {feedbackMessage ? (
              <View style={styles.toastBanner}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={theme.colors.olive}
                />
                <Text style={styles.toastBannerText}>{feedbackMessage}</Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.colors.deepRust}
                />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. Glucose Value Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Glucose Value <Text style={styles.unitInline}>(mg/dL) *</Text>
              </Text>
              <View style={styles.valueRow}>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.valueInputField,
                    focusedInput === 'glucose' && styles.inputFocused,
                  ]}
                  placeholder="e.g. 132"
                  placeholderTextColor={theme.colors.taupe}
                  keyboardType="numeric"
                  value={glucoseValue}
                  onFocus={() => setFocusedInput('glucose')}
                  onBlur={() => setFocusedInput(null)}
                  onChangeText={(val) => {
                    setGlucoseValue(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  accessibilityLabel="Glucose value"
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>mg/dL</Text>
                </View>
              </View>
            </View>

            {/* 2. Date & Time (Local) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelActionRow}>
                <Text style={styles.inputLabel}>Date & Time (Local)</Text>
                <TouchableOpacity
                  onPress={() => setRecordedAt(nowLocalMinute())}
                  style={styles.setNowButton}
                >
                  <Ionicons name="time-outline" size={14} color={theme.colors.terracotta} />
                  <Text style={styles.setNowText}>Set to Now</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.inputField,
                  focusedInput === 'time' && styles.inputFocused,
                ]}
                placeholder="YYYY-MM-DDTHH:mm"
                placeholderTextColor={theme.colors.taupe}
                value={recordedAt}
                onFocus={() => setFocusedInput('time')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setRecordedAt}
              />
              <Text style={styles.helperCaption}>
                Stored in local time. Zero UTC conversion.
              </Text>
            </View>

            {/* 3. Reading Context Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reading Context (Optional)</Text>
              <Text style={styles.helperCaption}>
                Context is never inferred. Saved as null if unspecified.
              </Text>
              <View style={styles.chipsContainer}>
                {CONTEXT_OPTIONS.map((option) => {
                  const isSelected =
                    option === 'Prefer not to specify'
                      ? context === null
                      : context === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.contextChip,
                        isSelected && styles.contextChipSelected,
                      ]}
                      onPress={() => handleContextSelect(option)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.contextChipText,
                          isSelected && styles.contextChipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Medicine (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Medicine (Optional)</Text>
              <TextInput
                style={[
                  styles.inputField,
                  focusedInput === 'medicine' && styles.inputFocused,
                ]}
                placeholder="e.g. Metformin 500mg, Regular insulin"
                placeholderTextColor={theme.colors.taupe}
                value={medicine}
                onFocus={() => setFocusedInput('medicine')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setMedicine}
              />
              <Text style={styles.helperCaption}>
                Journal only — PlateLine never suggests doses.
              </Text>
            </View>

            {/* 5. Notes (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[
                  styles.inputField,
                  styles.notesInput,
                  focusedInput === 'notes' && styles.inputFocused,
                ]}
                placeholder="e.g. 15 min after meal, walked around the block"
                placeholderTextColor={theme.colors.taupe}
                multiline
                numberOfLines={3}
                value={notes}
                onFocus={() => setFocusedInput('notes')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setNotes}
              />
            </View>

            {/* Primary Submit Button: Terracotta fill, cream bold text, soft ochre-tinted glow shadow */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isSubmitting && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save reading"
            >
              <Ionicons
                name={editingId ? 'checkmark-circle' : 'add-circle'}
                size={20}
                color={theme.colors.cream}
              />
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? 'Saving...'
                  : editingId
                  ? 'Update Reading'
                  : 'Save Reading'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* NEW ENTRY MODAL ("+" tile trigger) */}
      <Modal
        visible={showNewEntryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewEntryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.newEntryModalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Choose Entry Type</Text>
              <TouchableOpacity
                onPress={() => setShowNewEntryModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color={theme.colors.ink} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalOptionCard}
              onPress={() => {
                setShowNewEntryModal(false);
                setActiveTab('quickReading');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: theme.colors.readingChipBg }]}>
                <Ionicons name="speedometer-outline" size={24} color={theme.colors.terracotta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Quick Reading</Text>
                <Text style={styles.modalOptionSubtitle}>
                  Log glucose number, time, context & medicine in &lt;20 seconds
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOptionCard}
              onPress={() => {
                setShowNewEntryModal(false);
                setActiveTab('mealLog');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: theme.colors.mealChipBg }]}>
                <Ionicons name="restaurant-outline" size={24} color={theme.colors.terracotta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Meal Log</Text>
                <Text style={styles.modalOptionSubtitle}>
                  Log meal type, food description, carbs & optional photo
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PREVIEW / EDIT-NOTE MODAL (Shared EntryPreviewModal) */}
      <EntryPreviewModal
        visible={!!selectedEntry}
        entry={selectedEntry}
        onClose={handleClosePreview}
        onSaveNotes={async (entry, newNotes) => {
          if (entry.entryType === 'reading') {
            await updateReading(entry.id, { notes: newNotes || null });
          } else {
            await updateMeal(entry.id, { note: newNotes || null });
          }
          setFeedbackMessage('✓ Notes updated');
          await loadRecentData();
        }}
        onDelete={async (entry) => {
          if (entry.entryType === 'reading') {
            await deleteReading(entry.id);
          } else {
            await deleteMeal(entry.id);
          }
          if (editingId === entry.id) resetForm();
          setFeedbackMessage('✓ Entry deleted');
          await loadRecentData();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: theme.spacing.screenPadding, // 20px screen padding
    paddingBottom: 40,
  },
  section: {
    marginBottom: theme.spacing.sectionGap, // 16px between sections
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: theme.typography.sectionHeader.fontSize,
    fontWeight: theme.typography.sectionHeader.fontWeight,
    color: theme.colors.ink,
  },
  captionText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
  },
  // 2-col Entry Tiles Grid with 12px gaps
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.listGap, // 12px gaps
  },
  // "+" Tile (terracotta fill, cream "+", >=64px tall, 20px radius)
  addTile: {
    width: '48%',
    minHeight: 68, // >=64px tall
    borderRadius: theme.radius.tiles, // 20px radius
    backgroundColor: theme.colors.terracotta, // #C1553B
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    ...theme.shadow.ochreGlow,
  },
  addTileText: {
    color: theme.colors.cream,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  // Entry Tiles (sand fill, >=64px tall, 20px radius, warm shadow)
  entryTile: {
    width: '48%',
    minHeight: 68,
    borderRadius: theme.radius.tiles, // 20px radius
    backgroundColor: theme.colors.sand, // #FBF6EA
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 10,
    justifyContent: 'space-between',
    ...theme.shadow.warm,
  },
  tileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  entryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  readingChip: {
    backgroundColor: theme.colors.readingChipBg, // #F7E7C8
  },
  mealChip: {
    backgroundColor: theme.colors.mealChipBg, // #F5DED5
  },
  entryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  medicineMarker: {
    backgroundColor: theme.colors.medicineMarker, // #C98F7E
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  tileTime: {
    fontSize: 11,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  // Segmented control (sand fill, selected segment terracotta)
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.sand,
    borderRadius: theme.radius.buttons,
    padding: 4,
    marginBottom: theme.spacing.sectionGap,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.spacing.touchTargetMin,
    borderRadius: 14,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.terracotta,
  },
  modeButtonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  modeButtonTextActive: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  // Form Card (sand fill, 18px radius, warm shadow)
  formCard: {
    backgroundColor: theme.colors.sand, // #FBF6EA
    borderRadius: theme.radius.cards, // 18px radius
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
    marginBottom: theme.spacing.sectionGap,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  formTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  cancelEditButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelEditText: {
    color: theme.colors.terracotta,
    fontSize: 14,
    fontWeight: '600',
  },
  // Toasts / Banners (olive-tinted success with ink text)
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 139, 108, 0.18)',
    borderWidth: 1,
    borderColor: theme.colors.olive,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  toastBannerText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(158, 61, 42, 0.14)',
    borderWidth: 1,
    borderColor: theme.colors.deepRust,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    color: theme.colors.deepRust,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: 6,
  },
  unitInline: {
    color: theme.colors.taupe,
    fontWeight: '400',
  },
  helperCaption: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
    marginTop: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Inputs: sand fill, 1px olive border, amber->ochre on focus
  inputField: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border, // 1px olive border
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.ink,
    minHeight: theme.spacing.touchTargetMin,
  },
  inputFocused: {
    borderColor: theme.colors.ochre, // Amber->ochre on focus
    borderWidth: 1.5,
  },
  valueInputField: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  unitBadge: {
    marginLeft: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  unitBadgeText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  labelActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  setNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  setNowText: {
    color: theme.colors.terracotta,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  // Chips (chips 22 radius, sand fill, selected terracotta)
  contextChip: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.chips, // 22px
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextChipSelected: {
    backgroundColor: theme.colors.terracotta,
    borderColor: theme.colors.deepRust,
  },
  contextChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.ink,
  },
  contextChipTextSelected: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  // Primary Button: Terracotta fill, cream bold text, soft ochre-tinted glow shadow, pressed deepRust
  primaryButton: {
    backgroundColor: theme.colors.terracotta,
    borderRadius: theme.radius.buttons, // 18px
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
    ...theme.shadow.ochreGlow,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.deepRust,
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.cream,
  },
  // Modals (modals 20 top corners, sand fill, warm shadow)
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.modalBackdrop, // Plum-tinted 40% backdrop
    justifyContent: 'flex-end',
  },
  newEntryModalContent: {
    backgroundColor: theme.colors.sand,
    borderTopLeftRadius: theme.radius.modals, // 20px
    borderTopRightRadius: theme.radius.modals,
    padding: 24,
    paddingBottom: 36,
    ...theme.shadow.warm,
  },
  previewModalContent: {
    backgroundColor: theme.colors.sand,
    borderTopLeftRadius: theme.radius.modals, // 20px
    borderTopRightRadius: theme.radius.modals,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '80%',
    ...theme.shadow.warm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  modalCloseButton: {
    padding: 6,
  },
  modalOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 14,
  },
  modalOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 13,
    color: theme.colors.taupe,
  },
  previewDetailBox: {
    backgroundColor: theme.colors.cream,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  previewValue: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.terracotta,
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 13,
    color: theme.colors.taupe,
    marginBottom: 6,
  },
  previewDescription: {
    fontSize: 14,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  previewContext: {
    fontSize: 13,
    color: theme.colors.taupe,
    fontStyle: 'italic',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  deleteModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.deepRust,
    gap: 6,
  },
  deleteModalButtonText: {
    color: theme.colors.deepRust,
    fontSize: 14,
    fontWeight: '600',
  },
  saveModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.terracotta,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
    ...theme.shadow.ochreGlow,
  },
  saveModalButtonText: {
    color: theme.colors.cream,
    fontSize: 14,
    fontWeight: '700',
  },
});
