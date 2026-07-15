import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { homeRouteForRole } from '@/utils/routing';

const ONBOARDED_KEY = 'cc_onboarded';

export default function SplashScreen() {
  const router = useRouter();
  const { hydrating, token, role } = useAuthStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [opacity]);

  useEffect(() => {
    if (hydrating) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (token) {
        router.replace(homeRouteForRole(role));
        return;
      }
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (cancelled) return;
      router.replace(onboarded ? '/login' : '/onboarding');
    }, 1400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hydrating, token, role, router]);

  return (
    <View style={styles.container}>
      {/* Splash always renders on the dark branded background (colors.splash
          is identical in both palettes by design), so light content reads
          correctly regardless of the user's theme preference. */}
      <StatusBar style="light" />
      <Animated.View style={[styles.content, { opacity }]}>
        <View style={styles.icon}>
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerDot} />
          </View>
        </View>
        <Text style={styles.title}>CineConnectKE</Text>
        <Text style={styles.subtitle}>Kenya&apos;s Film Workforce, Connected</Text>
        <View style={styles.rule} />
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.splash,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      alignItems: 'center',
    },
    icon: {
      width: 96,
      height: 96,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxl,
    },
    iconOuterRing: {
      width: 52,
      height: 52,
      borderRadius: radius.circle,
      borderWidth: 3,
      borderColor: colors.textOnPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconInnerDot: {
      width: 18,
      height: 18,
      borderRadius: radius.circle,
      backgroundColor: colors.textOnPrimary,
    },
    title: {
      ...typography.headingXL,
      color: colors.textOnPrimary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    rule: {
      width: 120,
      height: 3,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      marginTop: spacing.xxl,
    },
  });
