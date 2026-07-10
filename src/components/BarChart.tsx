import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { EmptyState } from '@/components/StateViews';
import { useTheme } from '@/hooks/useTheme';

interface BarChartProps {
  /** value per label, 0..max */
  data: { label: string; value: number }[] | null | undefined;
  height?: number;
  emptyLabel?: string;
}

/** Simple View-based bar chart. Bars deepen in red toward the right. */
export function BarChart({ data, height = 150, emptyLabel = 'No data yet' }: BarChartProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const safeData = Array.isArray(data) ? data.filter((d) => d && typeof d.value === 'number' && !isNaN(d.value)) : [];

  if (safeData.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <EmptyState label={emptyLabel} />
      </View>
    );
  }

  // 0 is a valid max (e.g. all-zero data) but must never divide by zero.
  const max = Math.max(...safeData.map((d) => d.value), 1) || 1;

  return (
    <View style={[styles.container, { height }]}>
      {safeData.map((d, i) => {
        const ratio = d.value / max;
        // Opacity ramps with index so later bars read as a deeper red.
        const opacity = 0.35 + (0.65 * i) / Math.max(safeData.length - 1, 1);
        return (
          // Composite key: labels can repeat (e.g. "M T W T F S S"), so index
          // alone disambiguates while label keeps the key content-meaningful.
          <View key={`${d.label}-${i}`} style={styles.column}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(ratio * 100, 6)}%`, opacity },
                ]}
              />
            </View>
            <Text style={styles.label}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    column: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
    },
    barTrack: {
      flex: 1,
      width: '60%',
      justifyContent: 'flex-end',
    },
    bar: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: radius.input,
    },
    label: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
