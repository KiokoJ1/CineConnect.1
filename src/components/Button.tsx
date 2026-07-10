import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { layout, radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { MIN_TOUCH_TARGET } from '@/hooks/useResponsive';

type Variant = 'primary' | 'outline' | 'success' | 'success-outline';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Render at a smaller, list-action size (Shortlist / Decline cards). */
  compact?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  compact = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const variantStyles = getVariantStyles(colors);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // Guarantees a >=44pt touch target even if `compact` or custom `style`
      // shrinks the visible box below the accessible minimum.
      hitSlop={compact ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.full,
        variantStyles[variant].container,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textOnPrimary : colors.primary} />
      ) : (
        <Text
          style={[styles.label, compact && styles.labelCompact, variantStyles[variant].label]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      width: '100%',
    },
    full: {
      height: layout.buttonHeight,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 20,
    },
    compact: {
      height: 44,
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: 16,
      width: undefined,
      alignSelf: 'flex-start',
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      fontWeight: '700',
    },
    labelCompact: {
      fontSize: 15,
    },
  });

const getVariantStyles = (
  colors: ThemeColors,
): Record<Variant, { container: ViewStyle; label: { color: string } }> => ({
  primary: {
    container: { backgroundColor: colors.primary },
    label: { color: colors.textOnPrimary },
  },
  outline: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
    label: { color: colors.primary },
  },
  success: {
    container: { backgroundColor: colors.success },
    label: { color: colors.textOnPrimary },
  },
  'success-outline': {
    container: {
      backgroundColor: colors.successSoft,
      borderWidth: 1.5,
      borderColor: colors.success,
    },
    label: { color: colors.success },
  },
});
