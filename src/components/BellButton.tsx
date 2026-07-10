import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from './Badge';

interface BellButtonProps {
  count: number;
  onPress: () => void;
}

/** Notification bell with an unread count badge, top-right of home screens. */
export function BellButton({ count, onPress }: BellButtonProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.bell}>🔔</Text>
      {count > 0 ? (
        <View style={styles.badge}>
          <Badge count={count} />
        </View>
      ) : null}
    </Pressable>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      width: 48,
      height: 48,
      borderRadius: radius.circle,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.94 }],
    },
    bell: {
      fontSize: 22,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
    },
  });
