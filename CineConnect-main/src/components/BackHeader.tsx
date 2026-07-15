import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { layout, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface BackHeaderProps {
  label: string;
  /** Bold dark style (e.g. "← Post a Job") vs muted ("← Back to jobs"). */
  emphasis?: 'bold' | 'muted';
  onPress?: () => void;
}

export function BackHeader({ label, emphasis = 'muted', onPress }: BackHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const handlePress = onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <Pressable
      onPress={handlePress}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={[styles.label, emphasis === 'bold' ? styles.bold : styles.muted]}>
        ← {label}
      </Text>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      paddingVertical: spacing.sm,
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontSize: 18,
    },
    bold: {
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 22,
    },
    muted: {
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
