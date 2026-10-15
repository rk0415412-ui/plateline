import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Report</Text>
          <Text style={styles.headerSubtitle}>
            Clinician-ready PDF export and full data portability
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.cardTitle}>A4 PDF & Data Backup</Text>
          <Text style={styles.cardDescription}>
            Generate an on-device PDF summary for your doctor consultation, or export/import complete JSON records.
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Milestone 1 Placeholder</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="share-social-outline" size={24} color={theme.colors.primaryLight} />
          <Text style={styles.infoText}>
            Local rendering: Created on-device via expo-print and shared directly through your OS share sheet.
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
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
