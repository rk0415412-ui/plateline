import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export default function MedicalDisclaimerFooter() {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>
        PlateLine is a journaling tool, not a medical device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: theme.colors.cream,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.screenPadding,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: theme.colors.taupe,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
