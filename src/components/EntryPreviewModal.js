import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { formatDisplay } from '../lib/time';

/**
 * Shared EntryPreviewModal
 * Used in both Add tab and Timeline tab for viewing/editing entries.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {object|null} props.entry - Reading or Meal item
 * @param {() => void} props.onClose
 * @param {(entry: object, updatedNotes: string) => Promise<void>} props.onSaveNotes
 * @param {(entry: object) => Promise<void>} props.onDelete
 */
export default function EntryPreviewModal({
  visible,
  entry,
  onClose,
  onSaveNotes,
  onDelete,
}) {
  const [modalNotes, setModalNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setModalNotes(entry.notes || entry.note || '');
    } else {
      setModalNotes('');
    }
  }, [entry]);

  if (!entry) return null;

  const isReading = entry.entryType === 'reading' || (!entry.meal_type && entry.value !== undefined);
  const timeString = entry.recordedAt || entry.created_at || entry.time;

  // Medicine parsing for reading
  const notesText = entry.notes || entry.note || '';
  let medicineText = '';
  if (notesText && notesText.includes('Med:')) {
    const parts = notesText.split('|');
    const medPart = parts.find((p) => p.trim().startsWith('Med:'));
    if (medPart) {
      medicineText = medPart.replace('Med:', '').trim();
    }
  }

  const handleSave = async () => {
    if (!onSaveNotes) return;
    try {
      setIsSaving(true);
      await onSaveNotes(entry, modalNotes.trim());
      onClose();
    } catch (err) {
      Alert.alert('Error', `Could not update notes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this record?\nThis will remove it from your device permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDelete) {
                await onDelete(entry);
              }
              onClose();
            } catch (err) {
              Alert.alert('Error', `Failed to delete: ${err.message}`);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.previewModalContent}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalHeaderTitleGroup}>
              <View
                style={[
                  styles.modalTypeIndicator,
                  {
                    backgroundColor: isReading
                      ? theme.colors.ochre
                      : theme.colors.terracotta,
                  },
                ]}
              />
              <Text style={styles.modalTitle}>
                {isReading ? 'Reading Details' : 'Meal Details'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <Ionicons name="close" size={22} color={theme.colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Primary Details Box */}
            <View style={styles.previewDetailBox}>
              <View style={styles.detailTopRow}>
                {isReading ? (
                  <View style={styles.valueRow}>
                    <Text style={styles.previewValue}>{entry.value}</Text>
                    <Text style={styles.previewUnit}>{entry.unit || 'mg/dL'}</Text>
                  </View>
                ) : (
                  <View style={styles.mealChip}>
                    <Text style={styles.mealChipText}>
                      {entry.meal_type || 'Meal'}
                    </Text>
                  </View>
                )}

                <Text style={styles.previewTime}>
                  {formatDisplay(timeString, { includeDate: true, includeTime: true })}
                </Text>
              </View>

              {/* Meal specific details */}
              {!isReading && (
                <>
                  {entry.description ? (
                    <Text style={styles.previewDescription}>
                      {entry.description}
                    </Text>
                  ) : null}

                  {entry.carbs !== null &&
                  entry.carbs !== undefined &&
                  String(entry.carbs).trim() !== '' ? (
                    <Text style={styles.previewCarbs}>
                      ~{entry.carbs}g carbs
                    </Text>
                  ) : null}

                  {(entry.photo_uri || entry.photoPath) && (
                    <View style={styles.photoContainer}>
                      <Image
                        source={{ uri: entry.photo_uri || entry.photoPath }}
                        style={styles.previewPhoto}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </>
              )}

              {/* Reading specific details */}
              {isReading && (
                <>
                  {entry.context ? (
                    <View style={styles.contextBadge}>
                      <Text style={styles.contextBadgeText}>
                        Context: {entry.context}
                      </Text>
                    </View>
                  ) : null}

                  {entry.medicine_status ? (
                    <View style={[styles.contextBadge, { marginTop: 6, backgroundColor: theme.colors.surfaceSubtle }]}>
                      <Text style={styles.contextBadgeText}>
                        Medication: {entry.medicine_status === 'taken' ? 'Taken (💊)' : entry.medicine_status === 'not_taken' ? 'Not taken' : 'Prefer not to say'}
                      </Text>
                    </View>
                  ) : null}

                  {medicineText ? (
                    <View style={styles.medicineBadge}>
                      <Text style={styles.medicineText}>💊 {medicineText}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

            {/* Editable Notes Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.inputField, styles.notesInput]}
                placeholder="Add or update notes..."
                placeholderTextColor={theme.colors.taupe}
                multiline
                value={modalNotes}
                onChangeText={setModalNotes}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.deleteModalButton}
                onPress={handleDelete}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.deepRust}
                />
                <Text style={styles.deleteModalButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalButton,
                  isSaving && styles.saveModalButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Save notes"
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={theme.colors.cream}
                />
                <Text style={styles.saveModalButtonText}>
                  {isSaving ? 'Saving...' : 'Save Notes'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.modalBackdrop, // Plum-tinted 40% backdrop
    justifyContent: 'flex-end',
  },
  previewModalContent: {
    backgroundColor: theme.colors.sand,
    borderTopLeftRadius: theme.radius.modals, // 20px
    borderTopRightRadius: theme.radius.modals,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '85%',
    ...theme.shadow.warm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTypeIndicator: {
    width: 6,
    height: 18,
    borderRadius: 3,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  modalCloseButton: {
    padding: 6,
  },
  previewDetailBox: {
    backgroundColor: theme.colors.cream,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  previewUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  mealChip: {
    backgroundColor: theme.colors.mealChipBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.chips,
  },
  mealChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  previewTime: {
    fontSize: 12,
    color: theme.colors.taupe,
  },
  previewDescription: {
    fontSize: 15,
    color: theme.colors.ink,
    lineHeight: 22,
    marginBottom: 6,
  },
  previewCarbs: {
    fontSize: 13,
    color: theme.colors.taupe,
    fontWeight: '600',
    marginBottom: 6,
  },
  photoContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  previewPhoto: {
    width: '100%',
    height: 160,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  contextBadge: {
    marginTop: 4,
  },
  contextBadgeText: {
    fontSize: 13,
    color: theme.colors.taupe,
    fontStyle: 'italic',
  },
  medicineBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(201, 143, 126, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  medicineText: {
    fontSize: 13,
    color: theme.colors.rose,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
    marginBottom: 6,
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
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
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
    backgroundColor: theme.colors.sand,
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
  saveModalButtonDisabled: {
    backgroundColor: theme.colors.deepRust,
    opacity: 0.6,
  },
  saveModalButtonText: {
    color: theme.colors.cream,
    fontSize: 15,
    fontWeight: '700',
  },
});
