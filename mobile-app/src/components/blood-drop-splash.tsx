import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { BloodDrop } from './blood-drop';
import { Brand } from '@/constants/brand';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

export function BloodDropSplash() {
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => setVisible(false));
    }, 900);
    return () => clearTimeout(timer);
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <BloodDrop size={96} />
      <Animated.Text style={styles.title}>{Strings.appName}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  title: {
    color: Brand.white,
    fontSize: 22,
    fontWeight: '700',
    marginTop: Spacing.three,
  },
});