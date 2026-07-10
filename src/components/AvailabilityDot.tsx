import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface AvailabilityDotProps {
  availability?: 'available' | 'on_project';
  /** Override the label colour (e.g. green text on the profile header). */
  labelColor?: string;
}

export function AvailabilityDot({ availability = 'available', labelColor }: AvailabilityDotProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isAvailable = availability === 'available';
  const dotColor = isAvailable ? colors.success : colors.textMuted;
  const text = isAvailable ? 'Available' : 'On Project';
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: labelColor ?? (isAvailable ? colors.success : colors.textSecondary) }]}>
        {text}
      </Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: radius.circle,
      marginRight: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
