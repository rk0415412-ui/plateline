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
    backgroundColor: theme.colors.footerBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: theme.colors.footerText,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
