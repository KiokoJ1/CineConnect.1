import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/layout';
import { ThemePreference } from '@/store/themeStore';

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'Auto' },
];

/** Segmented Light / Dark / Auto (follows device) control. */
export function ThemeToggle() {
  const { colors, typography, preference, setPreference } = useTheme();
  const styles = getStyles(colors);

  return (
    <View>
      <Text style={[typography.label, styles.title]}>Appearance</Text>
      <View style={styles.track}>
        {OPTIONS.map((option) => {
          const active = option.key === preference;
          return (
            <Pressable
              key={option.key}
              onPress={() => setPreference(option.key)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    title: {
      marginBottom: spacing.sm,
    },
    track: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.textOnPrimary,
    },
  });
