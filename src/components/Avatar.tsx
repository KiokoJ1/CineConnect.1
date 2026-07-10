import { StyleSheet, Text, View } from 'react-native';

import { ThemeColors } from '@/constants/colors';
import { radius } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';
import { getAvatarColor, getInitials } from '@/utils/avatar';

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  muted?: boolean;
}

/** Initials circle. Colour is derived from the name unless overridden. */
export function Avatar({ name, size = 48, color, muted = false }: AvatarProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const background = muted ? colors.avatarMuted : color ?? getAvatarColor(name);
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius.circle, backgroundColor: background },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    circle: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: colors.textOnPrimary,
      fontWeight: '700',
    },
  });
