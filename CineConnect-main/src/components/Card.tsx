import { ReactNode } from 'react';
import { Pressable, StyleSheet, StyleProp, View, ViewStyle } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Themed rounded surface with a soft shadow — the standard content card. */
export function Card({ children, onPress, style, padded = true }: CardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const content = (
    <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    padded: {
      padding: spacing.lg,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.995 }],
    },
  });
