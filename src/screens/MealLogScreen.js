import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../styles/theme';
import { insertMeal } from '../db';
import { nowLocalInputValue } from '../lib/time';
import MedicalDisclaimerFooter from '../components/MedicalDisclaimerFooter';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function MealLogScreen({ navigation, onBack }) {
  // Form State
  const [mealType, setMealType] = useState('Breakfast');
  const [description, setDescription] = useState('');
  const [carbs, setCarbs] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [note, setNote] = useState('');

  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastFadeAnim] = useState(new Animated.Value(0));
  const [descriptionError, setDescriptionError] = useState('');

  // Input Focus tracking for amber->ochre border on focus
  const [focusedInput, setFocusedInput] = useState(null);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation && typeof navigation.goBack === 'function' && navigation.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Add');
    }
  };

  const handlePickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera Permission',
          'Permission to access your camera is needed to take a meal photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error taking photo:', err);
      Alert.alert('Camera Error', 'Could not access the camera. Please try again.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Library Permission',
          'Permission to access your photos is needed to select a meal photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error choosing photo:', err);
      Alert.alert('Gallery Error', 'Could not select photo. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setDescriptionError('Please describe what you ate before saving.');
      return;
    }
    setDescriptionError('');
    setIsSaving(true);

    try {
      const timestamp = nowLocalInputValue();
      const carbsValue = carbs.trim() === '' ? null : parseInt(carbs, 10);

      // Insert into SQLite 'meals' table
      await insertMeal({
        meal_type: mealType,
        description: description.trim(),
        carbs: isNaN(carbsValue) ? null : carbsValue,
        photo_uri: photoUri,
        note: note.trim() || null,
        created_at: timestamp,
      });

      // Show 2-second success toast (olive-tinted success with ink text)
      setShowToast(true);
      Animated.timing(toastFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Return to previous screen after 2 seconds
      setTimeout(() => {
        Animated.timing(toastFadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setShowToast(false);
          setIsSaving(false);
          handleBack();
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to save meal:', err);
      setIsSaving(false);
      Alert.alert('Save Failed', `Could not save meal: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 2-second Success Toast: Olive-tinted with ink text */}
      {showToast && (
        <Animated.View style={[styles.toastContainer, { opacity: toastFadeAnim }]}>
          <View style={styles.toastContent}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.ink} />
            <Text style={styles.toastText}>Saved — logged after your meal</Text>
          </View>
        </Animated.View>
      )}

      {/* Screen Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.ink} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Log</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: Meal Type (4 chips, 22px radius, sand fill, selected terracotta) */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Meal type</Text>
            <View style={styles.chipsRow}>
              {MEAL_TYPES.map((type) => {
                const isSelected = mealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.chip,
                      isSelected ? styles.chipSelected : styles.chipUnselected,
                    ]}
                    onPress={() => setMealType(type)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 2: Description (Multi-line text input, label above, sand fill, 1px olive border, ochre on focus) */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              What did you eat? (e.g. 2 roti, dal, small bowl rice)
            </Text>
            <Text style={styles.helperText}>Home-cooked estimates are fine.</Text>
            <TextInput
              style={[
                styles.multiLineInput,
                focusedInput === 'desc' && styles.inputFocused,
                descriptionError ? styles.inputErrorBorder : null,
              ]}
              placeholder="e.g. 2 phulkas, 1 katori dal tadka, small bowl bhindi sabzi, sliced cucumber"
              placeholderTextColor={theme.colors.taupe}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onFocus={() => setFocusedInput('desc')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={(text) => {
                setDescription(text);
                if (descriptionError) setDescriptionError('');
              }}
            />
            {descriptionError ? (
              <Text style={styles.errorText}>{descriptionError}</Text>
            ) : null}
          </View>

          {/* SECTION 3: Carbs Estimate (OPTIONAL) */}
          <View style={styles.card}>
            <View style={styles.labelWithOptionalRow}>
              <Text style={styles.sectionLabel}>Carbs estimate</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>
            <Text style={styles.helperText}>
              grams of carbs, if you know it — leave blank otherwise
            </Text>
            <View style={styles.numericInputRow}>
              <TextInput
                style={[
                  styles.numericInput,
                  focusedInput === 'carbs' && styles.inputFocused,
                ]}
                placeholder="e.g. 45"
                placeholderTextColor={theme.colors.taupe}
                keyboardType="numeric"
                value={carbs}
                onFocus={() => setFocusedInput('carbs')}
                onBlur={() => setFocusedInput(null)}
                onChangeText={(val) => setCarbs(val.replace(/[^0-9]/g, ''))}
                maxLength={4}
              />
              <View style={styles.unitSuffix}>
                <Text style={styles.unitSuffixText}>grams</Text>
              </View>
            </View>
          </View>

          {/* SECTION 4: Photo (OPTIONAL) */}
          <View style={styles.card}>
            <View style={styles.labelWithOptionalRow}>
              <Text style={styles.sectionLabel}>Photo</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>
            <Text style={styles.helperText}>Stored locally on your device only</Text>

            {photoUri ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={handleRemovePhoto}
                  activeOpacity={0.8}
                  accessibilityLabel="Remove photo"
                >
                  <Ionicons name="close" size={18} color={theme.colors.sand} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="image-outline" size={16} color={theme.colors.ink} />
                  <Text style={styles.changePhotoText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromCamera}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={20} color={theme.colors.terracotta} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={20} color={theme.colors.ochre} />
                  <Text style={styles.photoActionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SECTION 5: Note (OPTIONAL) */}
          <View style={styles.card}>
            <View style={styles.labelWithOptionalRow}>
              <Text style={styles.sectionLabel}>Note</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>
            <TextInput
              style={[
                styles.singleLineInput,
                focusedInput === 'note' && styles.inputFocused,
              ]}
              placeholder="e.g. 15 mins after metformin, 20 min walk afterwards"
              placeholderTextColor={theme.colors.taupe}
              value={note}
              onFocus={() => setFocusedInput('note')}
              onBlur={() => setFocusedInput(null)}
              onChangeText={setNote}
              maxLength={200}
            />
          </View>

          {/* SECTION 6: Big SAVE Button (Terracotta fill, cream bold text, soft ochre-tinted glow shadow, 52px tall, 18px radius) */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving ? styles.saveButtonDisabled : null]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Save meal log"
            >
              <Ionicons name="checkmark-done" size={22} color={theme.colors.cream} style={{ marginRight: 8 }} />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Meal Log'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacing for footer */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mandatory Medical Disclaimer Footer (Rule 10) */}
      <MedicalDisclaimerFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.cream, // #F6EFE3
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.cream,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    minHeight: theme.spacing.touchTargetMin,
  },
  backButtonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.ink,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.screenPadding, // 20px screen padding
    paddingTop: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.sand, // Sand card fill (#FBF6EA)
    borderRadius: theme.radius.cards, // 18px radius
    padding: 16,
    marginBottom: theme.spacing.sectionGap, // 16px between sections
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  sectionLabel: {
    fontSize: theme.typography.sectionHeader.fontSize,
    fontWeight: theme.typography.sectionHeader.fontWeight,
    color: theme.colors.ink,
    marginBottom: 6,
  },
  labelWithOptionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionalBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.taupe,
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.chips, // 22px
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: '46%',
  },
  chipSelected: {
    backgroundColor: theme.colors.terracotta,
    borderColor: theme.colors.deepRust,
  },
  chipUnselected: {
    backgroundColor: theme.colors.sand,
    borderColor: theme.colors.borderSubtle,
  },
  chipText: {
    fontSize: 14,
    textAlign: 'center',
  },
  chipTextSelected: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: theme.colors.ink,
    fontWeight: '600',
  },
  // Inputs: Sand fill, 1px olive border, ochre on focus
  multiLineInput: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border, // 1px olive border
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.ink,
    minHeight: 96,
  },
  inputFocused: {
    borderColor: theme.colors.ochre, // Amber->ochre on focus
    borderWidth: 1.5,
  },
  inputErrorBorder: {
    borderColor: theme.colors.deepRust,
  },
  errorText: {
    color: theme.colors.deepRust,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  numericInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numericInput: {
    flex: 1,
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink,
    minHeight: theme.spacing.touchTargetMin,
  },
  unitSuffix: {
    marginLeft: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  unitSuffixText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.buttons,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: theme.spacing.touchTargetMin,
    gap: 6,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  photoPreviewWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.deepRust,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.warm,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: theme.colors.sand,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  singleLineInput: {
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.ink,
    minHeight: theme.spacing.touchTargetMin,
  },
  saveButtonContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  // Primary Big SAVE Button: terracotta fill, cream bold text, soft ochre-tinted glow shadow, 18px radius
  saveButton: {
    backgroundColor: theme.colors.terracotta,
    height: 52,
    width: '100%',
    borderRadius: theme.radius.buttons, // 18px
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    letterSpacing: 0.3,
  },
  // Toast: Olive-tinted success with ink text
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 24,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
    borderWidth: 1.5,
    borderColor: theme.colors.olive,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
    ...theme.shadow.warm,
  },
  toastText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
});
