import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { createReading } from '../db';
import { nowLocalMinute, isStableLocalString } from '../lib/time';

const CONTEXT_OPTIONS = [
  'Fasting',
  'Before meal',
  'After meal',
  'Other',
  'Prefer not to specify',
];

export default function QuickReadingModal({ visible, onClose, onSaved }) {
  const [glucoseValue, setGlucoseValue] = useState('');
  const [recordedAt, setRecordedAt] = useState(nowLocalMinute());
  const [context, setContext] = useState(null);
  const [medicine, setMedicine] = useState('');
  const [medicineStatus, setMedicineStatus] = useState(null); // 'taken' | 'not_taken' | 'prefer_not_to_say'
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const resetForm = () => {
    setGlucoseValue('');
    setRecordedAt(nowLocalMinute());
    setContext(null);
    setMedicine('');
    setMedicineStatus(null);
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
    const validationErr = validateGlucose(glucoseValue);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    // Rule 20: Medicine status is strictly mandatory
    if (!medicineStatus) {
      setErrorMessage('Please select medication status (Taken, Not taken, or Prefer not to say).');
      return;
    }

    let finalTimestamp = recordedAt.trim();
    if (!isStableLocalString(finalTimestamp)) {
      finalTimestamp = nowLocalMinute();
    }

    setIsSubmitting(true);
    try {
      const notesCombined = [
        medicine.trim() ? `Med: ${medicine.trim()}` : null,
        notes.trim() || null,
      ]
        .filter(Boolean)
        .join(' | ') || null;

      const created = await createReading({
        value: parseFloat(glucoseValue),
        unit: 'mg/dL',
        recordedAt: finalTimestamp,
        context: context,
        medicine_status: medicineStatus,
        notes: notesCombined,
      });

      resetForm();
      if (onSaved) onSaved(created);
      onClose();
    } catch (err) {
      setErrorMessage(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.iconCircle}>
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color={theme.colors.terracotta}
                />
              </View>
              <Text style={styles.modalTitle}>Quick Reading (&lt;20s)</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close form"
            >
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

            {/* Glucose Value */}
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
                  autoFocus
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitBadgeText}>mg/dL</Text>
                </View>
              </View>
            </View>

            {/* Date & Time */}
            <View style={styles.inputGroup}>
              <View style={styles.labelActionRow}>
                <Text style={styles.inputLabel}>Date & Time (Local)</Text>
                <TouchableOpacity
                  onPress={() => setRecordedAt(nowLocalMinute())}
                  style={styles.setNowButton}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={theme.colors.terracotta}
                  />
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

            {/* Context Chips */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reading Context (Optional)</Text>
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

            {/* Medication Status (Mandatory - Rule 20) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Medication Status <Text style={{ color: theme.colors.terracotta }}>*</Text>
              </Text>
              <View style={styles.chipsContainer}>
                {[
                  { key: 'taken', label: 'Taken', icon: '💊' },
                  { key: 'not_taken', label: 'Not taken' },
                  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
                ].map((item) => {
                  const isSelected = medicineStatus === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.contextChip,
                        isSelected && styles.contextChipSelected,
                      ]}
                      onPress={() => setMedicineStatus(item.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.contextChipText,
                          isSelected && styles.contextChipTextSelected,
                        ]}
                      >
                        {item.icon ? `${item.icon} ` : ''}{item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Medicine */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Medicine Name (Optional)</Text>
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

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[
                  styles.inputField,
                  styles.notesInput,
                  focusedInput === 'notes' && styles.inputFocused,
                ]}
                placeholder="e.g. 15 min after meal, feeling good"
                placeholderTextColor={theme.colors.taupe}
                multiline
                numberOfLines={3}
                value={notes}
                onFocus={() => setFocusedInput('notes')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={setNotes}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                isSubmitting && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save reading"
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={theme.colors.cream}
              />
              <Text style={styles.saveButtonText}>
                {isSubmitting ? 'Saving...' : 'Save Reading'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.modalBackdrop, // Plum-tinted 40% backdrop
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.sand,
    borderTopLeftRadius: theme.radius.modals, // 20px
    borderTopRightRadius: theme.radius.modals,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '88%',
    ...theme.shadow.warm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.readingChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  closeButton: {
    padding: 6,
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
    fontSize: 13,
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
    fontSize: 12,
    color: theme.colors.taupe,
    marginTop: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.ink,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: theme.colors.ochre,
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
  contextChip: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.chips,
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
    minHeight: 72,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.terracotta,
    borderRadius: theme.radius.buttons,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 8,
    ...theme.shadow.ochreGlow,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.deepRust,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.cream,
  },
});
