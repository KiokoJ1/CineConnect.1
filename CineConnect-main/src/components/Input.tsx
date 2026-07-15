import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  /** Render a taller multiline box (e.g. job description). */
  textarea?: boolean;
  /** Inline validation message shown below the field; also reddens the border. */
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, textarea = false, error, style, ...rest },
  ref,
) {
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, textarea && styles.textarea, error ? styles.inputError : null, style]}
        multiline={textarea}
        textAlignVertical={textarea ? 'top' : 'center'}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    input: {
      height: layout.inputHeight,
      backgroundColor: colors.surface,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      fontSize: 15,
      color: colors.textPrimary,
    },
    textarea: {
      height: 140,
      paddingTop: spacing.md,
    },
    inputError: {
      borderColor: colors.primary,
    },
    errorText: {
      ...typography.caption,
      color: colors.primary,
      marginTop: spacing.xs,
    },
  });
