import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import DevTimestampTestScreen from './DevTimestampTestScreen';

export default function TimelineScreen() {
  const [showDevTest, setShowDevTest] = useState(false);

  if (showDevTest) {
    return <DevTimestampTestScreen onBack={() => setShowDevTest(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timeline</Text>
          <Text style={styles.headerSubtitle}>
            Meals, glucose readings & therapy timing on one unified view
          </Text>
        </View>

        {/* Milestone 2 Verification Card */}
        <View style={styles.devCard}>
          <View style={styles.devHeaderRow}>
            <View style={styles.devIconCircle}>
              <Ionicons name="flask-outline" size={24} color={theme.colors.accentMint} />
            </View>
            <View style={styles.devTitleColumn}>
              <Text style={styles.devCardTitle}>Milestone 2 Verification</Text>
              <Text style={styles.devCardSubtitle}>Timestamp Stability & SQLite</Text>
            </View>
          </View>
          <Text style={styles.devDescription}>
            Proves Hard Rule 6: saves record to SQLite, simulates reload, edits non-time notes field, and verifies local timestamp is 100% unchanged.
          </Text>
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => setShowDevTest(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Run Timestamp Stability Test"
          >
            <Ionicons name="play-circle-outline" size={22} color="#0F172A" />
            <Text style={styles.devButtonText}>Run Timestamp Stability Test</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="time-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Unified Proximity Timeline</Text>
          <Text style={styles.cardDescription}>
            Your home-cooked meals, glucose checks, and medication timings will appear here in reverse chronological order.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SQLite Layer Ready (Milestone 2)</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.accentSky} />
          <Text style={styles.infoText}>
            Privacy-First: All entries stay securely in on-device SQLite storage.
          </Text>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.headingLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  devCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  devHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: 12,
  },
  devIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTitleColumn: {
    flex: 1,
  },
  devCardTitle: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  devCardSubtitle: {
    fontSize: 14,
    color: theme.colors.accentMint,
    fontWeight: '600',
  },
  devDescription: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  devButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    minHeight: theme.touchTarget.largeButtonHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  devButtonText: {
    fontSize: theme.typography.bodyLarge,
    fontWeight: '700',
    color: '#0F172A',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.headingSmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  badge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.body,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
