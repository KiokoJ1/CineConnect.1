import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

interface BadgeProps {
  count: number;
}

/** Small red count badge (notification bell / tab counts). */
export function Badge({ count }: BadgeProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: radius.circle,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    text: {
      color: colors.textOnPrimary,
      fontSize: 11,
      fontWeight: '700',
    },
  });
