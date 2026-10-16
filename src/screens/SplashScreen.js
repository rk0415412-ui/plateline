import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  StatusBar,
  Dimensions,
  Text,
  Image,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = Math.min(SCREEN_WIDTH * 0.62, 250);

/**
 * SplashScreen — Signature PlateLine Native Handoff & Intro Sequence
 *
 * Sequence (Total <= 3.0s, tappable to skip):
 * 1. Plate on cream (#F6EFE3) mounts -> onReady() triggers SplashScreen.hideAsync()
 * 2. Plate fades in and scales smoothly (T=0..400ms)
 * 3. Fork slides from left, Spoon slides from right (T=350..750ms)
 * 4. Pulse wave appears inside plate (T=750..1200ms)
 * 5. "PlateLine / every plate, every pulse" typography floats in (T=1150..1550ms)
 * 6. Hold brand mark (T=1550..2500ms)
 * 7. Cross-fade into Home (T=2500..2800ms)
 *
 * Fault Tolerance (Rule 24): If any asset fails, degrades immediately to
 * a clean static splash rather than freezing.
 */
export default function SplashScreen({ onReady, onFinish }) {
  const [hasError, setHasError] = useState(false);

  // Animation values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const plateOpacity = useRef(new Animated.Value(0.9)).current;
  const plateScale = useRef(new Animated.Value(0.92)).current;

  const forkTranslateX = useRef(new Animated.Value(-50)).current;
  const forkOpacity = useRef(new Animated.Value(0)).current;

  const spoonTranslateX = useRef(new Animated.Value(50)).current;
  const spoonOpacity = useRef(new Animated.Value(0)).current;

  const pulseScale = useRef(new Animated.Value(0.7)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  const textTranslateY = useRef(new Animated.Value(12)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const isFinishedRef = useRef(false);

  const finish = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onFinish && onFinish();
    });
  }, [containerOpacity, onFinish]);

  const handleLayoutReady = useCallback(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);

  useEffect(() => {
    // Notify native splash on layout
    handleLayoutReady();

    if (hasError) {
      // Degrade gracefully to clean static splash (Rule 24)
      const errTimer = setTimeout(finish, 1400);
      return () => clearTimeout(errTimer);
    }

    // Step-by-step choreographic animation
    Animated.sequence([
      // 1. Plate entrance
      Animated.parallel([
        Animated.timing(plateOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(plateScale, {
          toValue: 1,
          friction: 7,
          tension: 45,
          useNativeDriver: true,
        }),
      ]),

      // 2. Fork slides from left, Spoon slides from right
      Animated.parallel([
        Animated.timing(forkOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(forkTranslateX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(spoonOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.spring(spoonTranslateX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // 3. Pulse line draws/emerges inside plate
      Animated.parallel([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(pulseScale, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),

      // 4. Brand Typography floats up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),

      // 5. Brief hold so user absorbs the brand mark
      Animated.delay(650),
    ]).start(() => {
      finish();
    });

    // Hard fallback safety timer: maximum 3.0 seconds total
    const maxTimer = setTimeout(finish, 2900);
    return () => clearTimeout(maxTimer);
  }, [finish, handleLayoutReady, hasError, plateOpacity, plateScale, forkOpacity, forkTranslateX, spoonOpacity, spoonTranslateX, pulseOpacity, pulseScale, textOpacity, textTranslateY]);

  return (
    <TouchableWithoutFeedback onPress={finish} accessibilityRole="button" accessibilityLabel="Skip intro">
      <Animated.View
        style={[styles.container, { opacity: containerOpacity }]}
        onLayout={handleLayoutReady}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#F6EFE3" />

        {hasError ? (
          /* Rule 24: Degrade to clean static splash on error */
          <View style={styles.logoStage}>
            <Image
              source={require('../../assets/splash-icon.png')}
              style={styles.staticFallback}
              resizeMode="contain"
            />
          </View>
        ) : (
          /* Multi-layered sequence */
          <View style={styles.logoStage}>
            {/* Layer 1: Plate on cream background */}
            <Animated.Image
              source={require('../../assets/splash-plate.png')}
              style={[
                styles.layerImage,
                {
                  opacity: plateOpacity,
                  transform: [{ scale: plateScale }],
                },
              ]}
              resizeMode="contain"
              onError={() => setHasError(true)}
            />

            {/* Layer 2: Fork sliding from left */}
            <Animated.Image
              source={require('../../assets/splash-fork.png')}
              style={[
                styles.layerImage,
                {
                  opacity: forkOpacity,
                  transform: [{ translateX: forkTranslateX }],
                },
              ]}
              resizeMode="contain"
              onError={() => setHasError(true)}
            />

            {/* Layer 3: Spoon sliding from right */}
            <Animated.Image
              source={require('../../assets/splash-spoon.png')}
              style={[
                styles.layerImage,
                {
                  opacity: spoonOpacity,
                  transform: [{ translateX: spoonTranslateX }],
                },
              ]}
              resizeMode="contain"
              onError={() => setHasError(true)}
            />

            {/* Layer 4: Pulse wave inside plate */}
            <Animated.Image
              source={require('../../assets/splash-pulse.png')}
              style={[
                styles.layerImage,
                {
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                },
              ]}
              resizeMode="contain"
              onError={() => setHasError(true)}
            />
          </View>
        )}

        {/* Brand Typography */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>
            <Text style={styles.titlePlate}>Plate</Text>
            <Text style={styles.titleLine}>Line</Text>
          </Text>
          <Text style={styles.brandTagline}>every plate, every pulse</Text>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6EFE3', // identical native splash cream background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoStage: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  layerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  staticFallback: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  brandTitle: {
    fontSize: 34,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  titlePlate: {
    color: '#4E3728', // Ink
    fontWeight: '700',
  },
  titleLine: {
    color: '#C1553B', // Terracotta
    fontWeight: '300',
  },
  brandTagline: {
    fontSize: 14,
    color: '#766355', // Taupe
    letterSpacing: 0.8,
    fontWeight: '400',
  },
});
