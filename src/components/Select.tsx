import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { Typography } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

interface SelectProps {
  label?: string;
  placeholder: string;
  value: string | null;
  options: readonly string[];
  onChange: (value: string) => void;
}

/** Tap-to-open option picker styled like the rounded input fields. */
export function Select({ label, placeholder, value, options, onChange }: SelectProps) {
  const [open, setOpen] = useState(false);
  const { colors, typography } = useTheme();
  const styles = getStyles(colors, typography);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.value, !value && styles.placeholder]}>{value ?? placeholder}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            {options.map((opt) => {
              const selected = opt === value;
              return (
                <Pressable
                  key={opt}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, typography: Typography) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      marginBottom: spacing.sm,
    },
    field: {
      height: layout.inputHeight,
      backgroundColor: colors.surface,
      borderRadius: radius.input,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    value: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    placeholder: {
      color: colors.textMuted,
    },
    chevron: {
      fontSize: 18,
      color: colors.textMuted,
    },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    sheetTitle: {
      ...typography.headingM,
      marginBottom: spacing.md,
    },
    option: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderRadius: radius.input,
      minHeight: 44,
    },
    optionSelected: {
      backgroundColor: colors.primarySoft,
    },
    optionText: {
      ...typography.body,
    },
    optionTextSelected: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
