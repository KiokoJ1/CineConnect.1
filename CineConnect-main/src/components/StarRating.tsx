import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

interface StarRatingProps {
  rating: number;
  /** Show "(N reviews)" / "N.N" trailing label. */
  reviewCount?: number;
  size?: number;
  showValue?: boolean;
}

/** Five-star row using filled/empty star glyphs. */
export function StarRating({ rating, reviewCount, size = 18, showValue = true }: StarRatingProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const rounded = Math.round(rating);
  return (
    <View style={styles.row}>
      <Text style={[styles.stars, { fontSize: size }]}>
        {'★'.repeat(rounded)}
        <Text style={styles.empty}>{'★'.repeat(5 - rounded)}</Text>
      </Text>
      {showValue ? (
        <Text style={styles.value}>
          {rating.toFixed(1)}
          {reviewCount !== undefined ? ` (${reviewCount} reviews)` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stars: {
      color: colors.star,
      letterSpacing: 2,
    },
    empty: {
      color: colors.border,
    },
    value: {
      marginLeft: 8,
      fontSize: 15,
      color: colors.textSecondary,
    },
  });
