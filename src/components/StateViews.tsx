import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

export function ErrorState({ label = 'Something went wrong.' }: { label?: string }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

export function EmptyState({ emoji = '🗂️', label }: { emoji?: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    emoji: {
      fontSize: 40,
      marginBottom: spacing.md,
    },
    caption: {
      ...typography.caption,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
