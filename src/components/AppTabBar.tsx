import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { useTheme } from '@/hooks/useTheme';

/**
 * Custom bottom tab bar matching the design: plain text labels with a small
 * red dot floating above the active tab.
 */
export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            onPress={onPress}
            accessibilityRole="button"
          >
            <View style={[styles.dot, focused && styles.dotActive]} />
            <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      minHeight: 44,
    },
    pressed: {
      opacity: 0.7,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: radius.circle,
      backgroundColor: colors.transparent,
      marginBottom: 6,
    },
    dotActive: {
      backgroundColor: colors.navActive,
    },
    label: {
      fontSize: 13,
    },
    labelActive: {
      color: colors.navActive,
      fontWeight: '700',
    },
    labelInactive: {
      color: colors.navInactive,
      fontWeight: '500',
    },
  });
