import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../styles/theme';
import { listAllReadings, listAllMeals, getSetting, getAllSettings } from '../db';
import { nowLocalMinute, formatDisplay } from '../lib/time';
import MedicalDisclaimerFooter from '../components/MedicalDisclaimerFooter';

export default function ReportScreen({ onClose }) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [showPdfOptionsModal, setShowPdfOptionsModal] = useState(false);

  /**
   * Generate Clinician PDF specifically tailored for Type 2 Diabetes Remission
   * Includes metrics: Time in target band, glycemic variability, average, high/low excursions,
   * along with complete log of readings and home-cooked meals with timestamps.
   */
  const handleGeneratePdf = async (mode = 'share') => {
    try {
      setIsGeneratingPdf(true);
      setShowPdfOptionsModal(false);

      const [readings, meals, unitSetting, lowSetting, highSetting] = await Promise.all([
        listAllReadings(),
        listAllMeals(),
        getSetting('glucose_unit', 'mg/dL'),
        getSetting('target_low', '70'),
        getSetting('target_high', '140'),
      ]);

      const unit = unitSetting || 'mg/dL';
      const targetLow = parseInt(lowSetting || '70', 10) || 70;
      const targetHigh = parseInt(highSetting || '140', 10) || 140;

      // Stats calculations for T2D Remission
      const validReadings = (readings || []).filter(
        (r) => !isNaN(Number(r.value)) && Number(r.value) > 0
      );
      const values = validReadings.map((r) => Number(r.value));

      let avgVal = '—';
      let stdDevVal = '—';
      let inRangePercent = '—';
      let inRangeCount = 0;
      let highsCount = 0;
      let lowsCount = 0;

      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        avgVal = unit === 'mmol/L' ? (avg / 18.0182).toFixed(1) : Math.round(avg);

        if (values.length > 1) {
          const variance =
            values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (values.length - 1);
          const dev = Math.sqrt(variance);
          stdDevVal = unit === 'mmol/L' ? (dev / 18.0182).toFixed(1) : Math.round(dev);
        } else {
          stdDevVal = '0';
        }

        values.forEach((v) => {
          if (v >= targetLow && v <= targetHigh) inRangeCount++;
          else if (v > targetHigh) highsCount++;
          else if (v < targetLow) lowsCount++;
        });

        inRangePercent = Math.round((inRangeCount / values.length) * 100);
      }

      // Combine chronological entries
      const combinedEvents = [
        ...validReadings.map((r) => ({
          type: 'Reading',
          time: r.recordedAt,
          value: unit === 'mmol/L' ? `${(Number(r.value) / 18.0182).toFixed(1)} mmol/L` : `${r.value} mg/dL`,
          detail: r.context || 'Context not specified',
          notes: r.notes || '—',
          status: Number(r.value) > targetHigh ? 'High' : Number(r.value) < targetLow ? 'Low' : 'In-Range',
        })),
        ...(meals || []).map((m) => ({
          type: 'Meal',
          time: m.created_at || m.recordedAt,
          value: m.meal_type || 'Meal',
          detail: m.description || 'Home meal',
          notes: [
            m.carbs !== null && m.carbs !== undefined ? `~${m.carbs}g carbs` : null,
            m.note || null,
          ].filter(Boolean).join(' | ') || '—',
          status: m.carbs !== null && m.carbs !== undefined ? `${m.carbs}g carbs` : 'Logged',
        })),
      ].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

      // Generate HTML string for A4 PDF print
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>PlateLine Clinician Report - Type 2 Diabetes Remission</title>
          <style>
            @page { size: A4; margin: 18mm 14mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #4E3728;
              background: #FFFFFF;
              margin: 0;
              padding: 0;
              font-size: 11pt;
              line-height: 1.4;
            }
            .header-banner {
              border-bottom: 2px solid #C1553B;
              padding-bottom: 12px;
              margin-bottom: 16px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .brand-title {
              font-size: 24pt;
              font-weight: 800;
              color: #C1553B;
              margin: 0 0 2px;
            }
            .report-title {
              font-size: 13pt;
              font-weight: 700;
              color: #4E3728;
              margin: 0 0 2px;
            }
            .report-subtitle {
              font-size: 9pt;
              color: #8C7462;
              margin: 0;
            }
            .meta-box {
              text-align: right;
              font-size: 9pt;
              color: #8C7462;
            }
            /* Stats Grid */
            .stats-container {
              display: flex;
              gap: 10px;
              margin-bottom: 20px;
            }
            .stat-card {
              flex: 1;
              background: #FBF6EA;
              border: 1px solid #E6DAC7;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
            }
            .stat-label {
              font-size: 8pt;
              font-weight: 700;
              color: #8C7462;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .stat-value {
              font-size: 18pt;
              font-weight: 800;
              color: #C1553B;
              line-height: 1;
              margin-bottom: 2px;
            }
            .stat-sub {
              font-size: 8pt;
              color: #8C7462;
            }
            /* Remission Overview Box */
            .remission-box {
              background: #F6EFE3;
              border-left: 4px solid #8A8B6C;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 20px;
              font-size: 9.5pt;
            }
            .remission-title {
              font-weight: 700;
              color: #4E3728;
              margin-bottom: 2px;
            }
            /* Table */
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 9pt;
            }
            th {
              background: #FBF6EA;
              color: #4E3728;
              font-weight: 700;
              text-align: left;
              padding: 8px 6px;
              border-bottom: 1.5px solid #C1553B;
            }
            td {
              padding: 7px 6px;
              border-bottom: 1px solid #E6DAC7;
              vertical-align: top;
            }
            tr:nth-child(even) td {
              background: #FAF7F0;
            }
            .badge-reading {
              color: #D9A441;
              font-weight: 700;
            }
            .badge-meal {
              color: #C1553B;
              font-weight: 700;
            }
            .status-tag {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 7.5pt;
              font-weight: 700;
            }
            .tag-inrange { background: #E8F0E2; color: #446835; }
            .tag-high { background: #FDE8E4; color: #9E3D2A; }
            .tag-low { background: #FFF3DA; color: #A06B1A; }
            .tag-meal { background: #F5EAE5; color: #C1553B; }
            .footer {
              margin-top: 24px;
              padding-top: 10px;
              border-top: 1px solid #E6DAC7;
              font-size: 8pt;
              color: #8C7462;
              text-align: center;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="brand-title">PlateLine</div>
              <div class="report-title">Type 2 Diabetes Remission & Glucose Journal</div>
              <div class="report-subtitle">Longitudinal Journal for Clinical Review & Consultation</div>
            </div>
            <div class="meta-box">
              <div><strong>Generated:</strong> ${formatDisplay(nowLocalMinute(), { includeDate: true, includeTime: true })}</div>
              <div><strong>Target Band:</strong> ${targetLow} – ${targetHigh} ${unit}</div>
              <div><strong>Records:</strong> ${validReadings.length} readings, ${meals.length} meals</div>
            </div>
          </div>

          <div class="remission-box">
            <div class="remission-title">Clinical Remission Monitoring Focus</div>
            Self-monitored home journal tracking dietary carbs, post-meal glucose proximity, and medication consistency. Timestamps are stored in strict local time with zero timezone distortion.
          </div>

          <div class="stats-container">
            <div class="stat-card">
              <div class="stat-label">Average Glucose</div>
              <div class="stat-value">${avgVal}</div>
              <div class="stat-sub">${unit}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Variability (SD)</div>
              <div class="stat-value">±${stdDevVal}</div>
              <div class="stat-sub">${unit} (Glycemic Dev)</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Time In Target</div>
              <div class="stat-value">${inRangePercent}%</div>
              <div class="stat-sub">${inRangeCount} of ${values.length} in range</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Excursions</div>
              <div class="stat-value">${highsCount} / ${lowsCount}</div>
              <div class="stat-sub">Highs / Lows</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 18%;">Date & Time</th>
                <th style="width: 10%;">Type</th>
                <th style="width: 18%;">Reading / Meal</th>
                <th style="width: 20%;">Context / Food Details</th>
                <th style="width: 22%;">Medicine & Notes</th>
                <th style="width: 12%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${combinedEvents
                .map(
                  (item) => `
                <tr>
                  <td><strong>${formatDisplay(item.time, { includeDate: true, includeTime: true })}</strong></td>
                  <td><span class="${item.type === 'Reading' ? 'badge-reading' : 'badge-meal'}">${item.type}</span></td>
                  <td><strong>${item.value}</strong></td>
                  <td>${item.detail}</td>
                  <td>${item.notes}</td>
                  <td>
                    <span class="status-tag ${
                      item.status === 'In-Range'
                        ? 'tag-inrange'
                        : item.status === 'High'
                        ? 'tag-high'
                        : item.status === 'Low'
                        ? 'tag-low'
                        : 'tag-meal'
                    }">
                      ${item.status}
                    </span>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <strong>Medical Disclaimer:</strong> PlateLine is a journaling tool, not a medical device. This report compiles self-recorded personal journal entries and is intended solely for reference during consultations with licensed healthcare providers.
          </div>
        </body>
        </html>
      `;

      if (mode === 'print') {
        await Print.printAsync({ html: htmlContent });
        return;
      }

      // mode === 'share' -> Generate PDF file and trigger native share sheet
      let pdfUri = null;
      try {
        const file = await Print.printToFileAsync({
          html: htmlContent,
          base64: true,
        });

        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const cleanName = `PlateLine_Report_${Date.now()}.pdf`;
        let destUri = `${cacheDir}${cleanName}`;
        if (!destUri.startsWith('file://')) {
          destUri = `file://${destUri}`;
        }

        if (file && file.base64) {
          await FileSystem.writeAsStringAsync(destUri, file.base64, {
            encoding: FileSystem.EncodingType?.Base64 || 'base64',
          });
          pdfUri = destUri;
        } else if (file && file.uri) {
          await FileSystem.copyAsync({
            from: file.uri,
            to: destUri,
          });
          pdfUri = destUri;
        }
      } catch (fileErr) {
        console.warn('printToFileAsync error:', fileErr);
        Alert.alert('PDF Error', `Could not create PDF file: ${fileErr.message}`);
        return;
      }

      if (pdfUri) {
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(pdfUri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Share PlateLine Report (WhatsApp, Telegram, etc.)',
            });
          } else {
            Alert.alert(
              'Sharing Unavailable',
              'Native file sharing is not supported on this platform. Please use "System Print / Save as PDF".'
            );
          }
        } catch (shareErr) {
          console.error('Sharing.shareAsync error:', shareErr);
          Alert.alert('Sharing Failed', `Could not share PDF: ${shareErr.message}`);
        }
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      Alert.alert('PDF Export', `Could not complete PDF export: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  /**
   * Export Complete SQLite Database as a real downloadable .json file
   */
  const handleExportJson = async () => {
    try {
      setIsExportingJson(true);

      const [readings, meals] = await Promise.all([
        listAllReadings(),
        listAllMeals(),
      ]);

      // Gather settings individually to avoid getAllSettings issues
      let settingsObj = {};
      try {
        const allSettings = await getAllSettings();
        settingsObj = allSettings || {};
      } catch (settingsErr) {
        console.warn('getAllSettings failed, using defaults:', settingsErr);
        settingsObj = {
          glucose_unit: 'mg/dL',
          target_low: '70',
          target_high: '140',
        };
      }

      const backupPayload = {
        app: 'PlateLine',
        version: '0.1',
        exportedAt: nowLocalMinute(),
        exportType: 'Full SQLite Journal Backup',
        statistics: {
          totalReadings: (readings || []).length,
          totalMeals: (meals || []).length,
        },
        settings: settingsObj,
        readings: readings || [],
        meals: meals || [],
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const filename = `PlateLine_Backup_${Date.now()}.json`;

      let shared = false;
      try {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (cacheDir) {
          const fileUri = `${cacheDir}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType?.UTF8 || 'utf8',
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Save PlateLine JSON Backup',
            });
            shared = true;
          }
        }
      } catch (fileErr) {
        console.warn('FileSystem backup share failed, falling back to Share.share:', fileErr);
      }

      if (!shared) {
        await Share.share({
          title: filename,
          message: jsonString,
        });
      }
    } catch (err) {
      console.error('JSON Export Error:', err);
      Alert.alert('JSON Export Failed', `Could not export JSON backup: ${err.message}`);
    } finally {
      setIsExportingJson(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Clinician Report</Text>
          <Text style={styles.headerSubtitle}>
            A4 PDF export & data backup for T2D remission
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close report"
          >
            <Ionicons name="close" size={24} color={theme.colors.ink} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* PDF Generator Card */}
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={32} color={theme.colors.terracotta} />
          </View>
          <Text style={styles.cardTitle}>Doctor Consultation PDF</Text>
          <Text style={styles.cardDescription}>
            Generate an on-device, print-ready A4 PDF summary with Time in Range, glycemic variability, meal descriptions, and medication timings for your clinician.
          </Text>

          <TouchableOpacity
            style={[styles.primaryButton, isGeneratingPdf && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={() => setShowPdfOptionsModal(true)}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <ActivityIndicator color={theme.colors.cream} size="small" />
            ) : (
              <Ionicons name="share-outline" size={18} color={theme.colors.cream} />
            )}
            <Text style={styles.primaryButtonText}>
              {isGeneratingPdf ? 'Generating PDF...' : 'Export / Share PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* JSON Backup Card */}
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.readingChipBg }]}>
            <Ionicons name="download-outline" size={32} color={theme.colors.ochre} />
          </View>
          <Text style={styles.cardTitle}>Complete Data Export</Text>
          <Text style={styles.cardDescription}>
            Export your entire SQLite database as a real .json backup file for offline archiving, personal records, or data migration.
          </Text>

          <TouchableOpacity
            style={[styles.secondaryButton, isExportingJson && styles.buttonDisabled]}
            activeOpacity={0.85}
            onPress={handleExportJson}
            disabled={isExportingJson}
          >
            {isExportingJson ? (
              <ActivityIndicator color={theme.colors.ink} size="small" />
            ) : (
              <Ionicons name="folder-open-outline" size={18} color={theme.colors.ink} />
            )}
            <Text style={styles.secondaryButtonText}>
              {isExportingJson ? 'Exporting...' : 'Export JSON Backup'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Info Card */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.olive} />
          <Text style={styles.infoText}>
            Privacy Guaranteed: PDFs and JSON backups are compiled entirely on-device with zero cloud transmission.
          </Text>
        </View>
      </ScrollView>

      {/* PDF Export Chooser Modal */}
      <Modal
        visible={showPdfOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPdfOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPdfOptionsModal(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalSheetTitle}>Export Clinician Report</Text>
            <Text style={styles.modalSheetSubtitle}>
              Send a copy of your report or save it as a PDF
            </Text>

            {/* Option 1: Share PDF via Android Share Sheet (Telegram, WhatsApp, etc.) */}
            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.75}
              onPress={() => handleGeneratePdf('share')}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: theme.colors.terracotta }]}>
                <Ionicons name="share-social-outline" size={22} color={theme.colors.cream} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>Send PDF via Apps</Text>
                <Text style={styles.optionDesc}>WhatsApp, Telegram, Google Drive, Email...</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.taupe} />
            </TouchableOpacity>

            {/* Option 2: System Print / Save as PDF */}
            <TouchableOpacity
              style={styles.optionRow}
              activeOpacity={0.75}
              onPress={() => handleGeneratePdf('print')}
            >
              <View style={[styles.optionIconCircle, { backgroundColor: theme.colors.ochre }]}>
                <Ionicons name="print-outline" size={22} color={theme.colors.ink} />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>System Print / Save as PDF</Text>
                <Text style={styles.optionDesc}>Open Android system print & save dialog</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.taupe} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={() => setShowPdfOptionsModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <MedicalDisclaimerFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.cream, // #F6EFE3
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.cream,
  },
  headerLeft: {
    flex: 1,
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
  closeButton: {
    padding: 8,
  },
  container: {
    padding: theme.spacing.screenPadding, // 20
    paddingBottom: 28,
  },
  card: {
    backgroundColor: theme.colors.sand, // #FBF6EA (solid)
    borderRadius: theme.radius.cards, // 18
    padding: 20,
    alignItems: 'center',
    marginBottom: theme.spacing.sectionGap, // 16
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadow.warm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.mealChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: theme.typography.sectionHeader.fontSize,
    fontWeight: theme.typography.sectionHeader.fontWeight,
    color: theme.colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.taupe,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: theme.colors.terracotta,
    borderRadius: theme.radius.buttons, // 18
    minHeight: 52, // 52px primary button
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    ...theme.shadow.ochreGlow,
  },
  primaryButtonText: {
    color: theme.colors.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: theme.colors.cream,
    borderRadius: theme.radius.buttons,
    minHeight: theme.spacing.touchTargetMin,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    width: '100%',
  },
  secondaryButtonText: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 139, 108, 0.12)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.olive,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.ink,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.sand,
    borderTopLeftRadius: theme.radius.modals,
    borderTopRightRadius: theme.radius.modals,
    padding: theme.spacing.screenPadding,
    paddingBottom: 36,
    ...theme.shadow.card,
  },
  modalHandle: {
    width: 44,
    height: 5,
    backgroundColor: theme.colors.taupe,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.6,
  },
  modalSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.ink,
    textAlign: 'center',
  },
  modalSheetSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.taupe,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  optionDesc: {
    fontSize: 12.5,
    color: theme.colors.taupe,
    marginTop: 2,
  },
  cancelBtn: {
    minHeight: 48,
    borderRadius: theme.radius.buttons,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.sand,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.taupe,
  },
});
