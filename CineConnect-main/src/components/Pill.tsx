import { Pressable, StyleSheet, Text } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface PillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Horizontal category filter pill — red filled when active, grey when not. */
export function Pill({ label, active, onPress }: PillProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      marginRight: spacing.sm,
      minHeight: 36,
      justifyContent: 'center',
    },
    active: {
      backgroundColor: colors.primary,
    },
    inactive: {
      backgroundColor: colors.border,
    },
    pressed: {
      opacity: 0.8,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
    },
    labelActive: {
      color: colors.textOnPrimary,
    },
    labelInactive: {
      color: colors.textPrimary,
    },
  });
