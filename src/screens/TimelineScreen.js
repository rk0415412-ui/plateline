import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import {
  listAllReadings,
  listAllMeals,
  updateReading,
  updateMeal,
  deleteReading,
  deleteMeal,
} from '../db';
import { nowLocalMinute, formatDisplay, parseLocalString } from '../lib/time';
import EntryPreviewModal from '../components/EntryPreviewModal';
import DevTimestampTestScreen from './DevTimestampTestScreen';
import { TabBarScrollContext } from '../context/TabBarScrollContext';

const FULL_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * Format local date string into day header:
 * - "TODAY"
 * - "YESTERDAY"
 * - "14 OCTOBER"
 */
function getDayHeaderTitle(dateKey) {
  try {
    const todayKey = nowLocalMinute().slice(0, 10);
    if (dateKey === todayKey) {
      return 'TODAY';
    }

    const { year, month, day } = parseLocalString(`${todayKey}T00:00:00`);
    const todayDate = new Date(year, month - 1, day);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(todayDate.getDate() - 1);

    const yYear = yesterdayDate.getFullYear();
    const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
    const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
    const yesterdayKey = `${yYear}-${yMonth}-${yDay}`;

    if (dateKey === yesterdayKey) {
      return 'YESTERDAY';
    }

    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10) - 1;
      const monthName = FULL_MONTHS[m] || '';
      return `${d} ${monthName}`;
    }

    return dateKey.toUpperCase();
  } catch (e) {
    return dateKey;
  }
}

/**
 * Extract medicine text from reading notes if present
 */
function extractMedicine(notes) {
  if (!notes || typeof notes !== 'string') return null;
  if (notes.includes('Med:')) {
    const parts = notes.split('|');
    const medPart = parts.find((p) => p.trim().startsWith('Med:'));
    if (medPart) {
      return medPart.replace('Med:', '').trim();
    }
  }
  return null;
}

export default function TimelineScreen({ navigation }) {
  const { onScroll } = useContext(TabBarScrollContext);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDevTest, setShowDevTest] = useState(false);

  const loadTimelineData = async () => {
    try {
      const [readings, meals] = await Promise.all([
        listAllReadings(),
        listAllMeals(),
      ]);

      const normalizedReadings = (readings || []).map((r) => ({
        id: r.id,
        type: 'reading',
        entryType: 'reading',
        value: r.value,
        unit: r.unit || 'mg/dL',
        time: r.recordedAt,
        recordedAt: r.recordedAt,
        context: r.context,
        notes: r.notes,
        raw: r,
      }));

      const normalizedMeals = (meals || []).map((m) => ({
        id: m.id,
        type: 'meal',
        entryType: 'meal',
        meal_type: m.meal_type || 'Meal',
        description: m.description,
        carbs: m.carbs,
        photo_uri: m.photo_uri || m.photoPath,
        photoPath: m.photo_uri || m.photoPath,
        note: m.note,
        notes: m.note,
        time: m.created_at || m.recordedAt,
        created_at: m.created_at || m.recordedAt,
        recordedAt: m.created_at || m.recordedAt,
        raw: m,
      }));

      // Combined and sorted newest first
      const combined = [...normalizedReadings, ...normalizedMeals].sort(
        (a, b) => (b.time || '').localeCompare(a.time || '')
      );

      // Group by day key 'YYYY-MM-DD'
      const groupsMap = new Map();
      combined.forEach((item) => {
        const dateKey = (item.time || '').slice(0, 10) || 'Unknown';
        if (!groupsMap.has(dateKey)) {
          groupsMap.set(dateKey, []);
        }
        groupsMap.get(dateKey).push(item);
      });

      const sectionList = [];
      groupsMap.forEach((data, dateKey) => {
        sectionList.push({
          dateKey,
          title: getDayHeaderTitle(dateKey),
          data,
        });
      });

      setSections(sectionList);
    } catch (err) {
      console.warn('Error loading timeline data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTimelineData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTimelineData();
  };

  const handleSaveNotes = async (entry, updatedNotes) => {
    if (entry.entryType === 'reading') {
      await updateReading(entry.id, { notes: updatedNotes || null });
    } else {
      await updateMeal(entry.id, { note: updatedNotes || null });
    }
    await loadTimelineData();
  };

  const handleDeleteEntry = async (entry) => {
    if (entry.entryType === 'reading') {
      await deleteReading(entry.id);
    } else {
      await deleteMeal(entry.id);
    }
    await loadTimelineData();
  };

  if (showDevTest) {
    return <DevTimestampTestScreen onBack={() => setShowDevTest(false)} />;
  }

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isReading = item.type === 'reading';
    const timeFormatted = formatDisplay(item.time, {
      includeDate: false,
      includeTime: true,
    });
    const medicine = isReading ? extractMedicine(item.notes) : null;
    const hasPhoto = !isReading && !!(item.photo_uri || item.photoPath);

    return (
      <TouchableOpacity
        style={styles.cardRow}
        activeOpacity={0.8}
        onPress={() => setSelectedEntry(item.raw ? { ...item.raw, entryType: item.type } : item)}
        accessibilityRole="button"
        accessibilityLabel={`${isReading ? 'Reading' : 'Meal'} entry at ${timeFormatted}`}
      >
        {/* 4px Left Color Bar: Ochre for readings, Terracotta for meals */}
        <View
          style={[
            styles.leftBar,
            {
              backgroundColor: isReading
                ? theme.colors.ochre
                : theme.colors.terracotta,
            },
          ]}
        />

        <View style={styles.cardContent}>
          {isReading ? (
            /* READING ROW */
            <View style={styles.readingRowContainer}>
              <View style={styles.readingTopRow}>
                <View style={styles.valueGroup}>
                  <Text style={styles.glucoseValue}>
                    {item.value}{' '}
                    <Text style={styles.glucoseUnit}>{item.unit}</Text>
                  </Text>
                  {item.context ? (
                    <Text style={styles.contextLabel}>{item.context}</Text>
                  ) : null}
                </View>

                <Text style={styles.timeText}>{timeFormatted}</Text>
              </View>

              {/* Second line: Medicine in dusty rose with 💊 if present */}
              {medicine ? (
                <View style={styles.medicineRow}>
                  <Text style={styles.medicineIcon}>💊</Text>
                  <Text style={styles.medicineText} numberOfLines={1}>
                    {medicine}
                  </Text>
                </View>
              ) : item.notes && !medicine ? (
                <Text style={styles.notesText} numberOfLines={1}>
                  {item.notes}
                </Text>
              ) : null}
            </View>
          ) : (
            /* MEAL ROW */
            <View style={styles.mealRowContainer}>
              <View style={styles.mealTopRow}>
                <View style={styles.mealChipGroup}>
                  <View style={styles.mealChip}>
                    <Text style={styles.mealChipText}>{item.meal_type}</Text>
                  </View>
                  {item.carbs !== null &&
                  item.carbs !== undefined &&
                  String(item.carbs).trim() !== '' ? (
                    <Text style={styles.carbsText}>~{item.carbs}g carbs</Text>
                  ) : null}
                </View>

                <Text style={styles.timeText}>{timeFormatted}</Text>
              </View>

              <View style={styles.mealBottomRow}>
                <View style={styles.mealDescriptionColumn}>
                  <Text
                    style={styles.mealDescription}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.description || 'Meal logged'}
                  </Text>
                </View>

                {/* 48px Photo Thumbnail if present */}
                {hasPhoto && (
                  <Image
                    source={{ uri: item.photo_uri || item.photoPath }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const totalEntries = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Timeline</Text>
          <TouchableOpacity
            style={styles.devTestButton}
            onPress={() => setShowDevTest(true)}
            accessibilityRole="button"
            accessibilityLabel="Timestamp stability test"
          >
            <Ionicons name="flask-outline" size={18} color={theme.colors.taupe} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Meals & readings grouped by day, newest first
        </Text>
      </View>

      {/* Main List or Empty State */}
      {!isLoading && totalEntries === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="calendar-clear-outline"
              size={36}
              color={theme.colors.taupe}
            />
          </View>
          <Text style={styles.emptyText}>
            Nothing logged yet — swipe to Add to begin.
          </Text>
          <TouchableOpacity
            style={styles.addEntryButton}
            onPress={() => navigation && navigation.navigate('Add')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add entry"
          >
            <Ionicons name="add" size={20} color={theme.colors.cream} />
            <Text style={styles.addEntryButtonText}>Add entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.terracotta}
              colors={[theme.colors.terracotta]}
            />
          }
        />
      )}

      {/* Reusable EntryPreviewModal shared with Add tab */}
      <EntryPreviewModal
        visible={!!selectedEntry}
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onSaveNotes={handleSaveNotes}
        onDelete={handleDeleteEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.title.fontSize, // 28
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.ink,
  },
  devTestButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingBottom: 90, // room for floating bottom bar
  },
  // Day Header: Sticky, small caps, terracotta semi-bold — "TODAY", "YESTERDAY", "14 OCTOBER"
  sectionHeaderContainer: {
    backgroundColor: theme.colors.cream,
    paddingVertical: 10,
    paddingHorizontal: 2,
    marginTop: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.terracotta, // #C1553B
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Row: Sand card, 18px radius, warm shadow, minHeight >= 64px, 10px gaps
  cardRow: {
    backgroundColor: theme.colors.sand, // #FBF6EA
    borderRadius: theme.radius.cards, // 18px
    minHeight: 64, // Rows >=64px
    marginBottom: 10, // 10px gaps
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  // 4px left color bar — ochre for readings, terracotta for meals
  leftBar: {
    width: 4,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  /* Reading Row Styles */
  readingRowContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  readingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  valueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flex: 1,
  },
  glucoseValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  glucoseUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.taupe,
  },
  contextLabel: {
    fontSize: 12,
    color: theme.colors.taupe,
    fontStyle: 'italic',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.taupe,
    fontWeight: '500',
  },
  medicineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  medicineIcon: {
    fontSize: 12,
  },
  medicineText: {
    fontSize: 13,
    color: theme.colors.rose, // Dusty rose #C98F7E
    fontWeight: '600',
    flex: 1,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.taupe,
    marginTop: 4,
  },
  /* Meal Row Styles */
  mealRowContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mealTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealChipGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealChip: {
    backgroundColor: theme.colors.mealChipBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.chips,
  },
  mealChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  carbsText: {
    fontSize: 12,
    color: theme.colors.taupe, // "~45g carbs" in taupe
    fontWeight: '500',
  },
  mealBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  mealDescriptionColumn: {
    flex: 1,
  },
  mealDescription: {
    fontSize: 14,
    color: theme.colors.ink,
    lineHeight: 19,
  },
  // 48px photo thumbnail right if present
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.sand,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.taupe, // Centered taupe text
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.terracotta, // Terracotta button
    borderRadius: theme.radius.buttons, // 18px
    minHeight: 48,
    paddingHorizontal: 22,
    gap: 6,
    ...theme.shadow.ochreGlow,
  },
  addEntryButtonText: {
    color: theme.colors.cream,
    fontSize: 15,
    fontWeight: '700',
  },
});
