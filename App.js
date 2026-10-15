import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import TimelineScreen from './src/screens/TimelineScreen';
import AddScreen from './src/screens/AddScreen';
import ChartScreen from './src/screens/ChartScreen';
import ReportScreen from './src/screens/ReportScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MedicalDisclaimerFooter from './src/components/MedicalDisclaimerFooter';
import { theme } from './src/styles/theme';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Timeline: {
    iconFocused: 'time',
    iconOutline: 'time-outline',
    label: 'Timeline',
  },
  Add: {
    iconFocused: 'add-circle',
    iconOutline: 'add-circle-outline',
    label: 'Add',
  },
  Chart: {
    iconFocused: 'stats-chart',
    iconOutline: 'stats-chart-outline',
    label: 'Chart',
  },
  Report: {
    iconFocused: 'document-text',
    iconOutline: 'document-text-outline',
    label: 'Report',
  },
  Settings: {
    iconFocused: 'settings',
    iconOutline: 'settings-outline',
    label: 'Settings',
  },
};

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.tabBarWrapper}>
      {/* Rule 10: Footer visible on every screen */}
      <MedicalDisclaimerFooter />

      <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || {
            iconFocused: 'ellipse',
            iconOutline: 'ellipse-outline',
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? theme.colors.primary : theme.colors.tabInactive;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || config.label}
              testID={options.tabBarTestID || `tab-${route.name.toLowerCase()}`}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <Ionicons
                name={isFocused ? config.iconFocused : config.iconOutline}
                size={26}
                color={color}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color, fontWeight: isFocused ? '700' : '500' },
                ]}
                numberOfLines={1}
              >
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tab.Screen name="Timeline" component={TimelineScreen} />
          <Tab.Screen name="Add" component={AddScreen} />
          <Tab.Screen name="Chart" component={ChartScreen} />
          <Tab.Screen name="Report" component={ReportScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    backgroundColor: theme.colors.surface,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    minHeight: 64, // Large tap target height
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52, // Large touchable target
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
