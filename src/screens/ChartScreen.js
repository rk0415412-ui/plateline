import React, { useState, useCallback, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import ReportScreen from './ReportScreen';
import MealLogScreen from './MealLogScreen';
import QuickReadingModal from '../components/QuickReadingModal';
import EntryPreviewModal from '../components/EntryPreviewModal';
import { listAllReadings, listAllMeals, getSetting, updateReading, deleteReading } from '../db';
import { nowLocalMinute, formatDisplay } from '../lib/time';
import { TabBarScrollContext } from '../context/TabBarScrollContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PERIODS = [7, 14, 30];

// Convert mg/dL to display value according to unit
function toDisplayValue(mgDlVal, unit) {
  if (mgDlVal === null || mgDlVal === undefined || isNaN(Number(mgDlVal))) return '—';
  const num = Number(mgDlVal);
  if (unit === 'mmol/L') {
    return (num / 18.0182).toFixed(1);
  }
  return String(Math.round(num));
}

// Helpers for 3-factor encoding on chart
function getContextBadgeInfo(context) {
  switch (context) {
    case 'before_meal':
      return { label: 'Pre', color: theme.colors.terracotta, bg: '#FDE8E4' };
    case 'after_meal':
      return { label: 'Post', color: '#8F5E0A', bg: '#FFF3DA' };
    case 'fasting':
      return { label: 'Fast', color: theme.colors.olive, bg: '#E8F0E2' };
    case 'bedtime':
      return { label: 'Bed', color: theme.colors.taupe, bg: theme.colors.sand };
    default:
      return { label: 'Log', color: theme.colors.taupe, bg: theme.colors.sand };
  }
}

// Compute strictly local start date string for X days ago
function getPeriodStartDate(days) {
  const now = new Date();
  const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1), 0, 0, 0);
  const y = past.getFullYear();
  const m = String(past.getMonth() + 1).padStart(2, '0');
  const d = String(past.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00`;
}

export default function ChartScreen() {
  const { onScroll } = useContext(TabBarScrollContext);

  const [selectedDays, setSelectedDays] = useState(7);
  const [chartView, setChartView] = useState('line'); // 'line' | 'daily' | 'context'
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [allReadings, setAllReadings] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [glucoseUnit, setGlucoseUnit] = useState('mg/dL');
  const [targetLow, setTargetLow] = useState(70);
  const [targetHigh, setTargetHigh] = useState(140);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);

  const handleSaveNotes = async (entry, updatedNotes) => {
    if (entry && entry.id) {
      await updateReading(entry.id, { notes: updatedNotes || null });
      await loadChartData();
    }
  };

  const handleDeleteReading = async (entry) => {
    if (entry && entry.id) {
      await deleteReading(entry.id);
      await loadChartData();
    }
  };

  const loadChartData = async () => {
    try {
      const [readings, meals, unitSetting, lowSetting, highSetting] = await Promise.all([
        listAllReadings(),
        listAllMeals(),
        getSetting('glucose_unit', 'mg/dL'),
        getSetting('target_low', '70'),
        getSetting('target_high', '140'),
      ]);
      setAllReadings(readings || []);
      setAllMeals(meals || []);
      setGlucoseUnit(unitSetting || 'mg/dL');
      setTargetLow(parseInt(lowSetting || '70', 10) || 70);
      setTargetHigh(parseInt(highSetting || '140', 10) || 140);
    } catch (err) {
      console.warn('Error loading chart data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChartData();
    }, [])
  );

  // Filter data for selected period
  const startDateStr = useMemo(() => getPeriodStartDate(selectedDays), [selectedDays]);
  const endDateStr = useMemo(() => `${nowLocalMinute()}:59`, []);

  const periodReadings = useMemo(() => {
    return allReadings
      .filter((r) => r.recordedAt >= startDateStr && r.recordedAt <= endDateStr)
      .sort((a, b) => (a.recordedAt || '').localeCompare(b.recordedAt || ''));
  }, [allReadings, startDateStr, endDateStr]);

  const periodMeals = useMemo(() => {
    return allMeals
      .filter((m) => {
        const t = m.created_at || m.recordedAt || '';
        return t >= startDateStr && t <= endDateStr;
      })
      .sort((a, b) => {
        const tA = a.created_at || a.recordedAt || '';
        const tB = b.created_at || b.recordedAt || '';
        return tA.localeCompare(tB);
      });
  }, [allMeals, startDateStr, endDateStr]);

  // Recompute 4 Stat Tiles for the period (converted to user's unit)
  const stats = useMemo(() => {
    const values = periodReadings
      .map((r) => Number(r.value))
      .filter((v) => !isNaN(v) && v > 0);

    let avgStr = '—';
    let devStr = '—';
    let hiLoStr = '— • —';

    if (values.length > 0) {
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = sum / values.length;
      avgStr = toDisplayValue(avg, glucoseUnit);

      if (values.length > 1) {
        const variance =
          values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) /
          (values.length - 1);
        const stdDev = Math.sqrt(variance);
        devStr = `±${toDisplayValue(stdDev, glucoseUnit)}`;
      } else {
        devStr = glucoseUnit === 'mmol/L' ? '±0.0' : '±0';
      }

      const hi = Math.max(...values);
      const lo = Math.min(...values);
      hiLoStr = `${toDisplayValue(hi, glucoseUnit)} • ${toDisplayValue(lo, glucoseUnit)}`;
    }

    // Carbs from meals in period
    let totalCarbs = 0;
    let carbsCount = 0;
    periodMeals.forEach((m) => {
      if (
        m.carbs !== null &&
        m.carbs !== undefined &&
        String(m.carbs).trim() !== '' &&
        !isNaN(Number(m.carbs))
      ) {
        totalCarbs += Number(m.carbs);
        carbsCount++;
      }
    });

    const carbsStr = carbsCount > 0 ? `~${Math.round(totalCarbs)}g` : 'n/a';

    return {
      avg: avgStr,
      dev: devStr,
      hiLo: hiLoStr,
      carbs: carbsStr,
      unit: glucoseUnit,
    };
  }, [periodReadings, periodMeals, glucoseUnit]);

  // Daily averages computation for Daily Average Bar View
  const dailyData = useMemo(() => {
    const daysMap = new Map();
    const now = new Date();
    for (let i = selectedDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      daysMap.set(key, {
        dateKey: key,
        displayDate: `${m}/${day}`,
        readings: [],
        medsCount: 0,
      });
    }

    periodReadings.forEach((r) => {
      const dateKey = (r.recordedAt || '').slice(0, 10);
      if (daysMap.has(dateKey)) {
        const item = daysMap.get(dateKey);
        item.readings.push(r);
        if (r.medicine_status === 'taken' || (r.notes && r.notes.toLowerCase().includes('med:'))) {
          item.medsCount++;
        }
      }
    });

    const result = [];
    daysMap.forEach((val) => {
      const nums = val.readings.map((r) => Number(r.value)).filter((v) => !isNaN(v) && v > 0);
      const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      result.push({
        ...val,
        count: nums.length,
        avg,
      });
    });
    return result;
  }, [periodReadings, selectedDays]);

  // Context averages for Pre vs Post Meal Analysis View
  const contextStats = useMemo(() => {
    const groups = {
      fasting: { label: 'Fasting', values: [] },
      before_meal: { label: 'Before Meal', values: [] },
      after_meal: { label: 'After Meal', values: [] },
    };

    periodReadings.forEach((r) => {
      const val = Number(r.value);
      if (!isNaN(val) && val > 0) {
        if (r.context === 'fasting') groups.fasting.values.push(val);
        else if (r.context === 'before_meal') groups.before_meal.values.push(val);
        else if (r.context === 'after_meal') groups.after_meal.values.push(val);
      }
    });

    const summarize = (g) => {
      const count = g.values.length;
      if (count === 0) return { ...g, count: 0, avg: '—', inRangePct: '—', rawAvg: null };
      const sum = g.values.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const inRange = g.values.filter((v) => v >= targetLow && v <= targetHigh).length;
      return {
        ...g,
        count,
        rawAvg: avg,
        avg: toDisplayValue(avg, glucoseUnit),
        inRangePct: `${Math.round((inRange / count) * 100)}%`,
      };
    };

    const fast = summarize(groups.fasting);
    const pre = summarize(groups.before_meal);
    const post = summarize(groups.after_meal);

    let postMealRise = '—';
    if (pre.rawAvg !== null && post.rawAvg !== null) {
      const diff = post.rawAvg - pre.rawAvg;
      const sign = diff >= 0 ? '+' : '';
      postMealRise = `${sign}${toDisplayValue(diff, glucoseUnit)} ${glucoseUnit}`;
    }

    return {
      fasting: fast,
      before_meal: pre,
      after_meal: post,
      postMealRise,
    };
  }, [periodReadings, targetLow, targetHigh, glucoseUnit]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
            {/* Header with Title, Logo and Export Button */}
            <View style={styles.headerRow}>
              <View style={styles.headerBrandCol}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
                <View style={styles.headerTextGroup}>
                  <Text style={styles.headerTitle}>PlateLine</Text>
                  <Text style={styles.headerSubtitle}>
                    Glucose & Meal Journal
                  </Text>
                </View>
              </View>

              {/* Compact Export PDF button that never clips */}
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => setShowReportModal(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Export or view report"
              >
                <Ionicons name="document-text-outline" size={16} color={theme.colors.cream} />
                <Text style={styles.exportButtonText}>Export PDF</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Period Selector: 7 / 14 / 30 chips above chart (SOLID SAND) */}
            <View style={styles.periodSelectorRow}>
              {PERIODS.map((days) => {
                const isSelected = selectedDays === days;
                return (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.periodChip,
                      isSelected && styles.periodChipSelected,
                    ]}
                    onPress={() => setSelectedDays(days)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`${days} days period`}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        isSelected && styles.periodChipTextSelected,
                      ]}
                    >
                      {days} Days
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Quick-Add Row: Two half-width buttons (SOLID OCHRE & SOLID TERRACOTTA) */}
            <View style={styles.quickAddRow}>
              {/* "+ Reading": solid ochre fill, ink text */}
              <TouchableOpacity
                style={styles.quickAddReadingBtn}
                onPress={() => setShowReadingModal(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add reading"
              >
                <Ionicons name="add-circle-outline" size={18} color={theme.colors.ink} />
                <Text style={styles.quickAddReadingText}>＋ Reading</Text>
              </TouchableOpacity>

              {/* "+ Meal": solid terracotta fill, cream text */}
              <TouchableOpacity
                style={styles.quickAddMealBtn}
                onPress={() => setShowMealModal(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add meal"
              >
                <Ionicons name="restaurant-outline" size={16} color={theme.colors.cream} />
                <Text style={styles.quickAddMealText}>＋ Meal</Text>
              </TouchableOpacity>
            </View>

            {/* View Switcher: 2 Clean Non-Overlapping Tabs */}
            <View style={styles.viewSwitcherBar}>
              <TouchableOpacity
                style={[styles.viewTab, chartView === 'line' && styles.viewTabActive]}
                onPress={() => setChartView('line')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="pulse-outline"
                  size={15}
                  color={chartView === 'line' ? theme.colors.cream : theme.colors.ink}
                />
                <Text style={[styles.viewTabText, chartView === 'line' && styles.viewTabTextActive]}>
                  3-Factor Timeline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewTab, chartView === 'daily' && styles.viewTabActive]}
                onPress={() => setChartView('daily')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={15}
                  color={chartView === 'daily' ? theme.colors.cream : theme.colors.ink}
                />
                <Text style={[styles.viewTabText, chartView === 'daily' && styles.viewTabTextActive]}>
                  Daily Averages
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1. SOLID Graph Card */}
            <View style={styles.chartCardSolid}>
              {/* Chart Header */}
              <View style={styles.chartHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chartTitleText}>
                    {chartView === 'line'
                      ? '3-Factor Glucose & Therapy Timeline'
                      : 'Daily Average Glucose History'}
                  </Text>
                  <Text style={styles.chartSubtitleText}>
                    Target {toDisplayValue(targetLow, glucoseUnit)}–{toDisplayValue(targetHigh, glucoseUnit)} {glucoseUnit} · Last {selectedDays} days
                  </Text>
                </View>
                <View style={styles.badgeSolid}>
                  <Text style={styles.badgeSolidText}>{glucoseUnit}</Text>
                </View>
              </View>

              {/* View 1: 3-Factor Timeline View */}
              {chartView === 'line' && (
                <View style={styles.chartCanvasSolid}>
                  {/* Horizontal Grid lines with labels */}
                  <View style={[styles.gridLine, { top: 12 }]}>
                    <Text style={styles.gridLabel}>{toDisplayValue(200, glucoseUnit)}</Text>
                    <View style={styles.gridDashes} />
                  </View>

                  <View style={[styles.targetBandArea, { top: 50, height: 75 }]}>
                    <Text style={styles.targetBandTitle}>
                      Target Range ({toDisplayValue(targetLow, glucoseUnit)} – {toDisplayValue(targetHigh, glucoseUnit)})
                    </Text>
                  </View>

                  <View style={[styles.gridLine, { top: 50 }]}>
                    <Text style={styles.gridLabel}>{toDisplayValue(targetHigh, glucoseUnit)}</Text>
                    <View style={styles.gridDashes} />
                  </View>

                  <View style={[styles.gridLine, { top: 125 }]}>
                    <Text style={styles.gridLabel}>{toDisplayValue(targetLow, glucoseUnit)}</Text>
                    <View style={styles.gridDashes} />
                  </View>

                  {/* Render 3-Factor Timeline Events */}
                  {periodReadings.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pointsScrollContainer}
                    >
                      {periodReadings.map((reading, idx) => {
                        const val = Number(reading.value);
                        const isInTarget = val >= targetLow && val <= targetHigh;
                        const isHigh = val > targetHigh;
                        const isLow = val < targetLow;

                        // Factor 1: Measurement Value Color
                        const dotBg = isInTarget
                          ? '#E8F0E2'
                          : isHigh
                          ? '#FDE8E4'
                          : '#FFF3DA';
                        const dotBorder = isInTarget
                          ? theme.colors.olive
                          : isHigh
                          ? theme.colors.terracotta
                          : theme.colors.ochre;

                        // Factor 2: Meal Time Proximity
                        const ctx = reading.context || 'unspecified';
                        const isPre = ctx === 'before_meal';
                        const isPost = ctx === 'after_meal';
                        const isFast = ctx === 'fasting';
                        const mealBadgeLabel = isPre
                          ? 'Pre-Meal'
                          : isPost
                          ? 'Post-Meal'
                          : isFast
                          ? 'Fasting'
                          : ctx === 'bedtime'
                          ? 'Bedtime'
                          : 'General';
                        const mealBadgeBg = isPre
                          ? '#FDE8E4'
                          : isPost
                          ? '#FFF3DA'
                          : isFast
                          ? '#E8F0E2'
                          : theme.colors.sand;
                        const mealBadgeColor = isPre
                          ? theme.colors.terracotta
                          : isPost
                          ? '#8F5E0A'
                          : isFast
                          ? theme.colors.olive
                          : theme.colors.taupe;

                        // Factor 3: Medication Status
                        const notesLower = (reading.notes || '').toLowerCase();
                        const isMedTaken =
                          reading.medicine_status === 'taken' ||
                          notesLower.includes('med:');
                        const isMedNotTaken = reading.medicine_status === 'not_taken';

                        // Format Date and Time cleanly
                        const rawTime = reading.recordedAt || '';
                        const timeParts = rawTime.split('T');
                        const datePart = timeParts[0] || '';
                        const timePart = timeParts[1] ? timeParts[1].substring(0, 5) : '';

                        // Format date like '16 Oct'
                        let dateDisplay = datePart;
                        try {
                          const [y, m, d] = datePart.split('-');
                          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                          if (m && d) {
                            dateDisplay = `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
                          }
                        } catch (e) {}

                        // Format 24h to 12h time
                        let timeDisplay = timePart;
                        try {
                          const [hh, mm] = timePart.split(':');
                          const hNum = parseInt(hh, 10);
                          const ampm = hNum >= 12 ? 'PM' : 'AM';
                          const h12 = hNum % 12 || 12;
                          timeDisplay = `${h12}:${mm} ${ampm}`;
                        } catch (e) {}

                        return (
                          <TouchableOpacity
                            key={reading.id || idx}
                            style={styles.factorCard}
                            activeOpacity={0.8}
                            onPress={() => setSelectedPoint(reading)}
                            accessibilityLabel={`Reading ${val} ${glucoseUnit}, tap for details`}
                          >
                            {/* Factor 3: Medicine Status (Top) */}
                            <View style={styles.medStatusRow}>
                              {isMedTaken ? (
                                <View style={styles.medTakenPill}>
                                  <Text style={styles.medTakenText}>💊 Med Taken</Text>
                                </View>
                              ) : isMedNotTaken ? (
                                <View style={styles.medNotTakenPill}>
                                  <Text style={styles.medNotTakenText}>✗ No Med</Text>
                                </View>
                              ) : (
                                <View style={styles.medEmptyPill}>
                                  <Text style={styles.medEmptyText}>— Med</Text>
                                </View>
                              )}
                            </View>

                            {/* Factor 1: Blood Glucose Measurement Value */}
                            <View
                              style={[
                                styles.glucoseValueBadge,
                                {
                                  backgroundColor: dotBg,
                                  borderColor: dotBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.glucoseValueNum, { color: dotBorder }]}>
                                {toDisplayValue(val, glucoseUnit)}
                              </Text>
                              <Text style={styles.glucoseValueUnitText}>{glucoseUnit}</Text>
                            </View>

                            {/* Status label: In Range / High / Low */}
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: dotBorder },
                              ]}
                            >
                              {isInTarget ? 'In Range' : isHigh ? 'High' : 'Low'}
                            </Text>

                            {/* Factor 2: Meal Time Proximity Badge */}
                            <View
                              style={[
                                styles.mealProximityBadge,
                                { backgroundColor: mealBadgeBg, borderColor: mealBadgeColor },
                              ]}
                            >
                              <Text style={[styles.mealProximityText, { color: mealBadgeColor }]}>
                                🍽️ {mealBadgeLabel}
                              </Text>
                            </View>

                            {/* Time & Date */}
                            <View style={styles.dateTimeContainer}>
                              <Text style={styles.timeLabelText}>{timeDisplay}</Text>
                              <Text style={styles.dateLabelText}>{dateDisplay}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    /* Empty Period Notice */
                    <View style={styles.emptyChartNotice}>
                      <View style={styles.emptyNoticeIcon}>
                        <Ionicons
                          name="trending-up"
                          size={32}
                          color={theme.colors.ochre}
                        />
                      </View>
                      <Text style={styles.emptyChartTitle}>
                        No readings in this {selectedDays}-day period
                      </Text>
                      <Text style={styles.emptyChartSubtitle}>
                        Tap ＋ Reading to log your first reading.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* 3-Factor Clean Wrapping Legend */}
              {chartView === 'line' && (
                <View style={styles.factorLegendBar}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.olive }]} />
                    <Text style={styles.legendLabel}>In Target</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.terracotta }]} />
                    <Text style={styles.legendLabel}>High / Pre-Meal</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: theme.colors.ochre }]} />
                    <Text style={styles.legendLabel}>Low / Post-Meal</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <Text style={styles.legendEmoji}>💊</Text>
                    <Text style={styles.legendLabel}>Med Taken</Text>
                  </View>
                </View>
              )}


              {/* View 2: Daily Average View */}
              {chartView === 'daily' && (
                <View style={styles.dailyViewContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dailyBarsScrollContainer}
                  >
                    {dailyData.map((d) => {
                      const hasData = d.avg !== null;
                      const val = d.avg || 0;
                      const clamped = Math.max(50, Math.min(250, val));
                      const barHeightPercent = hasData
                        ? `${Math.max(12, Math.round(((clamped - 50) / 200) * 100))}%`
                        : '6%';
                      const isInTarget = hasData && val >= targetLow && val <= targetHigh;
                      const isHigh = hasData && val > targetHigh;
                      const barColor = !hasData
                        ? theme.colors.borderSubtle
                        : isInTarget
                        ? theme.colors.olive
                        : isHigh
                        ? theme.colors.terracotta
                        : theme.colors.ochre;

                      return (
                        <View key={d.dateKey} style={styles.dailyBarCol}>
                          {/* Value label on top */}
                          <Text style={styles.dailyBarValueText}>
                            {hasData ? toDisplayValue(d.avg, glucoseUnit) : '—'}
                          </Text>

                          {/* Bar Track */}
                          <View style={styles.dailyBarTrack}>
                            {/* Target Band Guide behind bar */}
                            <View style={styles.dailyTargetBandGuide} />
                            <View
                              style={[
                                styles.dailyBarFill,
                                {
                                  height: barHeightPercent,
                                  backgroundColor: barColor,
                                },
                              ]}
                            />
                          </View>

                          {/* Date label */}
                          <Text style={styles.dailyBarDateText}>{d.displayDate}</Text>

                          {/* Count & Med badge */}
                          <View style={styles.dailyBarMetaRow}>
                            <Text style={styles.dailyBarCountText}>
                              {d.count > 0 ? `${d.count}x` : '—'}
                            </Text>
                            {d.medsCount > 0 && (
                              <Text style={styles.dailyBarMedText}>💊</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.factorLegendBar}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.olive }]} />
                      <Text style={styles.legendLabel}>In Target</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.terracotta }]} />
                      <Text style={styles.legendLabel}>High</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: theme.colors.ochre }]} />
                      <Text style={styles.legendLabel}>Low</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <Text style={styles.legendEmoji}>💊</Text>
                      <Text style={styles.legendLabel}>Med Taken</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* View 3: Pre vs Post Meal Analysis */}
              {chartView === 'context' && (
                <View style={styles.contextViewContainer}>
                  {/* Excursion Delta Header Card */}
                  <View style={styles.deltaCard}>
                    <View style={styles.deltaIconCol}>
                      <Ionicons name="git-compare-outline" size={24} color={theme.colors.terracotta} />
                    </View>
                    <View style={styles.deltaTextCol}>
                      <Text style={styles.deltaTitle}>Post-Meal Glycemic Rise</Text>
                      <Text style={styles.deltaValue}>{contextStats.postMealRise}</Text>
                      <Text style={styles.deltaSub}>Average shift between Pre-Meal and Post-Meal readings</Text>
                    </View>
                  </View>

                  {/* 3 Context Rows */}
                  <View style={styles.contextGrid}>
                    {/* Fasting */}
                    <View style={[styles.contextCardItem, { borderLeftColor: theme.colors.olive }]}>
                      <View style={styles.contextCardHeader}>
                        <Text style={styles.contextCardLabel}>Fasting</Text>
                        <Text style={styles.contextCardCount}>{contextStats.fasting.count} logs</Text>
                      </View>
                      <Text style={styles.contextCardValue}>
                        {contextStats.fasting.avg} <Text style={styles.contextCardUnit}>{glucoseUnit}</Text>
                      </Text>
                      <Text style={styles.contextCardSub}>
                        Time in target: {contextStats.fasting.inRangePct}
                      </Text>
                    </View>

                    {/* Pre-Meal */}
                    <View style={[styles.contextCardItem, { borderLeftColor: theme.colors.terracotta }]}>
                      <View style={styles.contextCardHeader}>
                        <Text style={styles.contextCardLabel}>Before Meal</Text>
                        <Text style={styles.contextCardCount}>{contextStats.before_meal.count} logs</Text>
                      </View>
                      <Text style={styles.contextCardValue}>
                        {contextStats.before_meal.avg} <Text style={styles.contextCardUnit}>{glucoseUnit}</Text>
                      </Text>
                      <Text style={styles.contextCardSub}>
                        Time in target: {contextStats.before_meal.inRangePct}
                      </Text>
                    </View>

                    {/* Post-Meal */}
                    <View style={[styles.contextCardItem, { borderLeftColor: theme.colors.ochre }]}>
                      <View style={styles.contextCardHeader}>
                        <Text style={styles.contextCardLabel}>After Meal</Text>
                        <Text style={styles.contextCardCount}>{contextStats.after_meal.count} logs</Text>
                      </View>
                      <Text style={styles.contextCardValue}>
                        {contextStats.after_meal.avg} <Text style={styles.contextCardUnit}>{glucoseUnit}</Text>
                      </Text>
                      <Text style={styles.contextCardSub}>
                        Time in target: {contextStats.after_meal.inRangePct}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 5. Stat Tiles (SOLID SAND fill, 18px radius, terracotta bold values) */}
            <View style={styles.statTilesContainer}>
              {/* Tile 1: AVG */}
              <View style={styles.statTileItem}>
                <Text style={styles.statTileLabel}>AVG</Text>
                <Text style={styles.statTileValue}>{stats.avg}</Text>
                <Text style={styles.statTileSub}>{stats.unit}</Text>
              </View>

              {/* Tile 2: DEV */}
              <View style={styles.statTileItem}>
                <Text style={styles.statTileLabel}>DEV</Text>
                <Text style={styles.statTileValue}>{stats.dev}</Text>
                <Text style={styles.statTileSub}>std dev</Text>
              </View>

              {/* Tile 3: HI/LO */}
              <View style={styles.statTileItem}>
                <Text style={styles.statTileLabel}>HI / LO</Text>
                <Text style={styles.statTileValueSmall}>{stats.hiLo}</Text>
                <Text style={styles.statTileSub}>highest • lowest</Text>
              </View>

              {/* Tile 4: CARBS */}
              <View style={styles.statTileItem}>
                <Text style={styles.statTileLabel}>CARBS</Text>
                <Text style={styles.statTileValue}>{stats.carbs}</Text>
                <Text style={styles.statTileSub}>total est.</Text>
              </View>
            </View>

            {/* Verbatim Disclaimer: 13px taupe */}
            <Text style={styles.statDisclaimer}>
              Simple statistics — not medical advice.
            </Text>
          </ScrollView>

      {/* Export / Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <ReportScreen onClose={() => setShowReportModal(false)} />
      </Modal>

      {/* Quick Reading Modal */}
      <QuickReadingModal
        visible={showReadingModal}
        onClose={() => setShowReadingModal(false)}
        onSaved={() => {
          loadChartData();
        }}
      />

      {/* Meal Log Modal */}
      <Modal
        visible={showMealModal}
        animationType="slide"
        onRequestClose={() => setShowMealModal(false)}
      >
        <MealLogScreen
          onBack={() => {
            setShowMealModal(false);
            loadChartData();
          }}
        />
      </Modal>

      {/* Tap-to-preview point modal (3-factor complete data preview, edit notes, delete) */}
      <EntryPreviewModal
        visible={!!selectedPoint}
        entry={selectedPoint ? { ...selectedPoint, entryType: 'reading' } : null}
        onClose={() => setSelectedPoint(null)}
        onSaveNotes={handleSaveNotes}
        onDelete={handleDeleteReading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Abstract art as the background of the app/screen
  screenBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  screenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(246, 239, 227, 0.88)', // warm cream overlay over bohemian art
  },
  container: {
    padding: theme.spacing.screenPadding, // 20px padding
    paddingBottom: 90, // room for floating toolbar
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.sand,
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
  // Export button
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.terracotta,
    borderRadius: 14,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
    ...theme.shadow.ochreGlow,
  },
  exportButtonText: {
    color: theme.colors.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  // 2. Period Selector: SOLID SAND (chips 40px)
  periodSelectorRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.sand, // solid sand
    borderRadius: theme.radius.buttons, // 18
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 14,
  },
  periodChipSelected: {
    backgroundColor: theme.colors.terracotta,
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  periodChipTextSelected: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  // 3. Quick-Add Row: SOLID OCHRE & SOLID TERRACOTTA (minHeight: 48px)
  quickAddRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickAddReadingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ochre, // SOLID OCHRE #D9A441
    borderRadius: 16,
    minHeight: 48,
    gap: 6,
    ...theme.shadow.warm,
  },
  quickAddReadingText: {
    color: theme.colors.ink, // Ink text
    fontSize: 14,
    fontWeight: '700',
  },
  quickAddMealBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.terracotta, // SOLID TERRACOTTA #C1553B
    borderRadius: 16,
    minHeight: 48,
    gap: 6,
    ...theme.shadow.ochreGlow,
  },
  quickAddMealText: {
    color: theme.colors.cream, // Cream text
    fontSize: 14,
    fontWeight: '700',
  },
  // View Switcher Segmented Bar
  viewSwitcherBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.sand,
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 11,
    gap: 5,
  },
  viewTabActive: {
    backgroundColor: theme.colors.terracotta,
  },
  viewTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  viewTabTextActive: {
    color: theme.colors.cream,
    fontWeight: '700',
  },
  // 1. SOLID Chart Card (Sand fill, NO Image inside)
  chartCardSolid: {
    backgroundColor: theme.colors.sand, // SOLID SAND #FBF6EA
    borderRadius: theme.radius.cards, // 18px
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 16,
    ...theme.shadow.warm,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  chartSubtitleText: {
    fontSize: 12,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  badgeSolid: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  badgeSolidText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  // Chart Canvas: SOLID CREAM background, ochre line #D9A441, grid ink at 15% opacity
  chartCanvasSolid: {
    backgroundColor: theme.colors.cream, // SOLID CREAM #F6EFE3
    borderRadius: 14,
    padding: 10,
    minHeight: 220,
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  gridLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 10,
    color: theme.colors.taupe,
    width: 28,
    fontWeight: '600',
  },
  gridDashes: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(78, 55, 40, 0.15)', // Grid ink at 15% opacity
    marginLeft: 4,
  },
  targetBandArea: {
    position: 'absolute',
    left: 38,
    right: 10,
    backgroundColor: 'rgba(138, 139, 108, 0.18)', // Faded olive tint
    borderRadius: 6,
    justifyContent: 'flex-start',
    padding: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(138, 139, 108, 0.35)',
  },
  targetBandTitle: {
    fontSize: 10,
    color: theme.colors.olive,
    fontWeight: '700',
  },
  plotArea: {
    flex: 1,
    marginLeft: 32,
    justifyContent: 'flex-end',
  },
  pointsScrollContainer: {
    flexDirection: 'row',
    paddingLeft: 34,
    paddingRight: 20,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  factorCard: {
    width: 106,
    backgroundColor: theme.colors.sand,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  medStatusRow: {
    marginBottom: 6,
    width: '100%',
    alignItems: 'center',
    minHeight: 20,
  },
  medTakenPill: {
    backgroundColor: '#FDE8E4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: theme.colors.terracotta,
  },
  medTakenText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.terracotta,
  },
  medNotTakenPill: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  medNotTakenText: {
    fontSize: 9.5,
    color: theme.colors.taupe,
    fontWeight: '500',
  },
  medEmptyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medEmptyText: {
    fontSize: 9.5,
    color: theme.colors.taupe,
    opacity: 0.5,
  },
  glucoseValueBadge: {
    width: 76,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  glucoseValueNum: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  glucoseValueUnitText: {
    fontSize: 8.5,
    color: theme.colors.taupe,
    fontWeight: '600',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  mealProximityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  mealProximityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateTimeContainer: {
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 5,
    width: '100%',
  },
  timeLabelText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  dateLabelText: {
    fontSize: 9,
    color: theme.colors.taupe,
    marginTop: 1,
  },
  // 3-Factor Legend
  factorLegendBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendEmoji: {
    fontSize: 11,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
  // View 2: Daily Average Styles
  dailyViewContainer: {
    backgroundColor: theme.colors.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  dailyBarsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    gap: 12,
    minWidth: '100%',
  },
  dailyBarCol: {
    alignItems: 'center',
    width: 44,
  },
  dailyBarValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 4,
  },
  dailyBarTrack: {
    width: 22,
    height: 110,
    backgroundColor: 'rgba(78, 55, 40, 0.08)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  dailyTargetBandGuide: {
    position: 'absolute',
    top: '35%',
    bottom: '30%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(138, 139, 108, 0.20)',
  },
  dailyBarFill: {
    width: '100%',
    borderRadius: 6,
  },
  dailyBarDateText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.ink,
    marginTop: 6,
  },
  dailyBarMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  dailyBarCountText: {
    fontSize: 9,
    color: theme.colors.taupe,
  },
  dailyBarMedText: {
    fontSize: 9,
  },
  // View 3: Context Breakdown Styles
  contextViewContainer: {
    backgroundColor: theme.colors.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  deltaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  deltaIconCol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE8E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deltaTextCol: {
    flex: 1,
  },
  deltaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.taupe,
    textTransform: 'uppercase',
  },
  deltaValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.terracotta,
    marginVertical: 2,
  },
  deltaSub: {
    fontSize: 11,
    color: theme.colors.taupe,
  },
  contextGrid: {
    gap: 10,
  },
  contextCardItem: {
    backgroundColor: theme.colors.sand,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  contextCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contextCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  contextCardCount: {
    fontSize: 11,
    color: theme.colors.taupe,
    fontWeight: '600',
  },
  contextCardValue: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.ink,
  },
  contextCardUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.taupe,
  },
  contextCardSub: {
    fontSize: 11,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  emptyChartNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyNoticeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.readingChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyChartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyChartSubtitle: {
    fontSize: 12,
    color: theme.colors.taupe,
    textAlign: 'center',
  },
  // 5. SOLID Stat Tiles (Sand fill, 18px radius, terracotta bold values)
  statTilesContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statTileItem: {
    flex: 1,
    backgroundColor: theme.colors.sand, // SOLID SAND #FBF6EA
    borderRadius: theme.radius.cards, // 18px
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 74,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  statTileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.taupe,
    letterSpacing: 0.5,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statTileValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.terracotta, // Terracotta bold values
  },
  statTileValueSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.terracotta,
    textAlign: 'center',
  },
  statTileSub: {
    fontSize: 10,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  statDisclaimer: {
    fontSize: 13,
    color: theme.colors.taupe,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
