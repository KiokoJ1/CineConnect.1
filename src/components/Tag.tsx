import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'red' | 'red-outline' | 'blue-outline' | 'green' | 'grey';

interface TagProps {
  label: string;
  variant?: Variant;
}

/** Small rounded category / status tag. */
export function Tag({ label, variant = 'red' }: TagProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const variants = getVariants(colors);
  const v = variants[variant];
  return (
    <View style={[styles.tag, v.container]}>
      <Text style={[styles.label, v.label]}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      alignSelf: 'flex-start',
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
    },
  });

const getVariants = (
  colors: ThemeColors,
): Record<Variant, { container: object; label: { color: string } }> => ({
  red: {
    container: { backgroundColor: colors.primary },
    label: { color: colors.textOnPrimary },
  },
  'red-outline': {
    container: { backgroundColor: colors.primarySoft },
    label: { color: colors.primary },
  },
  'blue-outline': {
    container: { backgroundColor: colors.infoSoft },
    label: { color: colors.info },
  },
  green: {
    container: { backgroundColor: colors.successSoft },
    label: { color: colors.success },
  },
  grey: {
    container: { backgroundColor: colors.border },
    label: { color: colors.textSecondary },
  },
});
