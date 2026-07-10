import { StyleSheet, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface ProgressBarProps {
  /** 0..100 */
  percent: number;
}

export function ProgressBar({ percent }: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    track: {
      height: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
  });
