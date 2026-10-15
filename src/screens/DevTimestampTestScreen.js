import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import {
  createReading,
  getReadingById,
  updateReading,
  deleteReading,
  resetDatabaseConnection,
} from '../db';
import { nowLocalInputValue, formatDisplay, parseLocalString } from '../lib/time';

export default function DevTimestampTestScreen({ onBack }) {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [testResult, setTestResult] = useState(null); // 'PASS' | 'FAIL' | null
  const [metrics, setMetrics] = useState(null);

  const addLog = (title, status, detail) => {
    setLogs((prev) => [...prev, { title, status, detail, time: new Date().toLocaleTimeString() }]);
  };

  const runProofTest = async () => {
    setRunning(true);
    setLogs([]);
    setTestResult(null);
    setMetrics(null);

    let testRecordId = null;

    try {
      // STEP 1: Generate initial local date-time string
      const initialTimestamp = nowLocalInputValue();
      addLog(
        'Step 1: Capture Local Timestamp',
        'info',
        `Generated: "${initialTimestamp}" (Local time, zero UTC conversion)`
      );

      // Verify no UTC offset or 'Z'
      if (initialTimestamp.includes('Z') || initialTimestamp.includes('+')) {
        throw new Error(`Timestamp contains UTC/timezone offset: ${initialTimestamp}`);
      }

      // STEP 2: Save reading to SQLite
      const initialNotes = 'Test Note: Initial log before reload';
      const created = await createReading({
        value: 126,
        unit: 'mg/dL',
        recordedAt: initialTimestamp,
        context: 'Before meal',
        notes: initialNotes,
      });
      testRecordId = created.id;
      addLog(
        'Step 2: Save to On-Device SQLite',
        'success',
        `Row saved with ID: ${created.id}\nrecordedAt: "${created.recordedAt}"`
      );

      // STEP 3: Simulate App Reload / Cold Storage Retrieval
      // Invalidate in-memory cached handle to simulate cold restart
      resetDatabaseConnection();
      const reloadedRecord = await getReadingById(testRecordId);
      if (!reloadedRecord) {
        throw new Error('Failed to retrieve record after simulated reload');
      }

      const reloadMatch = reloadedRecord.recordedAt === initialTimestamp;
      if (!reloadMatch) {
        throw new Error(
          `Timestamp changed after reload!\nExpected: "${initialTimestamp}"\nGot: "${reloadedRecord.recordedAt}"`
        );
      }
      addLog(
        'Step 3: Simulate App Reload',
        'success',
        `Retrieved from disk.\nrecordedAt: "${reloadedRecord.recordedAt}" (Exact match)`
      );

      // STEP 4: Edit ONLY a non-time field (notes)
      // Slight delay to ensure system clock advances
      await new Promise((resolve) => setTimeout(resolve, 300));
      const updatedNotes = 'Test Note: Edited notes field ONLY';
      await updateReading(testRecordId, { notes: updatedNotes });
      addLog(
        'Step 4: Edit Non-Time Field',
        'info',
        `Updated 'notes' to: "${updatedNotes}"\n(No recordedAt passed in update payload)`
      );

      // STEP 5: Reload from SQLite after edit and verify timestamp stability
      resetDatabaseConnection();
      const finalRecord = await getReadingById(testRecordId);
      if (!finalRecord) {
        throw new Error('Failed to retrieve record after non-time edit');
      }

      const notesUpdated = finalRecord.notes === updatedNotes;
      const timestampUnchanged = finalRecord.recordedAt === initialTimestamp;
      const timeMatchesCharacterByCharacter =
        finalRecord.recordedAt.length === initialTimestamp.length &&
        finalRecord.recordedAt === initialTimestamp;

      addLog(
        'Step 5: Verify Post-Edit Record',
        timestampUnchanged ? 'success' : 'error',
        `Final notes: "${finalRecord.notes}"\nInitial recordedAt: "${initialTimestamp}"\nFinal recordedAt:   "${finalRecord.recordedAt}"`
      );

      if (notesUpdated && timestampUnchanged && timeMatchesCharacterByCharacter) {
        setTestResult('PASS');
        setMetrics({
          initialTimestamp,
          finalTimestamp: finalRecord.recordedAt,
          updatedNotes: finalRecord.notes,
          formattedDisplay: formatDisplay(finalRecord.recordedAt),
          recordId: testRecordId,
        });
      } else {
        setTestResult('FAIL');
      }

      // Cleanup test row
      if (testRecordId) {
        await deleteReading(testRecordId);
        addLog('Step 6: Cleanup Test Data', 'info', 'Test reading row deleted from SQLite.');
      }
    } catch (err) {
      addLog('Test Error', 'error', err.message);
      setTestResult('FAIL');
      if (testRecordId) {
        try {
          await deleteReading(testRecordId);
        } catch (_) {}
      }
    } finally {
      setRunning(false);
    }
  };

  // Run automatically on first mount
  useEffect(() => {
    runProofTest();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Navigation header */}
        <View style={styles.topBar}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
              <Text style={styles.backText}>Back to Settings</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Dev Test: Timestamp Stability Proof</Text>
          <Text style={styles.subtitle}>
            Verifies Hard Rule 6: save record → reload → edit non-time field → confirm timestamp unchanged.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.runButton, running && styles.runButtonDisabled]}
          onPress={runProofTest}
          disabled={running}
          activeOpacity={0.8}
        >
          {running ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="play" size={22} color="#0F172A" />
              <Text style={styles.buttonText}>Re-Run Timestamp Proof Test</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Result Banner */}
        {testResult && (
          <View
            style={[
              styles.resultBanner,
              testResult === 'PASS' ? styles.resultPass : styles.resultFail,
            ]}
          >
            <Ionicons
              name={testResult === 'PASS' ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color={testResult === 'PASS' ? theme.colors.accentMint : '#F87171'}
            />
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultTitle}>
                {testResult === 'PASS'
                  ? 'PASS: Timestamp 100% Stable'
                  : 'FAIL: Timestamp Mismatch Detected'}
              </Text>
              <Text style={styles.resultDescription}>
                {testResult === 'PASS'
                  ? 'Record reloaded from disk and non-time field was edited. The local timestamp remained identical down to the second.'
                  : 'The timestamp shifted or failed validation.'}
              </Text>
            </View>
          </View>
        )}

        {/* Metrics Card */}
        {metrics && (
          <View style={styles.metricsCard}>
            <Text style={styles.metricsTitle}>Verified Comparison Data</Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Initial Timestamp:</Text>
              <Text style={styles.metricValueMono}>{metrics.initialTimestamp}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>After Edit Timestamp:</Text>
              <Text style={styles.metricValueMono}>{metrics.finalTimestamp}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Display Formatted:</Text>
              <Text style={styles.metricValue}>{metrics.formattedDisplay}</Text>
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Non-Time Field (notes):</Text>
              <Text style={styles.metricValue}>{metrics.updatedNotes}</Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.passBadge}>
                <Ionicons name="checkmark-sharp" size={16} color={theme.colors.accentMint} />
                <Text style={styles.passBadgeText}>Exact Match (===)</Text>
              </View>
              <View style={styles.passBadge}>
                <Ionicons name="checkmark-sharp" size={16} color={theme.colors.accentMint} />
                <Text style={styles.passBadgeText}>No UTC Skew</Text>
              </View>
            </View>
          </View>
        )}

        {/* Execution Log */}
        <View style={styles.logContainer}>
          <Text style={styles.logHeader}>Execution Log</Text>
          {logs.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View style={styles.logItemHeader}>
                <Ionicons
                  name={
                    log.status === 'success'
                      ? 'checkmark-circle'
                      : log.status === 'error'
                      ? 'alert-circle'
                      : 'information-circle'
                  }
                  size={20}
                  color={
                    log.status === 'success'
                      ? theme.colors.accentMint
                      : log.status === 'error'
                      ? '#F87171'
                      : theme.colors.accentSky
                  }
                />
                <Text style={styles.logTitle}>{log.title}</Text>
                <Text style={styles.logTime}>{log.time}</Text>
              </View>
              <Text style={styles.logDetail}>{log.detail}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  topBar: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 48,
  },
  backText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.body,
    marginLeft: 8,
    fontWeight: '600',
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.headingLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    minHeight: theme.touchTarget.largeButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: '#0F172A',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    gap: 12,
  },
  resultPass: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  resultFail: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: theme.typography.headingSmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  metricsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricsTitle: {
    fontSize: theme.typography.headingSmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  metricRow: {
    marginBottom: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  metricValueMono: {
    fontSize: 16,
    color: theme.colors.accentSky,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  passBadgeText: {
    color: theme.colors.accentMint,
    fontSize: 14,
    fontWeight: '600',
  },
  logContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logHeader: {
    fontSize: theme.typography.headingSmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  logItem: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm + 4,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  logTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  logDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 28,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
