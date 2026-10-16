import React, { useRef, useState, useCallback, useMemo, createContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ImageBackground,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import TimelineScreen from './src/screens/TimelineScreen';
import AddScreen from './src/screens/AddScreen';
import ChartScreen from './src/screens/ChartScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';
import * as ExpoSplashScreen from 'expo-splash-screen';
import MedicalDisclaimerFooter from './src/components/MedicalDisclaimerFooter';
import ErrorBoundary from './src/components/ErrorBoundary';
import { theme } from './src/styles/theme';

// Prevent native splash from auto-hiding early before the first layer is mounted
ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

import { TabBarScrollContext } from './src/context/TabBarScrollContext';
export { TabBarScrollContext };

const TABS = [
  {
    name: 'Home',
    label: 'Home',
    iconFocused: 'home',
    iconOutline: 'home-outline',
  },
  {
    name: 'Timeline',
    label: 'Timeline',
    iconFocused: 'time',
    iconOutline: 'time-outline',
  },
  {
    name: 'Add',
    label: 'Add',
    iconFocused: 'add-circle',
    iconOutline: 'add-circle-outline',
  },
  {
    name: 'Settings',
    label: 'Settings',
    iconFocused: 'settings',
    iconOutline: 'settings-outline',
  },
];

function MainContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const pagerRef = useRef(null);
  const insets = useSafeAreaInsets ? useSafeAreaInsets() : { bottom: 12 };

  // Toolbar animation on scroll
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const isTabBarHidden = useRef(false);
  const lastOffsetY = useRef(0);

  const showTabBar = useCallback(() => {
    if (isTabBarHidden.current) {
      isTabBarHidden.current = false;
      Animated.timing(tabBarTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [tabBarTranslateY]);

  const hideTabBar = useCallback(() => {
    if (!isTabBarHidden.current) {
      isTabBarHidden.current = true;
      Animated.timing(tabBarTranslateY, {
        toValue: 130, // slide completely off screen
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [tabBarTranslateY]);

  const handleScroll = useCallback(
    (event) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastOffsetY.current;

      if (currentY > 40 && diff > 10) {
        // Scrolling down -> hide toolbar
        hideTabBar();
      } else if (diff < -8 || currentY <= 15) {
        // Scrolling up or at top -> show toolbar
        showTabBar();
      }
      lastOffsetY.current = currentY;
    },
    [hideTabBar, showTabBar]
  );

  const handleTabPress = (index) => {
    setActiveTab(index);
    showTabBar();
    if (pagerRef.current) {
      pagerRef.current.setPage(index);
    }
  };

  const handlePageSelected = (e) => {
    const position = e.nativeEvent.position;
    setActiveTab(position);
    showTabBar();
  };

  // Mock navigation object for screens that call navigation.navigate('...')
  const navigation = useMemo(
    () => ({
      navigate: (screenName) => {
        const targetIdx = TABS.findIndex((t) => t.name === screenName);
        if (targetIdx !== -1) {
          handleTabPress(targetIdx);
        }
      },
      goBack: () => {},
      canGoBack: () => false,
    }),
    []
  );

  const handleSplashReady = useCallback(async () => {
    try {
      await ExpoSplashScreen.hideAsync();
    } catch (e) {
      // Safe ignore
    }
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        onReady={handleSplashReady}
        onFinish={handleSplashFinish}
      />
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <NavigationContainer>
        <TabBarScrollContext.Provider value={{ onScroll: handleScroll, showTabBar, hideTabBar }}>
          {/* Third uploaded image as the background of the entire app */}
          <ImageBackground
            source={require('./assets/app_background.jpg')}
            style={styles.appBg}
            resizeMode="cover"
          >
            {/* Soft warm overlay: botanical art visible in margins, all cards solid on top */}
            <View style={styles.appBgOverlay}>
              {/* Swipeable PagerView: Swipe left/right switches tabs smoothly */}
              <PagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={handlePageSelected}
              >
                <View key="home" style={styles.page}>
                  <ChartScreen navigation={navigation} />
                </View>
                <View key="timeline" style={styles.page}>
                  <TimelineScreen navigation={navigation} />
                </View>
                <View key="add" style={styles.page}>
                  <AddScreen navigation={navigation} />
                </View>
                <View key="settings" style={styles.page}>
                  <SettingsScreen navigation={navigation} />
                </View>
              </PagerView>

              {/* Floating Bottom Tab Bar with animated hide/show on scroll */}
              <Animated.View
                style={[
                  styles.tabBarWrapper,
                  {
                    transform: [{ translateY: tabBarTranslateY }],
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                  },
                ]}
              >
                <MedicalDisclaimerFooter />

                <View
                  style={[
                    styles.tabBarContainer,
                    { paddingBottom: Math.max(insets?.bottom || 8, 8) },
                  ]}
                >
                  {TABS.map((tab, idx) => {
                    const isFocused = activeTab === idx;
                    const color = isFocused
                      ? theme.colors.terracotta
                      : theme.colors.tabInactive;

                    return (
                      <TouchableOpacity
                        key={tab.name}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={tab.label}
                        testID={`tab-${tab.name.toLowerCase()}`}
                        onPress={() => handleTabPress(idx)}
                        activeOpacity={0.7}
                        style={styles.tabButton}
                      >
                        <Ionicons
                          name={isFocused ? tab.iconFocused : tab.iconOutline}
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
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </View>
          </ImageBackground>
        </TabBarScrollContext.Provider>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <MainContent />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  appBgOverlay: {
    flex: 1,
    backgroundColor: 'rgba(246, 239, 227, 0.78)', // subtle warm tint over botanical art
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  tabBarWrapper: {
    backgroundColor: theme.colors.cream, // Solid cream
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    ...theme.shadow.warm,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 8,
    minHeight: 64, // Large tap target height
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.spacing.touchTargetMin,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
